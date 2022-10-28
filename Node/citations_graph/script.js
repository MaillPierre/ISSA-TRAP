import * as fs from "fs";
import * as $rdf from 'rdflib';
import * as md5 from 'md5';
import { Statement } from "rdflib";
import { v4 as uuidv4 } from 'uuid';

var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
var RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");
var OWL = $rdf.Namespace("http://www.w3.org/2002/07/owl#");
var XSD = $rdf.Namespace("http://www.w3.org/2001/XMLSchema#");
var DCAT = $rdf.Namespace("http://www.w3.org/ns/dcat#");
var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
var PROV = $rdf.Namespace("http://www.w3.org/ns/prov#");
var SCHEMA = $rdf.Namespace("http://schema.org/");
var VOID = $rdf.Namespace("http://rdfs.org/ns/void#");
var SD = $rdf.Namespace("http://www.w3.org/ns/sparql-service-description#");
var DCE = $rdf.Namespace("http://purl.org/dc/elements/1.1/");
var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
var SKOS = $rdf.Namespace("http://www.w3.org/2004/02/skos/core#");
var PAV = $rdf.Namespace("http://purl.org/pav/");
var MOD = $rdf.Namespace("https://w3id.org/mod#");
var CITO = $rdf.Namespace("http://purl.org/spar/cito#");

function appendToFile(filename, content) {
    fs.writeFile(filename, content, { flag: 'a+' }, err => {
        if (err) {
            console.error(err);
        }
    });
}

function writeFile(filename, content) {
    fs.writeFile(filename, content, err => {
        if (err) {
            console.error(err);
        }
    });
}

function createStore() {
    var store = $rdf.graph();
    store.setPrefixForURI("dcat", "http://www.w3.org/ns/dcat#");
    store.setPrefixForURI("ex", "https://e.g/#");
    store.setPrefixForURI("kgi", "https://ns.inria.fr/kg/index#");
    return store;
}

function serializeStoreToTurtlePromise(store) {
    return new Promise((accept, reject) => {
        $rdf.serialize(null, store, undefined, 'text/turtle', function (err, str) {
            if (err != null) {
                reject(err);
            }
            accept(str)
        }, { namespaces: store.namespaces });
    })
}

function serializeStoreToNTriplesPromise(store) {
    return new Promise((accept, reject) => {
        $rdf.serialize(null, store, undefined, 'application/n-triples', function (err, str) {
            if (err != null) {
                reject(err);
            }
            accept(str)
        }, { namespaces: store.namespaces });
    })
}

function fetchGETPromise(url, header = new Map()) {
    return fetchPromise(url, header);
}

function fetchPOSTPromise(url, query = "", header = new Map()) {
    return fetchPromise(url, header, "POST", query);
}

function fetchPromise(url, header = new Map(), method = "GET", query = "") {
    var myHeaders = new Headers();
    header.forEach((value, key) => {
        myHeaders.set(key, value);
    });
    var myInit = {
        method: method,
        headers: myHeaders,
        mode: 'cors',
        cache: 'no-cache',
        redirect: 'follow'
    };
    if (method.localeCompare("POST") == 0) {
        myInit.body = query;
    }
    return fetch(url, myInit)
        .then(response => {
            if (response.ok) {
                return response.blob().then(blob => blob.text())
            } else {
                throw response;
            }
        });
}

function fetchJSONPromise(url) {
    var header = new Map();
    header.set('Content-Type', 'application/json');
    header.set("Accept", "application/sparql-results+json")
    return fetchPromise(url, header).then(response => {
        return JSON.parse(response);
    });
}

function sparqlQueryPromise(endpoint, query) {
    if (query.includes("SELECT") || query.includes("ASK")) {
        return fetchJSONPromise(endpoint + '?query=' + encodeURIComponent(query) + '&format=json&timeout=60000')
    } else if (query.includes("CONSTRUCT")) {
        return fetchPromise(endpoint + '?query=' + encodeURIComponent(query) + '&timeout=60000')
    } else {
        console.error(error)
    }
}

const queryPaginationSize = 100;

function paginatedSparqlQueryPromise(endpoint, query, limit = queryPaginationSize, offset = 0, pageFunctionPromise = pageResultBindingItem => { return; }, finalResult = []) {
    var paginatedQuery = query + " LIMIT " + limit + " OFFSET " + offset;
    return sparqlQueryPromise(endpoint, paginatedQuery)
        .then(queryResult => {
            queryResult.results.bindings.forEach(resultItem => {
                var finaResultItem = {};
                queryResult.head.vars.forEach(variable => {
                    finaResultItem[variable] = resultItem[variable];
                })
                pageResultBindingItem(finaResultItem);
                finalResult.push(finaResultItem);
            })
            if (queryResult.results.bindings.length > 0) {
                return paginatedSparqlQueryPromise(endpoint, query, limit + queryPaginationSize, offset + queryPaginationSize, pageFunctionPromise, finalResult)
            }
            return finalResult;
        })
        .then(() => {
            return finalResult;
        })
        .catch(error => {
            console.error(error)
            return finalResult;
        })
        .finally(() => {
            return finalResult;
        })
}

const endpointISSA = "https://data-issa.cirad.fr/sparql";

function retrieveURIISSAFromDOI(dois = []) {
    // console.log("retrieveURIISSAFromDOI", dois)
    if(dois.length > 0) {
        const doisList = "\"" + dois.join("\" \"") + "\"";
        // console.log(doisList)
        const articleQuery = "prefix bibo: <http://purl.org/ontology/bibo/> prefix dct: <http://purl.org/dc/terms/> SELECT ?article ?doi { ?article <http://purl.org/ontology/bibo/doi> ?doi . VALUES ?doi { " + doisList + " } }";
        // console.log(articleQuery)
        return sparqlQueryPromise(endpointISSA, articleQuery).then(sparqlQueryResults => {
            // console.log(sparqlQueryResults.results.bindings)
            var results = [];
            sparqlQueryResults.results.bindings.forEach(citationDois => {
                results.push(citationDois.article.value);
            })
            return results;
        });
    } else {
        return new Promise((resolve, reject) => resolve([]))
    }
}

function retrieveISSAArticles(limit = 100) {
    const articleQuery = "prefix bibo: <http://purl.org/ontology/bibo/> prefix dct: <http://purl.org/dc/terms/> SELECT ?article ?doi ?label { ?article <http://purl.org/ontology/bibo/doi> ?doi ; dct:title ?label } LIMIT " + limit;
    return sparqlQueryPromise(endpointISSA, articleQuery);
}

function retrieveSemanticScholarArticleJSON(doi) {
    if(doi != undefined) {
        const apiQuery = "https://api.semanticscholar.org/graph/v1/paper/DOI:" + doi + "?fields=externalIds,corpusId,title,referenceCount,citationCount,isOpenAccess,openAccessPdf,citations,citations.title,citations.externalIds,citations.corpusId";
        // console.log(apiQuery)
        return fetchJSONPromise(apiQuery);
    } else {
        throw new Error("No DOI given")
    }
}


var semanticscholarRDFStore = $rdf.graph();
const citoExtends = CITO("extends");
retrieveISSAArticles(200).then(results => {
    // console.log(results.results.bindings)
    var doiSSPromises = [];
    results.results.bindings.forEach(bindingItem => {
        var articleUri = bindingItem.article.value;
        const articleRDF = $rdf.sym(articleUri);
        var doi = bindingItem.doi.value;
        console.log(articleUri, doi)
        doiSSPromises.push(retrieveSemanticScholarArticleJSON(doi).then(ssJsonObject => {
            var ssDois = [];
            if(ssJsonObject.citations != undefined ) {
                ssJsonObject.citations.forEach(citationJsonObject => {
                    // console.log(citationJsonObject)
                    if(citationJsonObject.externalIds.DOI != undefined) {
                        console.log(citationJsonObject.externalIds.DOI)
                        console.log("citation", citationJsonObject.externalIds.DOI)
                        ssDois.push(citationJsonObject.externalIds.DOI);
                    }
                })
                console.log(ssDois)
                return retrieveURIISSAFromDOI(ssDois).then(citationsUris => {
                    // console.log(citationsUris)
                    citationsUris.forEach(citationUri => {
                        const citationRDF = $rdf.sym(citationUri);
                        const citationStatement = new Statement(articleRDF, citoExtends, citationRDF)
                        // console.log("ADDITION", citationStatement.toNT())
                        semanticscholarRDFStore.add(citationStatement);
                    })
                    return;
                }).catch(error => {
                    console.error(error)
                })
            }
        }));
    })

    Promise.allSettled(doiSSPromises).then(() => {
        return serializeStoreToTurtlePromise(semanticscholarRDFStore).then(ttl => {
            console.log(ttl);
    })
})
        })
.catch(error => {
    console.error(error)
})
// https://dblp.org/search/publ/api?


            
// @prefix cito: <http://purl.org/spar/cito> .
// # Direct form for a citation
// :paper-a cito:extends :paper-b .
// 
// :citation a cito:Citation ;
//     cito:hasCitingEntity :paper-a ;
//     cito:hasCitationCharacterization cito:extends ;
//     cito:hasCitedEntity :paper-b .
            // console.log(json);r(error)
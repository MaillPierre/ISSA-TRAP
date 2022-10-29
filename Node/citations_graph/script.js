import * as fs from "fs";
import * as $rdf from 'rdflib';
import md5 from 'md5';
import { Statement } from "rdflib";
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs'

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

var ISSA = $rdf.Namespace("http://data-issa.cirad.fr/");

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
    store.setPrefixForURI("issa", "http://data-issa.cirad.fr/");
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
    header.set("Accept", "application/sparql-results+json, application/json")
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
    if (dois.length > 0) {
        const doisList = "\"" + dois.join("\" \"") + "\"";
        console.log(doisList)
        const articleQuery = "prefix bibo: <http://purl.org/ontology/bibo/> prefix dct: <http://purl.org/dc/terms/> SELECT ?article ?doi { ?article <http://purl.org/ontology/bibo/doi> ?doi . VALUES ?doi { " + doisList + " } }";
        return sparqlQueryPromise(endpointISSA, articleQuery).then(sparqlQueryResults => {
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
    if (doi != undefined) {
        const apiQuery = "https://api.semanticscholar.org/graph/v1/paper/DOI:" + doi + "?fields=externalIds,corpusId,title,referenceCount,citationCount,isOpenAccess,openAccessPdf,citations,citations.title,citations.externalIds,citations.corpusId";
        return fetchJSONPromise(apiQuery);
    } else {
        throw new Error("No DOI given")
    }
}

const dctBibliographicCitation = DCT("bibliographicCitation");
function generateSimpleCitationTriples(article1URI, article2URI) {
    const artcle1Resource = $rdf.sym(article1URI);
    const artcle2Resource = $rdf.sym(article2URI);
    const citationStatement = new Statement(artcle1Resource, dctBibliographicCitation, artcle2Resource);

    return citationStatement;
}

// :citation a cito:Citation ;
//     cito:hasCitingEntity :paper-a ;
//     cito:hasCitationCharacterization cito:extends ;
//     cito:hasCitedEntity :paper-b .
function generateComplexCitationTriples(article1URI, article2URI, source) {
    const article1Resource = $rdf.sym(article1URI);
    const article2Resource = $rdf.sym(article2URI);
    const citationResource = $rdf.sym(ISSA("citation/" + uuidv4()))
    const generationDate = $rdf.lit(dayjs().toISOString(), undefined, XSD("datetime"));
    const citationStatements = [
        new Statement(citationResource, RDF("type"), CITO("Citation")),
        new Statement(citationResource, CITO("hasCitingEntity"), article1Resource),
        new Statement(citationResource, CITO("hasCitationCharacterization"), dctBibliographicCitation),
        new Statement(citationResource, CITO("hasCitedEntity"), article2Resource),
        new Statement(citationResource, PROV("generatedAtTime"), generationDate)
    ];
    const sourceResource = $rdf.sym(source);
    citationStatements.push(new Statement(citationResource, PROV("wasAssociatedWith"), sourceResource));
    return citationStatements;
}

function semanticScholarCitations(limit = 10) {
    var semanticscholarRDFStore = createStore();
    return retrieveISSAArticles(limit).then(results => {
        var doiSSPromises = [];
        results.results.bindings.forEach(bindingItem => {
            var articleUri = bindingItem.article.value;
            var doi = bindingItem.doi.value;
            console.log(articleUri, doi)
            doiSSPromises.push(retrieveSemanticScholarArticleJSON(doi).then(ssJsonObject => {
                var ssDois = [];
                console.log(ssJsonObject)
                var externalIds = ssJsonObject.externalIds;
                externalIds.url = ssJsonObject.url;
                if (ssJsonObject.citations != undefined) {
                    ssJsonObject.citations.forEach(citationJsonObject => {
                        if (citationJsonObject.externalIds != undefined && citationJsonObject.externalIds.DOI != undefined) {
                            ssDois.push(citationJsonObject.externalIds.DOI);
                        }
                    })
                    return retrieveURIISSAFromDOI(ssDois).then(citationsUris => {
                        citationsUris.forEach(citationUri => {

                            var citationTriples = generateComplexCitationTriples(articleUri, citationUri, "https://www.semanticscholar.org");
                            citationTriples.push(generateSimpleCitationTriples(articleUri, citationUri, "https://www.semanticscholar.org"));

                            if (externalIds.CorpusId != undefined) {
                                var corpusIdResource = ISSA(md5(articleUri + externalIds.CorpusId));
                                citationTriples.push(new Statement($rdf.sym(articleUri), SCHEMA("identifier"), corpusIdResource))
                                citationTriples.push(new Statement(corpusIdResource, SCHEMA("value"), $rdf.lit(externalIds.CorpusId)))
                                citationTriples.push(new Statement(corpusIdResource, RDFS("label"), $rdf.lit("CorpusId")))
                                citationTriples.push(new Statement(corpusIdResource, SCHEMA("propertyID"), $rdf.sym("https://www.semanticscholar.org")))
                            }
                            if (externalIds.DBLP != undefined) {
                                var corpusIdResource = ISSA(md5(articleUri + externalIds.DBLP));
                                citationTriples.push(new Statement($rdf.sym(articleUri), SCHEMA("identifier"), corpusIdResource))
                                citationTriples.push(new Statement(corpusIdResource, SCHEMA("value"), $rdf.lit(externalIds.DBLP)))
                                citationTriples.push(new Statement(corpusIdResource, RDFS("label"), $rdf.lit("DBLP")))
                                citationTriples.push(new Statement(corpusIdResource, SCHEMA("propertyID"), $rdf.sym("https://dblp.org")))
                            }
                            if (externalIds.ArXiv != undefined) {
                                var corpusIdResource = ISSA(md5(articleUri + externalIds.ArXiv));
                                citationTriples.push(new Statement($rdf.sym(articleUri), SCHEMA("identifier"), corpusIdResource))
                                citationTriples.push(new Statement(corpusIdResource, SCHEMA("value"), $rdf.lit(externalIds.ArXiv)))
                                citationTriples.push(new Statement(corpusIdResource, RDFS("label"), $rdf.lit("ArXiv")))
                                citationTriples.push(new Statement(corpusIdResource, SCHEMA("propertyID"), $rdf.sym("https://arxiv.org/")))
                            }
                            if (externalIds.url != undefined) {
                                citationTriples.push(new Statement($rdf.sym(articleUri), OWL("sameAs"), $rdf.sym(externalIds.url)))
                            }

                            console.log(citationTriples.map(triple => triple.toNT()))
                            citationTriples.forEach(triple => {
                                try {
                                    semanticscholarRDFStore.add(triple);
                                } catch (error) {
                                    console.error(triple.toNT());
                                    console.error(error)
                                    throw error;
                                }
                            })

                        })
                        return;
                    }).catch(error => {
                        console.error(error)
                    })
                }
            }).catch(error => {
                console.error(error)
            }));
        })

        return Promise.allSettled(doiSSPromises).then(() => {
            return serializeStoreToTurtlePromise(semanticscholarRDFStore)
        }).then(ttl => {
            writeFile("semanticScholar.ttl", ttl)
        })
    })
        .catch(error => {
            console.error(error)
        })
}

// semanticScholarCitations(400).then(ttl => {
//     writeFile("semanticScholar.ttl", ttl)
// });

function retrieveCrossRefArticleJSON(doi) {
    if (doi != undefined) {
        const apiQuery = "https://api.crossref.org/works/" + encodeURIComponent(doi);
        return fetchJSONPromise(apiQuery);
    } else {
        throw new Error("No DOI given")
    }
}


function retrieveOpenAlexArticleJSONByDOI(doi) {
    if (doi != undefined) {
        const apiQuery = "https://api.openalex.org/works/https://doi.org/" + doi;
        return fetchJSONPromise(apiQuery);
    } else {
        throw new Error("No DOI given")
    }
}


function retrieveOpenAlexArticleJSONByOpenAlexID(id) {
    if (id != undefined) {
        const apiQuery = "https://api.openalex.org/works/" + id;
        return fetchJSONPromise(apiQuery);
    } else {
        throw new Error("No DOI given")
    }
}


function openAlexCitations(limit) {
    var openAlexRDFStore = createStore();
    return retrieveISSAArticles(limit).then(results => {
        var doiOpenAlexPromises = [];
        var articleReferencesMap = new Map();
        results.results.bindings.forEach(bindingItem => {
            var articleUri = bindingItem.article.value;
            if (articleReferencesMap.get(articleUri) == undefined) {
                articleReferencesMap.set(articleUri, [])
            }
            var doi = bindingItem.doi.value;
            doiOpenAlexPromises.push(
                retrieveOpenAlexArticleJSONByDOI(doi).then(json => {
                    if (json.referenced_works != undefined) {
                        json.referenced_works.forEach(alexCitation => {
                            articleReferencesMap.get(articleUri).push(alexCitation);
                        })
                    }
                    if (json.ids != undefined) {
                        if (json.ids.openalex != undefined) {
                            openAlexRDFStore.add($rdf.sym(articleUri), OWL("sameAs"), $rdf.sym(json.ids.openalex))
                        }
                        if (json.ids.doi != undefined) {
                            openAlexRDFStore.add($rdf.sym(articleUri), OWL("sameAs"), $rdf.sym(json.ids.doi))
                        }
                        if (json.ids.pmid != undefined) {
                            openAlexRDFStore.add($rdf.sym(articleUri), OWL("sameAs"), $rdf.sym(json.ids.pmid))
                        }
                        if (json.ids.pmcid != undefined) {
                            openAlexRDFStore.add($rdf.sym(articleUri), OWL("sameAs"), $rdf.sym(json.ids.pmcid))
                        }
                    }
                }).catch(error => {
                    console.error(error)
                }))
        })
        Promise.allSettled(doiOpenAlexPromises).then(() => {
            var openAlexReferencesPromises = [];
            articleReferencesMap.forEach((references, articleUri) => {
                references.forEach(reference => {
                    const referenceOpenAlexId = reference.replace("https://openalex.org/", "");
                    openAlexReferencesPromises.push(retrieveOpenAlexArticleJSONByOpenAlexID(referenceOpenAlexId).then(json => {
                        const referenceDOI = json.doi;
                        const doiId = referenceDOI.replace("https://doi.org/", "")
                        return retrieveURIISSAFromDOI([doiId]).then(articles => {
                            if (articles.length > 0) {
                                articles.forEach(citationUri => {
                                    const simpleCitationTriples = generateSimpleCitationTriples(articleUri, citationUri, "https://openalex.org/");
                                    const complexCitationTriples = generateComplexCitationTriples(articleUri, citationUri, "https://openalex.org/");
                                    console.log(complexCitationTriples.map(triple => triple.toNT()))
                                    openAlexRDFStore.add(simpleCitationTriples);
                                    openAlexRDFStore.addAll(complexCitationTriples);
                                })
                            } else {
                                const simpleCitationTriples = generateSimpleCitationTriples(articleUri, referenceDOI, "https://openalex.org/");
                                const complexCitationTriples = generateComplexCitationTriples(articleUri, referenceDOI, "https://openalex.org/");
                                openAlexRDFStore.add(simpleCitationTriples);
                                openAlexRDFStore.addAll(complexCitationTriples);
                            }
                            return;
                        });
                    }))
                })
            })
            return Promise.allSettled(openAlexReferencesPromises)
        }).then(() => {
            return serializeStoreToTurtlePromise(openAlexRDFStore).then(ttl => {
                console.log(ttl)
                writeFile("OpenAlex.ttl", ttl)
                return;
            })
        });
    })
}

var globalISSAArticlesLimit = 30;
try {
    globalISSAArticlesLimit = Number.parseInt(process.argv[2]);
} catch (error) {
    console.error(error)
}

openAlexCitations(globalISSAArticlesLimit).then(() => {
    return semanticScholarCitations(globalISSAArticlesLimit);
})

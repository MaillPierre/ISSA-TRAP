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
    if(dois.length > 0) {
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
    if(doi != undefined) {
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
    var semanticscholarRDFStore = $rdf.graph();
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
                if(ssJsonObject.citations != undefined ) {
                    ssJsonObject.citations.forEach(citationJsonObject => {
                        if(citationJsonObject.externalIds != undefined && citationJsonObject.externalIds.DOI != undefined) {
                            ssDois.push(citationJsonObject.externalIds.DOI);
                        }
                    })
                    return retrieveURIISSAFromDOI(ssDois).then(citationsUris => {
                        citationsUris.forEach(citationUri => {

                            var citationTriples = generateComplexCitationTriples(articleUri, citationUri, "https://www.semanticscholar.org");
                            citationTriples.push(generateSimpleCitationTriples(articleUri, citationUri, "https://www.semanticscholar.org"));

                            if(externalIds.CorpusId != undefined) {
                                var corpusIdResource = ISSA(md5(articleUri + externalIds.CorpusId));
                                citationTriples.push(new Statement($rdf.sym(articleUri), SCHEMA("identifier"), corpusIdResource))
                                citationTriples.push(new Statement(corpusIdResource, SCHEMA("value"), $rdf.lit(externalIds.CorpusId)))
                                citationTriples.push(new Statement(corpusIdResource, RDFS("label"), $rdf.lit("CorpusId")))
                                citationTriples.push(new Statement(corpusIdResource, SCHEMA("propertyID"), $rdf.sym("https://www.semanticscholar.org")))
                            }
                            if(externalIds.DBLP != undefined) {
                                var corpusIdResource = ISSA(md5(articleUri + externalIds.DBLP));
                                citationTriples.push(new Statement($rdf.sym(articleUri), SCHEMA("identifier"), corpusIdResource))
                                citationTriples.push(new Statement(corpusIdResource, SCHEMA("value"), $rdf.lit(externalIds.DBLP)))
                                citationTriples.push(new Statement(corpusIdResource, RDFS("label"), $rdf.lit("DBLP")))
                                citationTriples.push(new Statement(corpusIdResource, SCHEMA("propertyID"), $rdf.sym("https://dblp.org")))
                            }
                            if(externalIds.ArXiv != undefined) {
                                var corpusIdResource = ISSA(md5(articleUri + externalIds.ArXiv));
                                citationTriples.push(new Statement($rdf.sym(articleUri), SCHEMA("identifier"), corpusIdResource))
                                citationTriples.push(new Statement(corpusIdResource, SCHEMA("value"), $rdf.lit(externalIds.ArXiv)))
                                citationTriples.push(new Statement(corpusIdResource, RDFS("label"), $rdf.lit("ArXiv")))
                                citationTriples.push(new Statement(corpusIdResource, SCHEMA("propertyID"), $rdf.sym("https://arxiv.org/")))
                            }
                            if(externalIds.url != undefined) {
                                citationTriples.push(new Statement($rdf.sym(articleUri), OWL("sameAs"), $rdf.sym(externalIds.url)))
                            }

                            console.log(citationTriples.map(triple => triple.toNT()))
                            citationTriples.forEach(triple => {
                                try{
                                semanticscholarRDFStore.add(triple);
                                } catch(error) {
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
    if(doi != undefined) {
        const apiQuery = "https://api.crossref.org/works/" + encodeURIComponent(doi) ;
        return fetchJSONPromise(apiQuery);
    } else {
        throw new Error("No DOI given")
    }
}


function retrieveOpenAlexArticleJSONByDOI(doi) {
    if(doi != undefined) {
        const apiQuery = "https://api.openalex.org/works/https://doi.org/" + doi;
        return fetchJSONPromise(apiQuery);
    } else {
        throw new Error("No DOI given")
    }
}


function retrieveOpenAlexArticleJSONByOpenAlexID(id) {
    if(id != undefined) {
        const apiQuery = "https://api.openalex.org/works/" + id;
        return fetchJSONPromise(apiQuery);
    } else {
        throw new Error("No DOI given")
    }
}


function openAlexCitations(limit) {
var openAlexRDFStore = $rdf.graph();
return retrieveISSAArticles(limit).then(results => {
    var doiOpenAlexPromises = [];
    var articleReferencesMap = new Map();
    results.results.bindings.forEach(bindingItem => {
        var articleUri = bindingItem.article.value;
        if(articleReferencesMap.get(articleUri) == undefined) {
            articleReferencesMap.set(articleUri, [])
        }
        var doi = bindingItem.doi.value;
        doiOpenAlexPromises.push(
            retrieveOpenAlexArticleJSONByDOI(doi).then(json => {
                if(json.referenced_works != undefined) {
                    json.referenced_works.forEach(alexCitation => {
                        articleReferencesMap.get(articleUri).push(alexCitation);
                    })
                }
                if(json.ids != undefined) {
                    if(json.ids.openalex != undefined) {
                        openAlexRDFStore.add($rdf.sym(articleUri), OWL("sameAs"), $rdf.sym(json.ids.openalex))
                    }
                    if(json.ids.doi != undefined) {
                        openAlexRDFStore.add($rdf.sym(articleUri), OWL("sameAs"), $rdf.sym(json.ids.doi))
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
                    const doiId = referenceDOI.replace("https://doi.org/","")
                    return retrieveURIISSAFromDOI([doiId]).then(articles => {
                        if(articles.length > 0) {
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

openAlexCitations(20).then(() => {
    return semanticScholarCitations(20);
})


            
// @prefix cito: <http://purl.org/spar/cito> .
// # Direct form for a citation
// :paper-a cito:extends :paper-b .
// 
            // console.log(json);r(error)



            // http://data-issa.cirad.fr/article/477479 10.19182/remvt.9739
            // http://data-issa.cirad.fr/article/477481 10.19182/remvt.9740
            // http://data-issa.cirad.fr/article/477501 10.19182/remvt.9746
            // http://data-issa.cirad.fr/article/477502 10.19182/remvt.9747
            // http://data-issa.cirad.fr/article/477831 10.1128/AEM.66.12.5437-5447.2000
            // http://data-issa.cirad.fr/article/480109 10.1017/S0950268801005465
            // http://data-issa.cirad.fr/article/481836 10.19182/remvt.9707
            // http://data-issa.cirad.fr/article/488770 10.1051/ocl.2001.0659
            // http://data-issa.cirad.fr/article/508870 10.1093/ps/80.6.703
            // http://data-issa.cirad.fr/article/509633 10.19182/remvt.9774
            // http://data-issa.cirad.fr/article/510768 10.1051/fruits:2002028
            // http://data-issa.cirad.fr/article/511152 10.1046/j.1364-3703.2002.00134.x
            // http://data-issa.cirad.fr/article/515692 10.1051/ocl.2003.0232
            // http://data-issa.cirad.fr/article/516404 10.1093/ps/81.8.1243
            // http://data-issa.cirad.fr/article/519928 10.19182/remvt.9868
            // http://data-issa.cirad.fr/article/521315 10.19182/remvt.9866
            // http://data-issa.cirad.fr/article/522063 10.37833/cord.v20i02.392
            // http://data-issa.cirad.fr/article/522074 10.37833/cord.v20i02.387
            // http://data-issa.cirad.fr/article/525671 10.1029/2003JD003430
            // http://data-issa.cirad.fr/article/528358 10.1017/S0950268805003729
            // http://data-issa.cirad.fr/article/528645 10.1051/fruits:2005027
            // http://data-issa.cirad.fr/article/529913 10.37833/cord.v21i01.399
            // http://data-issa.cirad.fr/article/534265 10.1051/fruits:2006021
            // http://data-issa.cirad.fr/article/537311 10.1051/fruits:2006043
            // http://data-issa.cirad.fr/article/537356 10.1051/fruits:2006051
            // http://data-issa.cirad.fr/article/539023 10.1017/S1751731107685073
            // http://data-issa.cirad.fr/article/539306 10.1051/fruits:2007014
            // http://data-issa.cirad.fr/article/540111 10.1051/fruits:2007017
            // http://data-issa.cirad.fr/article/540112 10.1051/fruits:2007018
            // http://data-issa.cirad.fr/article/540115 10.1051/fruits:2007019
            // http://data-issa.cirad.fr/article/541127 10.1051/fruits:2007029
            // http://data-issa.cirad.fr/article/542067 10.1128/AEM.70.10.6123-6130.2004
            // http://data-issa.cirad.fr/article/542255 10.1093/nar/gkm798
            // http://data-issa.cirad.fr/article/542388 10.4081/gh.2007.250
            // http://data-issa.cirad.fr/article/542680 10.1051/fruits:2007044
            // http://data-issa.cirad.fr/article/542694 10.1051/fruits:2008001
            // http://data-issa.cirad.fr/article/543258 10.1017/S0950268807008801
            // http://data-issa.cirad.fr/article/543267 10.1051/vetres:2007046
            // http://data-issa.cirad.fr/article/543275 10.1051/vetres:2007052
            // http://data-issa.cirad.fr/article/543655 10.1186/1471-2164-9-58
            // http://data-issa.cirad.fr/article/543784 10.1051/fruits:2007049
            // http://data-issa.cirad.fr/article/543896 10.1051/fruits:2007053
            // http://data-issa.cirad.fr/article/543898 10.1051/fruits:2007054
            // http://data-issa.cirad.fr/article/544342 10.1051/fruits:2008008
            // http://data-issa.cirad.fr/article/544344 10.1051/fruits:2008010
            // http://data-issa.cirad.fr/article/544345 10.1051/fruits:2008011
            // http://data-issa.cirad.fr/article/544567 10.1186/1471-2229-8-14
            // http://data-issa.cirad.fr/article/544684 10.37833/cord.v24i1.155
            // http://data-issa.cirad.fr/article/544686 10.37833/cord.v24i1.156
            // http://data-issa.cirad.fr/article/545317 10.3201/eid1407.071477
            // http://data-issa.cirad.fr/article/545746 10.1051/fruits:2008019
            // http://data-issa.cirad.fr/article/545747 10.1051/fruits:2008020
            // http://data-issa.cirad.fr/article/545749 10.1051/fruits:2008021
            // http://data-issa.cirad.fr/article/546007 10.1371/journal.ppat.1000127
            // http://data-issa.cirad.fr/article/546483 10.1590/S0103-50532008000700021
            // http://data-issa.cirad.fr/article/546501 10.1155/2008/369601
            // http://data-issa.cirad.fr/article/546898 10.1186/1743-422X-5-123
            // http://data-issa.cirad.fr/article/546973 10.1371/journal.pone.0003673
            // http://data-issa.cirad.fr/article/547072 10.20506/rst.27.2.1802
            // http://data-issa.cirad.fr/article/547193 10.19182/remvt.9996
            // http://data-issa.cirad.fr/article/547539 10.1051/fruits:2008038
            // http://data-issa.cirad.fr/article/547596 10.3201/eid1412.080591
            // http://data-issa.cirad.fr/article/547691 10.1093/nar/gkn821
            // http://data-issa.cirad.fr/article/547841 10.14411/eje.2008.019
            // http://data-issa.cirad.fr/article/548014 10.1128/AEM.02245-08
            // http://data-issa.cirad.fr/article/548148 10.1590/S1982-56762008000500006
            // http://data-issa.cirad.fr/article/548501 10.1186/1471-2164-9-512
            // http://data-issa.cirad.fr/article/548681 10.1111/j.1364-3703.2004.00250.x
            // http://data-issa.cirad.fr/article/548796 10.1051/fruits/2009001
            // http://data-issa.cirad.fr/article/549326 10.1007/s12284-008-9016-5
            // http://data-issa.cirad.fr/article/549349 10.1186/1471-2148-9-58
            // http://data-issa.cirad.fr/article/549366 10.1128/AEM.02906-07
            // http://data-issa.cirad.fr/article/549390 10.3923/ajpp.2008.73.80
            // http://data-issa.cirad.fr/article/549392 10.1186/1743-422X-5-135
            // http://data-issa.cirad.fr/article/549398 10.1186/1297-9686-41-32
            // http://data-issa.cirad.fr/article/549419 10.1186/1471-2164-9-204
            // http://data-issa.cirad.fr/article/549822 10.1111/j.1477-8947.2009.01220.x
            // http://data-issa.cirad.fr/article/550128 10.1051/fruits/2009008
            // http://data-issa.cirad.fr/article/550721 10.3201/eid1503.071410
            // http://data-issa.cirad.fr/article/551400 10.1051/fruits/2009015
            // http://data-issa.cirad.fr/article/551403 10.1051/fruits/2009021
            // http://data-issa.cirad.fr/article/551420 10.1051/fruits/2009017
            // http://data-issa.cirad.fr/article/552114 10.1051/fruits/2009027
            // http://data-issa.cirad.fr/article/552624 10.5194/hess-13-2151-2009
            // http://data-issa.cirad.fr/article/552657 10.5194/bg-6-2193-2009
            // http://data-issa.cirad.fr/article/552753 10.1051/fruits/2009035
            // http://data-issa.cirad.fr/article/553239 10.1051/vetres/2009076
            // http://data-issa.cirad.fr/article/553366 10.1186/1471-2164-10-616
            // http://data-issa.cirad.fr/article/553546 10.1186/1471-2199-10-111
            // http://data-issa.cirad.fr/article/553929 10.3382/ps.2009-00360
            // http://data-issa.cirad.fr/article/554026 10.18564/jasss.1538
            // http://data-issa.cirad.fr/article/554270 10.1051/fruits/20010001
            // http://data-issa.cirad.fr/article/554275 10.1051/fruits/20010004
            // http://data-issa.cirad.fr/article/554500 10.3923/ajps.2010.36.43
            // http://data-issa.cirad.fr/article/554519 10.1111/j.1755-263X.2009.00087.x
            // http://data-issa.cirad.fr/article/555340 10.1080/17429140902962613
            // http://data-issa.cirad.fr/article/555751 10.1186/1471-2156-10-1
            // http://data-issa.cirad.fr/article/555841 10.1371/journal.pntd.0000692
            // http://data-issa.cirad.fr/article/556061 10.1186/1471-2229-10-65
            // http://data-issa.cirad.fr/article/556182 10.5194/hess-14-1449-2010
            // http://data-issa.cirad.fr/article/556412 10.1051/fruits/2010018
            // http://data-issa.cirad.fr/article/556476 10.1186/1471-2105-11-401
            // http://data-issa.cirad.fr/article/556657 10.1051/parasite/2010173257
            // http://data-issa.cirad.fr/article/557002 10.1371/journal.pone.0013518
            // http://data-issa.cirad.fr/article/557126 10.1017/S095026881000035X
            // http://data-issa.cirad.fr/article/557130 10.1186/1756-3305-3-81
            // http://data-issa.cirad.fr/article/557158 10.1186/1471-2229-10-206
            // http://data-issa.cirad.fr/article/557536 10.19182/remvt.10093
            // http://data-issa.cirad.fr/article/557538 10.1017/S0950268810000506
            // http://data-issa.cirad.fr/article/557629 10.1007/s10681-010-0220-1
            // http://data-issa.cirad.fr/article/557683 10.18167/agritrop/00013
            // http://data-issa.cirad.fr/article/557773 10.1029/2009JG001016
            // http://data-issa.cirad.fr/article/558468 10.1186/1471-2148-10-184
            // http://data-issa.cirad.fr/article/558473 10.3390/d2111158
            // http://data-issa.cirad.fr/article/558495 10.1186/1471-2229-9-123
            // http://data-issa.cirad.fr/article/558496 10.1186/1471-2164-12-5
            // http://data-issa.cirad.fr/article/558808 10.1371/journal.pntd.0000907
            // http://data-issa.cirad.fr/article/558973 10.1186/1756-3305-4-18
            // http://data-issa.cirad.fr/article/559098 10.1186/1471-2164-12-114
            // http://data-issa.cirad.fr/article/559285 10.1590/S0103-90162011000100014
            // http://data-issa.cirad.fr/article/559401 10.1051/fruits/2011001
            // http://data-issa.cirad.fr/article/559407 10.1051/fruits/2011002
            // http://data-issa.cirad.fr/article/559779 10.19182/remvt.10041
            // http://data-issa.cirad.fr/article/559785 10.1088/1748-9326/6/1/014008
            // http://data-issa.cirad.fr/article/559787 10.19182/remvt.10045
            // http://data-issa.cirad.fr/article/560027 10.37833/cord.v27i1.120
            // http://data-issa.cirad.fr/article/560032 10.1371/journal.ppat.1002028
            // http://data-issa.cirad.fr/article/560080 10.1186/1297-9716-42-60
            // http://data-issa.cirad.fr/article/560189 10.1186/1756-3305-4-99
            // http://data-issa.cirad.fr/article/560275 10.4061/2011/391463
            // http://data-issa.cirad.fr/article/560284 10.1590/S0104-77602011000100013
            // http://data-issa.cirad.fr/article/560286 10.1890/ES10-00158.1
            // http://data-issa.cirad.fr/article/560322 10.1186/1471-2105-12-134
            // http://data-issa.cirad.fr/article/560742 10.1186/1471-2156-12-59
            // http://data-issa.cirad.fr/article/560771 10.1371/journal.pntd.0001276
            // http://data-issa.cirad.fr/article/560780 10.1186/1297-9716-42-86
            // http://data-issa.cirad.fr/article/561220 10.1155/2011/134526
            // http://data-issa.cirad.fr/article/561293 10.1007/s13593-011-0017-1
            // http://data-issa.cirad.fr/article/561457 10.1186/1753-6561-5-S7-O28
            // http://data-issa.cirad.fr/article/561773 10.1371/journal.pone.0000224
            // http://data-issa.cirad.fr/article/561842 10.1111/j.1364-3703.2005.00287.x
            // http://data-issa.cirad.fr/article/561845 10.1186/1297-9686-43-32
            // http://data-issa.cirad.fr/article/561846 10.1046/j.1365-2958.2003.03605.x
            // http://data-issa.cirad.fr/article/561946 10.4061/2011/429069
            // http://data-issa.cirad.fr/article/562309 10.1051/fruits/2011058
            // http://data-issa.cirad.fr/article/562456 10.1155/2011/165638
            // http://data-issa.cirad.fr/article/562488 10.1590/S1984-70332011000500011
            // http://data-issa.cirad.fr/article/562581 10.1186/1471-2164-12-538
            // http://data-issa.cirad.fr/article/563037 10.3201/eid1712.110928
            // http://data-issa.cirad.fr/article/563079 10.18564/jasss.1928
            // http://data-issa.cirad.fr/article/563168 10.1371/journal.pntd.0001423
            // http://data-issa.cirad.fr/article/563256 10.5897/IJBC11.231
            // http://data-issa.cirad.fr/article/563433 10.1186/1471-2229-12-1
            // http://data-issa.cirad.fr/article/563623 10.3390/d4010001
            // http://data-issa.cirad.fr/article/563646 10.1155/2012/605037
            // http://data-issa.cirad.fr/article/563890 10.3201/eid1804.111102
            // http://data-issa.cirad.fr/article/563903 10.1051/fruits/2012005
            // http://data-issa.cirad.fr/article/564000 10.5897/AJB11.920
            // http://data-issa.cirad.fr/article/564232 10.1111/j.1752-4571.2011.00223.x
            // http://data-issa.cirad.fr/article/564334 10.1371/journal.pone.0037124
            // http://data-issa.cirad.fr/article/564340 10.3201/eid1806.111165
            // http://data-issa.cirad.fr/article/564341 10.1111/j.1750-2659.2011.00314.x
            // http://data-issa.cirad.fr/article/564394 10.1186/1471-2164-13-103
            // http://data-issa.cirad.fr/article/564512 10.1051/fruits/2012015
            // http://data-issa.cirad.fr/article/564630 10.5897/AJAR11.1845
            // http://data-issa.cirad.fr/article/564864 10.1371/journal.pone.0039859
            // http://data-issa.cirad.fr/article/564946 10.1128/AEM.06123-11
            // http://data-issa.cirad.fr/article/565092 10.5197/j.2044-0588.2012.025.006
            // http://data-issa.cirad.fr/article/565194 10.4314/ijbcs.v6i3.2
            // http://data-issa.cirad.fr/article/565472 10.1371/journal.pone.0040699
            // http://data-issa.cirad.fr/article/565539 10.1371/journal.pone.0045739
            // http://data-issa.cirad.fr/article/565562 10.1186/1471-2164-13-222
            // http://data-issa.cirad.fr/article/565573 10.3201/eid1810.120398
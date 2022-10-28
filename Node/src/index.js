import * as fs from "fs";
import * as $rdf from 'rdflib';
import $ from 'jquery';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration.js';
dayjs.extend(duration);
import * as md5 from 'md5';
import { Statement } from "rdflib";
import 'leaflet';
import * as dt from 'datatables.net-bs5';

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

function paginatedSparqlQueryPromise(endpoint, query, pageFunctionPromise = pageResultBindingItem => { return; }, limit = queryPaginationSize, offset = 0, finalResult = []) {
    var paginatedQuery = query + " LIMIT " + limit + " OFFSET " + offset;
    return sparqlQueryPromise(paginatedQuery)
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
                return paginatedSparqlQueryPromise(endpoint, query, pageFunctionPromise, limit + queryPaginationSize, offset + queryPaginationSize, finalResult)
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


$(() => {
    var mapObject = L.map('map').setView([39.36827914916014, 12.117919921875002], 2);

    // Initialization of the map
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFpbGxwaWVycmUiLCJhIjoiY2t5OXlxeXhkMDBlZDJwcWxpZTF4ZGkxZiJ9.dCeJEhUs7EF2HI50vdv-7Q', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'pk.eyJ1IjoibWFpbGxwaWVycmUiLCJhIjoiY2t5OXlxeXhkMDBlZDJwcWxpZTF4ZGkxZiJ9.dCeJEhUs7EF2HI50vdv-7Q'
    }).addTo(mapObject);
    var layerGroup = L.layerGroup().addTo(mapObject);


    L.marker([43.61469940580401, 7.071802771869515]).addTo(mapObject)
    .bindPopup('ISSA TRAP !!!')
    .openPopup();
})
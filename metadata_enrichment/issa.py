# Enrichissement des méta-données ISSA
# extraction des liens ORCID associés à chaques auteurs dans le graphe de connaissances
# Auteur: Rémi FELIN

from distance import get_similarity
from SPARQLWrapper import SPARQLWrapper, JSON
import requests
from vocab import ISSA_PREFIX
from sparql import select
import json
# service
from services import open_alex, semantic_scholar

# set SPARQL service : ISSA endpoint
# issa_endpoint = "http://erebe-vm20.i3s.unice.fr:8890/sparql"
issa_endpoint = "https://data-issa.cirad.fr/sparql"
issa_sparql = SPARQLWrapper(issa_endpoint)


def get_DOI_with_authors_from_issa(**kwargs):
    """Return a list of authors (as list of str) using ISSA SPARQL Endpoint
    Structure: {"doi_1": ["author_1", ..., "author_n"], ...}"""
    limit = kwargs.get("limit")
    offset = kwargs.get("offset")
    if limit is not None:
        if offset is not None:
            query = select(ISSA_PREFIX, "distinct ?doi ?author", "?article bibo:doi ?doi . ?article dce:creator ?author"
                           , limit=limit, offset=offset)
        else:
            query = select(ISSA_PREFIX, "distinct ?doi ?author", "?article bibo:doi ?doi . ?article dce:creator ?author"
                           , limit=limit)
    else:
        query = select(ISSA_PREFIX, "distinct ?doi ?author", "?article bibo:doi ?doi . ?article dce:creator ?author")
    issa_sparql.setQuery(query)
    issa_sparql.setReturnFormat(JSON)
    lists = []
    for result in json.load(issa_sparql.query().response)["results"]["bindings"]:
        lists.append((result["doi"]["value"], result["author"]["value"]))
    # Clean list
    results = dict()
    for doi, author in lists:
        if str(doi) not in results.keys():
            results[str(doi)] = [author]
        else:
            results[str(doi)] += [author]
    # print(results)
    return results


def get_article_issa_from_DOI(doi: str):
    query = select(ISSA_PREFIX, "?article", "?article bibo:doi '{}'".format(doi))
    issa_sparql.setQuery(query)
    issa_sparql.setReturnFormat(JSON)
    return json.load(issa_sparql.query().response)["results"]["bindings"][0]["article"]["value"]


def main(mode: str):
    print("Alignement des auteurs pour 100 articles du jeu de données ISSA: " + issa_endpoint)
    dois = get_DOI_with_authors_from_issa(limit=100)
    issa_uri_by_dois = dict()
    for doi in dois:
        issa_uri_by_dois[str(doi)] = get_article_issa_from_DOI(doi)
    # MODE POSSIBLE:
    if mode == open_alex.MODE:
        results = open_alex.main(dois, issa_uri_by_dois)
        # export dict in file
        save_results(results, "openalex_100")
        print("Done !")
    elif mode == semantic_scholar.MODE:
        results = semantic_scholar.main(dois, issa_uri_by_dois)
        # export dict in file
        save_results(results, "semanticscholar_100")
        print("Done !")


def save_results(results: dict, service: str):
    # Complete results
    with open("results/resutls_{}.json".format(service), mode="w", encoding="utf-8") as json_file:
        json_file.write(json.dumps(results, indent=2))
        json_file.close()
    # RDF Triples as N-Triples to import
    with open("results/triples_{}.nt".format(service), mode="w", encoding="utf-8") as ttl_file:
        for article in results["articles"]:
            for author in article["authors"]:
                ttl_file.write(str(author["triple"]) + "\n")
        ttl_file.close()
    print("Done !")


if __name__ == '__main__':
    main(open_alex.MODE)
    # main(semantic_scholar.MODE)

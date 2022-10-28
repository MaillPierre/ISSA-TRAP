# Enrichissement des méta-données ISSA
# extraction des liens ORCID associés à chaques auteurs dans le graphe de connaissances
# Auteur: Rémi FELIN

from distance import get_similarity
from SPARQLWrapper import SPARQLWrapper, JSON
import requests
from vocab import ISSA_PREFIX
from sparql import select
import json

# set SPARQL service : ISSA endpoint
issa_endpoint = "https://data-issa.cirad.fr/sparql"
issa_sparql = SPARQLWrapper(issa_endpoint)

# set API endpoints
# Semantic scholar
semantic_scholar_endpoint = "https://api.semanticscholar.org/graph/v1/"


def get_DOI_with_authors_from_issa(**kwargs):
    """Return a list of authors (as list of str) using ISSA SPARQL Endpoint
    Structure: [[doi, [author_1, author_2, ..., author_n]], [...]]"""
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
    return results


def get_authors_from_semantic_scholar_by_DOI(doi: str):
    x = requests.get('https://w3schools.com/python/demopage.htm')
    print(x.text)
    return None


# def get_authors_from_issa(**kwargs):
#     """Return a list of authors (as list of str) using ISSA SPARQL Endpoint"""
#     limit = kwargs.get("limit")
#     offset = kwargs.get("offset")
#     if limit is not None:
#         if offset is not None:
#             query = select(ISSA_PREFIX, "distinct ?author", "?article dce:creator ?author", limit=limit, offset=offset)
#         else:
#             query = select(ISSA_PREFIX, "distinct ?author", "?article dce:creator ?author", limit=limit)
#     else:
#         query = select(ISSA_PREFIX, "distinct ?author", "?article dce:creator ?author")
#     issa_sparql.setQuery(query)
#     issa_sparql.setReturnFormat(JSON)
#     authors = []
#     for result in json.load(issa_sparql.query().response)["results"]["bindings"]:
#         authors.append(result["author"]["value"])
#     return authors

doi_and_authors_issa = get_DOI_with_authors_from_issa(limit=100)
# print(get_similarity("Toto tata", "Tutu tete"))

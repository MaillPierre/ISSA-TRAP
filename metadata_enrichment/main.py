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
openalex_endpoint = "https://api.openalex.org/"


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


def get_authors_from_semantic_scholar_by_DOI(doi: str):
    service = "paper/{}/authors".format(doi) + "?fields=name,externalIds"
    result = requests.get(semantic_scholar_endpoint + service)
    authors = []
    for author in result.json():
        authors.append((author["authorId"], author["name"]))
    #     print(author)
    # print(result.json())
    return authors


def get_authors_from_openalex_by_DOI(doi: str):
    query = requests.get(openalex_endpoint + "works/https://doi.org/" + doi)
    result = []
    for author in query.json()["authorships"]:
        result.append((author["author"]["display_name"], author["author"]["orcid"]))
    # print(result)
    return result


if __name__ == '__main__':
    print("Alignement des auteurs pour 100 articles du jeu de données ISSA: " + issa_endpoint)
    doi_with_authors: dict = get_DOI_with_authors_from_issa(limit=100)
    # Pour chaques articles, on va récupérer ses informations relatives sur les
    # différents endpoints disponibles
    print("------------------------------------")
    for doi in doi_with_authors.keys():
        print("DOI = " + doi)
        authors_from_openalex = get_authors_from_openalex_by_DOI(doi)
        authors_from_openalex_with_orcid = [(author, orcid) for author, orcid in authors_from_openalex if orcid is not None]
        print(str(len(authors_from_openalex_with_orcid)) + " authors have an ORCID on " + openalex_endpoint)
        if len(authors_from_openalex_with_orcid) != 0:
            # compute the distance between them and bind them
            for author_issa in doi_with_authors[str(doi)]:
                distances = []
                similar_author = ""
                for author_openalex, orcid_openalex in authors_from_openalex_with_orcid:
                    distance = get_similarity(author_issa, author_openalex)
                    distances.append(distance)
                    if distance <= min(distances):
                        similar_author = author_openalex
                print("The nearest author " + author_issa + " from ISSA is: " + similar_author + " in OpenAlex")
        else:
            print("Nothing to do ...")
        print("------------------------------------")


# get_authors_from_semantic_scholar_by_DOI("10.1684/agr.2012.0548")
# print(get_similarity("Toto tata", "Tutu tete"))
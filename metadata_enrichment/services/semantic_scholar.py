# Enrichissement des méta-données ISSA
# extraction des liens ORCID associés à chaques auteurs dans le graphe de connaissances
# Semantic Scholar API
# Auteur: Rémi FELIN
import requests
import json
from distance import get_similarity
from semanticscholar import SemanticScholar

semantic_scholar_endpoint = "https://api.semanticscholar.org/graph/v1/"
sch = SemanticScholar()

MODE = "SemanticScholar"


def get_authors_from_semantic_scholar_by_DOI(doi: str):
    authors = sch.get_paper(doi).authors
    results = []
    for author in authors:
        results.append((author["name"], author["url"]))
    return results


def main(doi_with_authors: dict, issa_uri_by_dois: dict):
    results = dict()
    print("Base utilisée pour l'enrichissement: " + semantic_scholar_endpoint)
    results["endpoint"] = semantic_scholar_endpoint
    # doi_with_authors: dict = get_DOI_with_authors_from_issa(limit=100)
    # Pour chaques articles, on va récupérer ses informations relatives sur les
    # différents endpoints disponibles
    results["articles"] = []
    print("------------------------------------")
    for doi in doi_with_authors.keys():
        article = dict()
        print("# DOI = " + doi)
        article["doi"] = str(doi)
        authors_from_semantic_scholar = get_authors_from_semantic_scholar_by_DOI(doi)
        authors_from_semantic_scholar_with_url = [(author, url) for author, url in authors_from_semantic_scholar if
                                                  url is not None]
        print("# " + str(len(authors_from_semantic_scholar_with_url)) + " authors have an URL !")
        article["authors_matched_rate"] = len(authors_from_semantic_scholar_with_url) / \
                                          len(authors_from_semantic_scholar)
        print(str(len(authors_from_semantic_scholar_with_url)) + " / " +
                                          str(len(authors_from_semantic_scholar)))
        article["authors"] = []
        if len(authors_from_semantic_scholar_with_url) != 0:
            # compute the distance between them and bind them
            for author_semantic_scholar, url_semantic_scholar in authors_from_semantic_scholar_with_url:
                author_dict = dict()
                distances = []
                similar_author = ""
                url = ""
                for author_issa in doi_with_authors[str(doi)]:
                    distance = get_similarity(author_semantic_scholar, author_issa)
                    distances.append(distance)
                    if distance <= min(distances):
                        similar_author = author_issa
                        url = url_semantic_scholar
                print("# The nearest author " + author_semantic_scholar + " from Semantic Scholar is: " + similar_author
                      + " in ISSA")
                author_dict["issa"] = similar_author
                author_dict["semanticScholar"] = author_semantic_scholar
                print("# Proposal RDF Triple (turtle): ")
                triple = "<" + issa_uri_by_dois[str(doi)] + "> <http://purl.org/dc/elements/1.1/creator> <" + url \
                         + "> ."
                print(triple)
                author_dict["triple"] = triple
                article["authors"] += [author_dict]
        else:
            print("Nothing to do ...")
        results["articles"] += [article]
        print("------------------------------------")
    return results

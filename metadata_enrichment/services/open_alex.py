# Enrichissement des méta-données ISSA
# extraction des liens ORCID associés à chaques auteurs dans le graphe de connaissances
# OpenAlex API
# Auteur: Rémi FELIN
import requests
from distance import get_similarity

openalex_endpoint = "https://api.openalex.org/"
MODE = "OpenAlex"


def get_authors_from_openalex_by_DOI(doi: str):
    query = requests.get(openalex_endpoint + "works/https://doi.org/" + doi)
    result = []
    for author in query.json()["authorships"]:
        result.append((author["author"]["display_name"], author["author"]["orcid"]))
    # print(result)
    return result


def main(doi_with_authors: dict, issa_uri_by_dois: dict):
    results = dict()
    print("Base utilisée pour l'enrichissement: " + openalex_endpoint)
    results["endpoint"] = openalex_endpoint
    # doi_with_authors: dict = get_DOI_with_authors_from_issa(limit=100)
    # Pour chaques articles, on va récupérer ses informations relatives sur les
    # différents endpoints disponibles
    results["articles"] = []
    print("------------------------------------")
    for doi in doi_with_authors.keys():
        article = dict()
        print("# DOI = " + doi)
        article["doi"] = str(doi)
        authors_from_openalex = get_authors_from_openalex_by_DOI(doi)
        authors_from_openalex_with_orcid = [(author, orcid) for author, orcid in authors_from_openalex if
                                            orcid is not None]
        print("# " + str(len(authors_from_openalex_with_orcid)) + " authors have an ORCID !")
        article["authors"] = []
        article["authors_matched_rate"] = len(authors_from_openalex_with_orcid) / \
                                          len(authors_from_openalex)
        if len(authors_from_openalex_with_orcid) != 0:
            # compute the distance between them and bind them
            for author_openalex, orcid_openalex in authors_from_openalex_with_orcid:
                author_dict = dict()
                distances = []
                similar_author = ""
                orcid = ""
                for author_issa in doi_with_authors[str(doi)]:
                    distance = get_similarity(author_openalex, author_issa)
                    distances.append(distance)
                    if distance <= min(distances):
                        similar_author = author_issa
                        orcid = orcid_openalex
                print("# The nearest author " + author_openalex + " from OpenAlex is: " + similar_author + " in ISSA")
                author_dict["issa"] = similar_author
                author_dict["openAlex"] = author_openalex
                print("# Proposal RDF Triple (turtle): ")
                triple = "<" + issa_uri_by_dois[str(doi)] + "> <http://purl.org/dc/elements/1.1/creator> <" + orcid \
                         + "> .\n<" + orcid + "> <http://www.w3.org/2000/01/rdf-schema#label> '" \
                         + similar_author + "' ."
                print(triple)
                author_dict["triple"] = triple
                article["authors"] += [author_dict]
        else:
            print("Nothing to do ...")
        results["articles"] += [article]
        print("------------------------------------")
    return results

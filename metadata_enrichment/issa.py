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
# statistic
from statistic import define_statistics_from_json_file, save_statistics

# set SPARQL service : ISSA endpoint
# issa_endpoint = "http://erebe-vm20.i3s.unice.fr:8890/sparql"
issa_endpoint = "https://data-issa.cirad.fr/sparql"
issa_sparql = SPARQLWrapper(issa_endpoint)


def get_articles(**kwargs):
    limit = kwargs.get("limit")
    offset = kwargs.get("offset")
    if limit is not None:
        if offset is not None:
            query = select(ISSA_PREFIX, "distinct ?article", "?article bibo:doi ?doi ."
                           , limit=limit, offset=offset)
        else:
            query = select(ISSA_PREFIX, "distinct ?article", "?article bibo:doi ?doi ."
                           , limit=limit)
    else:
        query = select(ISSA_PREFIX, "distinct ?article", "?article bibo:doi ?doi .")
    issa_sparql.setQuery(query)
    issa_sparql.setReturnFormat(JSON)
    res = []
    for result in json.load(issa_sparql.query().response)["results"]["bindings"]:
        res.append(result["article"]["value"])
    return res


def get_article_issa_from_DOI(doi: str):
    query = select(ISSA_PREFIX, "?article", "?article bibo:doi '{}'".format(doi))
    issa_sparql.setQuery(query)
    issa_sparql.setReturnFormat(JSON)
    return json.load(issa_sparql.query().response)["results"]["bindings"][0]["article"]["value"]


def get_DOI_with_authors_from_article(article):
    """Return a list of authors (as list of str) using ISSA SPARQL Endpoint
    Structure: {"doi_1": ["author_1", ..., "author_n"], ...}"""
    # values = "VALUES ?article { "
    # for article in articles:
    #     values += "<" + article + "> "
    # values += " }"
    query = select(ISSA_PREFIX, "distinct ?doi ?author", "<" + article + "> bibo:doi ?doi . <" + article +
                   "> dce:creator ?author . ")
    # print(query)
    issa_sparql.setQuery(query)
    issa_sparql.setReturnFormat(JSON)
    # res = json.load(issa_sparql.query().response)["results"]["bindings"]
    # print(res)
    # return res["doi"]["value"], res["author"]["value"]
    l = []
    # print(json.load(issa_sparql.query().response))
    for result in json.load(issa_sparql.query().response)["results"]["bindings"]:
        l.append((result["doi"]["value"], result["author"]["value"]))
    return l
    # for doi, author in lists:
    #     if str(doi) not in results.keys():
    #         results[str(doi)] = [author]
    #     else:
    #         results[str(doi)] += [author]
    # # print(results)
    # return results


def main(mode: str, limit: int):
    print("Alignement des auteurs pour {limit} articles du jeu de données ISSA: {endpoint}"
          .format(limit=limit, endpoint=issa_endpoint))
    articles = get_articles(limit=limit)
    dois = dict()
    for article in articles:
        doi_authors = get_DOI_with_authors_from_article(article)
        for doi, author in doi_authors:
            if str(doi) not in dois.keys():
                dois[str(doi)] = [author]
            else:
                dois[str(doi)] += [author]
    issa_uri_by_dois = dict()
    for doi in dois:
        issa_uri_by_dois[str(doi)] = get_article_issa_from_DOI(doi)
    # MODE POSSIBLE:
    if mode == open_alex.MODE:
        results = open_alex.main(dois, issa_uri_by_dois)
        # export dict in file
        save_results(results, "openalex_{}".format(limit))
        print("Done !")
    elif mode == semantic_scholar.MODE:
        results = semantic_scholar.main(dois, issa_uri_by_dois)
        # export dict in file
        save_results(results, "semanticscholar_{}".format(limit))
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
    # Statistics
    print("save statistics from experiments ...")
    with open("results/triples_{}.nt".format(service), mode="r") as fp:
        n_triples = len(fp.readlines())
    stats = define_statistics_from_json_file(results, n_triples)
    save_statistics(stats, "results/stats_{}.json".format(service))
    print("Results saved !")


if __name__ == '__main__':
    # main(open_alex.MODE, 100)
    main(semantic_scholar.MODE, 100)

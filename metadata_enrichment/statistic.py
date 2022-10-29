# Enrichissement des méta-données ISSA
# extraction des liens ORCID associés à chaques auteurs dans le graphe de connaissances
# Statistics from JSON files
# Auteur: Rémi FELIN
import json
from statistics import mean, stdev


def define_statistics_from_json_file(data: dict, n_triples: int):
    statistics = dict()
    list_n_author = []
    match_rate = []
    n_articles_without_authors = 0
    for article in data["articles"]:
        l = len(article["authors"])
        list_n_author.append(l)
        match_rate.append(article["authors_matched_rate"])
        if l == 0:
            n_articles_without_authors += 1
    # Le nombre d'articles
    len_list_n_author = len(list_n_author)
    # statistics["n_doi"] = len_list_n_author
    # Le nombre de triples à importer dans la base
    statistics["n_triples"] = n_triples
    # Le nombre d'articles pour lesquelles nous n'avons pu de correspondance
    statistics["articles_without_authors_rate"] = n_articles_without_authors / len_list_n_author
    # Le nombre d'auteurs total / moyenne nb auteurs par articles
    authors = dict()
    authors["n_authors"] = sum(list_n_author)
    authors["mean_n_authors"] = mean(list_n_author)
    authors["std_n_authors"] = stdev(list_n_author)
    authors["mean_matched_authors_rate"] = mean(match_rate)
    statistics["authors"] = [authors]
    # end
    return statistics


def save_statistics(statistic: dict, output):
    with open(output, mode="w", encoding="utf-8") as f:
        f.write(json.dumps(statistic, indent=2))
        f.close()

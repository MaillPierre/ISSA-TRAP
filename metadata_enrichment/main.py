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

# doi_and_authors_issa = get_DOI_with_authors_from_issa(limit=100)

# exemple réponse {'10.19182/remvt.9733': ['Bengoumi, Mohammed', 'Coxam, Véronique', 'Davicco, Marie Jeanne',
# 'El Khasmi, Mohammed', 'Faye, Bernard', 'Riad, Fouad', 'Safwate, Abdallah', 'Barlet, J.P.', 'Hidane, Kamel'],
# '10.37370/raizes.1999.v.173': ['Sabourin, Eric'], '10.1051/fruits:2008027': ['Chilin-Charles, Yolande', 'Chillet,
# Marc', 'De Lapeyre de Bellaire, Luc'], '10.1684/agr.2012.0548': ['Dussert, Stéphane', 'Joët, Thierry', 'Marraccini,
# Pierre', 'Pot, David', 'Pires Ferreira, Lucia'], '10.1684/agr.2013.0650': ['Breitler, Jean-Christophe', 'Courtois,
# Brigitte', 'Diévart, Anne', 'Gantet, Pascal', 'Guiderdoni, Emmanuel', 'Meynard, Donaldo', 'Mieulet, Delphine',
# 'Perin, Christophe', 'Petit, Julie', 'Sire, Christelle', 'Verdeil, Jean-Luc', 'Divol Malgoire, Fanchon'],
# '10.1590/S0100-67622014000200017': ['Belini, Ugo Leandro', 'Chaix, Gilles', 'Leménager, Nicolas', 'Thévenon,
# Marie-France', 'Tomazello Filho, Mario', 'Baudasse, Christine', 'Leite, Marta Karina'],
# '10.4000/economierurale.5813': ['Lemeilleur, Sylvaine', 'Allaire, Gilles'], '10.1186/s12862-022-01977-z': [
# 'Alignier, Audrey', 'Barkaoui, Karim', 'Sarthou, Jean-Pierre', 'Lauri, Pierre-Eric', 'Meziere, Delphine', 'Boinot,
# Sébastien'], '10.1080/26395916.2022.2043940': ['Colloff, Matthew J.', 'Locatelli, Bruno', 'Múnera-Roldán, Claudia',
# 'Wyborn, Carina'], '10.20870/productions-animales.2000.13.4.3784': ['Grimaud, Patrice', 'Doreau, Michel',
# 'Michalet Doreau, B.'], '10.19182/remvt.9734': ['Nasser, B.', 'El Kebbaj, M.S.', 'Wolff, R.L.'],
# '10.1590/S0103-49792010000100010': ['Sabourin, Eric'], '10.37370/raizes.2005.v24.244': ['Caron, Patrick',
# 'Sabourin, Eric', 'Tonneau, Jean-Philippe'], '10.1684/agr.2009.0370': ['Bricas, Nicolas', 'Daniel, Maud', 'Sirieix,
# Lucie'], '10.3917/eg.301.0013': ['Bousquet, François', 'Rouchier, Juliette', 'Bonnefoy, Jean-Luc'],
# '10.1016/j.ijid.2018.11.146': ['Binot, Aurélie', 'Khuntamoon, T.', 'Ruenghiran, C.', 'Thongyan, Suporn',
# 'Tulayakul, Phitsanu', 'Viriyarumpa, S.'], '10.1023/A:1001880030275': ['Dolezel, Jaroslav', 'Dolezelova, M.',
# 'Horry, Jean-Pierre', 'Swennen, R.', 'Valarik, M.'], '10.1029/96JD01621': ['Bégué, Agnès', 'Myneni, R.'],
# '10.1128/AEM.60.11.3974-3980.1994': ['Diem, Hoang Gia', 'Galiana, Antoine', 'Gnahoua, Guy-Modeste', 'Mallet,
# Bernard', 'Poitel, Mireille', 'Prin, Yves'], '10.1128/AEM.61.12.4343-4347.1995': ['Bossy, J.P.', 'De Barjac, H.',
# 'Drif, Latifa', 'Frutos, Roger', 'Itoua Apoyolo, C.', 'Leclant, François', 'Vassal, Jean-Michel'],
# '10.1007/BF00202672': ['Bon, Marie-Claude', 'Monteuuis, Olivier', 'Riccardi, F.'],
# '10.1128/AEM.61.6.2086-2092.1995': ['Adang, M.J.', 'Bosch, D.', 'Frutos, Roger', 'Luo, K.', 'Moar, William J.',
# 'Pusztai Carey, M.']}
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
                for author_openalex, orcid_openalex in authors_from_openalex_with_orcid:
                    if orcid_openalex is not None:
                        print("issa:" + author_issa + " / openalex:" + author_openalex + " -> distance = " + str(get_similarity(author_issa, author_openalex)))
        else:
            print("Nothing to do ...")
        print("------------------------------------")


# get_authors_from_semantic_scholar_by_DOI("10.1684/agr.2012.0548")
# print(get_similarity("Toto tata", "Tutu tete"))

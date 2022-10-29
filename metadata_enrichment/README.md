# ![ISSA TRAP !!!](./../ackbar.jpg)
# Metadata enrichment for authors
---
## Motivations

Le graphe de connaissances **ISSA** proposent une collection d'articles enrichis avec des métadonnées. Nous remarquons que les informations relatives aux auteurs sont caractériser par une chaîne de caractères tel que: `?article dce:creator "Dupont, Jean" .`
Cela limite les possibilités d'enrichissement des informations relatives aux auteurs et augmente la probabilité d'obtenir des doublons.

## Solution

Nous proposons ainsi l'exploration des services extérieurs suivants afin d'enrichir les informations relatives aux auteurs:

- Semantic Scholar https://www.semanticscholar.org/product/api
- OpenAlex https://docs.openalex.org/api

Parmis une sélection d'articles sur **ISSA**, nous faisons le lien entre les noms/prénoms des auteurs avec ceux des autres services. Ce rapprochement est possible à l'aide d'une fonction de calcul de distance entre deux chaînes de caractères (inspirée du calcul de la distance de Levenshtein).

Enfin, nous générons le(s) triple(s) associé(s) pour chaques auteurs de chaques articles afin d'enrichir le graphe de connaissances. Les résultats seront disposés comme suit:

- Un fichier `results_*.json`: résultats complets d'une exécution
- Un fichier `triples_*.nt`: les triplets RDF à importer dans le graphe de connaissances
- Un fichier `stats_*.json`: statistiques d'une exécution

## Pré-requis

Python 3.8: https://www.python.org/downloads/release/python-380/

## Installation

Depuis la racine de ce module:

1) `pip install -r requirements.txt`

## Utilisation



# Script pour l'extraction du graphe des citations des articles de ISSA

### Description

Dans ce script, un ensemble d'articles de ISSA sont extraits. Depuis ces articles, leurs citations sont extraites depuis Semantic Scholar et OpenAlex. Pour chacune de ces citations, on recherche si elle est aussi présente dans ISSA.

#### Installation:

`npm i`

#### Lancement:

`node script.js <limit>`

Example:
`node script.js 100`

`<limit>` est le nombre d'article de ISSA demandé.

### Problèmes
Actuellement, le script se heurte aux limites d'utilisation des apis de Semantic Scholar et Open Alex, respectivement 500 / 5 minutes et 100 / 5 secondes. Il est fortement déconseillé d'utiliser une limite au dessus de 300.

#### Sources testées:
- Semantic Scholar
- OpenALex
- DBLP
- CrossRef
- ORKG

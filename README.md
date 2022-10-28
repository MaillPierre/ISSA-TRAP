# ![ISSA TRAP !!!](./ackbar.jpg)

---

Endpoint ISSA: https://data-issa.cirad.fr/sparql

---

Idées:
- Script pour interrogation de DOI/ISSN vers ORKG: https://orkg.org/data
    - Trouver autres APIs
        - https://api.archives-ouvertes.fr/docs
            - Probablement deja fait
        - Semantic Scholar https://www.semanticscholar.org/product/api
        - OpenAlex ?
        - Wikify ?
        - DBLp https://dblp.org/faq/How+to+use+the+dblp+search+API.html
        - identifiant des auteurs français avec idref
- Préparer KNIME pour rechercher pattern/clusters dans les données
    - Regarder extraction de patterns
- Regarder correlation Geo/mot-clés
- Regarder correslation auteurs/co-auteurs
- Regarder NB citations/ Graphes de citations
- regarder recouvrement selon longueur de texte
- Relaxation de requêtes pour obtenir les descripteurs d'un article en édition
- Regarder pour visualiser polygones des pays et régions dans carte du monde
    - Regarder pour selectionner zone sur map pour restreindre recherche

- Lier/desambiguiser les auteurs et institutions
- Detection de boublons
- Utiliser ResarchGate (Sci-Hub) pour trouver PDF manquants ?
- Requetes par mot-clés qui utilise la hierarchie pour donner des résultats plus complets et avec des résultats ordonnés

---

Datasets:
- Microsoft Academic Knowledge Graph  https://makg.org/sparql ***
- Open Research Knowledge Graph https://orkg.org/data ***
- Linked Life Data http://linkedlifedata.com/sparql *
- AgroLD http://agrold.southgreen.fr/agrold/ *

Outils:
- Ecriture de requête: https://yasgui.triply.cc/
- Linked Open Vocabularies: https://lov.linkeddata.es/dataset/lov/
- Interrogation de n’importe quoi avec SPARQL: https://github.com/SPARQL-Anything/sparql.anything et http://localhost:3000/sparql,

---
Notes:
- ISSA est deja connecté à LDViz -> Il faut de la visualisation ciblée et optimisée
- Visualisation geographique deja faite
- Stats
    - 100 000 articles (12000 articles en texte complet)
    - 35000 auteurs
    - 3,65 milions de naled entities

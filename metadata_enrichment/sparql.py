# Enrichissement des méta-données ISSA
# SPARQL Query editor
# Auteur: Rémi FELIN

def select(prefix: str, to_select: str, body: str, **kwargs):
    limit = kwargs.get("limit")
    offset = kwargs.get("offset")
    # set SPARQL Query
    query = prefix + "SELECT {} WHERE {{ ".format(to_select) + body + " } "
    if limit is not None:
        query += "LIMIT {}".format(limit)
    if offset is not None:
        query += " OFFSET {}".format(offset)
    return query


# select("tutu", "tata")
# print(select("prefix\n", "?author", "?paper dce:author ?author", limit=10, offset=100))

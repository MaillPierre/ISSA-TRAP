# DIstance entre deux auteurs (sous forme de chaine de caractères)
# Auteur: Rémi FELIN
import Levenshtein


def get_similarity(author_a: str, author_b: str):
    """Compute similarity based on Levenshtein distance"""
    delimitor = " "
    sum_distance = 0
    for word_a in author_a.split(delimitor):
        for word_b in author_b.split():
            sum_distance += Levenshtein.distance(word_a, word_b)
    return sum_distance


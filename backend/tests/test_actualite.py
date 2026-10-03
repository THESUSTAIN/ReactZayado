"""Tests de la logique pure de l'Actualité (réglages, décision d'envoi, nettoyage, e-mail)."""
import os, sys
from datetime import datetime
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from actualite_ext import (corps_email, doit_envoyer, extraire_urls, lire_prefs, nettoyer, titre_cite, url_publique, veut_actu)


def loc(j, h, m=0):  # 2026-10-05 = lundi
    return datetime(2026, 10, 5 + j, h, m)


def test_prefs_par_defaut():
    p = lire_prefs({})
    assert p["rythme"] == "quotidien" and p["canaux"] == ["email", "push"] and p["nb"] == 3 and p["heure"] == "08:00"


def test_prefs_valeurs_invalides():
    p = lire_prefs({"actu_nb": 9, "actu_heure": "25:99", "actu_canaux": ["sms", "push"]})
    assert p["nb"] == 3 and p["heure"] == "08:00" and p["canaux"] == ["push"]


def test_rien_sans_rythme():
    assert doit_envoyer(lire_prefs({"actu_rythme": "jamais"}), loc(0, 9), False) == "rythme_non_choisi"


def test_envoi_quotidien_apres_heure():
    p = lire_prefs({"actu_rythme": "quotidien", "actu_heure": "08:00"})
    assert doit_envoyer(p, loc(0, 7, 59), False) == "trop_tot"
    assert doit_envoyer(p, loc(0, 8, 0), False) is None


def test_un_seul_envoi_par_jour():
    p = lire_prefs({"actu_rythme": "quotidien"})
    assert doit_envoyer(p, loc(0, 10), True) == "deja_envoye"


def test_jour_de_repos():
    p = lire_prefs({"actu_rythme": "quotidien", "jour_repos": 1})  # lundi (convention Paramètres : 1 = lundi)
    assert doit_envoyer(p, loc(0, 10), False) == "jour_de_repos"
    assert doit_envoyer(p, loc(1, 10), False) is None


def test_lundi_uniquement():
    p = lire_prefs({"actu_rythme": "lundi"})
    assert doit_envoyer(p, loc(0, 10), False) is None
    assert doit_envoyer(p, loc(2, 10), False) == "pas_lundi"


def test_aucun_canal():
    assert doit_envoyer(lire_prefs({"actu_rythme": "quotidien", "actu_canaux": []}), loc(0, 10), False) == "aucun_canal"


def test_nettoyer_html_et_coupe():
    assert nettoyer("<p>Bonjour&nbsp;<b>toi</b></p>") == "Bonjour toi"
    assert nettoyer("mot " * 100, 30).endswith("…") and len(nettoyer("mot " * 100, 30)) <= 31


def test_urls_et_titre():
    m = "Résume « La loi change » https://exemple.fr/a?b=1)."
    assert extraire_urls(m) == ["https://exemple.fr/a?b=1"] and titre_cite(m) == "La loi change"
    assert veut_actu("c'est quoi le plus intéressant ?") and not veut_actu("écris un devis")


def test_url_privee_refusee():
    assert not url_publique("http://127.0.0.1:8000/x") and not url_publique("file:///etc/passwd")


def test_email_echappe_html():
    h = corps_email("Zoé", [{"titre": "<script>x</script>", "description": "d"}], "https://zayado.net")
    assert "<script>" not in h and "tab=actu" in h


# ── Bref de l'actualité : des phrases COMPLÈTES, jamais coupées ──
from actualite_ext import bref_de_secours, extrait_utile, meta_description, phrases_completes, texte_brut


def test_texte_brut_ne_coupe_pas_et_gere_une_balise_tronquee():
    assert texte_brut('<a href="https://news.google.com/rss/articles/CBMi') == ""
    assert texte_brut("<p>Un  texte&nbsp;long</p>") == "Un texte long"


def test_phrases_completes_garde_des_phrases_entieres():
    t = "La loi change au 1er janvier. Les PME devront déclarer plus tôt. Un délai de grâce est prévu. Les syndicats réagissent. Cinquième phrase."
    r = phrases_completes(t, 320, 4)
    assert r.count(".") == 4 and r.endswith("réagissent.") and "Cinquième" not in r


def test_phrases_completes_abandonne_le_fragment_coupe():
    r = phrases_completes("Le gouvernement annonce une aide pour les artisans. Elle sera versée dès le mo", 320, 4)
    assert r == "Le gouvernement annonce une aide pour les artisans."


def test_phrases_completes_ne_termine_jamais_par_des_points_de_suspension():
    long = "mot " * 200
    r = phrases_completes(long, 100, 4)
    assert not r.endswith("…") and r.endswith(".") and len(r) <= 101


def test_extrait_utile_google_actualites_ne_donne_rien():
    # Google Actualités ne renvoie que le titre et le média : aucun vrai résumé
    titre = "Les PME face à la hausse des prix de l'énergie - Le Monde"
    resume = '<a href="https://news.google.com/rss/articles/CBMi123" target="_blank">Les PME face à la hausse des prix de l\'énergie</a>&nbsp;&nbsp;<font color="#6f6f6f">Le Monde</font>'
    assert extrait_utile(titre, resume) == ""


def test_extrait_utile_garde_un_vrai_resume():
    r = extrait_utile("Titre court", "Titre court Les entreprises de moins de dix salariés pourront reporter leur déclaration jusqu'au 30 juin.")
    assert r.startswith("Les entreprises")


def test_meta_description():
    page = '<html><head><meta property="og:description" content="Une description assez longue pour être utile aux lecteurs de l\'article."></head></html>'
    assert meta_description(page).startswith("Une description")
    assert meta_description('<meta property="og:description" content="Court">') == ""


def test_bref_de_secours_prefere_la_page_puis_le_flux_puis_le_titre():
    meta = "L'État prolonge le dispositif d'aide. Les demandes restent ouvertes jusqu'en mars."
    assert bref_de_secours("Aide prolongée", "", meta) == (meta, "page")
    t, o = bref_de_secours("Aide prolongée", "Aide prolongée Les demandes restent ouvertes jusqu'en mars pour toutes les entreprises concernées.")
    assert o == "flux" and t.endswith(".")
    t, o = bref_de_secours("Aide prolongée jusqu'en mars - Le Figaro", "")
    assert o == "titre" and t == "Aide prolongée jusqu'en mars." 

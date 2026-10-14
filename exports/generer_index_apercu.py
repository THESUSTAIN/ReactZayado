#!/usr/bin/env python3
"""Génère /app/frontend/public/apercu/index.html — inventaire visuel des pages publiques."""
from capturer_pages import APP_PAGES, SHOP_PAGES  # mêmes listes
from pathlib import Path

OUT = Path("/app/frontend/public/apercu")

COULEURS = {
    "APP — à garder": ("#047857", "Pages transactionnelles et compte : les boutons de la boutique mènent ici. À GARDER."),
    "APP — légal (Google)": ("#1D4ED8", "Exigées par Google OAuth et les redirections zayado.net/legal/*. À GARDER."),
    "APP — iframes boutique": ("#7C3AED", "Affichées DANS les pages de la boutique en iframe. À GARDER tant que la boutique les utilise."),
    "APP — DOUBLON ?": ("#B42318", "Seules pages vitrines restantes dans l'app. VOTRE DÉCISION : garder ou retirer."),
}


def carte(nom, chemin, cat, titre, note, base):
    img = f"{nom}.png"
    existe = (OUT / img).exists()
    visu = f'<a href="{img}" target="_blank"><img src="{img}" loading="lazy" alt="{titre}"></a>' if existe else "<div class='ko'>capture indisponible</div>"
    note_html = f"<p class='note'>{note}</p>" if note else ""
    return f"""<div class="carte">
      {visu}
      <div class="meta"><strong>{titre}</strong><code>{base}{chemin}</code>{note_html}</div>
    </div>"""


blocs = []
for cat, (couleur, explication) in COULEURS.items():
    cartes = "".join(carte(n, c, cat, t, note, "app.zayado.net") for n, c, ct, t, note in APP_PAGES if ct == cat)
    blocs.append(f"""<section>
      <h2><span class="pastille" style="background:{couleur}"></span>{cat}</h2>
      <p class="expl">{explication}</p>
      <div class="grille">{cartes}</div>
    </section>""")

shop_cartes = "".join(
    f"""<div class="carte">
      <a href="{n}.png" target="_blank"><img src="{n}.png" loading="lazy" alt="{t}"></a>
      <div class="meta"><strong>{t}</strong><code>zayado.net{c}</code></div>
    </div>"""
    for n, c, t in SHOP_PAGES)
blocs.append(f"""<section>
      <h2><span class="pastille" style="background:#0D1F38"></span>BOUTIQUE SHOPIFY — la vitrine vit ici (déjà en ligne)</h2>
      <p class="expl">Ces pages n'existent QUE sur Shopify : il n'y a aucun doublon dans l'app.</p>
      <div class="grille">{shop_cartes}</div>
    </section>""")

html = f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Inventaire des pages publiques — Zayado</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  body {{ font-family: Poppins, sans-serif; background: #FDFCF8; color: #0D1F38; margin: 0; padding: 32px 20px 80px; }}
  .conteneur {{ max-width: 1200px; margin: 0 auto; }}
  h1 {{ font-size: 28px; margin: 0 0 8px; }}
  .sous {{ color: #5b6b82; margin: 0 0 32px; }}
  h2 {{ font-size: 19px; margin: 40px 0 4px; display: flex; align-items: center; gap: 10px; }}
  .pastille {{ width: 14px; height: 14px; border-radius: 50%; display: inline-block; }}
  .expl {{ color: #5b6b82; font-size: 14px; margin: 0 0 16px; }}
  .grille {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }}
  .carte {{ background: #fff; border: 1px solid #E8E2D5; border-radius: 12px; overflow: hidden; }}
  .carte img {{ width: 100%; display: block; aspect-ratio: 1366/900; object-fit: cover; object-position: top; }}
  .meta {{ padding: 12px 14px; }}
  .meta strong {{ display: block; font-size: 15px; }}
  .meta code {{ display: block; font-size: 12px; color: #9A6A2A; margin: 4px 0; word-break: break-all; }}
  .note {{ font-size: 12.5px; color: #5b6b82; margin: 4px 0 0; }}
  .ko {{ padding: 40px; text-align: center; color: #B42318; font-size: 13px; }}
  .concl {{ background: #F4EFE6; border-left: 4px solid #D6A64F; padding: 14px 18px; border-radius: 8px; font-size: 14.5px; margin-top: 44px; }}
</style></head>
<body><div class="conteneur">
<h1>Inventaire complet des pages publiques</h1>
<p class="sous">Captures réelles du 14/10/2026 · app.zayado.net (preview) et zayado.net (boutique Shopify en ligne) · cliquez sur une capture pour l'agrandir</p>
{''.join(blocs)}
<div class="concl"><strong>Conclusion :</strong> il n'y a <u>aucun doublon vitrine</u> entre l'app et la boutique — les pages marketing n'existent que sur Shopify. Dans l'app ne restent que les tunnels de paiement, le compte, le légal (exigé par Google) et les iframes utilisées par la boutique. Seules <strong>/pricing</strong> et <strong>/partenaires/thesustain</strong> sont à trancher. Pages non capturées car elles exigent un lien personnel : /v/:token (partage de vision), /t/:slug (tunnel publié), /temoignage/:jeton, /embed/exercice/:slug, /pricing/success.</div>
</div></body></html>"""

(OUT / "index.html").write_text(html, encoding="utf-8")
print("index.html généré :", OUT / "index.html")

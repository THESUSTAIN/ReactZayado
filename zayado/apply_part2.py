#!/usr/bin/env python3
"""Applique la Partie 2 sur le projet Kairos DÉPLOYÉ (pas sur le zip d'origine).

Usage : à la racine du projet (là où sont backend/ et frontend/), après avoir copié
les fichiers du zip Partie 2 :   python apply_part2.py [racine]

Chaque fichier est patché « tout ou rien » : si UNE ancre manque (fichier différent
de celui du zip d'origine), il n'est pas touché et le script dit quoi ajouter à la main.
Idempotent : relancer ne double rien.
"""
import os
import sys

RACINE = sys.argv[1] if len(sys.argv) > 1 else "."

VERS_LOGIN = '''function _versLogin() {
  // 401 = session absente/expirée : on renvoie vers /login, mais seulement depuis l'app (pas la landing).
  const p = window.location.pathname;
  if (p.startsWith("/app") || p.startsWith("/onboarding") || p.startsWith("/parametres")) window.location.assign("/login");
}

'''

# (fichier, marqueur d'idempotence, [(mode, ancre, texte)])   mode : before | after | replace_all
PATCHS = [
    ("backend/server.py", "install_part2", [
        ("before", "app.include_router(api)",
         "# ── Partie 2 : auth obligatoire en prod, images IA, marketplace, Qonto ──\n"
         "from part2_ext import install_part2  # noqa: E402\n"
         "install_part2(globals())\n\n"),
    ]),
    ("frontend/src/App.js", "pages/Marketplace", [
        ("after", 'import Parametres from "@/pages/Parametres";\n', 'import Marketplace from "@/pages/Marketplace";\n'),
        ("before", '<Route path="/parametres" element={<Parametres />} />',
         '<Route path="/app/marketplace" element={<Marketplace />} />\n            '),
    ]),
    ("frontend/src/components/kairos/Sidebar.jsx", 'key: "market"', [
        ("replace_all", "CalendarCheck, Map, Bot,", "CalendarCheck, Map, Bot, Store,"),
        ("after", '{ key: "wellbeing", name: "Bien-être", Icon: Heart },\n',
         '  { key: "market", name: "Marketplace", Icon: Store },\n'),
        ("before", 'if (location.pathname === "/parametres") return "settings";',
         'if (location.pathname.startsWith("/app/marketplace")) return "market";\n    '),
        ("before", 'else if (key === "agents") navigate("/app/agents");',
         'else if (key === "market") navigate("/app/marketplace");\n    '),
    ]),
    ("frontend/src/components/vision/VisionCanvas.jsx", "AiImageRow", [
        ("after", 'import { BoardSwitcher } from "@/components/vision/BoardSwitcher";\n',
         'import { AiImageRow } from "@/components/vision/AiImageRow";\n'),
        ("before", '<p className="text-[9px] text-white/60">{t("vision.unsplash.orUrl")}</p>',
         '<AiImageRow onPick={(url) => editImage(card.id, url)} />\n                        '),
    ]),
    ("frontend/src/components/kairos/PoulsBusinessWidget.jsx", "PoulsQonto", [
        ("after", 'import { fetchPouls, savePouls } from "@/lib/kairosApi";\n',
         'import PoulsQonto from "@/components/kairos/PoulsQonto";\n'),
        ("before", '<button onClick={save} disabled={saving} data-testid="pouls-save"',
         '{form.source === "qonto" && (\n            <PoulsQonto onSynced={(d) => { setData(d); setForm((f) => ({ ...f, ca_mensuel: d.ca_mensuel, tresorerie: d.tresorerie, source: "qonto" })); }} />\n          )}\n          '),
    ]),
    ("frontend/src/lib/kairosApi.js", "_versLogin", [
        ("replace_all", "if (r.status === 401) setToken(null);", "if (r.status === 401) { setToken(null); _versLogin(); }"),
        ("before", "async function jget(path) {", VERS_LOGIN),
    ]),
]


def appliquer(fichier, marqueur, ops):
    chemin = os.path.join(RACINE, fichier)
    if not os.path.exists(chemin):
        return f"ABSENT     {fichier} — fichier introuvable, rien fait."
    src = open(chemin, encoding="utf-8").read()
    if marqueur in src:
        return f"DÉJÀ FAIT  {fichier}"
    for mode, ancre, _ in ops:
        if ancre not in src:
            return f"ANCRE MANQUANTE dans {fichier} : {ancre!r} — fichier non modifié (voir LISEZMOI-partie2.md, section « à la main »)."
        if mode in ("before", "after") and src.count(ancre) != 1:
            return f"ANCRE AMBIGUË dans {fichier} : {ancre!r} ({src.count(ancre)} occurrences) — fichier non modifié."
    for mode, ancre, texte in ops:
        if mode == "before":
            src = src.replace(ancre, texte + ancre, 1)
        elif mode == "after":
            src = src.replace(ancre, ancre + texte, 1)
        else:
            src = src.replace(ancre, texte)
    open(chemin, "w", encoding="utf-8").write(src)
    return f"PATCHÉ     {fichier}"


if __name__ == "__main__":
    bilan = [appliquer(*p) for p in PATCHS]
    print("\n".join(bilan))
    sys.exit(0 if all(l.startswith(("PATCHÉ", "DÉJÀ")) for l in bilan) else 1)

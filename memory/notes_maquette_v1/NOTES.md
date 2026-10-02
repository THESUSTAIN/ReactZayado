# Notes — Maquette v1 (vitrine Cockpit Zayado) remplacée par le vrai projet v12

Date: installation du vrai projet ReactZayado-complet-v12.

## Ce qui a été fait en v1 (maquette vitrine, frontend-only, données simulées)
- Page vitrine "Cockpit Zayado" thème sombre marine + doré (glassmorphism, Playfair Display + Inter, aurora).
- 6 tuiles cliquables (Aujourd'hui, Vision Bord & Action, Radar, Copilote IA, Bien-être, Pouls business) ouvrant un aperçu modal avec mini-dashboards simulés.
- Code source conservé dans ./frontend_src_maquette (pour inspiration design).

## Pourquoi remplacé
- L'utilisateur a fourni le vrai projet complet (v12) déjà déployé (React/CRACO + FastAPI + SQLite kairos.db).
- Demande: corriger erreurs de démarrage, refondre la page Admin (suivi users, rétention, sources d'acquisition, suppression users), réduire les verrous du plan 15€ (surtout mobile).

## Idées design réutilisables de la v1
- Palette: navy #0a1230/#0f1b3a, doré #DEC2A3/#F1E2CC, offwhite #F6F1E9.
- Aperçus modaux riches (rings de progression, barres, timeline) — utile pour l'admin dashboards.

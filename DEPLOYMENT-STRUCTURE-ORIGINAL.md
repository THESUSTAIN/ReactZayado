# Structure de déploiement conservée

Cette version repart de ReactZayado-main (6)(1).zip et conserve la structure backend/ + frontend/.
Le frontend Vite est compilé vers frontend/dist puis copié directement dans backend/static/.
FastAPI sert backend/static/index.html et ses assets ; le montage legacy /static n'est activé que si backend/static/static existe.
WhatsApp-service reste un service Railway séparé sous /WhatsApp-service.

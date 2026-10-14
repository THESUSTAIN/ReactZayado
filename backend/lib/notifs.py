"""Envoyer une notification (cloche + push) depuis les routeurs du Copilote, qui n'ont pas de session SQL.

Utilise `notifier` installé par notifications_ext dans le module server. Ne lève jamais d'erreur :
une notification ratée ne doit jamais faire échouer l'action de l'utilisateur.
"""
import logging
import sys

log = logging.getLogger("kairos.notifs")


async def notifier(user_id: str, kind: str, titre: str, corps: str = "", url: str = "/",
                   cle: str | None = None, push: bool = True, tag: str | None = None) -> bool:
    srv = sys.modules.get("server")
    f = getattr(srv, "notifier", None) if srv else None
    if not f or not user_id:
        return False
    try:
        async with srv.async_session() as s:
            await f(s, user_id, kind, titre, corps, url, tag=tag or kind, cle=(cle[:80] if cle else None), push=push)
        return True
    except Exception as e:  # noqa: BLE001
        log.warning("Notification non envoyée (%s) : %s", kind, e)
        return False

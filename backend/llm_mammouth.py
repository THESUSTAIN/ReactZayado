"""Client IA Mammouth AI (API compatible OpenAI).

Remplace emergentintegrations pour tout le texte (Copilote, Radar, SWOT,
Agent Business…). Même interface que l'ancien client, pour ne rien changer
aux appels existants :

    client = MammouthChat(cle, systeme)
    texte = await client.send_message(UserMessage(text="..."))
    async for ev in client.stream_message(UserMessage(text="...")):
        TextDelta(content) … puis StreamDone()

Variables d'environnement :
    MAMMOTH_API_KEY  (ou MAMMOUTH_API_KEY)  — obligatoire
    MAMMOTH_BASE_URL  défaut https://api.mammouth.ai/v1
    MAMMOTH_MODEL     défaut claude-sonnet-4-5
"""
import json
import os
from dataclasses import dataclass

import httpx

MAMMOTH_BASE_URL = os.environ.get("MAMMOTH_BASE_URL", "https://api.mammouth.ai/v1").rstrip("/")
MAMMOTH_MODEL = os.environ.get("MAMMOTH_MODEL", "claude-sonnet-4-5")


def cle_mammouth() -> str:
    return os.environ.get("MAMMOTH_API_KEY") or os.environ.get("MAMMOUTH_API_KEY") or ""


@dataclass
class UserMessage:
    text: str


@dataclass
class TextDelta:
    content: str


@dataclass
class StreamDone:
    pass


class MammouthErreur(RuntimeError):
    pass


class MammouthChat:
    def __init__(self, api_key: str, system_message: str = "", model: str = "", max_tokens: int = 4096):
        self.api_key = api_key
        self.system_message = system_message or ""
        self.model = model or MAMMOTH_MODEL
        self.max_tokens = max_tokens

    def _corps(self, message, stream: bool) -> dict:
        texte = message.text if hasattr(message, "text") else str(message)
        messages = []
        if self.system_message:
            messages.append({"role": "system", "content": self.system_message})
        messages.append({"role": "user", "content": texte})
        return {"model": self.model, "messages": messages, "max_tokens": self.max_tokens, "stream": stream}

    def _entetes(self) -> dict:
        return {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

    async def send_message(self, message) -> str:
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0)) as http:
            r = await http.post(f"{MAMMOTH_BASE_URL}/chat/completions", headers=self._entetes(),
                                json=self._corps(message, stream=False))
        if r.status_code != 200:
            raise MammouthErreur(f"Mammouth AI a répondu {r.status_code} : {r.text[:200]}")
        data = r.json()
        return (data.get("choices") or [{}])[0].get("message", {}).get("content", "") or ""

    async def stream_message(self, message):
        async with httpx.AsyncClient(timeout=httpx.Timeout(90.0, connect=10.0)) as http:
            async with http.stream("POST", f"{MAMMOTH_BASE_URL}/chat/completions", headers=self._entetes(),
                                   json=self._corps(message, stream=True)) as r:
                if r.status_code != 200:
                    corps = (await r.aread())[:200]
                    raise MammouthErreur(f"Mammouth AI a répondu {r.status_code} : {corps!r}")
                async for ligne in r.aiter_lines():
                    if not ligne.startswith("data: "):
                        continue
                    donnees = ligne[6:].strip()
                    if donnees == "[DONE]":
                        break
                    try:
                        morceau = json.loads(donnees)
                    except json.JSONDecodeError:
                        continue
                    contenu = (morceau.get("choices") or [{}])[0].get("delta", {}).get("content")
                    if contenu:
                        yield TextDelta(contenu)
        yield StreamDone()

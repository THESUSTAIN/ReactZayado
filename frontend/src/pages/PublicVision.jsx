import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, MessageSquare, X } from "lucide-react";
import { fetchPublicVision, fetchPublicCommentaires, posterCommentairePublic } from "@/lib/kairosApi";
import { VisionCanvas } from "@/components/vision/VisionCanvas";
import "@/components/vision/sf.css";

/**
 * Lien public en lecture seule d'un Vision Board (/v/:token).
 * Aucune modification possible ; finances / énergie masquées si le
 * propriétaire l'a choisi (filtré côté serveur, pas seulement à l'affichage).
 * Le visiteur peut laisser un commentaire (le propriétaire est notifié).
 */
export default function PublicVision() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [comms, setComms] = useState([]);
  const [commOpen, setCommOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [message, setMessage] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [merci, setMerci] = useState(false);

  useEffect(() => {
    fetchPublicVision(token).then(setData).catch(() => setError(true));
    fetchPublicCommentaires(token).then((d) => setComms(d.commentaires || [])).catch(() => {});
  }, [token]);

  useEffect(() => {
    const prenom = data?.live?.state?.profile?.prenom;
    document.title = prenom ? `Vision Board de ${prenom} · Zayado` : "Vision Board · Zayado";
  }, [data]);

  const envoyer = async () => {
    if (!message.trim() || envoi) return;
    setEnvoi(true);
    try {
      const c = await posterCommentairePublic(token, nom.trim(), message.trim());
      setComms((prev) => [...prev, c]);
      setMessage("");
      setMerci(true);
      setTimeout(() => setMerci(false), 4000);
    } catch {
      alert("Le commentaire n'a pas pu être envoyé. Réessaie dans un instant.");
    } finally {
      setEnvoi(false);
    }
  };

  if (error) {
    return (
      <div className="sf flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="sf-title" style={{ fontSize: 20 }}>Ce lien n'est plus actif</p>
          <p className="sf-small mt-2">Il a peut-être été désactivé par son propriétaire.</p>
          <a href="/" className="sf-btn sf-btn-primary mt-5 inline-flex h-10">Découvrir Zayado</a>
        </div>
      </div>
    );
  }
  if (!data) {
    return <div className="sf flex min-h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  const prenom = data.live?.state?.profile?.prenom;
  return (
    <div className="sf flex h-[100dvh] flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b px-4 py-3 sm:px-6" style={{ borderColor: "var(--sf-line)", background: "var(--sf-chrome)" }}>
        <img src="/logo.png" alt="Zayado" className="h-8 w-8 shrink-0 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="sf-title truncate">{prenom ? `Vision Board de ${prenom}` : "Vision Board"}</p>
          <p className="sf-small" style={{ fontSize: 12.5 }}>
            Lecture seule · données à jour à l'ouverture
            {data.masque?.finances ? " · finances masquées" : ""}{data.masque?.energie ? " · énergie masquée" : ""}
          </p>
        </div>
        <button
          onClick={() => setCommOpen(true)}
          className="sf-btn sf-btn-outline inline-flex h-9 items-center gap-1.5"
          data-testid="public-comments-open"
        >
          <MessageSquare size={15} />
          <span className="hidden sm:inline">Commentaires</span>{comms.length > 0 ? ` (${comms.length})` : ""}
        </button>
        <a href="/" className="sf-btn sf-btn-outline hidden h-9 sm:inline-flex">Créé avec Zayado</a>
      </header>
      <div className="min-h-0 flex-1">
        <VisionCanvas readOnly initialItems={data.cards} liveData={data.live} />
      </div>

      {commOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => setCommOpen(false)}
          data-testid="public-comments-modal"
        >
          <div
            className="sf-chrome flex max-h-[85dvh] w-full flex-col rounded-t-2xl border p-4 sm:max-w-md sm:rounded-2xl"
            style={{ borderColor: "var(--sf-chrome-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="sf-title" style={{ fontSize: 16 }}>Commentaires</p>
              <button className="sf-btn" onClick={() => setCommOpen(false)} data-testid="public-comments-close" aria-label="Fermer"><X size={15} /></button>
            </div>

            <div className="mt-3 min-h-[80px] flex-1 space-y-2 overflow-y-auto" data-testid="public-comments-list">
              {comms.length === 0 && (
                <p className="sf-small py-6 text-center">Aucun commentaire pour le moment. Sois la première personne à réagir à ce board !</p>
              )}
              {comms.map((c) => (
                <div key={c.id} className="rounded-xl border p-3" style={{ borderColor: "var(--sf-line)", background: "var(--sf-card)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-semibold" style={{ color: "var(--sf-text)" }}>{c.auteur}</span>
                    <span className="text-[10.5px]" style={{ color: "var(--sf-muted)" }}>
                      {c.date ? new Date(c.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed" style={{ color: "var(--sf-text-2)" }}>{c.texte}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--sf-line)" }}>
              {merci && <p className="mb-2 text-[12.5px] font-semibold" style={{ color: "var(--sf-accent)" }} data-testid="public-comment-merci">Merci ! Ton commentaire est visible par le propriétaire du board.</p>}
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ton prénom (facultatif)"
                maxLength={80}
                className="sf-input mb-2 w-full rounded-lg px-3 py-2 text-[13px]"
                data-testid="public-comment-name"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ton commentaire sur ce board…"
                rows={3}
                maxLength={1000}
                className="sf-input w-full rounded-lg px-3 py-2 text-[13px]"
                data-testid="public-comment-text"
              />
              <button
                onClick={envoyer}
                disabled={!message.trim() || envoi}
                className="sf-btn sf-btn-primary mt-2 inline-flex h-10 w-full items-center justify-center gap-2"
                data-testid="public-comment-submit"
              >
                {envoi ? <Loader2 size={15} className="animate-spin" /> : <MessageSquare size={15} />}
                Envoyer mon commentaire
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

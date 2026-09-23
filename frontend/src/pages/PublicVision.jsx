import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { fetchPublicVision } from "@/lib/kairosApi";
import { VisionCanvas } from "@/components/vision/VisionCanvas";
import "@/components/vision/sf.css";

/**
 * Lien public en lecture seule d'un Vision Board (/v/:token).
 * Aucune modification possible ; finances / énergie masquées si le
 * propriétaire l'a choisi (filtré côté serveur, pas seulement à l'affichage).
 */
export default function PublicVision() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchPublicVision(token).then(setData).catch(() => setError(true));
  }, [token]);

  useEffect(() => {
    const prenom = data?.live?.state?.profile?.prenom;
    document.title = prenom ? `Vision Board de ${prenom} · Zayado` : "Vision Board · Zayado";
  }, [data]);

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
        <a href="/" className="sf-btn sf-btn-outline hidden h-9 sm:inline-flex">Créé avec Zayado</a>
      </header>
      <div className="min-h-0 flex-1">
        <VisionCanvas readOnly initialItems={data.cards} liveData={data.live} />
      </div>
    </div>
  );
}

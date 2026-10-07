import { toast } from "sonner";
import { ESSAI } from "@/lib/plans";

// Démarre un paiement Mollie et redirige. Pour Solo, l'essai « 1 mois pour 1 € »
// est tenté d'abord ; s'il a déjà été utilisé (409), on bascule sur l'offre normale.
export async function lancerPaiement(plan, { cycle = "mensuel", essai = ESSAI.plans.includes(plan) } = {}) {
  const appel = async (corps) => {
    const r = await fetch(`${process.env.REACT_APP_BACKEND_URL || ""}/api/checkout`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps),
    });
    return { r, j: await r.json().catch(() => ({})) };
  };
  try {
    if (plan === "reveur" && essai) {
      // Rêveur : 1 mois offert, sans carte. Déjà utilisé (409) → paiement normal de Rêveur.
      const r0 = await fetch(`${process.env.REACT_APP_BACKEND_URL || ""}/api/essai-reveur`, { method: "POST", headers: { "Content-Type": "application/json" } });
      if (r0.ok) { toast.success("Rêveur est à toi pour 1 mois, offert."); window.location.href = "/app"; return true; }
      if (r0.status !== 409) { const j0 = await r0.json().catch(() => ({})); toast.error(j0.detail || "L'essai n'a pas pu démarrer."); return false; }
      essai = false;
    }
    let { r, j } = essai ? await appel({ plan, essai: true }) : await appel({ plan, cycle });
    if (essai && r.status === 409) ({ r, j } = await appel({ plan, cycle }));
    if (r.ok && j.checkoutUrl) { window.location.href = j.checkoutUrl; return true; }
    toast.error(j.detail || "Le paiement n'a pas pu démarrer. Réessaie dans un instant.");
  } catch { toast.error("Paiement indisponible pour le moment."); }
  return false;
}

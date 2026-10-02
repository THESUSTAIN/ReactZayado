import { jsPDF } from "jspdf";
import { PLANS_GRILLE, PLAN_ENTREPRISE } from "@/lib/plans";

const NAVY = [11, 15, 25];
const GOLD = [179, 138, 78];
const GREY = [90, 95, 110];

// Génère et télécharge un PDF récapitulatif des offres Zayado (100% navigateur).
export function telechargerOffresPdf() {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;
  let y = 0;

  // En-tête
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Zayado", M, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(222, 194, 163);
  doc.text("Les offres — Cockpit IA pour entrepreneurs et porteurs de projet", M, 24);
  doc.setFontSize(8);
  doc.setTextColor(200, 205, 215);
  doc.text(`Édité le ${new Date().toLocaleDateString("fr-FR")}`, M, 30);
  y = 44;

  const plans = [...PLANS_GRILLE, PLAN_ENTREPRISE];

  plans.forEach((p) => {
    const prix = p.devis ? "Sur devis" : p.mensuel === 0 ? "—" : `${p.mensuel} €/mois`;
    const points = p.points || [];
    const blocH = 20 + points.length * 5.4 + 6;
    if (y + blocH > H - 16) { doc.addPage(); y = 18; }

    // Carte
    doc.setDrawColor(225, 227, 232);
    doc.setFillColor(250, 249, 247);
    doc.roundedRect(M, y, W - 2 * M, blocH, 3, 3, "FD");

    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(p.nom + (p.star ? "  ★" : ""), M + 6, y + 10);

    doc.setTextColor(...GOLD);
    doc.setFontSize(13);
    doc.text(prix, W - M - 6, y + 10, { align: "right" });

    if (p.annuel && p.annuel > 0 && !p.devis) {
      doc.setTextColor(...GREY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`ou ${Math.round(p.annuel / 12)} €/mois en annuel`, W - M - 6, y + 15, { align: "right" });
    }

    doc.setTextColor(...GREY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    if (p.pourQui) doc.text(p.pourQui, M + 6, y + 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(40, 44, 55);
    let ly = y + 22;
    points.forEach((pt) => {
      doc.setTextColor(...GOLD);
      doc.text("•", M + 6, ly);
      doc.setTextColor(40, 44, 55);
      const lines = doc.splitTextToSize(pt, W - 2 * M - 16);
      doc.text(lines, M + 10, ly);
      ly += lines.length * 5.4;
    });

    y += blocH + 6;
  });

  // Pied de page
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  doc.text("Prix indicatifs. Essai Solo 1 mois pour 1 €. zayado.net", M, H - 10);

  doc.save("Zayado-offres.pdf");
}

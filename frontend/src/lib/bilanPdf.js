import { jsPDF } from "jspdf";

const NAVY = [11, 15, 25];
const GOLD = [179, 138, 78];
const GREY = [90, 95, 110];
const ROUGE = [185, 82, 78];

const moy = (a) => { const v = a.filter((x) => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
const fmt = (n) => (n == null ? "—" : `${(Math.round(n * 10) / 10).toString().replace(".", ",")}/5`);

// Bilan Bien-être en PDF (100 % navigateur) : uniquement les mesures réelles de l'utilisateur.
export function telechargerBilanPdf({ prenom = "", jours30 = [], taches = null, serie = null, verdict = null }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 16;
  doc.setFillColor(...NAVY); doc.rect(0, 0, W, 34, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.text("Zayado", M, 16);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(222, 194, 163);
  doc.text("Mon bilan Bien-être · 30 derniers jours", M, 24);
  doc.setFontSize(8); doc.setTextColor(200, 205, 215);
  doc.text(`Édité le ${new Date().toLocaleDateString("fr-FR")}${prenom ? ` · ${prenom}` : ""} · document privé`, M, 30);

  let y = 46;
  const titre = (t) => { doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text(t.toUpperCase(), M, y); y += 6; };
  const ligne = (t, gras = false) => { doc.setTextColor(...NAVY); doc.setFont("helvetica", gras ? "bold" : "normal"); doc.setFontSize(11); doc.text(t, M, y); y += 6; };

  const e = jours30.map((j) => j.energie), s = jours30.map((j) => j.stress), c = jours30.map((j) => j.clarte);
  const mesures = jours30.filter((j) => j.energie != null).length;
  titre("En chiffres");
  ligne(`Jours mesurés : ${mesures} sur 30`);
  ligne(`Énergie moyenne : ${fmt(moy(e))}`);
  ligne(`Stress moyen : ${fmt(moy(s))}`);
  ligne(`Clarté mentale moyenne : ${fmt(moy(c))}`);
  if (serie?.jours > 0) ligne(`Série en cours : ${serie.jours} jour${serie.jours > 1 ? "s" : ""}${serie.record > serie.jours ? ` (record ${serie.record})` : ""}`);
  if (taches) ligne(`Plan d'action : ${taches.faites} faites · ${taches.en_cours} en cours · ${taches.a_faire} à faire`);
  y += 4;

  // Courbe énergie (bleu) et stress (rouge), échelle 1–5.
  titre("Énergie et stress");
  const gx = M, gy = y, gw = W - 2 * M, gh = 56;
  doc.setDrawColor(220, 222, 228); doc.setLineWidth(0.2);
  for (let v = 1; v <= 5; v++) {
    const yy = gy + gh - ((v - 1) / 4) * gh;
    doc.line(gx, yy, gx + gw, yy);
    doc.setFontSize(7); doc.setTextColor(...GREY); doc.text(String(v), gx - 4, yy + 1);
  }
  const trace = (serieVals, couleur, tiret) => {
    doc.setDrawColor(...couleur); doc.setLineWidth(0.6);
    if (tiret) doc.setLineDashPattern([1.2, 1.2], 0); else doc.setLineDashPattern([], 0);
    let prec = null;
    serieVals.forEach((v, i) => {
      if (v == null) { prec = null; return; }
      const px = gx + (i / Math.max(serieVals.length - 1, 1)) * gw;
      const py = gy + gh - ((v - 1) / 4) * gh;
      if (prec) doc.line(prec[0], prec[1], px, py);
      doc.setFillColor(...couleur); doc.circle(px, py, 0.6, "F");
      prec = [px, py];
    });
    doc.setLineDashPattern([], 0);
  };
  trace(e, NAVY, false); trace(s, ROUGE, true);
  y = gy + gh + 6;
  doc.setFontSize(8); doc.setTextColor(...GREY);
  doc.text("Trait plein : énergie · pointillé : stress · les jours sans mesure restent vides.", M, y); y += 10;

  if (verdict) {
    titre("Verdict du jour");
    ligne(`Charge suggérée : ${verdict.charge}`, true);
    verdict.conseils.forEach((t) => ligne(`· ${t}`));
    y += 4;
  }

  titre("Mon bilan de la semaine (à compléter)");
  ["Qu'est-ce qui a vraiment compté cette semaine ?", "Une décision dont je suis fier·ère ?", "Ce que j'aurais dû dire « non » ?", "Mon énergie moyenne sur 10 ?", "Mon intention pour la semaine prochaine ?"].forEach((q) => {
    doc.setTextColor(...NAVY); doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(q, M, y); y += 7;
    doc.setDrawColor(200, 204, 212); doc.setLineWidth(0.2); doc.line(M, y, W - M, y); y += 7;
  });

  doc.setFontSize(8); doc.setTextColor(...GREY);
  doc.text("Ce bilan reste privé : il n'est partagé avec personne.", M, 287);
  doc.save(`zayado-bilan-bien-etre-${new Date().toISOString().slice(0, 10)}.pdf`);
}

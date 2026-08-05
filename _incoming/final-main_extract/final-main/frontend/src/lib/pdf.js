import { jsPDF } from "jspdf";

// Bilan trimestriel bien-être — PDF navy/or simple
export function generateQuarterlyPdf(r) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const navy = [10, 20, 44];
  const gold = [201, 164, 73];

  // Bandeau
  doc.setFillColor(...navy);
  doc.rect(0, 0, W, 120, "F");
  doc.setTextColor(...gold);
  doc.setFontSize(10);
  doc.text("BILAN TRIMESTRIEL · BIEN-ÊTRE", 40, 48);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.text("90 jours de toi", 40, 82);
  doc.setFontSize(11);
  doc.setTextColor(210, 210, 210);
  doc.text(r.period || "", 40, 104);

  let y = 160;
  doc.setTextColor(...navy);
  doc.setFontSize(14);
  doc.text("Synthèse", 40, y);
  y += 26;
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  const lines = [
    `Jours suivis : ${r.days_tracked}`,
    `Score moyen : ${r.avg_score}/100`,
    `Meilleur jour : ${r.best_day?.date} (${r.best_day?.score}/100)`,
    `Jour le plus dur : ${r.hardest_day?.date} (${r.hardest_day?.score}/100)`,
    `Signal burnout : ${r.burnout?.risk} (${r.burnout?.level}/100)`,
  ];
  lines.forEach((l) => { doc.text(l, 40, y); y += 20; });

  y += 12;
  doc.setDrawColor(...gold);
  doc.setLineWidth(1);
  doc.line(40, y, W - 40, y);
  y += 26;

  doc.setFontSize(13);
  doc.setTextColor(...navy);
  doc.text("Verdict du co-pilote", 40, y);
  y += 22;
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(doc.splitTextToSize(r.verdict || "", W - 80), 40, y);

  // Courbe simple des scores
  const series = (r.series || []).slice(-30);
  if (series.length > 1) {
    const cy = 640, ch = 120, cx = 40, cw = W - 80;
    doc.setFontSize(12);
    doc.setTextColor(...navy);
    doc.text("Évolution du score", cx, cy - 16);
    doc.setDrawColor(220, 220, 220);
    doc.rect(cx, cy, cw, ch);
    doc.setDrawColor(...gold);
    doc.setLineWidth(1.5);
    const max = 100;
    series.forEach((p, i) => {
      if (i === 0) return;
      const x1 = cx + ((i - 1) / (series.length - 1)) * cw;
      const y1 = cy + ch - (series[i - 1].score / max) * ch;
      const x2 = cx + (i / (series.length - 1)) * cw;
      const y2 = cy + ch - (p.score / max) * ch;
      doc.line(x1, y1, x2, y2);
    });
  }

  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text("Généré par MyExtension AI · privé, jamais partagé.", 40, 800);
  return doc;
}

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, RotateCcw } from "lucide-react";
import { simulerReprise, simulerReprisePublique } from "@/zy/lib/kairosApi";

/**
 * « Testez votre projet » : formulaire en 3 étapes → analyse point par point → résultat.
 * Le calcul est fait par le serveur, sans IA ; chaque ligne de l'animation affiche un vrai résultat.
 * Charte : beige clair sur bleu, titres sans gras, vouvoiement, « Aucun financement n'est garanti ».
 *
 * props : publique (sans compte), board (tableau du Vision Board), initial (résultat déjà calculé),
 *         compact (tiroir du Vision Board), onResultat(r), suite(r) (bloc « la suite » sous le résultat).
 */
export const ACCENT = "#EADFC0";
export const eur = (n) => (n === null || n === undefined || Number.isNaN(Number(n)) ? "—"
  : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n));
const fois = (n) => (n === null || n === undefined ? "—" : `${String(n).replace(".", ",")} ×`);
const pct = (n) => (n === null || n === undefined ? "—" : `${String(n).replace(".", ",")} %`);

const ETAPES = [
  { titre: "L'entreprise que vous visez", aide: "Le prix demandé suffit pour commencer ; le reste affine le calcul.",
    champs: [["prix_demande", "Prix demandé par le vendeur", true], ["chiffre_affaires", "Chiffre d'affaires annuel"],
      ["tresorerie", "Trésorerie de l'entreprise"], ["dettes_financieres", "Dettes financières de l'entreprise"]] },
  { titre: "Que disent ses 3 derniers bilans ?", aide: "Les montants figurent dans les comptes transmis par le vendeur. Une estimation suffit pour commencer.",
    champs: [["ebe_moyen_3ans", "EBE moyen sur 3 ans", true], ["remuneration_dirigeant", "Rémunération actuelle du dirigeant, charges comprises"],
      ["amortissements", "Dotations aux amortissements"]] },
  { titre: "Votre projet", aide: "Ces réponses servent au montage et aux opportunités après la reprise.",
    champs: [["remuneration_repreneur", "Votre future rémunération, charges comprises"], ["credit_vendeur_pct", "Crédit vendeur envisagé (% du prix)"],
      ["pret_honneur", "Prêt d'honneur envisagé (facultatif)"], ["delai_clients_jours", "Délai de paiement des clients (jours)"],
      ["prix_revus_depuis_ans", "Prix revus il y a combien d'années ?"]] },
];

const LIGNES = [
  ["Retraitement de l'EBE avec votre rémunération", (r) => eur(r.ebe_retraite)],
  ["Prix comparé à l'EBE et au résultat net", (r) => `${fois(r.multiple_ebe)} · ${fois(r.multiple_resultat_net)}`],
  ["Impôt sur les sociétés calculé", () => "15 % puis 25 %"],
  ["Montage sans apport : vendeur, prêt d'honneur, banque si utile", (r) => eur(r.montage?.total)],
  ["Poids des échéances sur l'EBE retraité", (r) => pct(r.ratio_echeances_ebe)],
  ["Points forts, risques et opportunités", (r) => `${(r.points_forts || []).length + (r.risques || []).length + (r.opportunites || []).length} repérés`],
];

const champCls = "w-full rounded-xl border border-white/15 bg-white/[0.07] px-4 py-3 text-[16px] text-offwhite outline-none placeholder:text-offwhite/35 focus:border-[#EADFC0]";

export function SimulationReprise({ publique = false, board = "", initial = null, compact = false, onResultat, suite }) {
  const [f, setF] = useState(() => ({ credit_vendeur_pct: 30, credit_vendeur_annees: 3, taux_bancaire_pct: 4.5, duree_banque_annees: 7, ...(initial?.entree || {}) }));
  const [vue, setVue] = useState(initial ? "resultat" : 0);       // 0, 1, 2 = étapes ; "analyse" ; "resultat"
  const [res, setRes] = useState(initial);
  const [coche, setCoche] = useState(0);
  const attente = useRef(null);

  useEffect(() => { if (initial) { setRes(initial); setVue("resultat"); } }, [initial]);

  // Animation : une ligne toutes les ~1,1 s, jamais plus vite que la réponse du serveur.
  useEffect(() => {
    if (vue !== "analyse") return undefined;
    if (coche >= LIGNES.length) {
      const t = setTimeout(() => { setVue("resultat"); onResultat?.(res); }, 650);
      return () => clearTimeout(t);
    }
    if (!res) return undefined;
    const t = setTimeout(() => setCoche((c) => c + 1), 1100);
    return () => clearTimeout(t);
  }, [vue, coche, res]); // eslint-disable-line react-hooks/exhaustive-deps

  const num = (k) => (f[k] === "" || f[k] === undefined || f[k] === null ? undefined : Number(f[k]));
  const suivant = (e) => {
    e.preventDefault();
    const etape = ETAPES[vue];
    const manquant = etape.champs.find(([k, , requis]) => requis && !(num(k) > 0 || (k === "ebe_moyen_3ans" && num(k) !== undefined)));
    if (manquant) { toast.error(`Indiquez : ${manquant[1].toLowerCase()}.`); return; }
    if (vue < 2) { setVue(vue + 1); return; }
    lancer();
  };

  const lancer = async () => {
    const corps = {};
    ["credit_vendeur_annees", "taux_bancaire_pct", "duree_banque_annees", ...ETAPES.flatMap((e) => e.champs.map(([k]) => k))]
      .forEach((k) => { if (num(k) !== undefined) corps[k] = num(k); });
    if (f.a_marketing === true || f.a_marketing === false) corps.a_marketing = f.a_marketing;
    setRes(null); setCoche(0); setVue("analyse");
    try {
      attente.current = publique ? simulerReprisePublique(corps) : simulerReprise(corps, board);
      const r = await attente.current;
      setRes({ ...r, entree: corps });
    } catch (err) {
      toast.error(typeof err.detail === "string" ? err.detail : "Le calcul n'a pas abouti. Vérifiez les montants saisis.");
      setVue(2);
    }
  };

  // ───────── Formulaire en 3 étapes ─────────
  if (typeof vue === "number") {
    const etape = ETAPES[vue];
    return (
      <form onSubmit={suivant} className={compact ? "" : "mx-auto max-w-xl"} data-testid="sim-formulaire">
        <div className="mb-1.5 flex gap-1.5">{ETAPES.map((_, i) => <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i <= vue ? ACCENT : "rgba(255,255,255,.12)" }} />)}</div>
        <p className="mb-4 text-[12.5px] text-offwhite/60">Étape {vue + 1} sur 3</p>
        <h2 className={`${compact ? "text-[19px]" : "text-[24px]"} font-normal leading-snug`}>{etape.titre}</h2>
        <p className="mb-4 mt-1 text-[13.5px] text-offwhite/65">{etape.aide}</p>
        {etape.champs.map(([k, label]) => (
          <label key={k} className="mb-3 block text-[12.5px] text-offwhite/70">{label}
            <input type="number" inputMode="decimal" className={`${champCls} mt-1`} value={f[k] ?? ""}
              placeholder={k.endsWith("_pct") ? "%" : k.endsWith("_jours") ? "jours" : k.endsWith("_ans") ? "années" : "€"}
              onChange={(e) => setF({ ...f, [k]: e.target.value })} data-testid={`sim-${k}`} />
          </label>
        ))}
        {vue === 2 ? (
          <div className="mb-3 text-[12.5px] text-offwhite/70">L'entreprise a-t-elle un site ou fait-elle du marketing&nbsp;?
            <div className="mt-1.5 flex gap-2">
              {[["Oui", true], ["Non", false]].map(([l, v]) => (
                <button type="button" key={l} onClick={() => setF({ ...f, a_marketing: v })}
                  className={`rounded-full border px-4 py-1.5 text-[13px] ${f.a_marketing === v ? "border-[#EADFC0] bg-[#EADFC0]/15" : "border-white/15"}`}>{l}</button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-5 flex items-center justify-between">
          {vue > 0 ? <button type="button" onClick={() => setVue(vue - 1)} className="inline-flex items-center gap-1.5 text-[14px] text-offwhite/70"><ArrowLeft size={15} /> Retour</button> : <span />}
          <button type="submit" className="rounded-full bg-[#FAF7F1] px-6 py-3 text-[14.5px] font-medium text-[#1A2B57]" data-testid="sim-suivant">
            {vue < 2 ? "Continuer" : "Analyser mon projet"}
          </button>
        </div>
      </form>
    );
  }

  // ───────── Analyse point par point ─────────
  if (vue === "analyse") {
    return (
      <div className={compact ? "" : "mx-auto max-w-xl"} data-testid="sim-analyse">
        <h2 className={`${compact ? "text-[19px]" : "text-[24px]"} font-normal`}>Nous analysons votre projet…</h2>
        <p className="mb-4 mt-1 text-[13.5px] text-offwhite/65">Chaque ligne correspond à un vrai calcul fait sur vos chiffres.</p>
        {LIGNES.map(([texte, valeur], i) => {
          const fait = i < coche, enCours = i === coche;
          return (
            <div key={texte} className={`flex items-center gap-3 border-b border-white/[0.08] py-3 text-[14.5px] ${!fait && !enCours ? "text-offwhite/40" : ""}`}>
              <span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full"
                style={fait ? { background: "#8FCFA8", color: "#0B1A3D" } : { border: "1px solid rgba(255,255,255,.2)" }}>
                {fait ? <Check size={13} /> : enCours ? <Loader2 size={13} className="animate-spin" style={{ color: ACCENT }} /> : null}
              </span>
              <span className="flex-1">{texte}</span>
              {fait && res ? <span className="whitespace-nowrap text-[12.5px] text-offwhite/65">{valeur(res)}</span> : null}
            </div>
          );
        })}
      </div>
    );
  }

  // ───────── Résultat ─────────
  const r = res || {};
  const ratio = r.ratio_echeances_ebe;
  return (
    <div data-testid="sim-resultat">
      <div className={compact ? "" : "rounded-3xl border border-white/10 bg-white/[0.04] p-5"}>
        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: ACCENT }}>Votre rapport · indicatif</p>
        <h2 className={`${compact ? "text-[18px]" : "text-[22px]"} mb-3 mt-1 font-normal`}>Ce que disent vos chiffres</h2>
        <div className="grid grid-cols-3 gap-2">
          <Kpi v={eur(r.ebe_retraite)} l="EBE retraité" />
          <Kpi v={fois(r.multiple_ebe)} l="prix / EBE retraité" />
          <Kpi v={compact ? pct(ratio) : fois(r.multiple_resultat_net)} l={compact ? "échéances / EBE" : "prix / résultat net"} />
        </div>
        <p className="mb-1 mt-4 text-[11px] uppercase tracking-[0.18em]" style={{ color: ACCENT }}>Montage indicatif sans apport personnel</p>
        <Ligne l="Crédit vendeur" v={eur(r.montage?.credit_vendeur)} />
        <Ligne l="Prêt d'honneur (personnel, à taux zéro)" v={eur(r.montage?.pret_honneur)} />
        <Ligne l="Prêt bancaire, si utile" v={eur(r.montage?.banque)} />
        {ratio !== null && ratio !== undefined ? (
          <>
            <p className="mt-3 text-[13.5px]">Échéances payées par l'entreprise : {eur(r.echeances_annuelles)} par an, soit {pct(ratio)} de l'EBE retraité</p>
            <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(ratio, 100)}%`, background: ratio > 50 ? "#F2A3A3" : "linear-gradient(90deg,#8FCFA8,#EADFC0)" }} />
              <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/80" />
            </div>
            <p className="mt-1 text-[12px] text-offwhite/55">Repère : rester sous 50 % de l'EBE retraité.</p>
          </>
        ) : null}
      </div>
      <div className={`mt-3 grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
        <Liste titre="Points forts" items={r.points_forts} couleur="#8FCFA8" />
        <Liste titre="Risques" items={r.risques} couleur="#D9C3A0" />
      </div>
      {r.opportunites?.length ? <div className="mt-3"><Liste titre="Opportunités après la reprise" items={r.opportunites} couleur={ACCENT} note={r.note_swot} /></div> : null}
      <p className="mt-3 text-[12px] text-offwhite/55">{r.mention || "Calcul indicatif. Aucun financement n'est garanti."}</p>
      {suite ? <div className="mt-5">{suite(r)}</div> : null}
      <button onClick={() => { setVue(0); setCoche(0); }} className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-offwhite/65 hover:text-offwhite" data-testid="sim-refaire">
        <RotateCcw size={13} /> Refaire le test avec d'autres chiffres
      </button>
    </div>
  );
}

function Kpi({ v, l }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
      <span className="block whitespace-nowrap text-[18px]">{v}</span>
      <span className="text-[11.5px] text-offwhite/55">{l}</span>
    </div>
  );
}

function Ligne({ l, v }) {
  return <div className="flex justify-between gap-4 border-b border-white/[0.08] py-1.5 text-[13.5px] last:border-0"><span>{l}</span><span className="whitespace-nowrap">{v}</span></div>;
}

export function Liste({ titre, items = [], couleur, note }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="mb-1.5 text-[11px] uppercase tracking-[0.18em]" style={{ color: ACCENT }}>{titre}</p>
      {items.map((x) => (
        <p key={x} className="relative py-1 pl-4 text-[13.5px]"><span className="absolute left-0 top-[11px] h-2 w-2 rounded-full" style={{ background: couleur }} />{x}</p>
      ))}
      {note ? <p className="mt-1.5 text-[12px] text-offwhite/55">{note}</p> : null}
    </div>
  );
}

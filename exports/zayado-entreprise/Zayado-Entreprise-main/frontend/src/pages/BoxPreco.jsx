import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CalendarClock, Check, Gift, PackageCheck, QrCode, ShieldCheck, Users } from "lucide-react";
import { Reveal, Stamp } from "@/components/Reveal";
import usePageMeta from "@/hooks/usePageMeta";
import { BOX_PRECO } from "@/data/catalogue";
import { useCart } from "@/context/CartContext";
import { envoyerLead } from "@/lib/api";

export default function BoxPreco() {
  usePageMeta(
    "Box Zayado de fin d'année — test en précommande · Zayado",
    "Box entrepreneur apaisé et Box équipe en précommande : seuil de 30 box, date limite du 20 novembre, remboursé intégralement si le seuil n'est pas atteint."
  );
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { ajouter } = useCart();
  const lancement = params.get("preco") === "1";
  const prixEntrepreneur = lancement ? 49 : BOX_PRECO.entrepreneur.prix;
  const prixBarre = lancement ? BOX_PRECO.entrepreneur.prixBarre : null;

  const commander = (id) => {
    ajouter(id);
    navigate(`/checkout?items=${id}`);
  };

  return (
    <div data-testid="box-preco-page">
      {/* HERO */}
      <section className="border-b" style={{ borderColor: "var(--line)", background: "var(--paper-2)" }}>
        <div className="mx-auto max-w-6xl px-5 py-14 text-center md:py-20">
          <Reveal>
            <Stamp>Test en précommande · édition limitée</Stamp>
            <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-[var(--navy)] sm:text-5xl">
              La Box de fin d'année qui remet <span className="font-display italic">l'équilibre</span> au centre.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed opacity-75">
              Pour vous, votre équipe, vos clients. On ne commande les box qu'une fois les précommandes en :
              {BOX_PRECO.seuil} box minimum, sinon <strong>remboursement intégral</strong>, sans aucune démarche.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-semibold" style={{ background: "var(--navy)", color: "var(--paper-2)" }} data-testid="box-deadline">
                <CalendarClock size={15} /> Précommande jusqu'au {BOX_PRECO.deadline}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-semibold" style={{ border: "1px solid var(--line)", background: "var(--paper)" }} data-testid="box-seuil">
                <PackageCheck size={15} /> Seuil : {BOX_PRECO.seuil} box · {BOX_PRECO.expedition}
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* LES 2 BOX */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* BOX ENTREPRENEUR */}
          <Reveal className="h-full">
            <article className="card flex h-full flex-col p-8" data-testid="box-entrepreneur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-55">À garder ou à offrir</p>
                  <h2 className="font-display mt-2 text-2xl font-semibold text-[var(--navy)]">{BOX_PRECO.entrepreneur.nom}</h2>
                </div>
                <div className="text-right">
                  {prixBarre && <p className="text-[13px] opacity-45 line-through">{prixBarre} €</p>}
                  <p className="font-display text-4xl font-extrabold text-[var(--navy)]">{prixEntrepreneur} €</p>
                  <p className="text-[11px] opacity-55">TTC · port inclus</p>
                </div>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {BOX_PRECO.entrepreneur.contenu.map(([nom, desc, role]) => (
                  <li key={nom} className="flex items-start gap-3">
                    <span className="mt-1 flex h-5 w-5 flex-none items-center justify-center rounded-full" style={{ background: "var(--gold-soft)" }}>
                      <Check size={12} style={{ color: "var(--navy)" }} />
                    </span>
                    <p className="text-[14px] leading-relaxed">
                      <span className="font-semibold text-[var(--navy)]">{nom}</span>
                      <span className="opacity-70"> — {desc}</span>
                      <span className="block text-[11.5px] uppercase tracking-[0.12em] opacity-45">{role}</span>
                    </p>
                  </li>
                ))}
              </ul>
              <button onClick={() => commander(BOX_PRECO.entrepreneur.id)} data-testid="box-precommander" className="btn btn-primary mt-7 w-full px-6 py-4 text-[15.5px]">
                Précommander ma box {lancement && "à " + prixEntrepreneur + " €"} <Gift size={16} />
              </button>
              <p className="mt-3 text-center text-[12px] opacity-55">Paiement sécurisé Mollie · démo sans clé configurée</p>
            </article>
          </Reveal>

          {/* BOX ÉQUIPE */}
          <Reveal delay={0.1} className="h-full">
            <article className="bg-navy-grad flex h-full flex-col rounded-[22px] p-8 text-[var(--paper-2)]" data-testid="box-equipe">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--gold-soft)" }}>Cadeaux d'entreprise</p>
                  <h2 className="font-display mt-2 text-2xl font-semibold">{BOX_PRECO.equipe.nom}</h2>
                </div>
                <div className="text-right">
                  <p className="font-display text-4xl font-extrabold" style={{ color: "var(--gold-soft)" }}>39 €<span className="text-[15px] font-normal opacity-70"> HT/u</span></p>
                  <p className="text-[11px] opacity-55">dès 10 box · dégressif</p>
                </div>
              </div>
              <ul className="mt-6 flex-1 space-y-2.5">
                {BOX_PRECO.equipe.contenu.map((c) => (
                  <li key={c} className="flex items-start gap-3 text-[14px] leading-relaxed opacity-90">
                    <Users size={15} className="mt-0.5 flex-none" style={{ color: "var(--gold-soft)" }} /> {c}
                  </li>
                ))}
              </ul>
              <div className="glass-navy mt-6 rounded-2xl p-4" data-testid="box-equipe-devis">
                <p className="flex items-center gap-2 text-[14px] font-semibold"><QrCode size={15} style={{ color: "var(--gold-soft)" }} /> Une question sur votre commande équipe ?</p>
                <DevisForm />
              </div>
            </article>
          </Reveal>
        </div>
      </section>

      {/* GARANTIES */}
      <section className="border-y" style={{ borderColor: "var(--line)", background: "var(--paper-2)" }}>
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="grid gap-5 md:grid-cols-3">
            {BOX_PRECO.garanties.map((g, i) => (
              <Reveal key={g} delay={i * 0.07} className="h-full">
                <div className="flex items-start gap-3 rounded-2xl p-5" style={{ background: "var(--paper)", border: "1px solid var(--line)" }} data-testid={`box-garantie-${i}`}>
                  <ShieldCheck size={20} className="mt-0.5 flex-none" style={{ color: "var(--gold)" }} />
                  <p className="text-[14px] leading-relaxed opacity-85">{g}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="mt-8 flex items-center justify-center gap-2 text-center text-[13px] opacity-60">
              <QrCode size={15} /> Dans chaque box : la carte « Votre Cockpit IA » avec QR code — 2 mois pour 1 €, le passage vers le pilotage.
            </p>
            <p className="mt-2 text-center text-[12px] opacity-45">Partagez votre ouverture : #EntrepreneurApaisé</p>
          </Reveal>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-3xl px-5 py-16 text-center">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--navy)]">
            Une seule série. {BOX_PRECO.seuil} box. Et rien ne se perd.
          </h2>
          <button onClick={() => commander(BOX_PRECO.entrepreneur.id)} data-testid="box-final-cta" className="btn btn-primary mt-8 inline-flex items-center gap-2 px-8 py-4 text-[16px]">
            Précommander ma box <Gift size={17} />
          </button>
        </Reveal>
      </section>
    </div>
  );
}

function DevisForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const valid = /.+@.+\..+/.test(email);
  return sent ? (
    <p className="mt-3 text-[13.5px]" style={{ color: "var(--gold-soft)" }}>Reçu — votre devis arrive sous 48 h ouvrées.</p>
  ) : (
    <form className="mt-3 flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!valid) return; await envoyerLead({ email, source: "box-equipe-devis" }); setSent(true); }} data-testid="box-equipe-devis-form">
      <input
        className="field flex-1" style={{ paddingTop: 9, paddingBottom: 9, fontSize: 13.5 }}
        placeholder="Email pro — devis sous 48 h" value={email} onChange={(e) => setEmail(e.target.value)}
        data-testid="box-equipe-devis-email"
      />
      <button className="btn btn-gold-light px-5 py-2.5 text-[13px]" data-testid="box-equipe-devis-submit">Recevoir</button>
    </form>
  );
}

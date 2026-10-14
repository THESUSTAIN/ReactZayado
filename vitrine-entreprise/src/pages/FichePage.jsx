import { Link, useParams } from "react-router-dom";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Reveal, Stamp } from "@/components/Reveal";
import usePageMeta from "@/hooks/usePageMeta";
import { ficheDe, MARKET_ITEMS } from "@/data/catalogue";
import { IMG } from "@/data/images";
import { useCart } from "@/context/CartContext";

const eur = (n) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 });

export default function FichePage() {
  const { slug } = useParams();
  const fiche = ficheDe(slug);
  const { ajouter } = useCart();

  usePageMeta(
    fiche ? `${fiche.titre} · Zayado` : "Fiche introuvable · Zayado",
    fiche ? fiche.promesse : "La maison de l'entrepreneur."
  );

  if (!fiche) {
    return (
      <div className="mx-auto max-w-lg px-5 py-28 text-center" data-testid="fiche-introuvable">
        <h1 className="text-3xl font-semibold text-[var(--navy)]">Cette fiche n'existe pas (encore).</h1>
        <Link to="/marketplace" data-testid="fiche-introuvable-back" className="btn btn-primary mt-7 px-6 py-3.5 text-[15px]">
          Retour à la maison de l'entrepreneur
        </Link>
      </div>
    );
  }

  const item = fiche.item;
  const typeLabel = { produit: "Sélection Zayado", digital: "Outil Zayado", box: "Édition limitée", service: "Accompagnement" };
  const voisins = MARKET_ITEMS.filter((i) => i.id !== slug && i.besoin === item?.besoin).slice(0, 3);

  const ctaItem = () => {
    if (!item) return null;
    if (item.cta === "Activer") return (
      <a href={`${process.env.REACT_APP_APP_URL || "https://app.zayado.net"}`} data-testid="fiche-cta" className="btn btn-primary px-7 py-3.5 text-[15px]">
        {item.cta} — {item.prixLabel} <ArrowRight size={16} />
      </a>
    );
    if (item.cta === "Commander") return (
      <Link to="/box" data-testid="fiche-cta" className="btn btn-primary px-7 py-3.5 text-[15px]">
        {item.cta} — précommander <ArrowRight size={16} />
      </Link>
    );
    if (item.cta === "Se lancer") return (
      <Link to={item.to} data-testid="fiche-cta" className="btn btn-primary px-7 py-3.5 text-[15px]">
        {item.cta} — parlez-nous du besoin <ArrowRight size={16} />
      </Link>
    );
    return (
      <button onClick={() => ajouter(item.id)} data-testid="fiche-cta" className="btn btn-primary px-7 py-3.5 text-[15px]">
        {item.cta} — {eur(item.prix)} <ArrowRight size={16} />
      </button>
    );
  };

  return (
    <div data-testid="fiche-page">
      {/* HERO — douleur puis promesse */}
      <section className="border-b" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 md:grid-cols-2 md:py-20">
          <Reveal>
            <Stamp>{fiche.eyebrow}</Stamp>
            <h1 className="mt-5 text-3xl font-semibold leading-[1.1] tracking-tight text-[var(--navy)] sm:text-4xl lg:text-5xl">
              {fiche.titre}
            </h1>
            {item?.note && (
              <p className="mt-4 text-[13.5px] opacity-65" data-testid="fiche-avis">
                <span className="font-bold" style={{ color: "var(--gold)" }}>★ {item.note} / 10</span> — {item.avis} avis vérifiés
                <span className="ml-2 text-[11px] opacity-60">(exemple)</span>
              </p>
            )}
            <div className="mt-6 rounded-3xl border-l-4 p-5" style={{ background: "var(--paper-2)", borderColor: "var(--gold)" }} data-testid="fiche-douleur">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] opacity-55">Ça vous parle ?</p>
              <p className="font-hand mt-1 text-2xl leading-snug text-[var(--navy)]">{fiche.douleur}</p>
            </div>
            <p className="mt-5 text-[16px] leading-relaxed opacity-80">{fiche.promesse}</p>
            {item && (
              <div className="mt-6 inline-flex items-center gap-3 rounded-2xl px-5 py-3.5" style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}>
                <ShieldCheck size={18} className="flex-none" style={{ color: "var(--gold)" }} />
                <span className="text-[14px] font-bold" style={{ color: "var(--gold)" }}>BÉNÉFICE MAJEUR</span>
                <span className="text-[14px] opacity-80">{item.benefice}</span>
              </div>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {ctaItem()}
              {!item && (
                <Link to="/diagnostic" data-testid="fiche-cta" className="btn btn-primary inline-flex items-center gap-2 px-7 py-3.5 text-[15px]">
                  Commencer par le diagnostic <ArrowRight size={16} />
                </Link>
              )}
              <Link to="/marketplace" data-testid="fiche-back" className="btn btn-ghost px-6 py-3.5 text-[14px]">
                Voir la sélection
              </Link>
            </div>
            {item && (
              <p className="mt-4 text-[13px] opacity-55">
                {item.prixMode}
                {item.type === "produit" && " · 30 jours satisfait ou remboursé"}
                {item.type === "digital" && " · Sans engagement · Paiement sécurisé Mollie"}
              </p>
            )}
          </Reveal>

          <Reveal delay={0.12}>
            <div className="relative">
              <img
                src={IMG[fiche.img]}
                alt={fiche.titre}
                className="w-full rounded-[26px] object-cover shadow-[0_40px_80px_-40px_rgba(13,31,56,0.5)]"
                style={{ aspectRatio: "4/3" }}
                data-testid="fiche-image"
              />
              {item?.exclusif && (
                <span className="absolute left-5 top-5 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ background: "var(--navy)", color: "var(--paper-2)" }} data-testid="fiche-exclusif">
                  Exclusivité Zayado
                </span>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* GARANTIES — le trio boutique */}
      <section className="border-y" style={{ borderColor: "var(--line)", background: "var(--paper-2)" }} data-testid="fiche-garanties">
        <div className="mx-auto grid max-w-6xl gap-5 px-5 py-8 sm:grid-cols-3">
          {[
            ["Livraison offerte", "Dès 120 € — express, soignée, sans surprise."],
            ["30 jours satisfait ou remboursé", "Un essai réel, dans vos conditions."],
            ["Paiement sécurisé", "Via Mollie — carte bancaire, sans engagement."],
          ].map(([t, d]) => (
            <div key={t} className="flex items-center gap-3">
              <ShieldCheck size={20} className="flex-none" style={{ color: "var(--gold)" }} />
              <p className="text-[13.5px] leading-snug"><span className="font-semibold text-[var(--navy)]">{t}</span><span className="block opacity-65">{d}</span></p>
            </div>
          ))}
        </div>
      </section>

      {/* BÉNÉFICES / INCLUS */}
      {fiche.benefices?.length > 0 && (
        <section className="mx-auto max-w-4xl px-5 py-14" data-testid="fiche-benefices">
          <Reveal>
            <h2 className="text-2xl font-semibold text-[var(--navy)] md:text-3xl">Ce que ça change, concrètement</h2>
            <ul className="mt-7 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {fiche.benefices.map((b) => (
                <li key={b} className="card flex items-start gap-3 p-5 text-[14.5px] leading-relaxed">
                  <Check size={16} className="mt-0.5 flex-none" style={{ color: "var(--gold)" }} /> {b}
                </li>
              ))}
            </ul>
          </Reveal>
        </section>
      )}

      {/* AVIS — « Clients love us » (exemples à remplacer) */}
      <section className="mx-auto max-w-6xl px-5 py-14" data-testid="fiche-avis-section">
        <Reveal>
          <h2 className="text-2xl font-semibold text-[var(--navy)] md:text-3xl">Ils l'ont intégré à leur rythme.</h2>
          <p className="mt-2 text-[13px] opacity-45">Avis d'illustration — remplacés par vos vrais avis vérifiés.</p>
        </Reveal>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            { n: "Camille D.", r: "Fondatrice — e-commerce", t: "Trois semaines, et mes soirées ont changé de visage. Je ferme l'ordinateur plus tôt, sans culpabilité." },
            { n: "Thomas L.", r: "Dirigeant — BTP", t: "Le bénéfice majeur annoncé est réel. La trésorerie s'est éclaircie dès le premier mois." },
            { n: "Sophie M.", r: "Co-fondatrice — agence", t: "La qualité est là, et l'histoire qui va avec. On ne compare pas avec Amazon, et c'est tant mieux." },
          ].map((a, i) => (
            <Reveal key={a.n} delay={i * 0.07} className="h-full">
              <figure className="card flex h-full flex-col p-6" data-testid={`fiche-review-${i}`}>
                <p style={{ color: "var(--gold)" }}>★★★★★</p>
                <blockquote className="mt-3 flex-1 text-[14.5px] leading-relaxed opacity-85">« {a.t} »</blockquote>
                <figcaption className="mt-4 text-[13px]">
                  <span className="font-semibold text-[var(--navy)]">{a.n}</span>
                  <span className="opacity-60"> — {a.r}</span>
                  <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: "var(--gold)" }}>
                    <Check size={11} /> Acheteur vérifié
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 pb-14" data-testid="fiche-faq">
        <Reveal>
          <h2 className="text-center text-2xl font-semibold text-[var(--navy)] md:text-3xl">Les questions utiles</h2>
          <div className="mt-7 space-y-2.5">
            {[
              ["Comment annuler ou modifier ma commande ?", "Écrivez-nous dès réception — tant que la préparation n'a pas commencé, tout reste modifiable."],
              ["Comment suivre ma commande ?", "Un email avec le suivi part à l'expédition. Pour la box : expédition vers le 7 décembre."],
              ["Et si un problème survient ?", "30 jours pour changer d'avis, et un interlocuteur unique qui vous répond humainement."],
              ["Je n'ai pas reçu tous mes articles ?", "Signalez-le : nous renvoyons la pièce manquée, sans discussion."],
            ].map(([qq, aa]) => (
              <details key={qq} className="card p-5" data-testid="fiche-faq-item">
                <summary className="cursor-pointer text-[14.5px] font-semibold text-[var(--navy)]">{qq}</summary>
                <p className="mt-2 text-[14px] leading-relaxed opacity-70">{aa}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </section>

      {/* NEWSLETTER */}
      <section className="mx-auto max-w-6xl px-5 pb-20" data-testid="fiche-newsletter">
        <Reveal>
          <div className="bg-navy-grad flex flex-col items-center justify-between gap-5 rounded-[26px] p-8 text-[var(--paper-2)] md:flex-row md:p-10">
            <p className="font-display text-xl font-semibold leading-snug md:text-2xl">
              Soyez informé·e en premier — offres et nouvelles éditions.
            </p>
            <a href="mailto:contact@zayado.net" data-testid="fiche-newsletter-cta" className="btn btn-gold-light inline-flex flex-none items-center gap-2 px-7 py-3.5 text-[14px]">
              Recevoir les prochaines éditions <ArrowRight size={15} />
            </a>
          </div>
        </Reveal>
      </section>

      {/* VOISINS — même besoin */}
      {voisins.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pb-20" data-testid="fiche-voisins">
          <Reveal>
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Pour le même besoin</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {voisins.map((v) => (
                <Link key={v.id} to={`/fiche/${v.id}`} data-testid={`fiche-voisin-${v.id}`} className="card group p-6 transition-shadow hover:shadow-[0_24px_50px_-30px_rgba(13,31,56,0.4)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-55">{typeLabel[v.type]}</p>
                  <p className="mt-2 text-[16px] font-semibold leading-snug text-[var(--navy)]">{v.nom}</p>
                  <p className="mt-2 line-clamp-2 text-[13.5px] opacity-70">{v.desc}</p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: "var(--gold)" }}>
                    Voir la fiche <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                  </p>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}
    </div>
  );
}

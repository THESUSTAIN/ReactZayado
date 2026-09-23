import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { useSeo } from "@/lib/useSeo";

const DATA = {
  organisation: {
    label: "Organisation et productivité",
    title: "Organisation et productivité pour entrepreneurs | Zayado",
    meta: "Organisez vos tâches, choisissez vos priorités et avancez sur les actions qui font progresser votre entreprise.",
    h1: "Organisez vos priorités et avancez sans dispersion.",
    pain: "Votre liste de tâches augmente, mais vos priorités restent floues et les actions importantes sont repoussées.",
    intro: "Le Cockpit IA Zayado relie votre vision, vos objectifs, vos idées et vos actions. Vous voyez ce qui compte maintenant sans perdre le contexte de votre activité.",
    points: ["Vision et objectifs à 90 jours", "Actions prioritaires et progression", "Idées reliées aux projets", "Revue hebdomadaire et prochaines étapes"],
    use: "Freelance, consultant ou dirigeant de petite entreprise, vous disposez d’un cadre simple pour passer de l’intention à l’action.",
    faq: [["Comment organiser ses priorités quand on est entrepreneur ?", "Commencez par relier les tâches à un objectif précis, puis choisissez un nombre limité d’actions adaptées à votre temps et votre énergie."], ["Le Cockpit IA est-il une simple to-do list ?", "Non. Il relie vision, objectifs, idées et actions afin que la liste de tâches reste connectée à votre direction."], ["Puis-je réorganiser mes actions ?", "Oui. Les actions peuvent être ajustées selon l’avancement, les nouvelles informations et votre réalité du jour."]],
    next: "/ia/prospection",
    nextLabel: "Développer aussi ma prospection",
  },
  prospection: {
    label: "Prospection et croissance",
    title: "Prospection commerciale avec IA pour entrepreneurs | Zayado",
    meta: "Identifiez vos prochaines opportunités commerciales, préparez vos messages et développez votre activité avec une prospection IA plus régulière.",
    h1: "Trouvez vos prochaines opportunités sans vous épuiser à prospecter.",
    pain: "Vous savez qu’il faut prospecter, mais l’acquisition passe après les urgences et devient irrégulière.",
    intro: "Le Radar Zayado vous aide à passer du signal à une action commerciale concrète : comprendre l’opportunité, décider si elle correspond à votre activité et préparer la suite.",
    points: ["Opportunités et signaux de marché", "Messages commerciaux préparés", "Suivi des actions de prospection", "Priorités adaptées à votre contexte"],
    use: "Pour un freelance ou un consultant, la prospection devient un rythme de travail clair plutôt qu’une tâche repoussée à la fin de la journée.",
    faq: [["Comment trouver des clients quand on est freelance ?", "La régularité compte. Le Radar aide à identifier des pistes cohérentes avec votre activité et à préparer une prochaine action."], ["Le Radar fournit-il automatiquement des clients ?", "Non. Il aide à repérer des opportunités et à structurer votre prospection, mais la relation commerciale et la décision restent humaines."], ["Peut-on préparer des messages commerciaux ?", "Oui. Le Copilote peut aider à préparer un message contextualisé que vous relisez et validez avant de l’utiliser."]],
    next: "/ia/equilibre-dirigeant",
    nextLabel: "Préserver aussi mon équilibre",
  },
  equilibre: {
    label: "Équilibre du dirigeant",
    title: "Équilibre vie professionnelle et personnelle de l’entrepreneur | Zayado",
    meta: "Ajustez votre organisation, votre charge et vos priorités pour développer votre activité tout en préservant votre équilibre de vie.",
    h1: "Développez votre entreprise sans sacrifier votre équilibre.",
    pain: "Votre activité prend toute la place et votre organisation ne s’adapte pas à votre énergie réelle.",
    intro: "Zayado vous aide à observer votre énergie, votre charge et vos priorités pour construire un rythme plus réaliste. L’objectif est de mieux organiser votre activité, pas de promettre une solution médicale.",
    points: ["Check-in quotidien de l’énergie", "Charge ressentie et rythme de travail", "Priorités adaptées à la journée", "Équilibre vie professionnelle et personnelle"],
    use: "Vous pouvez continuer à développer votre activité en tenant compte de vos limites, de vos temps de récupération et de ce qui compte réellement pour vous.",
    faq: [["Comment améliorer son équilibre de vie professionnelle et personnelle ?", "Commencez par rendre visibles votre charge, vos priorités et votre temps disponible, puis ajustez l’organisation au lieu d’ajouter toujours plus de tâches."], ["Le module est-il un outil médical ?", "Non. Il aide à observer son rythme et à ajuster son organisation. Il ne remplace pas un médecin ou un psychologue."], ["Comment réduire la charge mentale d’un entrepreneur ?", "Clarifier les prochaines actions, limiter les priorités simultanées et externaliser la préparation de certains documents peuvent alléger la charge décisionnelle."]],
    next: "/ia/copilote-documents",
    nextLabel: "Découvrir le Copilote IA",
  },
  copilote: {
    label: "Copilote et documents IA",
    title: "Assistant IA et documents professionnels pour entrepreneurs | Zayado",
    meta: "Clarifiez vos décisions, préparez vos prochaines actions et gagnez du temps avec le Copilote IA Zayado.",
    h1: "L’IA prépare vos documents, vous gardez la décision.",
    pain: "Vous perdez du temps à commencer vos briefs, reformuler vos idées ou classer manuellement vos documents.",
    intro: "Le Copilote IA Zayado vous aide à clarifier une décision, structurer un brief, préparer un plan et générer un document. Vous relisez et validez chaque résultat.",
    points: ["Chat contextuel lié à votre activité", "Briefs, plans et documents professionnels", "Décisions et prochaines actions", "Transmission vers Google Drive, OneDrive ou SharePoint"],
    use: "Après activation dans Paramètres, chaque document peut être enregistré automatiquement dans votre espace cloud. Une confirmation nuage indique la transmission réussie.",
    faq: [["Que peut faire un assistant IA pour un entrepreneur ?", "Il peut aider à clarifier une situation, préparer un document, proposer des étapes et reformuler une décision dans son contexte."], ["Les documents peuvent-ils être envoyés dans Google Drive ?", "Oui, après connexion du compte et activation de la sauvegarde automatique. OneDrive et SharePoint sont également prévus."], ["Comment savoir si un document a bien été transmis ?", "Le chat affiche une confirmation nuage « Transmis » uniquement après la réponse positive du serveur."], ["Puis-je désactiver l’enregistrement automatique ?", "Oui, le réglage peut être désactivé à tout moment dans Paramètres."]],
    next: "/login?next=%2Fonboarding",
    nextLabel: "Essayer le Cockpit IA",
  },
};

export default function IaFeature({ kind }) {
  const d = DATA[kind] || DATA.organisation;
  useSeo({ title: d.title, description: d.meta });
  return <MarketingLayout>
    <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 lg:pb-24 lg:pt-20"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">{d.label} · Cockpit IA Zayado</p><h1 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-tight text-white sm:text-6xl">{d.h1}</h1><p className="mt-6 max-w-2xl text-lg leading-relaxed text-offwhite/70">{d.intro}</p><div className="mt-8 flex flex-wrap gap-3"><Link to="/login?next=%2Fonboarding" className="btn-gold inline-flex items-center gap-2 px-5 py-3">Découvrir cette fonctionnalité <ArrowRight size={16} /></Link><Link to="/ia" className="btn-ghost px-5 py-3">Voir tout le Cockpit IA</Link></div></section>
    <section className="border-y border-white/10 bg-navy-900/50"><div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-2 lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Le problème</p><h2 className="mt-3 font-display text-3xl font-bold text-white">{d.pain}</h2><p className="mt-4 leading-relaxed text-offwhite/65">Zayado ne vous demande pas de travailler plus. L’objectif est de rendre la prochaine décision plus claire et l’action plus réaliste.</p></div><div className="rounded-3xl border border-gold/20 bg-gold/5 p-7"><p className="text-xs uppercase tracking-widest text-gold">Ce que vous obtenez</p><div className="mt-5 space-y-3">{d.points.map((p) => <p key={p} className="flex items-start gap-3 text-sm text-offwhite/80"><Check className="mt-0.5 shrink-0 text-emerald-300" size={16} />{p}</p>)}</div></div></div></section>
    <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[.9fr_1.1fr]"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Une méthode concrète</p><h2 className="mt-3 font-display text-3xl font-bold text-white">Comprendre, structurer, valider.</h2><p className="mt-4 leading-relaxed text-offwhite/65">{d.use}</p></div><div className="grid gap-4 sm:grid-cols-3">{[["01", "Comprendre", "Votre contexte et votre vraie priorité."], ["02", "Préparer", "Une structure, une piste ou un document."], ["03", "Valider", "Vous décidez ce qui mérite d’être exécuté."]].map(([n, t, x]) => <div key={n} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><p className="text-xl font-bold text-gold">{n}</p><h3 className="mt-5 font-display text-lg font-semibold text-white">{t}</h3><p className="mt-2 text-sm leading-relaxed text-offwhite/55">{x}</p></div>)}</div></section>
    <section className="bg-[#0f1b3a] py-16"><div className="mx-auto max-w-6xl px-5"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Cas d’usage</p><h2 className="mt-3 max-w-3xl font-display text-3xl font-bold text-white">Une aide adaptée à la réalité des entrepreneurs.</h2><div className="mt-8 grid gap-4 md:grid-cols-3">{["Freelance", "Consultant", "Dirigeant de petite entreprise"].map((x) => <div key={x} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><h3 className="font-display text-lg font-semibold text-white">{x}</h3><p className="mt-2 text-sm leading-relaxed text-offwhite/60">Un cadre clair pour relier vos objectifs, votre activité et la prochaine étape utile.</p></div>)}</div></div></section>
    <section className="mx-auto grid max-w-6xl gap-8 px-5 py-16 lg:grid-cols-2"><div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7"><ShieldCheck className="text-cyan-200" /><h2 className="mt-5 font-display text-2xl font-bold text-white">Contrôle et transparence.</h2><p className="mt-3 text-sm leading-relaxed text-offwhite/60">L’IA prépare, vous validez. Pour les documents cloud, l’envoi nécessite une connexion et une activation explicites.</p></div><div className="rounded-3xl border border-dashed border-white/20 p-7"><p className="text-xs uppercase tracking-widest text-gold">Preuve à compléter</p><h2 className="mt-4 font-display text-2xl font-bold text-white">Ajoutez un témoignage réel.</h2><p className="mt-3 text-sm leading-relaxed text-offwhite/60">Présentez le profil, le problème initial, la fonctionnalité utilisée et un résultat vérifiable. Ne publiez pas de chiffres non mesurés.</p></div></section>
    <section className="mx-auto max-w-4xl px-5 pb-16"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">FAQ</p><h2 className="mt-3 font-display text-3xl font-bold text-white">Questions fréquentes</h2><div className="mt-8 space-y-3">{d.faq.map(([q, a]) => <details key={q} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><summary className="cursor-pointer list-none font-semibold text-white">{q}<span className="float-right text-gold">+</span></summary><p className="mt-3 text-sm leading-relaxed text-offwhite/65">{a}</p></details>)}</div></section>
    <section className="mx-auto max-w-6xl px-5 pb-20"><div className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-gradient-to-br from-[#DEC2A3] to-[#F1E2CC] p-8 text-navy-900 sm:flex-row sm:items-center sm:p-10"><div><h2 className="font-display text-2xl font-bold">Passez à la prochaine étape.</h2><p className="mt-2 text-sm text-navy-900/70">Commencez simplement, puis construisez votre rythme.</p></div><Link to={d.next} className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-sm font-semibold text-white">{d.nextLabel} <ArrowRight size={16} /></Link></div></section>
  </MarketingLayout>;
}

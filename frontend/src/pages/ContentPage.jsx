import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { LINKS } from "../data/content";
import { Newsletter } from "../components/Newsletter";

export default function ContentPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const link = LINKS.find((l) => l.slug === slug);

  if (!link) {
    return (
      <div className="min-h-screen grid place-items-center grain-bg bg-background px-6 text-center">
        <div>
          <p className="font-serif text-2xl text-navy">Page introuvable</p>
          <Link to="/" className="text-terracotta underline mt-3 inline-block">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  const Icon = link.icon;

  return (
    <div className="min-h-screen grain-bg bg-background">
      <div className="mx-auto w-full max-w-xl px-4 pb-20">
        <button data-testid="back-button" onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 mt-6 text-navy/80 hover:text-navy font-medium transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 bg-card rounded-[1.6rem] overflow-hidden ring-1 ring-black/5 shadow-[0_18px_50px_-24px_rgba(31,58,99,0.5)]">
          <div className="relative h-52 sm:h-64 overflow-hidden">
            <img src={link.image} alt={link.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/70 via-navy/10 to-transparent" />
            <div className="absolute left-5 bottom-5 flex items-center gap-3">
              <span className="grid place-items-center h-12 w-12 rounded-full bg-cream text-navy shadow-lg">
                <Icon className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <h1 className="font-serif text-cream text-2xl sm:text-3xl font-semibold drop-shadow" data-testid="page-title">
                {link.title}
              </h1>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <p className="font-serif italic text-navy text-lg leading-relaxed">{link.intro}</p>
            <div className="h-px w-14 bg-gold my-6" />
            {link.body.map((p, i) => (
              <p key={i} className="text-foreground/80 leading-relaxed mb-4">{p}</p>
            ))}

            {link.isNewsletter && <Newsletter />}
          </div>
        </motion.div>

        <p className="font-script text-terracotta text-xl text-center mt-10">
          Réconcilier sens, travail et bien-être
        </p>
      </div>
    </div>
  );
}

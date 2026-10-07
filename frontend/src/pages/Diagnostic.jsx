import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { createAppointment } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Eyebrow } from "@/components/Bits";
import { MaskedLine, FadeUp } from "@/components/Reveal";

const U = "https://images.unsplash.com";
const SIDE_IMG = `${U}/photo-1656383908989-bb1c4e9db214?q=85&w=1000&auto=format&fit=crop`;

const SUBJECTS = [
    { value: "none", label: "Je ne sais pas encore", type: "diagnostic" },
    { value: "cockpit", label: "Cockpit IA Zayado (abonnement)", type: "abonnement" },
    { value: "optimisation", label: "Optimisation d'entreprise", type: "diagnostic" },
    { value: "acquisition", label: "Acquisition d'entreprise", type: "diagnostic" },
    { value: "transmission", label: "Transmission d'entreprise", type: "diagnostic" },
    { value: "amenagement", label: "Aménagement et travaux (devis)", type: "devis" },
];

const SERVICE_TO_SUBJECT = {
    "cockpit-ia": "cockpit",
    "optimisation-entreprise": "optimisation",
    "acquisition-transmission": "acquisition",
    amenagement: "amenagement",
};

function initialSubject() {
    const match = (window.location.search || "").match(
        /[?&]service=([^&]+)/,
    );
    const prefill = match ? decodeURIComponent(match[1]) : null;
    return (prefill && SERVICE_TO_SUBJECT[prefill]) || "none";
}

const inputClass =
    "h-auto rounded-none border-0 border-b border-line bg-transparent px-0 py-3 text-base text-ink shadow-none transition-colors duration-300 focus-visible:border-navy focus-visible:ring-0";

const CTA_LABELS = {
    diagnostic: "Envoyer ma demande de diagnostic",
    abonnement: "Commencer mon abonnement",
    devis: "Demander mon devis",
};

export default function Diagnostic() {
    const [subject, setSubject] = useState(initialSubject);
    const [sending, setSending] = useState(false);
    const [done, setDone] = useState(false);
    const [formError, setFormError] = useState(null);

    const requestType =
        SUBJECTS.find((s) => s.value === subject)?.type ?? "diagnostic";

    const onSubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const subjectLabel = SUBJECTS.find((s) => s.value === subject)?.label;
        const payload = {
            name: (fd.get("name") || "").trim(),
            email: (fd.get("email") || "").trim(),
            phone: (fd.get("phone") || "").trim() || null,
            request_type: requestType,
            subject: subject === "none" ? null : subjectLabel,
            preferred_date: fd.get("date") || null,
            message: (fd.get("message") || "").trim() || null,
        };
        setSending(true);
        setFormError(null);
        try {
            await createAppointment(payload);
            setDone(true);
            toast.success(
                "Demande envoyée — la Maison vous répond sous 24 h ouvrées.",
            );
        } catch (err) {
            setFormError(
                err?.response?.data?.detail?.[0]?.msg ||
                    "L'envoi a échoué. Réessayez dans un instant.",
            );
            toast.error("L'envoi a échoué. Réessayez dans un instant.");
        } finally {
            setSending(false);
        }
    };

    return (
        <main className="pt-28 md:pt-36">
            <section className="mx-auto max-w-7xl px-6 pb-28 lg:px-10">
                <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
                    <div className="lg:col-span-6">
                        <Eyebrow>Le premier pas</Eyebrow>
                        <h1 className="mt-6 font-serif text-4xl leading-[1.03] tracking-tight text-ink md:text-6xl">
                            <MaskedLine delay={0.05}>Parlons de vous,</MaskedLine>
                            <MaskedLine delay={0.17}>
                                et de{" "}
                                <em className="italic text-navy">
                                    votre entreprise.
                                </em>
                            </MaskedLine>
                        </h1>
                        <FadeUp delay={0.25}>
                            <ul className="mt-10 space-y-4">
                                {[
                                    "Réponse sous 24 h ouvrées",
                                    "Premier échange avec la Maison, sans engagement",
                                    "Proposition sur mesure après diagnostic",
                                ].map((line) => (
                                    <li
                                        key={line}
                                        className="flex items-center gap-3 text-sm text-ink/70 md:text-base"
                                    >
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sand">
                                            <Check className="h-3.5 w-3.5 text-navy" />
                                        </span>
                                        {line}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-12 hidden overflow-hidden rounded-b-3xl rounded-t-[999px] lg:block lg:w-3/4">
                                <img
                                    src={SIDE_IMG}
                                    alt="Arche minimaliste au soleil"
                                    className="img-editorial aspect-[4/5] w-full object-cover"
                                />
                            </div>
                        </FadeUp>
                    </div>

                    <div className="lg:col-span-6">
                        <FadeUp delay={0.15}>
                            {done ? (
                                <div
                                    data-testid="diagnostic-success"
                                    className="flex min-h-[32rem] flex-col items-center justify-center border border-line bg-white p-10 text-center"
                                >
                                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy">
                                        <Check className="h-6 w-6 text-paper" />
                                    </span>
                                    <h2 className="mt-8 font-serif text-4xl text-ink">
                                        C'est noté.
                                    </h2>
                                    <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink/65">
                                        Votre demande est arrivée à la Maison.
                                        Zayado vous répond sous 24 h ouvrées
                                        pour convenir d'un premier échange.
                                    </p>
                                    <a
                                        href="/"
                                        data-testid="diagnostic-success-home"
                                        className="mt-10 inline-flex items-center gap-2 rounded-full bg-navy px-7 py-3.5 text-sm font-semibold text-paper transition-colors duration-300 hover:bg-navy-soft"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Retour à l'accueil
                                    </a>
                                </div>
                            ) : (
                                <form
                                    data-testid="diagnostic-form"
                                    onSubmit={onSubmit}
                                    className="border border-line bg-white p-8 md:p-10"
                                >
                                    <div className="grid gap-8 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="name"
                                                className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ink/50"
                                            >
                                                Nom complet *
                                            </Label>
                                            <Input
                                                id="name"
                                                name="name"
                                                required
                                                minLength={2}
                                                placeholder="Camille Martin"
                                                data-testid="diagnostic-input-name"
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="email"
                                                className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ink/50"
                                            >
                                                Email *
                                            </Label>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                required
                                                placeholder="camille@entreprise.fr"
                                                data-testid="diagnostic-input-email"
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="phone"
                                                className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ink/50"
                                            >
                                                Téléphone
                                            </Label>
                                            <Input
                                                id="phone"
                                                name="phone"
                                                type="tel"
                                                placeholder="06 12 34 56 78"
                                                data-testid="diagnostic-input-phone"
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="date"
                                                className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ink/50"
                                            >
                                                Date souhaitée
                                            </Label>
                                            <Input
                                                id="date"
                                                name="date"
                                                type="date"
                                                data-testid="diagnostic-input-date"
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label
                                                htmlFor="subject"
                                                className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ink/50"
                                            >
                                                Votre sujet
                                            </Label>
                                            <Select
                                                value={subject}
                                                onValueChange={setSubject}
                                            >
                                                <SelectTrigger
                                                    id="subject"
                                                    data-testid="diagnostic-select-subject"
                                                    className="h-auto w-full justify-between rounded-none border-0 border-b border-line px-0 py-3 text-base shadow-none transition-colors duration-300 focus:ring-0 data-[state=open]:border-navy"
                                                >
                                                    <SelectValue placeholder="Je ne sais pas encore" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {SUBJECTS.map((s) => (
                                                        <SelectItem
                                                            key={s.value}
                                                            value={s.value}
                                                            data-testid={`diagnostic-select-option-${s.value}`}
                                                        >
                                                            {s.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label
                                                htmlFor="message"
                                                className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ink/50"
                                            >
                                                Votre situation en quelques mots
                                            </Label>
                                            <Textarea
                                                id="message"
                                                name="message"
                                                rows={4}
                                                placeholder="Ce qui pèse, ce qui bloque, ce dont vous rêvez…"
                                                data-testid="diagnostic-input-message"
                                                className={`${inputClass} resize-none`}
                                            />
                                        </div>
                                    </div>

                                    {formError && (
                                        <p
                                            data-testid="diagnostic-error"
                                            className="mt-6 border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                                        >
                                            {formError}
                                        </p>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={sending}
                                        data-testid="diagnostic-submit-button"
                                        className="mt-10 h-auto w-full rounded-full bg-navy py-4 text-sm font-semibold text-paper transition-colors duration-300 hover:bg-navy-soft"
                                    >
                                        {sending ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Envoi en cours…
                                            </>
                                        ) : (
                                            CTA_LABELS[requestType]
                                        )}
                                    </Button>
                                    <p className="mt-4 text-center text-xs text-ink/45">
                                        Vos informations restent confidentielles
                                        — jamais partagées hors de la Maison.
                                    </p>
                                </form>
                            )}
                        </FadeUp>
                    </div>
                </div>
            </section>
        </main>
    );
}

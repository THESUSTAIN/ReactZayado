import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { getOffers, createAppointment } from "@/lib/api";
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

const inputClass =
    "h-auto rounded-none border-0 border-b border-line bg-transparent px-0 py-3 text-base text-ink shadow-none transition-colors duration-300 focus-visible:border-navy focus-visible:ring-0";

export default function RendezVous() {
    const [offers, setOffers] = useState([]);
    const [offerId, setOfferId] = useState("none");
    const [sending, setSending] = useState(false);
    const [done, setDone] = useState(false);
    const [formError, setFormError] = useState(null);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        getOffers()
            .then((all) => {
                setOffers(all);
                const prefill = searchParams.get("offer");
                if (prefill && all.some((o) => o.id === prefill)) {
                    setOfferId(prefill);
                }
            })
            .catch(() => setOffers([]));
    }, [searchParams]);

    const selectedOffer = offers.find((o) => o.id === offerId);

    const onSubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const payload = {
            name: (fd.get("name") || "").trim(),
            email: (fd.get("email") || "").trim(),
            phone: (fd.get("phone") || "").trim() || null,
            offer_id: selectedOffer ? selectedOffer.id : null,
            offer_title: selectedOffer ? selectedOffer.title : null,
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
                                    "Premier échange de 30 minutes offert",
                                    "Sans engagement, sans relance insistante",
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
                                    data-testid="booking-success"
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
                                        Un expert vous répond sous 24 h ouvrées
                                        pour convenir d'un premier échange.
                                    </p>
                                    <a
                                        href="/"
                                        data-testid="booking-success-home"
                                        className="mt-10 inline-flex items-center gap-2 rounded-full bg-navy px-7 py-3.5 text-sm font-semibold text-paper transition-colors duration-300 hover:bg-navy-soft"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Retour à l'accueil
                                    </a>
                                </div>
                            ) : (
                                <form
                                    data-testid="booking-form"
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
                                                data-testid="booking-input-name"
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
                                                data-testid="booking-input-email"
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
                                                data-testid="booking-input-phone"
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
                                                data-testid="booking-input-date"
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label
                                                htmlFor="offer"
                                                className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ink/50"
                                            >
                                                Offre qui vous intéresse
                                            </Label>
                                            <Select
                                                value={offerId}
                                                onValueChange={setOfferId}
                                            >
                                                <SelectTrigger
                                                    id="offer"
                                                    data-testid="booking-select-offer"
                                                    className="h-auto w-full justify-between rounded-none border-0 border-b border-line px-0 py-3 text-base shadow-none transition-colors duration-300 focus:ring-0 data-[state=open]:border-navy"
                                                >
                                                    <SelectValue placeholder="Je ne sais pas encore" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem
                                                        value="none"
                                                        data-testid="booking-select-offer-none"
                                                    >
                                                        Je ne sais pas encore
                                                    </SelectItem>
                                                    {offers.map((o) => (
                                                        <SelectItem
                                                            key={o.id}
                                                            value={o.id}
                                                            data-testid={`booking-select-offer-${o.id}`}
                                                        >
                                                            {o.title}
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
                                                data-testid="booking-input-message"
                                                className={`${inputClass} resize-none`}
                                            />
                                        </div>
                                    </div>

                                    {formError && (
                                        <p
                                            data-testid="booking-error"
                                            className="mt-6 border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                                        >
                                            {formError}
                                        </p>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={sending}
                                        data-testid="booking-submit-button"
                                        className="mt-10 h-auto w-full rounded-full bg-navy py-4 text-sm font-semibold text-paper transition-colors duration-300 hover:bg-navy-soft"
                                    >
                                        {sending ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Envoi en cours…
                                            </>
                                        ) : (
                                            "Envoyer ma demande de rendez-vous"
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

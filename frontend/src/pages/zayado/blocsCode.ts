import type { CodeTunnel } from "@/zayado/types";

/* Bibliothèque de blocs de code prêts à insérer dans un tunnel (Admin › Tunnels › Code).
   Chaque bloc ajoute son contenu à la fin des champs concernés. Remplacer les VOTRE_… avant d'enregistrer. */

export type BlocCode = { cle: string; nom: string; description: string; champs: Partial<CodeTunnel> };

export const BLOCS_CODE: BlocCode[] = [
  {
    cle: "meta-pixel", nom: "Meta Pixel (Facebook / Instagram)", description: "Mesure les visites et conversions de vos publicités Meta. Remplacez VOTRE_PIXEL_ID.",
    champs: { head: `<!-- Meta Pixel -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'VOTRE_PIXEL_ID');
fbq('track', 'PageView');
</script>` },
  },
  {
    cle: "ga4", nom: "Google Analytics 4", description: "Statistiques de visite Google. Remplacez G-XXXXXXX.",
    champs: { head: `<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-XXXXXXX');
</script>` },
  },
  {
    cle: "tiktok", nom: "TikTok Pixel", description: "Suivi des publicités TikTok. Remplacez VOTRE_PIXEL_TIKTOK.",
    champs: { head: `<!-- TikTok Pixel -->
<script>
!function (w, d, t) {w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
ttq.load=function(e){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;var o=d.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
ttq.load('VOTRE_PIXEL_TIKTOK');ttq.page();
}(window, document, 'ttq');
</script>` },
  },
  {
    cle: "compte-rebours", nom: "Compte à rebours", description: "Bandeau « l'offre se termine dans… ». Changez la date dans data-fin.",
    champs: {
      html_haut: `<div class="zy-rebours" data-fin="2026-12-31T23:59:00">L'offre se termine dans <b class="zy-rebours__t">--</b></div>`,
      css: `.zy-rebours{margin:0 0 20px;padding:12px 16px;border-radius:14px;background:#0D1F38;color:#FDFCF8;text-align:center;font-size:15px}
.zy-rebours b{color:#F1E2CC;font-variant-numeric:tabular-nums}`,
      js: `document.querySelectorAll('.zy-rebours').forEach(function(el){var fin=new Date(el.dataset.fin).getTime(),t=el.querySelector('.zy-rebours__t');
function maj(){var r=Math.max(0,fin-Date.now()),j=Math.floor(r/864e5),h=Math.floor(r%864e5/36e5),m=Math.floor(r%36e5/6e4),s=Math.floor(r%6e4/1e3);
t.textContent=j+' j '+h+' h '+m+' min '+s+' s';if(r<=0){el.textContent="L'offre est terminée.";clearInterval(i);}}var i=setInterval(maj,1000);maj();});`,
    },
  },
  {
    cle: "temoignages", nom: "Témoignages clients", description: "Trois avis en cartes. Remplacez les textes et prénoms par de vrais témoignages.",
    champs: {
      html_bas: `<section class="zy-avis"><h2>Ils l'ont fait avant vous</h2><div class="zy-avis__grille">
<blockquote><p>« Texte du témoignage n°1. »</p><cite>Prénom, métier</cite></blockquote>
<blockquote><p>« Texte du témoignage n°2. »</p><cite>Prénom, métier</cite></blockquote>
<blockquote><p>« Texte du témoignage n°3. »</p><cite>Prénom, métier</cite></blockquote>
</div></section>`,
      css: `.zy-avis{margin-top:40px}.zy-avis h2{font-size:24px;font-weight:600;margin-bottom:16px}
.zy-avis__grille{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.zy-avis blockquote{margin:0;padding:18px;border-radius:18px;background:#fff;border:1px solid rgba(13,31,56,.08)}
.zy-avis cite{display:block;margin-top:10px;font-style:normal;font-size:13px;opacity:.7}`,
    },
  },
  {
    cle: "garantie", nom: "Garantie satisfait ou remboursé", description: "Encadré de réassurance sous l'offre.",
    champs: {
      html_bas: `<div class="zy-garantie"><b>Garantie 30 jours satisfait ou remboursé.</b> Si l'offre ne vous convient pas, un simple e-mail suffit : vous êtes remboursé·e, sans justification.</div>`,
      css: `.zy-garantie{margin-top:24px;padding:16px 18px;border-radius:16px;border:1px dashed #DEC2A3;background:#FFFBF2;font-size:14px}`,
    },
  },
  {
    cle: "bandeau-promo", nom: "Bandeau promo", description: "Message en haut de page (lancement, code promo…).",
    champs: {
      html_haut: `<div class="zy-promo">🎁 Offre de lancement : -20 % avec le code <b>LANCEMENT</b></div>`,
      css: `.zy-promo{margin:0 0 16px;padding:10px 14px;border-radius:999px;background:#F1E2CC;color:#0D1F38;text-align:center;font-size:14px}`,
    },
  },
  {
    cle: "video", nom: "Vidéo YouTube", description: "Vidéo de présentation en haut de page. Remplacez VIDEO_ID.",
    champs: {
      html_haut: `<div class="zy-video"><iframe src="https://www.youtube-nocookie.com/embed/VIDEO_ID" title="Présentation" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`,
      css: `.zy-video{position:relative;aspect-ratio:16/9;margin:0 0 24px;border-radius:18px;overflow:hidden}.zy-video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}`,
    },
  },
  {
    cle: "whatsapp", nom: "Bouton WhatsApp flottant", description: "Bouton de contact en bas à droite. Remplacez 33600000000.",
    champs: {
      html_bas: `<a class="zy-wa" href="https://wa.me/33600000000" target="_blank" rel="noopener">Une question ? WhatsApp</a>`,
      css: `.zy-wa{position:fixed;right:18px;bottom:18px;z-index:50;padding:12px 18px;border-radius:999px;background:#25D366;color:#fff;font-weight:600;text-decoration:none;box-shadow:0 10px 30px rgba(0,0,0,.18)}`,
    },
  },
  {
    cle: "calendly", nom: "Agenda Calendly", description: "Prise de rendez-vous intégrée. Remplacez l'adresse Calendly.",
    champs: {
      html_bas: `<div class="calendly-inline-widget" data-url="https://calendly.com/VOTRE-COMPTE/30min" style="min-width:320px;height:700px;margin-top:32px"></div>
<script src="https://assets.calendly.com/assets/external/widget.js" async></script>`,
    },
  },
];

/** Ajoute le bloc à la fin de chaque champ concerné (sans écraser l'existant). */
export function insererBloc(code: CodeTunnel, bloc: BlocCode): CodeTunnel {
  const out = { ...code };
  (Object.keys(bloc.champs) as (keyof CodeTunnel)[]).forEach((k) => {
    const ajout = bloc.champs[k] ?? "";
    out[k] = out[k].trim() ? `${out[k].trimEnd()}\n\n${ajout}` : ajout;
  });
  return out;
}

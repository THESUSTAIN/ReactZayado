import {
  Home as HomeIcon,
  Flower2,
  ShoppingBag,
  BarChart3,
  Users,
  BookOpen,
  Mail,
} from "lucide-react";

export const SOCIALS = [
  { name: "Instagram", url: "https://instagram.com", icon: "instagram" },
  { name: "YouTube", url: "https://youtube.com", icon: "youtube" },
  { name: "TikTok", url: "https://tiktok.com", icon: "tiktok" },
  { name: "Spotify", url: "https://spotify.com", icon: "spotify" },
];

export const LINKS = [
  {
    slug: "decouvrir-zayado",
    icon: HomeIcon,
    tone: "cream",
    title: "Découvrir Zayado",
    desc: "Notre vision, nos services et la boutique",
    image:
      "https://images.unsplash.com/photo-1769407790979-b8d968da0ecd?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    intro:
      "Zayado accompagne les entrepreneurs qui veulent conjuguer sens, clarté financière et équilibre de vie. Découvrez notre univers, notre mission et la manière dont nous réconcilions travail et bien-être.",
    body: [
      "Nous pensons qu'entreprendre ne devrait pas se faire au détriment de votre énergie ni de vos valeurs. Zayado réunit des outils, des ressources et un accompagnement humain pour avancer avec sérénité.",
      "De la clarté financière au pilotage de votre activité, en passant par le soin de votre équilibre personnel, chaque brique a été pensée pour vous aider à bâtir une entreprise qui vous ressemble.",
    ],
  },
  {
    slug: "bien-etre-equilibre",
    icon: Flower2,
    tone: "terracotta",
    title: "Bien-être & Équilibre",
    desc: "Des outils et conseils pour votre énergie au quotidien",
    image:
      "https://images.unsplash.com/photo-1615227875116-ae28a77814fb?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    intro:
      "Prendre soin de soi, c'est aussi prendre soin de son entreprise. Retrouvez ici des rituels simples et des conseils pour préserver votre énergie au fil des journées.",
    body: [
      "Respiration, pauses conscientes, organisation douce : de petits gestes qui changent profondément la qualité de votre travail.",
      "Nos contenus bien-être sont pensés pour les entrepreneurs pressés : concrets, courts, et applicables dès aujourd'hui.",
    ],
  },
  {
    slug: "boutique-zayado",
    icon: ShoppingBag,
    tone: "cream",
    title: "Boutique Zayado",
    desc: "Une sélection d'objets pour travailler mieux et vous sentir bien",
    image:
      "https://images.unsplash.com/photo-1488998427799-e3362cec87c3?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    intro:
      "Une sélection d'objets choisis avec soin pour rendre vos journées plus douces et plus productives.",
    body: [
      "Carnets, accessoires de bureau et objets inspirants : chaque pièce de la boutique a été choisie pour son utilité et sa beauté.",
      "Rendez-vous dans l'onglet Boutique pour parcourir la sélection complète.",
    ],
    isShop: true,
  },
  {
    slug: "myextension-ai",
    icon: BarChart3,
    tone: "terracotta",
    title: "MyExtension AI",
    desc: "Votre extension business (Clarté, Pilotage, Organisation)",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    intro:
      "MyExtension AI est votre copilote business : clarté financière, pilotage d'activité et organisation, réunis dans un seul espace intelligent.",
    body: [
      "Visualisez vos chiffres clés, anticipez vos décisions et gardez le cap sans vous noyer dans les tableurs.",
      "Une extension pensée pour les indépendants et petites équipes qui veulent avancer avec méthode.",
    ],
  },
  {
    slug: "services-accompagnement",
    icon: Users,
    tone: "cream",
    title: "Services & Accompagnement",
    desc: "Des experts sélectionnés pour répondre à vos besoins",
    image:
      "https://images.unsplash.com/photo-1531347387918-af516d1e939c?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    intro:
      "Un réseau d'experts sélectionnés pour vous accompagner là où vous en avez besoin : finance, stratégie, organisation ou bien-être.",
    body: [
      "Nous vous mettons en relation avec les bonnes personnes, au bon moment, pour débloquer ce qui compte.",
      "Un accompagnement sur mesure, humain et aligné avec vos valeurs.",
    ],
  },
  {
    slug: "ressources-inspirations",
    icon: BookOpen,
    tone: "terracotta",
    title: "Ressources & Inspirations",
    desc: "Articles, conseils et outils pratiques pour avancer avec sens",
    image:
      "https://images.unsplash.com/photo-1608280392091-724833b66c2b?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    intro:
      "Articles, guides et outils pratiques pour nourrir votre réflexion et passer à l'action avec sens.",
    body: [
      "Chaque ressource est pensée pour vous apporter une idée actionnable, sans jargon inutile.",
      "Revenez régulièrement : la bibliothèque s'enrichit au fil des saisons.",
    ],
  },
  {
    slug: "rester-en-contact",
    icon: Mail,
    tone: "cream",
    title: "Rester en contact",
    desc: "Inscription à notre newsletter",
    image:
      "https://images.unsplash.com/photo-1619363830049-755dde30d9cc?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    intro:
      "Recevez nos inspirations, outils et nouveautés directement dans votre boîte mail.",
    body: [],
    isNewsletter: true,
  },
];

export const PRODUCTS = [
  {
    id: "mug-equilibre",
    name: "Mug Équilibre",
    desc: "Céramique artisanale, pour vos pauses douces.",
    price: "24 €",
    image:
      "https://images.unsplash.com/photo-1615659080593-2248cc4213fb?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    details:
      "Un mug en céramique émaillée à la main, pensé pour ralentir le temps d'une pause chaude. Contenance 300 ml, passe au lave-vaisselle.",
  },
  {
    id: "carnet-clarte",
    name: "Carnet Clarté",
    desc: "Pour clarifier vos idées et vos chiffres.",
    price: "18 €",
    image:
      "https://images.unsplash.com/photo-1488998427799-e3362cec87c3?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    details:
      "Carnet à pages pointillées, couverture souple, 160 pages. Idéal pour poser vos priorités, votre pilotage et vos intentions.",
  },
  {
    id: "lunettes-focus",
    name: "Lunettes Focus",
    desc: "Filtre lumière bleue pour vos longues journées.",
    price: "39 €",
    image:
      "https://images.unsplash.com/photo-1531347387918-af516d1e939c?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    details:
      "Monture légère et verres anti-lumière bleue pour préserver vos yeux devant l'écran. Étui en feutre inclus.",
  },
  {
    id: "bougie-serenite",
    name: "Bougie Sérénité",
    desc: "Cire végétale, notes douces et chaleureuses.",
    price: "22 €",
    image:
      "https://images.unsplash.com/photo-1651841689044-00521ab0fa66?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    details:
      "Bougie en cire de soja naturelle, 40 h de combustion. Un parfum enveloppant pour créer une atmosphère propice à la concentration.",
  },
  {
    id: "the-energie",
    name: "Thé Énergie",
    desc: "Mélange bio pour vos matins entreprenants.",
    price: "15 €",
    image:
      "https://images.unsplash.com/photo-1491720731493-223f97d92c21?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    details:
      "Un thé vert bio relevé de gingembre et de citron, pour démarrer la journée avec clarté. Boîte de 20 sachets.",
  },
  {
    id: "coffret-inspiration",
    name: "Coffret Inspiration",
    desc: "Une sélection de lectures pour avancer avec sens.",
    price: "48 €",
    image:
      "https://images.unsplash.com/photo-1608280392091-724833b66c2b?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    details:
      "Un coffret de trois ouvrages choisis autour de l'entrepreneuriat conscient, de la clarté financière et de l'équilibre de vie.",
  },
];

export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1775513999069-318837c9b21b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

// Ambiances sonores génératives (Web Audio) : aucun fichier à télécharger,
// fonctionne hors ligne, boucle sans coupure. Pluie, vagues, forêt, bols.

let ctx = null;
let courant = null; // { stop(), gain }

const contexte = () => {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
};

function bruit(ac, type = "blanc", secondes = 4) {
  const buf = ac.createBuffer(1, ac.sampleRate * secondes, ac.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, dernier = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (type === "rose") {
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
    } else if (type === "brun") {
      dernier = (dernier + 0.02 * w) / 1.02; d[i] = dernier * 3.5;
    } else d[i] = w;
  }
  const src = ac.createBufferSource();
  src.buffer = buf; src.loop = true;
  return src;
}

function lfo(ac, freq, profondeur, cible) {
  const o = ac.createOscillator(); const g = ac.createGain();
  o.frequency.value = freq; g.gain.value = profondeur;
  o.connect(g); g.connect(cible); o.start();
  return o;
}

const RECETTES = {
  pluie(ac, sortie) {
    const n = bruit(ac, "rose"); const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 500;
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 7000;
    const g = ac.createGain(); g.gain.value = 0.55;
    n.connect(hp); hp.connect(lp); lp.connect(g); g.connect(sortie); n.start();
    const l = lfo(ac, 0.13, 0.12, g.gain);
    // gouttes plus marquées de temps en temps
    const gouttes = setInterval(() => {
      const s = bruit(ac, "blanc", 0.05); const f = ac.createBiquadFilter(); f.type = "bandpass";
      f.frequency.value = 2500 + Math.random() * 3000; f.Q.value = 8; const gg = ac.createGain();
      gg.gain.setValueAtTime(0.25 * Math.random(), ac.currentTime); gg.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06);
      s.connect(f); f.connect(gg); gg.connect(sortie); s.start(); s.stop(ac.currentTime + 0.07);
    }, 90);
    return () => { clearInterval(gouttes); n.stop(); l.stop(); };
  },
  vagues(ac, sortie) {
    const n = bruit(ac, "brun"); const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
    const g = ac.createGain(); g.gain.value = 0.35;
    n.connect(lp); lp.connect(g); g.connect(sortie); n.start();
    const l1 = lfo(ac, 0.085, 0.3, g.gain);          // ressac lent
    const l2 = lfo(ac, 0.085, 500, lp.frequency);    // l'écume s'éclaircit à chaque vague
    return () => { n.stop(); l1.stop(); l2.stop(); };
  },
  foret(ac, sortie) {
    const n = bruit(ac, "brun"); const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600;
    const g = ac.createGain(); g.gain.value = 0.22;
    n.connect(lp); lp.connect(g); g.connect(sortie); n.start();
    const l = lfo(ac, 0.05, 0.1, g.gain);
    let t = null;
    const chant = () => {
      const notes = 2 + Math.floor(Math.random() * 4); const base = 2400 + Math.random() * 1800;
      for (let i = 0; i < notes; i++) {
        const o = ac.createOscillator(); const gg = ac.createGain(); const t0 = ac.currentTime + i * (0.12 + Math.random() * 0.08);
        o.type = "sine"; o.frequency.setValueAtTime(base, t0); o.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.4), t0 + 0.09);
        gg.gain.setValueAtTime(0.0001, t0); gg.gain.exponentialRampToValueAtTime(0.06, t0 + 0.02); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);
        o.connect(gg); gg.connect(sortie); o.start(t0); o.stop(t0 + 0.12);
      }
      t = setTimeout(chant, 1800 + Math.random() * 4500);
    };
    t = setTimeout(chant, 800);
    return () => { clearTimeout(t); n.stop(); l.stop(); };
  },
  bols(ac, sortie) {
    let t = null;
    const frappe = () => {
      const f0 = [174.6, 196, 220, 261.6][Math.floor(Math.random() * 4)];
      [[1, 0.18], [2.71, 0.07], [5.15, 0.035]].forEach(([k, a]) => {
        const o = ac.createOscillator(); const g = ac.createGain(); const t0 = ac.currentTime;
        o.type = "sine"; o.frequency.value = f0 * k;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(a, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 9);
        o.connect(g); g.connect(sortie); o.start(t0); o.stop(t0 + 9.2);
      });
      t = setTimeout(frappe, 7000 + Math.random() * 4000);
    };
    frappe();
    return () => clearTimeout(t);
  },
};

export const AMBIANCES_SON = [
  { id: "aucune", label: "Silence" },
  { id: "pluie", label: "Pluie douce" },
  { id: "vagues", label: "Vagues" },
  { id: "foret", label: "Forêt" },
  { id: "bols", label: "Bols chantants" },
];

export function jouerAmbiance(id, volume = 0.6) {
  arreterAmbiance();
  if (!id || id === "aucune" || !RECETTES[id]) return false;
  const ac = contexte();
  if (!ac) return false;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), ac.currentTime + 1.5); // fondu d'entrée
  gain.connect(ac.destination);
  const stop = RECETTES[id](ac, gain);
  courant = { stop, gain };
  return true;
}

export function volumeAmbiance(v) {
  if (courant && ctx) courant.gain.gain.setTargetAtTime(Math.max(0.0002, v), ctx.currentTime, 0.2);
}

export function arreterAmbiance() {
  if (!courant || !ctx) return;
  const { stop, gain } = courant;
  courant = null;
  try { gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4); } catch { /* déjà arrêté */ }
  setTimeout(() => { try { stop(); gain.disconnect(); } catch { /* déjà arrêté */ } }, 1500);
}

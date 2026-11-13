/* ==========================================================
   Kit commun « Gestion quotidien » — module partagé par toutes les apps
   - Registre des apps (nom, couleur, icône, fichier)
   - Thème clair / sombre, couleur de l'app
   - Hero : paysage + bande à ronds découpés + coulures organiques
   - Rocket (mascotte), icônes abstraites
   - Réglages communs (GitHub, IA) et synchro GitHub générique
   - Panneau, toast, sons
   ========================================================== */

/* ---------- Utilitaires ---------- */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const now = () => Date.now();
export const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export const read = (k, d = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
export const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('stockage', e); } };
export const todayISO = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
export const isISO = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
export const frDate = (iso, opt = { day: 'numeric', month: 'short', year: 'numeric' }) => isISO(iso) ? new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', opt) : '';
export const daysTo = iso => Math.round((new Date(iso + 'T12:00:00') - new Date(todayISO() + 'T12:00:00')) / 864e5);
export const addMonths = (iso, m) => { const d = new Date(iso + 'T12:00:00'); const day = d.getDate(); d.setMonth(d.getMonth() + m); if (d.getDate() < day) d.setDate(0); return todayISO(d); };
export const eur = (n, dec = 2) => (n === '' || n == null || isNaN(+n)) ? '' : Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: dec, maximumFractionDigits: dec });
export const mix = (c1, c2, t) => { const a = [1, 3, 5].map(i => parseInt(c1.slice(i, i + 2), 16)), b = [1, 3, 5].map(i => parseInt(c2.slice(i, i + 2), 16)); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
export const alpha = (c, a) => c + Math.round(a * 255).toString(16).padStart(2, '0');

/* ---------- Registre des apps ---------- */
export const APPS = [
  { id: 'violette',    name: 'Violette',    sub: 'Purées & menus',       color: '#7a3cf0', href: './violette.html',    icon: 'violette',    family: 'violette' },
  { id: 'habits',      name: 'Habits',      sub: 'Tenue du jour',        color: '#a678ff', href: './habits.html',      icon: 'habits',      family: 'violette' },
  { id: 'animaux',     name: 'Animaux',     sub: 'Santé & rappels',      color: '#ff7a1f', href: './animaux.html',     icon: 'animaux' },
  { id: 'plantes',     name: 'Plantes',     sub: 'Tailles & soins',      color: '#22b35e', href: './plantes.html',     icon: 'plantes' },
  { id: 'budget',      name: 'Cha-cha',     sub: 'Le compteur',          color: '#ff4f5e', href: './budget.html',      icon: 'budget' },
  { id: 'paperasse',   name: 'Paperasse',   sub: 'Factures & échéances', color: '#0bb5a3', href: './paperasse.html',   icon: 'paperasse' },
  { id: 'garage',      name: 'Garage',      sub: 'Entretien voiture',    color: '#2f86ff', href: './garage.html',      icon: 'garage' },
  { id: 'colis',       name: 'Colis',       sub: 'Commandes & retraits', color: '#b07a45', href: './colis.html',       icon: 'colis' },
  { id: 'collections', name: 'Collections', sub: 'Livres, BD, vinyles',  color: '#ffc21a', href: './collections.html', icon: 'collections' },
];
export const HUB = { id: 'hub', name: 'Accueil', color: '#ff7a59', href: './index.html' };
export const appById = id => APPS.find(a => a.id === id) || HUB;

/* ---------- Thème ---------- */
export function themePref() { return (read('hub.prefs', {}) || {}).theme || 'auto'; }
export function applyTheme() {
  const p = themePref();
  const dark = p === 'dark' || (p === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  return dark;
}
let CURRENT_APP = 'hub';
const AI_APPS = ['hub', 'budget', 'paperasse', 'collections'];
/* ---------- Réglages communs synchronisés (JSON_HUB.json) ---------- */
// Prénom, thème, sons et modèle IA suivent l'utilisateur d'un appareil à l'autre.
// Seuls le jeton GitHub et la clé Gemini restent propres à chaque appareil.
let hubDoc = null;
function hubSync() {
  if (hubDoc) return hubDoc;
  hubDoc = new DocSync({ key: 'hub.data.v1', path: 'JSON_HUB.json', label: 'Réglages communs', lists: ['summaries'],
    empty: () => { const prefs = read('hub.prefs', {}) || {}; return { app: 'hub', schema: 1, settings: { prefs, aiModel: (read('hub.ai', {}) || {}).model || '' }, settingsAt: Object.keys(prefs).length ? now() : 0 }; },
    onRemote: d => applyHubDoc(d) });
  return hubDoc;
}
function applyHubDoc(d) {
  const s = d.settings || {}, before = JSON.stringify(read('hub.prefs', {}) || {});
  write('hub.prefs', { ...(read('hub.prefs', {}) || {}), ...(s.prefs || {}) });
  if (s.aiModel) write('hub.ai', { ...(read('hub.ai', {}) || {}), model: s.aiModel });
  let fresh = false;
  for (const s2 of d.summaries || []) { const loc = read('hub.summary.' + s2.id, null); if (!loc || (loc.at || 0) < (s2.updatedAt || 0)) { const { id, createdAt, updatedAt, ...rest } = s2; write('hub.summary.' + id, { ...rest, at: updatedAt }); fresh = true; } }
  if (JSON.stringify(read('hub.prefs', {}) || {}) !== before) { applyTheme(); dispatchEvent(new Event('k-hubprefs')); }
  else if (fresh) dispatchEvent(new Event('k-summaries'));
}
// Résumé d'une appli pour l'accueil : gardé ici et dans JSON_HUB.json (visible depuis tous les appareils)
export function publishSummary(app, s) {
  const prev = read('hub.summary.' + app, null);
  const same = prev && JSON.stringify({ ...prev, at: 0 }) === JSON.stringify({ ...s, at: 0 });
  if (same) return;
  const at = now();
  write('hub.summary.' + app, { ...s, at });
  const d = hubSync(); const list = d.data.summaries || (d.data.summaries = []);
  const i = list.findIndex(x => x.id === app), item = { ...s, id: app, createdAt: list[i]?.createdAt || at, updatedAt: at };
  if (i >= 0) list[i] = item; else list.push(item);
  d.save();
}
export function pushHubPrefs() {
  const d = hubSync();
  d.data.settings = { prefs: read('hub.prefs', {}) || {}, aiModel: (read('hub.ai', {}) || {}).model || '' };
  d.data.settingsAt = now(); d.save();
}
import { hasTour, startTour, tourCSS } from './tour.js';
export const APP_VERSION = '2.7.4';
export function initApp(appId) {
  CURRENT_APP = appId;
  // Service worker commun à toutes les pages, vérifié à chaque ouverture (les mises à jour arrivent sans attendre)
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('./sw.js').then(r => r.update()).catch(() => {});
  setTimeout(() => addFooter(appId), 60);
  setTimeout(() => hubSync().sync(), 600);
  const app = appById(appId);
  const dark = applyTheme();
  const r = document.documentElement.style;
  r.setProperty('--acc', app.color);
  r.setProperty('--soft', alpha(app.color, dark ? .2 : .14));
  r.setProperty('--band', bandColor(app, dark));
  document.documentElement.dataset.app = app.id;
  let m = document.querySelector('meta[name=theme-color]');
  if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
  m.content = dark ? '#15141d' : '#f6f1e7';
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (themePref() === 'auto') location.reload(); });
  return app;
}
export function bandColor(app, dark) {
  if (app.id === 'hub') return dark ? '#2c2466' : '#231f4a';
  return mix(app.color, dark ? '#0b0a14' : '#0d1a2a', dark ? .6 : .5);
}

/* ---------- Icônes abstraites ---------- */
const ICONS = {
  violette: (c, k) => `<path d="M3 11h18a9 9 0 0 1-18 0z" fill="${c}"/><circle cx="12" cy="5.5" r="3" fill="${k}"/><circle cx="18" cy="4" r="1.6" fill="${c}" opacity=".6"/>`,
  habits: (c, k) => `<path d="M3 8l6-4h6l6 4-2.5 4.5L16 11v10H8V11l-2.5 1.5z" fill="${c}"/><path d="M9 4a3 3 0 0 0 6 0z" fill="${k}"/>`,
  collections: (c, k) => `<rect x="3" y="6" width="4.5" height="15" rx="2.25" fill="${c}"/><rect x="9.5" y="3" width="4.5" height="18" rx="2.25" fill="${k}"/><rect x="16" y="7" width="4.5" height="14" rx="2.25" fill="${c}" opacity=".55" transform="rotate(12 18 14)"/>`,
  paperasse: (c, k) => `<path d="M5 3h9.5L19 7.5V21H5z" fill="${c}"/><path d="M14.5 3v4.5H19z" fill="${k}" opacity=".35"/><rect x="8" y="12" width="8" height="2.2" rx="1.1" fill="${k}"/><rect x="8" y="16" width="5" height="2.2" rx="1.1" fill="${k}"/>`,
  budget: (c, k) => `<circle cx="9.5" cy="12" r="6.5" fill="${c}"/><circle cx="15" cy="12" r="6.5" fill="none" stroke="${k}" stroke-width="2.4"/>`,
  garage: (c, k) => `<path d="M3 15.5V12l2.5-5h13L21 12v3.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 15.5z" fill="${c}"/><circle cx="7.5" cy="17" r="2.6" fill="${k}"/><circle cx="16.5" cy="17" r="2.6" fill="${k}"/><rect x="7" y="8.5" width="10" height="3" rx="1.5" fill="${k}" opacity=".3"/>`,
  colis: (c, k) => `<rect x="3.5" y="7" width="17" height="13" rx="2.5" fill="${c}"/><rect x="2.5" y="4" width="19" height="5" rx="2" fill="${k}"/><rect x="10.3" y="4" width="3.4" height="16" fill="${k}" opacity=".35"/>`,
  animaux: (c, k) => `<ellipse cx="12" cy="16" rx="5.5" ry="4.5" fill="${c}"/><circle cx="5.5" cy="10" r="2.4" fill="${k}"/><circle cx="9.5" cy="6.5" r="2.4" fill="${c}"/><circle cx="14.5" cy="6.5" r="2.4" fill="${k}"/><circle cx="18.5" cy="10" r="2.4" fill="${c}"/>`,
  plantes: (c, k) => `<path d="M12 21V11" stroke="${k}" stroke-width="2.2" stroke-linecap="round"/><path d="M12 12C12 6 7 3 3 4c0 5 4 8 9 8z" fill="${c}"/><path d="M12 15c0-5 4-8 9-7 0 4-4 7-9 7z" fill="${c}" opacity=".6"/><rect x="7" y="19" width="10" height="3" rx="1.5" fill="${k}"/>`,
  hub: (c, k) => `<circle cx="8" cy="8" r="4" fill="${c}"/><circle cx="16" cy="8" r="4" fill="${k}"/><circle cx="8" cy="16" r="4" fill="${k}"/><circle cx="16" cy="16" r="4" fill="${c}" opacity=".6"/>`,
};
export function icon(name, { size = 24, color, ink } = {}) {
  const app = APPS.find(a => a.icon === name);
  const c = color || app?.color || '#ff7a59';
  const k = ink || (document.documentElement.dataset.theme === 'dark' ? '#f1ede4' : '#26233a');
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${(ICONS[name] || ICONS.hub)(c, k)}</svg>`;
}

/* ---------- Rocket ---------- */
export function rocket(pose = 'peek', s = 1, prop = '') {
  const K = '#000', E = '#fffdf8';
  // Tête reprise du portrait de Rocket (appli Animaux) : oreilles pointues, grands yeux blancs, petit nez
  const face = (eyes) => `<path d="M17 44 C14 30 16 22 19 13 L28 22 Q32 21 36 22 L45 13 C48 22 50 30 47 44 Q32 54 17 44Z" fill="${K}"/>${eyes}<path d="M30.5 40.5 L33.5 40.5 L32 42.2Z" fill="${E}"/>`;
  const open = `<ellipse cx="25.5" cy="34" rx="3.2" ry="4" fill="${E}"/><ellipse cx="38.5" cy="34" rx="3.2" ry="4" fill="${E}"/>`;
  const shut = `<path d="M23 34 q2.5 2 5 0 M36 34 q2.5 2 5 0" stroke="${E}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  const head = `<g transform="translate(40 7) scale(1.3) translate(-32 -13)">${face(open)}</g>`;
  if (pose === 'peek') return `<svg class="k-cat" width="${80 * s}" height="${68 * s}" viewBox="0 0 80 68" aria-hidden="true">${head}<ellipse cx="25" cy="62" rx="9" ry="5.5" fill="${K}"/><ellipse cx="55" cy="62" rx="9" ry="5.5" fill="${K}"/></svg>`;
  if (pose === 'sit') return `<svg class="k-cat" width="${86 * s}" height="${110 * s}" viewBox="0 0 86 110" aria-hidden="true"><path d="M60 100 Q84 100 80 78 Q78 66 70 70" stroke="${K}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M20 106 Q16 50 40 46 Q64 50 60 106Z" fill="${K}"/>${head}${prop}</svg>`;
  if (pose === 'sleep') return `<svg class="k-cat" width="${110 * s}" height="${54 * s}" viewBox="0 0 110 54" aria-hidden="true"><path d="M8 52 Q4 22 42 22 Q90 20 98 42 Q100 52 84 52Z" fill="${K}"/><g transform="translate(33 9) scale(1.1) translate(-32 -13)">${face(shut)}</g></svg>`;
  return '';
}
export const letterProp = () => `<g transform="translate(46 70) rotate(-12)"><rect width="30" height="21" rx="3" fill="#fffdf8" stroke="#000" stroke-width="2"/><path d="M1 2 l14 10 l14 -10" fill="none" stroke="#000" stroke-width="2"/><circle cx="15" cy="15" r="3.5" fill="#ff4f5e"/></g>`;
export function bubble(text, { name = 'Rocket', prop = '' } = {}) {
  return `<div class="k-bubble">${rocket('sit', .52, prop)}<div class="k-say"><b>${esc(name)}</b><div>${text}</div></div></div>`;
}

/* ---------- Paysage ---------- */
function landscape(col, dark, W, h, seed = 0) {
  const sky1 = dark ? '#17143a' : '#ffe3cf', sky2 = dark ? '#3b2470' : '#ffc2a8';
  const L = [.45, .22, .04].map(x => mix(col, dark ? '#1d1b33' : '#ffffff', x));
  const near = mix(col, dark ? '#0d0c16' : '#2b2a45', .55);
  const fg = dark ? '#0f0e18' : '#26233a';
  const sx = x => x * W / 340, id = 'sk' + Math.random().toString(36).slice(2, 7);
  const sh = (seed % 3) * 18;
  const stars = dark ? [[30, 22, 1], [80, 48, 1.3], [150, 18, 1], [210, 40, .9], [300, 26, 1.2], [120, 70, .8], [260, 12, 1]].map(([x, y, r]) => `<circle cx="${sx(x)}" cy="${y}" r="${r}" fill="#fff" opacity=".8"/>`).join('') : '';
  const birds = dark ? '' : `<path d="M${sx(150)} ${h * .56} q5 -5 10 0 q5 -5 10 0 M${sx(178)} ${h * .48} q4 -4 8 0 q4 -4 8 0" fill="none" stroke="#2b2a45" stroke-width="1.4" opacity=".5"/>`;
  const clouds = dark ? '' : `<g fill="#fff" opacity=".8"><ellipse cx="${sx(150)}" cy="${h * .5}" rx="26" ry="7"/><ellipse cx="${sx(290)}" cy="${h * .32}" rx="20" ry="6"/></g>`;
  const pines = [[20, 14, 12], [34, 10, 9], [262, 16, 13], [278, 12, 10], [292, 14, 11], [312, 10, 8]].map(([x, y, w]) => `<path d="M${sx(x)} ${h - y} l${w / 2} -${w * 2.2} l${w / 2} ${w * 2.2}z"/>`).join('');
  const P = (pts) => pts.map(([x, y], i) => (i ? 'L' : 'M') + sx(x) + ' ' + (h * y)).join(' ');
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient></defs>
<rect width="${W}" height="${h}" fill="url(#${id})"/>${stars}${clouds}
<circle cx="${sx(250 - sh)}" cy="${h * .34}" r="28" fill="${dark ? '#fff6e0' : '#fff3c2'}"/>${birds}
<path d="${P([[0, .58], [40, .4], [70, .5], [115 + sh, .26], [160, .5], [200, .36], [240, .55], [290 - sh, .3], [340, .5]])} V${h} H0Z" fill="${L[0]}"/>
<path d="M0 ${h * .7} Q${sx(60)} ${h * .5} ${sx(130)} ${h * .66} T${sx(260)} ${h * .6} T${W} ${h * .64} V${h} H0Z" fill="${L[1]}"/>
<path d="M0 ${h * .8} Q${sx(90)} ${h * .66} ${sx(190)} ${h * .78} T${W} ${h * .74} V${h} H0Z" fill="${L[2]}"/>
<path d="M0 ${h * .9} Q${sx(110)} ${h * .8} ${sx(220)} ${h * .88} T${W} ${h * .86} V${h} H0Z" fill="${near}"/>
<g fill="${fg}">${pines}</g>`;
}

/* ---------- Hero ---------- */
/* opts : { app, title, sub, subHref, actions (html), rings:[{label, html|value, color, href|on}], perRow, landH } */
export function hero(el, opts) {
  const app = appById(opts.app);
  const dark = document.documentElement.dataset.theme === 'dark';
  const band = bandColor(app, dark);
  const draw = () => {
    const W = Math.max(300, el.clientWidth || innerWidth);
    const rings = opts.rings || [];
    const per = Math.min(opts.perRow || 5, Math.max(1, rings.length));
    const rows = rings.length ? Math.ceil(rings.length / per) : 0;
    const LH = opts.landH || 176;
    const rowH = 92;
    const bandH = rows ? rows * rowH + 6 : 26;
    const y0 = LH + bandH;
    const R = 26;
    const pos = [];
    rings.forEach((r, i) => {
      const row = Math.floor(i / per), inRow = Math.min(per, rings.length - row * per), col = i - row * per;
      const span = Math.min(W - 24, per * 86);
      const step = span / per;
      const x = W / 2 - (inRow * step) / 2 + step * (col + .5);
      pos.push([x, LH + 42 + row * rowH]);
    });
    const seed = [...app.id].reduce((s, c) => s + c.charCodeAt(0), 0);
    const f = [.15, .44, .71].map((p, i) => ((p + ((seed >> i) % 7) * .012) % .9) + .03);
    const D = [[f[0], 24, 60, 17], [f[1], 20, 92, 15], [f[2], 30, 44, 21]];
    const bumps = [[-.02, 40, 12], [.29, 40, 18], [.58, 30, 12], [.88, 46, 20], [1.03, 30, 10]];
    let shapes = `<rect x="-80" y="${LH}" width="${W + 160}" height="${bandH}" fill="${band}"/>`;
    shapes += bumps.map(([x, rx, ry]) => `<ellipse cx="${x * W}" cy="${y0}" rx="${rx}" ry="${ry}" fill="${band}"/>`).join('');
    D.forEach(([x, w, l, r]) => { x *= W; shapes += `<rect x="${x - w / 2}" y="${y0 - 12}" width="${w}" height="${l}" rx="${w / 2}" fill="${band}"/><circle cx="${x}" cy="${y0 + l - r * .4}" r="${r}" fill="${band}"/>`; });
    shapes += `<ellipse cx="${D[0][0] * W + 3}" cy="${y0 + D[0][2] + D[0][3] + 24}" rx="${D[0][3] * .45}" ry="${D[0][3] * .55}" fill="${band}"/><circle cx="${D[2][0] * W + 6}" cy="${y0 + D[2][2] + D[2][3] + 18}" r="5" fill="${band}"/>`;
    const fid = 'g' + Math.random().toString(36).slice(2, 7);
    const total = y0 + 150;
    const holes = pos.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${R}" fill="#000"/>`).join('');
    const svg = `<svg width="${W}" height="${total}" viewBox="0 0 ${W} ${total}">
<defs><filter id="${fid}" filterUnits="userSpaceOnUse" x="-100" y="${LH - 20}" width="${W + 200}" height="${bandH + 220}"><feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b"/><feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="g"/><feComposite in="SourceGraphic" in2="g" operator="atop"/></filter>
<mask id="m${fid}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${total}"><rect width="${W}" height="${total}" fill="#fff"/>${holes}</mask></defs>
<g mask="url(#m${fid})">${landscape(app.color, dark, W, LH + 4, seed)}<g filter="url(#${fid})">${shapes}</g></g>
${pos.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${R + 3}" fill="none" stroke="${rings[i].color || app.color}" stroke-width="3"/>`).join('')}</svg>`;
    const ringsHtml = rings.map((r, i) => {
      const [x, y] = pos[i];
      const tag = r.href ? 'a' : 'button';
      const attr = r.href ? `href="${r.href}"` : `type="button" data-ring="${i}"`;
      const inner = r.html || `<b class="k-num" style="color:${r.color || app.color}">${esc(r.value)}</b>`;
      return `<${tag} class="k-ring" ${attr} style="left:${x}px;top:${y}px" aria-label="${esc(r.label)}">${inner}</${tag}><div class="k-ring-lbl" style="left:${x}px;top:${y + 32}px">${esc(r.label)}</div>`;
    }).join('');
    el.querySelectorAll('[data-keep]').forEach(n => document.body.appendChild(n));
    el.className = 'k-hero';
    el.style.height = (y0 + (opts.dripSpace ?? 72)) + 'px';
    el.innerHTML = svg + ringsHtml + `<div class="k-head"><div class="k-titles"><div class="k-sub">${opts.subHref ? `<a href="${opts.subHref}">${esc(opts.sub || '')}</a>` : esc(opts.sub || '')}</div><h1>${esc(opts.title)}</h1></div><div class="k-actions">${opts.actions || ''}</div></div>`;
    $$('[data-ring]', el).forEach(b => b.onclick = () => rings[+b.dataset.ring].on?.());
    opts.after?.(el);
  };
  draw();
  if (!el._resizeBound) { el._resizeBound = true; let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (el.isConnected) draw(); }, 200); }); }
  el._redraw = draw;
  return el;
}
export const backLink = () => `<a class="k-ibtn" href="./index.html" aria-label="Accueil">⌂</a>`;

/* ---------- Panneau & toast ---------- */
let sheetEl, sheetOnClose = null, afterClose = null;
function ensureSheet() {
  if (sheetEl) return;
  sheetEl = document.createElement('div');
  sheetEl.className = 'k-sheet-wrap'; sheetEl.hidden = true;
  sheetEl.innerHTML = `<div class="k-sheet" role="dialog" aria-modal="true"><div class="k-sheet-head"><h2></h2><button class="k-ibtn" aria-label="Fermer">✕</button></div><div class="k-sheet-body"></div></div>`;
  document.body.appendChild(sheetEl);
  sheetEl.querySelector('.k-sheet-head .k-ibtn').onclick = () => closeSheet();
  sheetEl.addEventListener('click', e => { if (e.target === sheetEl) closeSheet(); });
  addEventListener('popstate', () => { if (!sheetEl.hidden) doClose(); const f = afterClose; afterClose = null; f?.(); });
}
function doClose() { sheetEl.hidden = true; sheetEl.querySelector('.k-sheet-body').innerHTML = ''; const f = sheetOnClose; sheetOnClose = null; f?.(); }
export function openSheet(title, html, { onClose } = {}) {
  ensureSheet();
  const was = !sheetEl.hidden;
  if (was && sheetOnClose) { const f = sheetOnClose; sheetOnClose = null; f(); }
  sheetEl.querySelector('h2').textContent = title;
  const body = sheetEl.querySelector('.k-sheet-body');
  body.innerHTML = html; body.scrollTop = 0;
  sheetOnClose = onClose || null;
  if (!was) { sheetEl.hidden = false; history.pushState({ ksheet: 1 }, ''); }
  return body;
}
export function closeSheet(then) {
  if (!sheetEl || sheetEl.hidden) { then?.(); return; }
  if (history.state?.ksheet) { afterClose = then || null; history.back(); } else { doClose(); then?.(); }
}
let toastEl, toastT;
export function toast(msg) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'k-toast'; document.body.appendChild(toastEl); }
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2600);
}
export function pickFiles({ accept = 'image/*', camera = false, multiple = false } = {}) {
  return new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = accept;
    if (camera) i.capture = 'environment'; if (multiple) i.multiple = true;
    i.onchange = () => res([...i.files]); i.addEventListener('cancel', () => res([])); i.click();
  });
}
export function download(name, content, type = 'application/json') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

/* ---------- Sons (Web Audio, sans fichier) ---------- */
let actx = null;
export function sound(type = 'click') {
  if ((read('hub.prefs', {}) || {}).sounds === false) return;
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
    o.connect(g); g.connect(actx.destination);
    const S = { click: ['sine', 600, 200, .07, .05], pop: ['sine', 300, 700, .09, .08], success: ['triangle', 440, 880, .11, .16] }[type] || ['sine', 600, 200, .07, .05];
    o.type = S[0]; o.frequency.setValueAtTime(S[1], t); o.frequency.exponentialRampToValueAtTime(S[2], t + S[4]);
    g.gain.setValueAtTime(S[3], t); g.gain.exponentialRampToValueAtTime(.001, t + S[4]);
    o.start(t); o.stop(t + S[4]);
  } catch { }
}

/* ---------- Réglages communs (GitHub + IA) ---------- */
export function getGH() {
  const hub = read('hub.github', {}) || {};
  const vio = read('violette_github', {}) || {};
  const pick = k => (hub[k] || vio[k] || '').trim();
  return { owner: pick('owner'), repo: pick('repo'), branch: pick('branch') || 'main', token: pick('token') };
}
export function setGH(g) {
  const hub = read('hub.github', {}) || {};
  write('hub.github', { ...hub, ...g });
  const vio = read('violette_github', null);
  if (vio) write('violette_github', { ...vio, owner: g.owner, repo: g.repo, branch: g.branch, token: g.token });
}
/* ---------- IA : Google Gemini, appelé directement depuis le téléphone ---------- */
export const AI_MODELS = [['gemini-flash-latest', 'Gemini Flash — rapide (recommandé)'], ['gemini-pro-latest', 'Gemini Pro — le plus fin'], ['gemini-flash-lite-latest', 'Gemini Flash-Lite — économe']];
export const AI_DEFAULT = 'gemini-flash-latest';
const isGeminiModel = m => typeof m === 'string' && m.startsWith('gemini');
const isGeminiKey = k => typeof k === 'string' && k && !k.startsWith('sk-ant');
export function getAI() {
  const ai = read('hub.ai', {}) || {};
  return { key: isGeminiKey(ai.key) ? ai.key : '', model: isGeminiModel(ai.model) ? ai.model : AI_DEFAULT };
}

// Liste des modèles Gemini réellement ouverts à cette clé (Google en retire régulièrement) : demandée à Google, gardée 24 h.
const MODELS_KEY = 'hub.ai.models';
async function availableModels(key) {
  const c = read(MODELS_KEY, null);
  if (c && c.k === key.slice(-6) && Date.now() - c.at < 864e5) return c.list;
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key } });
    if (!r.ok) return null;
    const j = await r.json();
    const list = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => m.name.replace(/^models\//, ''));
    write(MODELS_KEY, { at: Date.now(), k: key.slice(-6), list });
    return list;
  } catch { return null; }
}
function forgetModel(m) { const c = read(MODELS_KEY, null); if (c) write(MODELS_KEY, { ...c, list: c.list.filter(x => x !== m) }); }
const ver = m => parseFloat((m.match(/^gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);
async function modelChain(key, wanted) {
  const list = await availableModels(key);
  if (!list) return [...new Set([wanted, 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-pro-latest'])];
  const stable = kind => list.filter(m => new RegExp(`^gemini-\\d+(?:\\.\\d+)?-${kind}$`).test(m)).sort((a, b) => ver(b) - ver(a));
  const flash = stable('flash'), lite = stable('flash-lite'), pro = stable('pro');
  const kind = /lite/.test(wanted) ? 'lite' : /pro/.test(wanted) ? 'pro' : 'flash';
  const order = kind === 'pro' ? [pro[0], flash[0], lite[0]] : kind === 'lite' ? [lite[0], flash[0], lite[1]] : [flash[0], lite[0], flash[1], pro[0]];
  return [...new Set([list.includes(wanted) ? wanted : null, ...order].filter(Boolean))].slice(0, 4);
}
// Lit le premier objet JSON complet d'une réponse d'IA, même entouré de texte, de ``` ou suivi d'un second bloc.
export function parseJsonLoose(t) {
  t = String(t || '').replace(/```(?:json)?/gi, '');
  const start = t.search(/[{[]/);
  if (start < 0) throw new Error('Réponse IA illisible');
  const stack = []; let inStr = false, esc2 = false, end = -1;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (inStr) { if (esc2) esc2 = false; else if (c === '\\') esc2 = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') stack.push(c === '{' ? '}' : ']');
    else if (c === '}' || c === ']') { stack.pop(); if (!stack.length) { end = i; break; } }
  }
  let s = end > 0 ? t.slice(start, end + 1) : t.slice(start);
  try { return JSON.parse(s); } catch { }
  if (end < 0) s = (inStr ? s + '"' : s).replace(/,\s*$/, '') + stack.reverse().join(''); // réponse coupée en route
  s = s.replace(/,\s*([}\]])/g, '$1'); // virgules en trop
  try { return JSON.parse(s); } catch (e) { throw new Error('Réponse IA illisible, réessaie (' + e.message.slice(0, 60) + ')'); }
}
// parts : chaînes de texte ou { mime, b64 } (images JPEG/PNG, PDF). Renvoie le texte de la réponse.
// search : autorise Gemini à chercher sur Google (comme dans l'appli Gemini) ; abandonné si le modèle ne le permet pas
export async function aiAsk(parts, { key, model, maxTokens = 4000, json = true, search = false } = {}) {
  const ai = getAI(); key = isGeminiKey(key) ? key : ai.key; model = isGeminiModel(model) ? model : ai.model;
  if (!key) throw new Error('Ajoute ta clé Gemini dans les réglages (⚙︎)');
  // Gemini est parfois saturé (« model overloaded », erreurs 503/429) : on réessaie, puis on bascule sur un autre modèle
  const chain = await modelChain(key, model);
  let useSearch = search;
  const makeBody = () => JSON.stringify({
    contents: [{ role: 'user', parts: parts.map(p => typeof p === 'string' ? { text: p } : { inline_data: { mime_type: p.mime, data: p.b64 } }) }],
    ...(useSearch ? { tools: [{ google_search: {} }] } : {}),
    generationConfig: { maxOutputTokens: maxTokens + 8192, /* les modèles récents « réfléchissent » sur ce même budget */ ...(json && !useSearch ? { responseMimeType: 'application/json' } : {}) }
  });
  let body = makeBody();
  // Économe en quota : un modèle saturé (503) est réessayé 2 fois ; un quota atteint (429) n'est JAMAIS réessayé sur le même modèle.
  let lastErr, quotaHit = false, sent = 0;
  for (const m of chain.slice(0, 3)) {
    let pauses = [0, 1500, 4000];
    for (let t = 0; t < pauses.length; t++) {
      if (pauses[t]) await new Promise(r => setTimeout(r, pauses[t]));
      if (sent >= 6) break; // garde-fou : jamais plus de 6 envois pour une même demande
      let r, j;
      try {
        sent++;
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body });
        j = await r.json().catch(() => ({}));
      } catch (e) { lastErr = new Error('IA : réseau indisponible'); continue; }
      const msg = j.error?.message || '';
      if (r.ok) {
        const txt = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
        if (txt) return txt;
        lastErr = new Error('IA : réponse vide' + (j.promptFeedback?.blockReason ? ' (' + j.promptFeedback.blockReason + ')' : ''));
        if (j.promptFeedback?.blockReason) throw lastErr;
        continue;
      }
      lastErr = new Error('IA : ' + (msg || 'HTTP ' + r.status));
      if (r.status === 404 || /not found|not supported|no longer available|deprecated|not available|update your code/i.test(msg)) { forgetModel(m); break; } // modèle retiré : on passe au suivant
      if (useSearch && (r.status === 400 || r.status === 429)) { useSearch = false; body = makeBody(); pauses = [0]; t = -1; continue; } // recherche Google refusée ou hors quota : on réessaie une fois sans
      if (r.status === 429 || /quota|exhausted|rate limit/i.test(msg)) {
        quotaHit = true;
        const wait = parseFloat((j.error?.details || []).find(d => /RetryInfo/.test(d['@type'] || ''))?.retryDelay) || 0;
        if (wait > 0 && wait <= 20 && t === 0) { pauses = [0, wait * 1000 + 500]; continue; } // limite par minute : on attend ce que Google indique, une fois
        break; // quota du jour : on passe au modèle suivant, qui a son propre quota
      }
      const busy = [500, 502, 503, 504].includes(r.status) || /overload|unavailable|try again/i.test(msg);
      if (!busy) throw lastErr; // clé invalide, requête refusée… : inutile d'insister
    }
  }
  if (quotaHit) throw new Error('Quota gratuit de Gemini atteint (par minute ou pour la journée). Réessaie dans une minute ; si ça persiste, c’est le quota du jour : il se réinitialise demain, ou active la facturation sur aistudio.google.com. Suivi : ai.dev/rate-limit');
  const m0 = lastErr?.message || 'IA indisponible';
  throw new Error(/overload|unavailable|503|réseau/i.test(m0) ? 'Gemini est saturé en ce moment, réessaie dans quelques minutes.' : m0);
}

export const setAI = a => write('hub.ai', { ...(read('hub.ai', {}) || {}), ...a });
export const ghReady = () => { const g = getGH(); return !!(g.owner && g.repo && g.token); };

/* ---------- API GitHub (fichiers JSON) ---------- */
const b64e = s => { const b = new TextEncoder().encode(s); let o = ''; for (let i = 0; i < b.length; i += 0x8000) o += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(o); };
const b64d = s => { const bin = atob(String(s).replace(/\s/g, '')); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new TextDecoder().decode(u); };
const ghUrl = p => { const g = getGH(); return `https://api.github.com/repos/${encodeURIComponent(g.owner)}/${encodeURIComponent(g.repo)}/contents/${p.split('/').map(encodeURIComponent).join('/')}`; };
const ghH = (accept = 'application/vnd.github+json') => ({ Authorization: 'Bearer ' + getGH().token, Accept: accept, 'X-GitHub-Api-Version': '2022-11-28' });
async function ghErr(r) { let m = ''; try { m = (await r.json()).message || ''; } catch { } const e = new Error(({ 401: 'Jeton invalide ou expiré', 403: 'Accès refusé par GitHub', 404: 'Dépôt, branche ou fichier introuvable' }[r.status] || 'Erreur GitHub ' + r.status) + (m ? ' (' + m + ')' : '')); e.status = r.status; return e; }
export async function ghGetJSON(path) {
  const q = '?ref=' + encodeURIComponent(getGH().branch);
  const r = await fetch(ghUrl(path) + q, { headers: ghH(), cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw await ghErr(r);
  const j = await r.json();
  let text;
  if (j.content && j.encoding === 'base64') text = b64d(j.content);
  else { const r2 = await fetch(ghUrl(path) + q, { headers: ghH('application/vnd.github.raw+json'), cache: 'no-store' }); if (!r2.ok) throw await ghErr(r2); text = await r2.text(); }
  return { sha: j.sha, json: text.trim() ? JSON.parse(text) : null };
}
export async function ghPutJSON(path, obj, sha, message) {
  const body = { message, content: b64e(JSON.stringify(obj, null, 1)), branch: getGH().branch };
  if (sha) body.sha = sha;
  const r = await fetch(ghUrl(path), { method: 'PUT', headers: { ...ghH(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw await ghErr(r);
  return (await r.json()).content.sha;
}
export async function ghTest() {
  const g = getGH();
  const r = await fetch(`https://api.github.com/repos/${encodeURIComponent(g.owner)}/${encodeURIComponent(g.repo)}`, { headers: ghH() });
  if (!r.ok) throw await ghErr(r);
  const j = await r.json();
  return { name: j.full_name, private: j.private, push: j.permissions?.push !== false };
}

/* ---------- Fusion générique { items:[{id,updatedAt}], tombstones:{} } ---------- */
export function mergeItems(a, b, lists = ['items']) {
  const out = { ...b, ...a };
  out.tombstones = { ...(b.tombstones || {}) };
  for (const [k, v] of Object.entries(a.tombstones || {})) out.tombstones[k] = Math.max(out.tombstones[k] || 0, v);
  for (const L of lists) {
    const m = new Map();
    for (const x of [...(b[L] || []), ...(a[L] || [])]) { const c = m.get(x.id); if (!c || (x.updatedAt || 0) >= (c.updatedAt || 0)) m.set(x.id, x); }
    out[L] = [...m.values()].filter(x => !((out.tombstones[x.id] || 0) >= (x.updatedAt || 0))).sort((p, q) => (p.createdAt || 0) - (q.createdAt || 0) || String(p.id).localeCompare(String(q.id)));
  }
  const sa = a.settingsAt || 0, sb = b.settingsAt || 0;
  if (sb > sa) { out.settings = b.settings; out.settingsAt = sb; } else { out.settings = a.settings; out.settingsAt = sa; }
  out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
  return out;
}
const canonical = (d, lists) => JSON.stringify([lists.map(L => [...(d[L] || [])].sort((x, y) => String(x.id).localeCompare(String(y.id)))), Object.keys(d.tombstones || {}).sort().map(k => [k, d.tombstones[k]]), d.settings || null]);

/* ---------- Synchro d'un document JSON ---------- */
export class DocSync {
  constructor({ key, path, empty, lists = ['items'], merge, onRemote, label = 'Données' }) {
    Object.assign(this, { key, path, empty, lists, label, onRemote });
    this.merge = merge || ((a, b) => mergeItems(a, b, lists));
    this.data = read(key) || empty();
    this.meta = read(key + '.sync', { sha: null, last: 0, dirty: false });
    this.busy = false; this.again = false; this.timer = null; this.state = 'local'; this.err = '';
    this.pills = [];
    addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.sync(); });
    addEventListener('beforeunload', e => { if (this.meta.dirty && ghReady()) { e.preventDefault(); e.returnValue = ''; } });
  }
  pill() { return `<button class="k-pill" data-sync type="button"><span class="dot"></span><span>Local</span></button>`; }
  bindPills(root = document) { $$('[data-sync]', root).forEach(p => { p.onclick = () => ghReady() ? this.sync() : openCommonSettings(); }); this.paint(); }
  paint() {
    const txt = { local: 'Local', pending: 'En attente', busy: 'Synchro…', ok: 'À jour', err: 'Erreur' }[this.state];
    $$('[data-sync]').forEach(p => { p.className = 'k-pill ' + this.state; p.lastElementChild.textContent = txt; p.title = this.err || (this.meta.last ? 'Dernière synchro : ' + new Date(this.meta.last).toLocaleString('fr-FR') : ''); });
  }
  setState(s, err = '') { this.state = s; this.err = err; this.paint(); }
  save() { this.data.updatedAt = now(); write(this.key, this.data); this.meta.dirty = true; write(this.key + '.sync', this.meta); this.schedule(); }
  schedule(ms = 1500) { clearTimeout(this.timer); if (!ghReady()) return this.setState('local'); this.setState('pending'); this.timer = setTimeout(() => this.sync(), ms); }
  async sync() {
    if (!ghReady()) return this.setState('local');
    if (this.busy) { this.again = true; return; }
    this.busy = true; this.setState('busy');
    try {
      for (let i = 0; i < 4; i++) {
        const remote = await ghGetJSON(this.path);
        const rd = remote?.json;
        const merged = rd ? this.merge(this.data, rd) : this.data;
        const localChanged = canonical(merged, this.lists) !== canonical(this.data, this.lists);
        const needPush = !rd || canonical(merged, this.lists) !== canonical(rd, this.lists);
        this.data = merged; write(this.key, this.data);
        if (localChanged) this.onRemote?.(this.data);
        if (!needPush) { this.meta.sha = remote.sha; break; }
        try { this.meta.sha = await ghPutJSON(this.path, this.data, remote?.sha, `${this.label} : mise à jour (${new Date().toLocaleString('fr-FR')})`); break; }
        catch (e) { if ((e.status === 409 || e.status === 422) && i < 3) continue; throw e; }
      }
      this.meta.dirty = false; this.meta.last = now(); write(this.key + '.sync', this.meta); this.setState('ok');
    } catch (e) { console.error(e); this.setState('err', e.message); toast('Synchro GitHub : ' + e.message); }
    finally { this.busy = false; if (this.again) { this.again = false; this.schedule(300); } }
  }
}

/* ---------- Panneau de réglages communs ---------- */
export function commonSettingsHTML() {
  const g = getGH(), a = getAI(), p = read('hub.prefs', {}) || {};
  const f = (id, l, v, at = '') => `<div class="k-field"><label for="${id}">${l}</label><input id="${id}" value="${esc(v)}" ${at}></div>`;
  return `<div class="k-sec acc">Apparence</div>
  <div class="k-chips" id="cTheme">${[['auto', 'Selon le téléphone'], ['light', 'Clair'], ['dark', 'Sombre']].map(([k, l]) => `<button class="k-chip ${(p.theme || 'auto') === k ? 'on' : ''}" data-th="${k}">${l}</button>`).join('')}</div>
  <label class="k-switch">Sons discrets <input type="checkbox" id="cSounds" ${p.sounds === false ? '' : 'checked'}></label>
  <div class="k-sec acc">Dépôt GitHub privé (toutes les apps)</div>
  <div class="k-grid2">${f('cOwner', 'Propriétaire', g.owner, 'autocapitalize="off"')}${f('cRepo', 'Dépôt', g.repo, 'autocapitalize="off"')}</div>
  ${f('cBranch', 'Branche', g.branch, 'autocapitalize="off"')}
  ${f('cToken', 'Jeton (Contents : lecture et écriture)', g.token, 'type="password" autocomplete="off"')}
  ${AI_APPS.includes(CURRENT_APP) ? `<div class="k-sec acc">IA (scan Paperasse, photo Collections, catégories Cha-cha)</div>
  ${f('cAi', 'Clé API Gemini (Google AI Studio)', a.key, 'type="password" autocomplete="off" placeholder="AIza…"')}
  <div class="k-field"><label for="cModel">Modèle</label><select id="cModel">${AI_MODELS.map(([v, l]) => `<option value="${v}" ${v === a.model ? 'selected' : ''}>${l}</option>`).join('')}</select></div>` : ''}
  <p class="k-hint" id="cMsg">Le jeton${AI_APPS.includes(CURRENT_APP) ? ' et la clé restent' : ' reste'} sur ce téléphone.</p>`;
}
export function bindCommonSettings(body, { onSaved } = {}) {
  $$('[data-th]', body).forEach(b => b.onclick = () => { $$('[data-th]', body).forEach(x => x.classList.toggle('on', x === b)); });
  const collect = () => {
    setGH({ owner: $('#cOwner', body).value.trim(), repo: $('#cRepo', body).value.trim(), branch: $('#cBranch', body).value.trim() || 'main', token: $('#cToken', body).value.trim() });
    if ($('#cAi', body)) setAI({ key: $('#cAi', body).value.trim(), model: $('#cModel', body).value });
    const th = $('[data-th].on', body)?.dataset.th || 'auto';
    const prev = read('hub.prefs', {}) || {};
    write('hub.prefs', { ...prev, theme: th, sounds: $('#cSounds', body).checked });
    return prev.theme !== th;
  };
  return {
    collect, async test() {
      collect(); const m = $('#cMsg', body);
      if (!ghReady()) { m.textContent = 'Renseigne propriétaire, dépôt et jeton.'; return; }
      m.textContent = 'Test…';
      try { const t = await ghTest(); m.textContent = `✓ ${t.name}${t.private ? ' (privé)' : ' — ⚠︎ dépôt PUBLIC'}${t.push ? '' : ' — jeton en lecture seule'}`; }
      catch (e) { m.textContent = '✗ ' + e.message; }
    }, onSaved
  };
}
export function openCommonSettings(extraHTML = '', bindExtra) {
  const body = openSheet('Réglages', extraHTML + commonSettingsHTML() + `<div class="k-btns" style="margin-top:6px"><button class="k-btn line" id="cTest">Tester GitHub</button><button class="k-btn" id="cSave">Enregistrer</button></div><button class="k-btn ghost block" id="cLogout" style="margin-top:14px;color:#ff4f5e">Se déconnecter de cet appareil</button>`);
  const s = bindCommonSettings(body);
  bindExtra?.(body);
  $('#cTest', body).onclick = () => s.test();
  $('#cLogout', body).onclick = () => closeSheet(() => logoutDevice());
  $('#cSave', body).onclick = () => { const themeChanged = s.collect(); bindExtra?.(body, true); pushHubPrefs(); closeSheet(() => { if (themeChanged) location.reload(); else { toast('Réglages enregistrés'); dispatchEvent(new Event('k-settings')); } }); };
  return body;
}



/* ---------- Pied de page discret : visite guidée + remarques ---------- */
function addFooter(appId) {
  if (document.querySelector('.k-foot')) return;
  const f = document.createElement('div'); f.className = 'k-foot';
  if (hasTour(appId)) { tourCSS(); f.innerHTML += `<button type="button" data-foot="tour">✦ Visite guidée</button><span aria-hidden="true">·</span>`; }
  f.innerHTML += `<button type="button" data-foot="fb">✎ Remarque${openNotes(appId) ? ` <b>${openNotes(appId)}</b>` : ''}</button><span aria-hidden="true">·</span><span title="Version de l'appli">v${APP_VERSION}</span>`;
  f.onclick = e => { const b = e.target.closest('[data-foot]'); if (!b) return; b.dataset.foot === 'tour' ? startTour(appId) : openFeedback(appId); };
  const nav = document.querySelector('.k-nav, nav.bottom, nav.bottom-nav');
  document.body.insertBefore(f, nav && nav.parentElement === document.body ? nav : null);
}
const refreshFooter = appId => { const b = document.querySelector('[data-foot="fb"]'); if (b) { const n = openNotes(appId); b.innerHTML = `✎ Remarque${n ? ` <b>${n}</b>` : ''}`; } };

/* ---------- Remarques pour améliorer les applis (JSON_FEEDBACK.json) ---------- */
// Tu notes ce qui ne va pas ou ce qui manque, appli par appli ; Claude lit ce fichier quand tu le lui demandes
// et applique les correctifs, puis passe chaque remarque à « fait » avec un mot d'explication.
const FB_KINDS = [['bug', 'Bug'], ['idee', 'Idée'], ['design', 'Design'], ['texte', 'Texte']];
const FB_STATUS = { ouvert: ['Ouverte', ''], fait: ['Faite', 'ok'], abandon: ['Abandonnée', 'mut'] };
let fbDoc = null;
function feedbackDoc() {
  return fbDoc ||= new DocSync({ key: 'hub.feedback.v1', path: 'JSON_FEEDBACK.json', label: 'Remarques', lists: ['notes'],
    empty: () => ({ app: 'feedback', schema: 1, notes: [], tombstones: {}, settings: {}, settingsAt: 0 }),
    onRemote: () => { refreshFooter(CURRENT_APP); if (fbBody?.isConnected) drawFeedback(); } });
}
const openNotes = appId => (read('hub.feedback.v1', {})?.notes || []).filter(n => n.app === appId && n.status === 'ouvert').length;
let fbBody = null, fbAll = false, fbKind = 'idee';
function drawFeedback() {
  const d = feedbackDoc(), app = CURRENT_APP;
  const list = d.data.notes.filter(n => fbAll || n.app === app).sort((a, b) => (a.status === 'ouvert' ? 0 : 1) - (b.status === 'ouvert' ? 0 : 1) || b.createdAt - a.createdAt);
  const name = id => id === 'hub' ? 'Accueil' : (appById(id)?.name || id);
  $('#fbList', fbBody).innerHTML = list.length ? list.map(n => `<div class="k-card" style="padding:10px 12px;margin-bottom:8px">
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:4px"><span class="k-tag ${FB_STATUS[n.status]?.[1] || ''}">${FB_STATUS[n.status]?.[0] || n.status}</span><span class="k-tag mut">${esc(FB_KINDS.find(k => k[0] === n.kind)?.[1] || n.kind)}</span>${fbAll ? `<span class="k-tag mut">${esc(name(n.app))}</span>` : ''}<small style="color:var(--mut);margin-left:auto">${new Date(n.createdAt).toLocaleDateString('fr-FR')}</small></div>
      <div style="white-space:pre-wrap;font-size:14px">${esc(n.text)}</div>
      ${n.reply ? `<div class="k-hint" style="margin-top:6px">↳ ${esc(n.reply)}</div>` : ''}
      <div style="display:flex;gap:6px;margin-top:8px">${n.status === 'ouvert' ? `<button class="k-btn ghost sm" data-fb-done="${n.id}">Marquer faite</button>` : `<button class="k-btn ghost sm" data-fb-open="${n.id}">Rouvrir</button>`}<button class="k-btn ghost sm" data-fb-del="${n.id}" style="color:#ff4f5e">Supprimer</button></div></div>`).join('')
    : `<p class="k-hint" style="text-align:center">Aucune remarque${fbAll ? '' : ' pour cette appli'} pour l’instant.</p>`;
}
export function openFeedback(appId = CURRENT_APP) {
  const d = feedbackDoc(); d.sync();
  fbBody = openSheet('Remarques', `
    <p class="k-hint" style="margin-top:0">Note ce qui ne va pas ou ce qui manque dans <b>${esc(appId === 'hub' ? 'l’accueil' : appById(appId)?.name || appId)}</b>. Quand tu le demandes, Claude lit toutes les remarques et applique les correctifs.</p>
    <div class="k-chips" id="fbKind">${FB_KINDS.map(([k, l]) => `<button class="k-chip ${k === fbKind ? 'on' : ''}" data-k="${k}">${l}</button>`).join('')}</div>
    <div class="k-field"><textarea id="fbText" rows="4" placeholder="Ex. « Le bouton Fait est trop petit », « Ajouter le tri par date »…" style="width:100%;resize:vertical"></textarea></div>
    <button class="k-btn block" id="fbAdd">Ajouter la remarque</button>
    <div style="display:flex;align-items:center;margin:18px 0 8px"><div class="k-sec" style="margin:0;flex:1">Remarques</div><label class="k-switch" style="margin:0;font-size:12.5px">Toutes les applis <input type="checkbox" id="fbAll" ${fbAll ? 'checked' : ''}></label></div>
    <div id="fbList"></div>`, { onClose: () => { fbBody = null; refreshFooter(appId); } });
  $$('[data-k]', fbBody).forEach(b => b.onclick = () => { fbKind = b.dataset.k; $$('[data-k]', fbBody).forEach(x => x.classList.toggle('on', x === b)); });
  $('#fbAll', fbBody).onchange = e => { fbAll = e.target.checked; drawFeedback(); };
  $('#fbAdd', fbBody).onclick = () => {
    const text = $('#fbText', fbBody).value.trim(); if (!text) return toast('Écris ta remarque');
    const t = now();
    d.data.notes.push({ id: uid(), app: appId, kind: fbKind, text, status: 'ouvert', reply: '', where: location.pathname.split('/').pop() + location.hash,
      theme: document.documentElement.dataset.theme || 'light', screen: `${innerWidth}×${innerHeight}`, device: /Mobi/i.test(navigator.userAgent) ? 'téléphone' : 'ordinateur', createdAt: t, updatedAt: t });
    d.save(); $('#fbText', fbBody).value = ''; drawFeedback(); refreshFooter(appId); toast('Remarque ajoutée');
  };
  fbBody.addEventListener('click', e => {
    const b = e.target.closest('[data-fb-done],[data-fb-open],[data-fb-del]'); if (!b) return;
    const id = b.dataset.fbDone || b.dataset.fbOpen || b.dataset.fbDel, n = d.data.notes.find(x => x.id === id); if (!n) return;
    if (b.dataset.fbDel) { if (!confirm('Supprimer cette remarque ?')) return; d.data.notes = d.data.notes.filter(x => x.id !== id); d.data.tombstones[id] = now(); }
    else { n.status = b.dataset.fbDone ? 'fait' : 'ouvert'; n.updatedAt = now(); }
    d.save(); drawFeedback(); refreshFooter(appId);
  });
  drawFeedback();
}

/* ---------- Se déconnecter de cet appareil ---------- */
// Efface de ce navigateur le jeton GitHub, la clé Gemini et toutes les données des applis.
// Rien n'est effacé sur GitHub : il suffit de saisir le jeton sur un autre appareil pour tout retrouver.
const OWN_PREFIXES = ['hub.', 'violette_', 'collections.', 'paperasse.', 'budget.', 'habits.', 'garage.', 'colis.', 'animaux.', 'plantes.', 'passerelle.', 'liquid_budget_'];
export function unsyncedApps() {
  const out = new Set();
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.endsWith('.sync') && read(k, {})?.dirty) out.add(k.split('.')[0]);
  }
  for (const a of ['paperasse', 'collections']) {
    const m = read(a + '.sync.v1', null) || {}, d = read(a + '.data.v1', null);
    if (d && (m.dirty || (m.pendingMedia || []).length || ((d.updatedAt || 0) > (m.lastSync || 0) && (d.docs || d.items || []).length))) out.add(a);
  }
  return [...out].map(id => appById(id)?.name || (id === 'hub' ? 'Accueil' : id));
}
async function wipeDevice() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (OWN_PREFIXES.some(p => k.startsWith(p))) keys.push(k); }
  keys.forEach(k => localStorage.removeItem(k));
  try { sessionStorage.clear(); } catch { }
  for (const db of ['paperasse-media', 'collections-media']) { try { indexedDB.deleteDatabase(db); } catch { } }
  try { for (const c of await caches.keys()) if (/^(gestion|violette)-/.test(c)) await caches.delete(c); } catch { }
  try { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch { }
}
export function logoutDevice() {
  const pend = unsyncedApps(), gh = ghReady();
  const body = openSheet('Se déconnecter de cet appareil', `
    <p>Ce navigateur va oublier <b>le jeton GitHub, la clé Gemini et toutes les données</b> des applis (photos et PDF compris).</p>
    <p class="k-hint">Rien n'est effacé sur GitHub : sur ton téléphone ou un autre ordinateur, tout reste là.</p>
    ${pend.length ? `<div class="k-card" style="border:2px solid #ff4f5e"><b>⚠︎ Pas encore envoyé sur GitHub :</b> ${esc(pend.join(', '))}.<br><span class="k-hint">${gh ? 'Ouvre ces applis et attends « À jour » avant de te déconnecter, sinon ces modifications seront perdues.' : 'Le jeton n’est pas renseigné : ces modifications n’existent que sur cet appareil.'}</span></div>` : ''}
    <p class="k-hint">Pense aussi à fermer la fenêtre du navigateur. Si tu as oublié de te déconnecter d'un ordinateur, supprime le jeton sur GitHub (Settings → Developer settings → Personal access tokens) : il ne servira plus à rien, puis crée-en un nouveau.</p>
    <div class="k-btns" style="margin-top:10px"><button class="k-btn line" id="loCancel">Annuler</button><button class="k-btn danger" id="loGo">${pend.length ? 'Effacer quand même' : 'Se déconnecter'}</button></div>`);
  $('#loCancel', body).onclick = () => closeSheet();
  $('#loGo', body).onclick = async () => { $('#loGo', body).disabled = true; await wipeDevice(); location.replace('./index.html'); };
}

/* ---------- Navigation basse ---------- */
export function nav(tabs, { active, fab } = {}) {
  const el = document.createElement('nav'); el.className = 'k-nav';
  const half = Math.ceil(tabs.length / 2);
  const btn = t => `<button data-tab="${t.id}" class="${t.id === active ? 'on' : ''}">${esc(t.label)}</button>`;
  el.innerHTML = tabs.slice(0, half).map(btn).join('') + (fab ? `<button class="k-fab" aria-label="Ajouter">＋</button>` : '') + tabs.slice(half).map(btn).join('');
  document.body.appendChild(el);
  return el;
}

// Visite guidée (« room tour ») : un petit lien discret en bas de chaque appli lance une série de bulles
// qui montrent, élément par élément, comment se servir de l'appli. Rien n'est lancé tout seul.

const TOURS = {
  hub: [
    { sel: '.k-hero .k-ring', title: 'Tes applis', text: 'Chaque rond ouvre une appli. La couleur du rond, c’est la couleur de l’appli.' },
    { sel: '#quest', title: 'La quête du jour', text: 'Rocket remonte ici la chose la plus urgente, toutes applis confondues : une échéance, un vermifuge, un entretien…' },
    { sel: '#glance', title: 'En un coup d’œil', text: 'Une ligne par appli. Un « ! » rouge veut dire qu’il y a du retard. Touche une ligne pour ouvrir l’appli.' },
    { sel: '#set', title: 'Réglages', text: 'Le jeton GitHub (une seule fois pour toutes les applis), la clé Gemini, ton prénom, le thème clair ou sombre, et « Se déconnecter de cet appareil ».' },
  ],
  violette: [
    { sel: '.k-hero .k-ring', title: 'Raccourcis', text: 'Résumé, Stocks et Menus : les trois parties de l’appli, aussi accessibles par la barre du bas.' },
    { sel: '#syncBadge', title: 'Synchro', text: 'L’état de la sauvegarde sur GitHub. Touche-le pour voir le détail ou relancer la synchro.' },
    { sel: '[data-tab="stocks"]', click: '[data-tab="stocks"]', title: 'Stocks', text: 'Tous les pots du congélateur. Ajoute, retire, filtre cru/cuit, et ouvre une fiche pour voir la famille et l’âge conseillé.' },
    { sel: '[data-tab="menus"]', click: '[data-tab="menus"]', title: 'Menus', text: 'La semaine de Violette. « ✨ Remplir les vides » propose des repas selon le stock et la frise ; « ✓ Repas pris » retire les pots.' },
    { sel: '#settingsBtn', click: '[data-tab="summary"]', title: 'Réglages', text: 'Les réglages propres à Violette : protéines selon la frise, repas affichés, sauvegarde.' },
  ],
  habits: [
    { sel: '#main .k-card||#main', title: 'Météo du jour', text: 'La météo du lieu choisi, heure par heure. Touche un moment de la journée pour adapter la tenue.' },
    { sel: '#geo', title: 'Ma position', text: 'Utilise la position du téléphone pour la météo (il te la demande une seule fois).' },
    { sel: '#sMaison', title: 'Température de la maison', text: 'Ajuste le curseur selon le thermomètre : la tenue de jour suit.' },
    { sel: '#sChambre', title: 'Température de la chambre', text: 'Pareil pour la nuit : pyjama, body et turbulette suivent.' },
    { sel: '#rules', title: 'Tes règles', text: 'Le tableau qui décide quoi mettre selon la température. Tout est modifiable, et synchronisé.' },
  ],
  animaux: [
    { sel: '.k-hero .k-ring||.k-hero', title: 'Tes animaux', text: 'Touche un portrait pour ouvrir sa fiche : poids, visites chez le vétérinaire, rappels.' },
    { sel: '#main .k-card||#main', title: 'Rappels', text: 'Vermifuges et vaccins, du plus urgent au moins urgent. « Fait » enregistre la date et crée le rappel suivant.' },
    { sel: '.k-fab', title: 'Ajouter', text: 'Une pesée, un rendez-vous chez le vétérinaire, un rappel ou un nouvel animal.' },
    { sel: '[data-sync]', title: 'Synchro', text: 'Vert : tout est sauvegardé sur GitHub. Touche pour relancer.' },
  ],
  plantes: [
    { sel: '#main .k-card||#main', title: 'Calendrier', text: 'Les tailles à faire, mois par mois. Touche une plante puis « Taille faite » : la prochaine se programme toute seule.' },
    { sel: '[data-tab="all"]', title: 'Recherche', text: 'Retrouve une plante par son nom, son type ou son emplacement.' },
    { sel: '.k-fab', title: 'Ajouter une plante', text: 'Nom, emplacement, comment la tailler et quand.' },
    { sel: '#set', title: 'Réglages', text: 'Le mois de l’engrais pour tout le jardin.' },
  ],
  budget: [
    { sel: '.k-hero .k-ring', title: 'Le mois en un coup d’œil', text: 'Solde, revenus, dépenses inévitables et évitables de la période choisie.' },
    { sel: '#per', title: 'Période', text: 'Change de mois ou regarde l’année entière.' },
    { sel: '.k-fab', title: 'Importer', text: 'Importe un relevé CSV de ta banque : les opérations sont classées automatiquement (règles, ce que l’appli a appris de tes choix, puis Gemini avec les seuls libellés).' },
    { sel: '[data-tab="ops"]', click: '[data-tab="ops"]', title: 'Opérations', text: 'Touche une opération pour changer sa catégorie : l’appli s’en souvient pour les suivantes. Le pas-à-pas classe celles qui restent.' },
    { sel: '[data-tab="wish"]', click: '[data-tab="wish"]', title: 'Achats', text: 'Ta liste d’achats. Selon le solde de fin de mois, Cha-cha propose quoi acheter, par ordre d’importance.' },
    { sel: '#set', click: '[data-tab="dash"]', title: 'Réglages', text: 'La réserve à garder, tes catégories et la sauvegarde.' },
  ],
  garage: [
    { sel: '.k-hero .k-ring', title: 'L’état de la voiture', text: 'Le compteur, les entretiens en retard ou bientôt dus, et ce que tu as dépensé. Touche « Compteur » pour saisir les km.' },
    { sel: '#main .k-card||#main', title: 'À faire', text: 'Chaque entretien avec sa prochaine échéance, en km et en date. Touche-le pour le modifier.' },
    { sel: '.k-fab', title: 'C’est fait', text: 'Coche ce que le garage a fait, avec le prix : les prochaines échéances se recalculent.' },
    { sel: '[data-tab="hist"]', click: '[data-tab="hist"]', title: 'Historique', text: 'Toutes les interventions, année par année, avec le total.' },
    { sel: '#set', click: '[data-tab="todo"]', title: 'Réglages', text: 'Le nom de la voiture et les km par an, pour estimer les échéances.' },
  ],
  colis: [
    { sel: '#main .k-card||#main', title: 'En cours', text: 'Tes commandes en route. « Arrivé au relais » lance le compte à rebours de retrait, « Récupéré » le range.' },
    { sel: '.k-fab', title: 'Ajouter un colis', text: 'Colle le numéro de suivi : le transporteur est reconnu et le lien de suivi prêt.' },
    { sel: '[data-tab="recus"]', click: '[data-tab="recus"]', title: 'Reçus', text: 'L’historique. Depuis un colis, « Garantie → Paperasse » crée la fiche de garantie (2 ans).' },
    { sel: '#set', click: '[data-tab="cours"]', title: 'Réglages', text: 'Le délai de retrait en point relais.' },
  ],
  paperasse: [
    { sel: '.k-hero .k-ring', title: 'Ce qui compte', text: 'Les échéances en retard, celles des 30 prochains jours, les garanties actives et les documents à traiter.' },
    { sel: '#fab', title: 'Scanner un document', text: 'Photo ou PDF. Le téléphone lit le texte, masque montants, dates, numéros et noms, puis Gemini le classe. Vérifie la fiche avant d’enregistrer.' },
    { sel: '[data-nav="#/agenda"]', click: '[data-nav="#/agenda"]', title: 'Agenda', text: 'Toutes les échéances : paiements, fins de contrat, garanties. Chacune s’exporte en rappel dans l’agenda du téléphone.' },
    { sel: '[data-nav="#/todo"]', click: '[data-nav="#/todo"]', title: 'À traiter', text: 'Ce qui demande une action et ce qui n’est pas encore classé.' },
    { sel: '#settingsBtn', click: '[data-nav="#/"]', title: 'Réglages', text: 'Les noms à masquer avant l’envoi à l’IA, le délai des rappels et la sauvegarde.' },
  ],
  collections: [
    { sel: '.k-hero .k-ring', title: 'Ta collection', text: 'Objets possédés, envies, prêts en cours et nombre de collections.' },
    { sel: '#fab', title: 'Ajouter', text: 'En photo (un objet ou toute une étagère : Gemini les reconnaît), par code-barres, ou à la main.' },
    { sel: '[data-nav="#/all"]', click: '[data-nav="#/all"]', title: 'Tout', text: 'Tous tes objets, à filtrer et trier.' },
    { sel: '[data-nav="#/suivi"]', click: '[data-nav="#/suivi"]', title: 'Suivi', text: 'Ce que tu as prêté (et à qui), et ta liste d’envies.' },
    { sel: '#settingsBtn', click: '[data-nav="#/"]', title: 'Réglages', text: 'La clé Gemini et la sauvegarde.' },
  ],
};

const CSS = `
.k-tour{position:fixed;inset:0;z-index:9999}
.k-tour-spot{position:fixed;border-radius:16px;box-shadow:0 0 0 9999px rgba(20,18,30,.58);transition:all .28s cubic-bezier(.3,.7,.3,1);pointer-events:none;outline:2px solid var(--acc,#ff7a59);outline-offset:2px}
.k-tour-card{position:fixed;left:50%;width:min(320px,calc(100vw - 28px));transform:translateX(-50%);background:var(--card,#fffdf8);color:var(--ink,#26233a);border-radius:18px;padding:14px 16px 12px;box-shadow:0 14px 40px rgba(0,0,0,.28);transition:top .28s,bottom .28s;font-family:Inter,system-ui,sans-serif}
.k-tour-card h3{margin:0 0 4px;font-size:15px}
.k-tour-card p{margin:0;font-size:13.5px;line-height:1.45;color:var(--ink,#26233a)}
.k-tour-foot{display:flex;align-items:center;gap:8px;margin-top:12px}
.k-tour-dots{display:flex;gap:4px;flex:1}
.k-tour-dots i{width:6px;height:6px;border-radius:3px;background:var(--line,#ebe3d3)}
.k-tour-dots i.on{width:16px;background:var(--acc,#ff7a59)}
.k-tour-foot button{border:0;border-radius:10px;padding:7px 12px;font:600 13px Inter,system-ui,sans-serif;cursor:pointer}
.k-tour-skip{background:none;color:var(--mut,#8a8496)}
.k-tour-prev{background:var(--soft,#eee);color:var(--ink,#26233a)}
.k-tour-next{background:var(--acc,#ff7a59);color:#fff}`;

function rectOf(sel) {
  for (const one of sel.split('||')) { const r = rectOf1(one.trim()); if (r) return r; }
  return null;
}
function rectOf1(sel) {
  const els = [...document.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && getComputedStyle(e).visibility !== 'hidden'; });
  if (!els.length) return null;
  const rs = els.map(e => e.getBoundingClientRect());
  const l = Math.min(...rs.map(r => r.left)), t = Math.min(...rs.map(r => r.top)), r = Math.max(...rs.map(r => r.right)), b = Math.max(...rs.map(r => r.bottom));
  return { el: els[0], left: l, top: t, width: r - l, height: b - t };
}
const wait = ms => new Promise(r => setTimeout(r, ms));

export function startTour(appId) {
  const steps = TOURS[appId]; if (!steps?.length) return;
  const root = document.createElement('div'); root.className = 'k-tour'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
  root.innerHTML = `<div class="k-tour-spot"></div><div class="k-tour-card" aria-live="polite"><h3></h3><p></p><div class="k-tour-foot"><span class="k-tour-dots">${steps.map(() => '<i></i>').join('')}</span><button class="k-tour-skip">Passer</button><button class="k-tour-prev">‹</button><button class="k-tour-next">Suivant</button></div></div>`;
  document.body.appendChild(root);
  const spot = root.querySelector('.k-tour-spot'), card = root.querySelector('.k-tour-card');
  let i = 0, busy = false;
  const close = () => { root.remove(); removeEventListener('keydown', onKey); removeEventListener('resize', place); const last = steps.findLast(s => s.click); const home = steps[steps.length - 1].click; if (last && home) document.querySelector(home)?.click(); };
  const place = () => {
    const s = steps[i], r = s.sel && rectOf(s.sel);
    if (!r) { spot.style.cssText = 'left:50%;top:40%;width:0;height:0'; card.style.top = '50%'; card.style.bottom = ''; card.style.transform = 'translate(-50%,-50%)'; return; }
    const pad = 6;
    spot.style.left = r.left - pad + 'px'; spot.style.top = r.top - pad + 'px'; spot.style.width = r.width + pad * 2 + 'px'; spot.style.height = r.height + pad * 2 + 'px';
    card.style.transform = 'translateX(-50%)';
    const below = r.top + r.height / 2 < innerHeight / 2;
    if (below) { card.style.top = Math.min(innerHeight - 200, r.top + r.height + pad + 12) + 'px'; card.style.bottom = ''; }
    else { card.style.bottom = Math.min(innerHeight - 200, innerHeight - r.top + pad + 12) + 'px'; card.style.top = ''; }
  };
  const show = async () => {
    if (busy) return; busy = true;
    const s = steps[i];
    if (s.click) { document.querySelector(s.click)?.click(); await wait(260); }
    const r = s.sel && rectOf(s.sel);
    if (r && (r.top < 70 || r.top + Math.min(r.height, 240) > innerHeight - 90)) { r.el.scrollIntoView({ block: 'center', behavior: 'smooth' }); await wait(380); }
    card.querySelector('h3').textContent = s.title; card.querySelector('p').textContent = s.text;
    card.querySelectorAll('.k-tour-dots i').forEach((d, k) => d.classList.toggle('on', k === i));
    card.querySelector('.k-tour-prev').style.visibility = i ? 'visible' : 'hidden';
    card.querySelector('.k-tour-next').textContent = i === steps.length - 1 ? 'Terminer' : 'Suivant';
    place(); busy = false;
  };
  const go = d => { if (busy) return; const n = i + d; if (n < 0) return; if (n >= steps.length) return close(); i = n; show(); };
  const onKey = e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); };
  root.querySelector('.k-tour-next').onclick = () => go(1);
  root.querySelector('.k-tour-prev').onclick = () => go(-1);
  root.querySelector('.k-tour-skip').onclick = close;
  root.addEventListener('click', e => { if (e.target === root) go(1); });
  addEventListener('keydown', onKey); addEventListener('resize', place);
  show();
}

export const hasTour = appId => !!TOURS[appId]?.length;
export function tourCSS() { if (!document.getElementById('k-tour-css')) { const st = document.createElement('style'); st.id = 'k-tour-css'; st.textContent = CSS; document.head.appendChild(st); } }

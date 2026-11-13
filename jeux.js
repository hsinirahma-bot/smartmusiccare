/* ============================================================
   Jeux — SmartMusicCare
   Recommande un jeu selon le profil de l'enfant
   ============================================================ */

// ============================================================
// 1. DÉCOR DE FOND
// ============================================================

const cloudsLayer = document.getElementById('cloudsLayer');
const balloonsLayer = document.getElementById('balloonsLayer');
const notesLayer = document.getElementById('notesLayer');

function spawnCloud() {
  const c = document.createElement('div');
  c.className = 'cloud';
  c.style.cssText = `
    position: absolute;
    width: 100px; height: 38px;
    background: rgba(255,255,255,0.9);
    border-radius: 100px;
    top: ${5 + Math.random() * 35}%;
    animation: cloudDrift ${50 + Math.random() * 40}s linear infinite;
    animation-delay: ${-Math.random() * 20}s;
  `;
  cloudsLayer.appendChild(c);
}
for (let i = 0; i < 3; i++) spawnCloud();

const BALLOON_COLORS = [
  'radial-gradient(circle at 30% 30%, #ff9ec4, #e84a7f)',
  'radial-gradient(circle at 30% 30%, #8be3ff, #2e8f88)',
  'radial-gradient(circle at 30% 30%, #c3b5ff, #6b5ce0)',
  'radial-gradient(circle at 30% 30%, #ffe08a, #f0a500)',
];
function spawnBalloon() {
  const b = document.createElement('div');
  b.className = 'balloon';
  const duration = 14 + Math.random() * 10;
  b.style.cssText = `
    position: absolute;
    width: 40px; height: 52px;
    border-radius: 50% 50% 50% 50% / 55% 55% 45% 45%;
    opacity: 0.8;
    left: ${Math.random() * 90}%;
    background: ${BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)]};
    animation: balloonFloat ${duration}s linear infinite;
    animation-delay: ${Math.random() * 3}s;
  `;
  balloonsLayer.appendChild(b);
  setTimeout(() => b.remove(), (duration + 5) * 1000);
}
setInterval(spawnBalloon, 2500);
for (let i = 0; i < 3; i++) setTimeout(spawnBalloon, i * 600);

function spawnNote() {
  const n = document.createElement('div');
  const size = 26 + Math.random() * 20;
  const duration = 12 + Math.random() * 8;
  const shapes = [
    `<svg viewBox="0 0 24 24"><path fill="#ff8fab" d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>`,
    `<svg viewBox="0 0 24 24"><path fill="#4fd1c5" d="M9 3v10.55A4 4 0 1 0 11 17V7h6V3H9z"/></svg>`,
    `<svg viewBox="0 0 24 24"><path fill="#ffd166" d="M9 3v10.55A4 4 0 1 0 11 17V7h6V3H9z"/></svg>`,
  ];
  n.style.cssText = `
    position: absolute;
    width: ${size}px; height: ${size}px;
    left: ${Math.random() * 92}%;
    opacity: 0;
    animation: floatNote ${duration}s linear infinite;
    animation-delay: ${Math.random() * 3}s;
  `;
  n.innerHTML = shapes[Math.floor(Math.random() * shapes.length)];
  notesLayer.appendChild(n);
  setTimeout(() => n.remove(), (duration + 5) * 1000);
}
setInterval(spawnNote, 1800);

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes cloudDrift {
    0%   { transform: translateX(-200px); }
    100% { transform: translateX(calc(100vw + 200px)); }
  }
  .cloud::before, .cloud::after {
    content: ""; position: absolute; background: inherit; border-radius: 50%;
  }
  .cloud::before { width: 50px; height: 50px; top: -22px; left: 15px; }
  .cloud::after  { width: 38px; height: 38px; top: -16px; left: 52px; }
  @keyframes balloonFloat {
    0%   { transform: translateY(110vh) rotate(-6deg); }
    50%  { transform: translateY(50vh) rotate(6deg); }
    100% { transform: translateY(-25vh) rotate(-6deg); }
  }
  @keyframes floatNote {
    0%   { transform: translateY(110vh) rotate(-15deg) scale(0.9); opacity: 0; }
    10%  { opacity: 1; }
    85%  { opacity: 1; }
    100% { transform: translateY(-15vh) rotate(25deg) scale(1.15); opacity: 0; }
  }
`;
document.head.appendChild(styleSheet);

// ============================================================
// 2. AUDIO + VOIX
// ============================================================

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new AudioCtx();
}

function playTone(freq, duration, type = 'sine', gainValue = 0.2) {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(gainValue, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

function playClick() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  playTone(880, 0.08, 'sine', 0.2);
}

let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
['click', 'touchstart', 'keydown'].forEach(evt => {
  window.addEventListener(evt, unlockAudio, { once: true, passive: true });
});

const synth = window.speechSynthesis;
let preferredVoice = null;

function loadVoices() {
  const voices = synth.getVoices();
  if (!voices.length) return;
  const fr = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('fr'));
  preferredVoice = (fr.length ? fr : voices)[0];
}
if ('speechSynthesis' in window) {
  synth.onvoiceschanged = loadVoices;
  loadVoices();
  setTimeout(loadVoices, 300);
  setTimeout(loadVoices, 1000);
}

function speak(text) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) { resolve(); return; }
    try { synth.cancel(); } catch (e) {}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.95;
    u.pitch = 1.4;
    u.volume = 1;
    if (preferredVoice) u.voice = preferredVoice;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      document.getElementById('milo').classList.remove('speaking');
      resolve();
    };
    u.onstart = () => document.getElementById('milo').classList.add('speaking');
    const safety = setTimeout(finish, Math.max(1500, text.length * 90 + 800));
    u.onend = () => { clearTimeout(safety); finish(); };
    u.onerror = () => { clearTimeout(safety); finish(); };
    try { synth.speak(u); } catch (e) { clearTimeout(safety); finish(); }
  });
}

function showSpeech(text) {
  document.getElementById('speechText').textContent = text;
}

// ============================================================
// 3. CHARGEMENT DU PROFIL
// ============================================================

function loadProfile() {
  try {
    const raw = localStorage.getItem('smc_profile');
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && data.profile ? data : null;
  } catch (e) { return null; }
}

let currentProfile = loadProfile();

const gamesGrid = document.getElementById('gamesGrid');
const noProfile = document.getElementById('noProfile');
const recommendation = document.getElementById('recommendation');
const recoText = document.getElementById('recoText');

if (!currentProfile) {
  // Pas de profil → cacher la grille, afficher le message
  gamesGrid.style.display = 'none';
  recommendation.hidden = true;
  noProfile.hidden = false;
  document.getElementById('profileLabel').textContent = 'Aucun profil actif';
} else {
  document.getElementById('profileLabel').textContent =
    `Profil : ${currentProfile.profile.id}`;
  gamesGrid.style.display = '';
  noProfile.hidden = true;
}

document.getElementById('goProfileBtn')?.addEventListener('click', () => {
  playClick();
  window.location.href = 'questionnaire-parent.html';
});

// ============================================================
// 4. RECOMMANDATION DU JEU
// ============================================================

/**
 * Analyse le profil pour recommander un jeu :
 *   - 'chef-orchestre' → attention, imitation
 *   - 'detective'      → attention, expression, communication
 *   - 'dialogue'       → interaction, engagement
 */
function recommendGame(profile) {
  if (!profile) return null;

  const p = profile.profile;
  const scores = {
    'chef-orchestre': 0,
    'detective': 0,
    'dialogue': 0,
  };

  // --- 1. Priorité (needs.priority_need) ---
  const priority = p.needs?.priority_need;
  if (priority === 'attention')       scores['chef-orchestre'] += 3;
  if (priority === 'imitation')       scores['chef-orchestre'] += 4;
  if (priority === 'engagement')      scores['dialogue'] += 3;
  if (priority === 'interaction')     scores['dialogue'] += 4;
  if (priority === 'communication')   scores['detective'] += 3;
  if (priority === 'expression')      scores['detective'] += 4;

  // --- 2. Objectifs (goals.goal_1 et goal_2) ---
  const goals = [p.goals?.goal_1, p.goals?.goal_2].filter(Boolean);
  goals.forEach(g => {
    if (g === 'participation') scores['chef-orchestre'] += 2;
    if (g === 'attention')     scores['detective'] += 2;
    if (g === 'imitation')     scores['chef-orchestre'] += 3;
    if (g === 'exchange')      scores['dialogue'] += 3;
    if (g === 'expression')    scores['detective'] += 3;
  });

  // --- 3. Préférence sociale ---
  const social = p.needs?.social_preference;
  if (social === 'individual') {
    scores['chef-orchestre'] += 1;
    scores['detective'] += 1;
  }
  if (social === 'with_adult' || social === 'group') {
    scores['dialogue'] += 2;
  }

  // --- 4. Niveau d'engagement ---
  const engagement = p.needs?.engagement_level;
  if (engagement === 'difficult' || engagement === 'variable') {
    scores['chef-orchestre'] += 1; // jeu court et progressif
  }

  // --- 5. Instruments / préférences musicales (bonus) ---
  const instruments = p.music_preferences?.instruments || [];
  if (instruments.includes('drum'))     scores['chef-orchestre'] += 2;
  if (instruments.includes('piano'))    scores['detective'] += 1;
  if (instruments.includes('flute'))    scores['detective'] += 1;
  if (instruments.includes('voice'))    scores['dialogue'] += 1;

  // --- 6. Questionnaire enfant : préférences déclarées ---
  const child = p.child_questionnaire;
  if (child) {
    const liked = child.liked_instruments || [];
    if (liked.includes('drum'))  scores['chef-orchestre'] += 2;
    if (liked.includes('piano')) scores['detective'] += 1;
    if (liked.includes('flute')) scores['detective'] += 1;

    const likedMusic = child.liked_music_types || [];
    if (likedMusic.includes('rhythmic')) scores['chef-orchestre'] += 1;
    if (likedMusic.includes('songs'))    scores['dialogue'] += 1;
    if (likedMusic.includes('soft'))     scores['detective'] += 1;
  }

  // --- 7. Sensibilité auditive ---
  const sensitivity = p.needs?.auditory_sensitivity;
  const loudReaction = p.needs?.loud_sound_reaction;
  if (sensitivity === 'yes' || loudReaction === 'avoids' || loudReaction === 'bothered') {
    scores['detective'] += 1; // reconnaissance = volume maîtrisé
    scores['chef-orchestre'] += 1;
  }

  // Trouver le jeu avec le score le plus haut
  let best = 'chef-orchestre';
  let bestScore = -1;
  for (const game in scores) {
    if (scores[game] > bestScore) {
      bestScore = scores[game];
      best = game;
    }
  }

  return { game: best, scores, bestScore };
}

// ============================================================
// 5. APPLICATION DE LA RECOMMANDATION
// ============================================================

const GAME_NAMES = {
  'chef-orchestre': "Chef d'orchestre",
  'detective': "Détective musical",
  'dialogue': "Dialogue musical",
};

const GAME_REASONS = {
  'chef-orchestre': "Il aide à travailler l'attention et l'imitation avec des rythmes.",
  'detective': "Il aide à travailler l'attention auditive et l'expression des choix.",
  'dialogue': "Il aide à travailler l'interaction et les échanges à tour de rôle.",
};

function applyRecommendation(rec) {
  if (!rec) return;

  const { game, bestScore } = rec;

  // Retirer les anciennes bordures
  document.querySelectorAll('.game-card').forEach(c => c.classList.remove('recommended'));

  // Ajouter la bordure dorée sur le jeu recommandé
  const card = document.getElementById(`card-${game}`);
  if (card) card.classList.add('recommended');

  // Afficher la barre de recommandation
  recommendation.hidden = false;
  recoText.innerHTML = `Le jeu <strong>${GAME_NAMES[game]}</strong> te convient bien ! ${GAME_REASONS[game]}`;

  // Message Milo
  setTimeout(() => {
    const t = `Je te conseille ${GAME_NAMES[game]} ! Tu peux essayer !`;
    showSpeech(t);
    speak(t);
  }, 800);
}

// Appliquer la recommandation si un profil existe
if (currentProfile) {
  const rec = recommendGame(currentProfile);
  console.log('[Recommandation]', rec);
  applyRecommendation(rec);
} else {
  setTimeout(() => {
    showSpeech("Un adulte doit d'abord créer ton profil !");
    speak("Un adulte doit d'abord créer ton profil.");
  }, 800);
}

// ============================================================
// 6. CLIC SUR UN JEU
// ============================================================

document.querySelectorAll('.game-card').forEach(card => {
  card.addEventListener('click', async () => {
    playClick();
    const game = card.dataset.game;

    // Effet visuel de sélection
    document.querySelectorAll('.game-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');

    const t = `Super ! On joue à ${GAME_NAMES[game]} !`;
    showSpeech(t);
    await speak(t);

    // Redirection vers le jeu correspondant
    setTimeout(() => {
      const urls = {
        'chef-orchestre': 'jeu-chef-orchestre.html',
        'detective': 'jeu-detective.html',
        'dialogue': 'jeu-dialogue.html',
      };
      window.location.href = urls[game];
    }, 1200);
  });
});

// ============================================================
// 7. BOUTON RETOUR
// ============================================================

document.getElementById('backHome').addEventListener('click', () => {
  playClick();
  window.location.href = 'index.html';
});

// ============================================================
// 8. INITIALISATION
// ============================================================

window.addEventListener('load', () => {
  setTimeout(() => {
    if (!currentProfile) {
      speak("Un adulte doit d'abord créer ton profil.");
    }
  }, 500);
});
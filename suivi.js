/* ============================================================
   Suivi — SmartMusicCare
   Version corrigée : bouton "Retour à l'accueil" toujours fonctionnel
   ============================================================ */

// ============================================================
// 1. DÉCOR DE FOND
// ============================================================

const cloudsLayer = document.getElementById('cloudsLayer');

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
for (let i = 0; i < 4; i++) spawnCloud();

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
`;
document.head.appendChild(styleSheet);

// ============================================================
// 2. AUDIO
// ============================================================

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new AudioCtx();
}

function playTone(freq, duration, type = 'sine', gainValue = 0.15) {
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
  playTone(880, 0.08, 'sine', 0.15);
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

// ============================================================
// 3. NAVIGATION — TOUJOURS EN PREMIER (robuste)
// ============================================================

/**
 * Navigation fiable avec fallback.
 */
function goTo(url) {
  try {
    window.location.href = url;
  } catch (e) {
    window.location.assign(url);
  }
}

/**
 * Attache un écouteur de clic sur un bouton (si présent).
 */
function bindClick(id, callback, label) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      try { playClick(); } catch (err) {}
      callback();
    });
    console.log(`[Suivi] ✅ Bouton #${id} attaché (${label})`);
    return true;
  } else {
    console.warn(`[Suivi] ⚠️ Bouton #${id} introuvable dans le DOM`);
    return false;
  }
}

// Bouton flèche en haut
bindClick('backHome', () => goTo('index.html'), 'flèche retour');

// Bouton "Retour à l'accueil" en bas (toujours visible)
bindClick('btnBackHome', () => goTo('index.html'), 'retour accueil bas');

// Bouton "Créer un profil" (si pas de profil)
bindClick('goProfileBtn', () => goTo('questionnaire-parent.html'), 'créer profil');

// Bouton "Voir les jeux" (si historique vide)
bindClick('goGamesBtn', () => goTo('jeux.html'), 'voir les jeux');

// ============================================================
// 4. CHARGEMENT DU PROFIL
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

const noProfile = document.getElementById('noProfile');
const mainContent = document.getElementById('mainContent');
const profileLabel = document.getElementById('profileLabel');

if (!currentProfile) {
  if (noProfile) noProfile.hidden = false;
  if (mainContent) mainContent.hidden = true;
  if (profileLabel) profileLabel.textContent = 'Aucun profil actif';
} else {
  if (noProfile) noProfile.hidden = true;
  if (mainContent) mainContent.hidden = false;
  if (profileLabel) profileLabel.textContent = `Profil : ${currentProfile.profile.id}`;
  fillProfile(currentProfile);
  fillStats(currentProfile);
  fillHistory(currentProfile);
}

// ============================================================
// 5. LIBELLÉS
// ============================================================

const LABELS = {
  age_range: {
    '4-6': '4 à 6 ans',
    '7-9': '7 à 9 ans',
    '10-12': '10 à 12 ans',
  },
  diagnosis: {
    'confirmed': 'Oui, confirmé',
    'in_progress': 'En cours d\'évaluation',
    'unknown': 'Non renseigné',
  },
  communication: {
    'speech': 'Avec des mots',
    'gestures': 'Avec des gestes',
    'pictograms': 'Avec des pictogrammes',
    'aac': 'Avec un outil de communication',
  },
  autonomy: {
    'autonomous': 'Autonome',
    'with_help': 'Avec un peu d\'aide',
    'with_support': 'Avec beaucoup d\'accompagnement',
  },
  priority_need: {
    'attention': '👀 Rester attentif',
    'engagement': '🎯 Rester engagé',
    'interaction': '🤗 Interagir',
    'communication': '💬 Communiquer',
    'expression': '🎨 Exprimer ses choix',
  },
  engagement_level: {
    'easy': '😊 Facilement',
    'with_reminders': '🙂 Avec rappels',
    'difficult': '😕 Difficilement',
    'variable': '🎢 Variable',
  },
  new_task_reaction: {
    'curious': '🤩 Curieux',
    'hesitant': '😐 Hésitant',
    'refuses': '🙅 Refuse parfois',
    'needs_help': '🆘 A besoin d\'aide',
  },
  social_preference: {
    'individual': '🧘 Seul',
    'with_adult': '👨‍👩‍👧 Avec un adulte',
    'group': '👫 En groupe',
    'variable': '🔀 Variable',
  },
  auditory_sensitivity: {
    'yes': '😣 Oui',
    'no': '😌 Non',
    'uncertain': '🤔 Incertain',
  },
  loud_sound_reaction: {
    'likes': '🎉 Les aime',
    'tolerates': '😐 Les tolère',
    'avoids': '😖 Les évite',
    'bothered': '😫 Gêné',
  },
  music_liking: {
    'much': '😍 Beaucoup',
    'little': '🙂 Un peu',
    'rarely': '😐 Rarement',
    'never': '🙁 Pas du tout',
  },
  music_types: {
    'soft': '🌙 Musique douce',
    'rhythmic': '🥁 Musique rythmée',
    'instrumental': '🎻 Instrumentale',
    'songs': '🎤 Chansons',
    'nature': '🌿 Sons de la nature',
  },
  instruments: {
    'piano': '🎹 Piano',
    'guitar': '🎸 Guitare',
    'drum': '🥁 Tambour',
    'flute': '🪈 Flûte',
    'voice': '🎤 Voix',
  },
  tempo_pref: {
    'slow': '🐢 Lent',
    'medium': '🚶 Moyen',
    'fast': '🐇 Rapide',
    'unknown': '🤷 Inconnu',
  },
  participation_modes: {
    'listen': '👂 Écouter',
    'sing': '🎤 Chanter',
    'reproduce_rhythm': '👏 Reproduire un rythme',
    'play_instrument': '🎺 Jouer d\'un instrument',
  },
  goals: {
    'participation': '🌈 Participation',
    'attention': '👀 Attention',
    'imitation': '🪞 Imitation',
    'exchange': '🔄 Échanges',
    'expression': '✨ Expression',
  },
};

function label(category, value) {
  if (!value) return '—';
  return LABELS[category]?.[value] || value;
}

// ============================================================
// 6. REMPLIR LE PROFIL
// ============================================================

function fillProfile(profile) {
  const p = profile.profile;

  document.getElementById('pId').textContent = p.id || '—';
  document.getElementById('pAge').textContent = label('age_range', p.general?.age_range);
  document.getElementById('pDiagnosis').textContent = label('diagnosis', p.general?.diagnosis);
  document.getElementById('pCommunication').textContent = label('communication', p.general?.communication);
  document.getElementById('pAutonomy').textContent = label('autonomy', p.general?.autonomy);

  if (p.created_at) {
    const d = new Date(p.created_at);
    document.getElementById('pCreated').textContent = d.toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  document.getElementById('pPriority').textContent = label('priority_need', p.needs?.priority_need);
  document.getElementById('pEngagement').textContent = label('engagement_level', p.needs?.engagement_level);
  document.getElementById('pNewTask').textContent = label('new_task_reaction', p.needs?.new_task_reaction);
  document.getElementById('pSocial').textContent = label('social_preference', p.needs?.social_preference);
  document.getElementById('pSensitivity').textContent = label('auditory_sensitivity', p.needs?.auditory_sensitivity);
  document.getElementById('pLoud').textContent = label('loud_sound_reaction', p.needs?.loud_sound_reaction);

  renderTags('pMusicTypes', p.music_preferences?.music_types || [], 'music_types');
  renderTags('pInstruments', p.music_preferences?.instruments || [], 'instruments');
  renderTags('pParticipation', p.music_preferences?.participation_modes || [], 'participation_modes');

  const tempo = p.music_preferences?.tempo_pref;
  document.getElementById('pTempo').innerHTML = tempo
    ? `<span class="tag">${label('tempo_pref', tempo)}</span>`
    : `<span class="tag-empty">Non renseigné</span>`;

  const soundsToAvoid = p.music_preferences?.sounds_to_avoid;
  if (soundsToAvoid && soundsToAvoid.trim()) {
    const sounds = soundsToAvoid.split(',').map(s => s.trim()).filter(Boolean);
    document.getElementById('pSoundsToAvoid').innerHTML = sounds
      .map(s => `<span class="tag tag-neutral">⚠️ ${s}</span>`)
      .join('');
  } else {
    document.getElementById('pSoundsToAvoid').innerHTML = `<span class="tag-empty">Aucun</span>`;
  }

  const goals = [];
  if (p.goals?.goal_1) goals.push(p.goals.goal_1);
  if (p.goals?.goal_2) goals.push(p.goals.goal_2);
  renderTags('pGoals', goals, 'goals');

  if (p.goals?.pro_note) {
    document.getElementById('pProNote').hidden = false;
    document.getElementById('pProNoteText').textContent = p.goals.pro_note;
  }

  if (p.child_questionnaire) {
    document.getElementById('childQuestionnaireCard').hidden = false;
    const c = p.child_questionnaire;

    renderTags('cLikedInstruments', c.liked_instruments || [], 'instruments');
    renderTags('cDislikedInstruments', c.disliked_instruments || [], 'instruments', 'tag-neutral');
    renderTags('cLikedMusic', c.liked_music_types || [], 'music_types');
    renderTags('cDislikedMusic', c.disliked_music_types || [], 'music_types', 'tag-neutral');

    const pauses = c.pauses_requested || 0;
    document.getElementById('cPauses').innerHTML = pauses > 0
      ? `<span class="tag">⏸️ ${pauses} pause${pauses > 1 ? 's' : ''}</span>`
      : `<span class="tag-empty">Aucune pause</span>`;

    const refusals = c.refusals || [];
    if (refusals.length > 0) {
      document.getElementById('cRefusals').innerHTML = refusals
        .map(r => {
          const txt = r.replace('stop_step_', 'Arrêt étape ').replace(/_/g, ' ');
          return `<span class="tag tag-neutral">🛑 ${txt}</span>`;
        })
        .join('');
    } else {
      document.getElementById('cRefusals').innerHTML = `<span class="tag-empty">Aucun refus</span>`;
    }
  }
}

function renderTags(containerId, values, category, extraClass = '') {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!values || values.length === 0) {
    container.innerHTML = `<span class="tag-empty">Non renseigné</span>`;
    return;
  }

  container.innerHTML = values.map(v => {
    const txt = label(category, v);
    return `<span class="tag ${extraClass}">${txt}</span>`;
  }).join('');
}

// ============================================================
// 7. STATISTIQUES
// ============================================================

function fillStats(profile) {
  const history = profile.profile.history || [];

  const totalGames = history.length;
  const totalTimeSec = history.reduce((sum, h) => sum + (h.total_time_seconds || 0), 0);
  const totalTimeMin = Math.round(totalTimeSec / 60);
  const bestLevel = history.reduce((max, h) => Math.max(max, h.level_reached || 0), 0);
  const totalSuccess = history.reduce((sum, h) => sum + (h.success || 0), 0);

  document.getElementById('totalGames').textContent = totalGames;
  document.getElementById('totalTime').textContent = totalTimeMin > 0 ? `${totalTimeMin} min` : '0 min';
  document.getElementById('bestLevel').textContent = bestLevel;
  document.getElementById('totalSuccess').textContent = totalSuccess;
}

// ============================================================
// 8. HISTORIQUE
// ============================================================

const GAME_INFO = {
  'chef-orchestre': { emoji: '🎼', name: 'Chef d\'orchestre' },
  'detective':      { emoji: '🔍', name: 'Détective musical' },
  'dialogue':       { emoji: '💬', name: 'Dialogue musical' },
};

function fillHistory(profile) {
  const history = profile.profile.history || [];
  const historyList = document.getElementById('historyList');
  const historyEmpty = document.getElementById('historyEmpty');

  if (history.length === 0) {
    historyEmpty.hidden = false;
    historyList.innerHTML = '';
    return;
  }

  historyEmpty.hidden = true;

  const sorted = [...history].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  historyList.innerHTML = sorted.map(h => {
    const info = GAME_INFO[h.game] || { emoji: '🎮', name: h.game };
    const date = new Date(h.date);
    const dateStr = date.toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit'
    });

    let meta = '';
    if (h.game === 'chef-orchestre') {
      meta = `
        <span>✅ ${h.success || 0} réussites</span>
        <span>🎯 ${h.attempts || 0} essais</span>
        <span>📈 Niveau ${h.level_reached || 1}</span>
        ${h.total_time_seconds ? `<span>⏱️ ${Math.round(h.total_time_seconds / 60)} min</span>` : ''}
      `;
    } else if (h.game === 'detective') {
      meta = `
        <span>✅ ${h.success || 0} réussites</span>
        <span>🎯 ${h.attempts || 0} essais</span>
        <span>📈 Niveau ${h.level_reached || 1}</span>
        ${h.total_time_seconds ? `<span>⏱️ ${Math.round(h.total_time_seconds / 60)} min</span>` : ''}
      `;
    } else if (h.game === 'dialogue') {
      meta = `
        <span>🔁 ${h.tours || 0} tours</span>
        <span>💬 ${h.exchanges || 0} échanges</span>
        <span>📈 Niveau ${h.level_reached || 1}</span>
        ${h.total_time_seconds ? `<span>⏱️ ${Math.round(h.total_time_seconds / 60)} min</span>` : ''}
      `;
    }

    return `
      <div class="history-item">
        <div class="history-icon">${info.emoji}</div>
        <div class="history-info">
          <div class="history-title">${info.name}</div>
          <div class="history-meta">
            <span>📅 ${dateStr} à ${timeStr}</span>
            ${meta}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// 9. EXPORT JSON
// ============================================================

function exportProfile() {
  if (!currentProfile) return;

  const blob = new Blob([JSON.stringify(currentProfile, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `profil_${currentProfile.profile.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

bindClick('exportBtn', exportProfile, 'export haut');
bindClick('exportBtn2', exportProfile, 'export bas');

// ============================================================
// 10. SUPPRESSION DU PROFIL
// ============================================================

const deleteModal = document.getElementById('deleteModal');
const cancelDelete = document.getElementById('cancelDelete');
const confirmDelete = document.getElementById('confirmDelete');

bindClick('deleteBtn', () => {
  if (deleteModal) deleteModal.hidden = false;
}, 'ouvrir suppression');

if (cancelDelete) {
  cancelDelete.addEventListener('click', () => {
    playClick();
    if (deleteModal) deleteModal.hidden = true;
  });
}

if (deleteModal) {
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) deleteModal.hidden = true;
  });
}

if (confirmDelete) {
  confirmDelete.addEventListener('click', () => {
    playClick();
    localStorage.removeItem('smc_profile');
    localStorage.removeItem('smc_profile_id');
    localStorage.removeItem('smc_profile_saved_at');
    if (deleteModal) deleteModal.hidden = true;
    goTo('index.html');
  });
}

// ============================================================
// 11. INITIALISATION
// ============================================================

console.log('[Suivi] ✅ Page initialisée');
console.log('[Suivi] Profil chargé :', currentProfile);
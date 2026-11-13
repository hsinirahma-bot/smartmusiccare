/* ============================================================
   SmartMusicCare — Accueil (version finale)
   ============================================================ */

// ============================================================
// 0. PRÉFÉRENCES
// ============================================================

const prefs = {
  music: localStorage.getItem('smc_pref_music') !== 'false',
  sfx:   localStorage.getItem('smc_pref_sfx')   !== 'false',
  voice: localStorage.getItem('smc_pref_voice') !== 'false',
  anim:  localStorage.getItem('smc_pref_anim')  !== 'false',
};

function savePrefs() {
  localStorage.setItem('smc_pref_music', String(prefs.music));
  localStorage.setItem('smc_pref_sfx',   String(prefs.sfx));
  localStorage.setItem('smc_pref_voice', String(prefs.voice));
  localStorage.setItem('smc_pref_anim',  String(prefs.anim));
}

// ============================================================
// 0 bis. PROFIL
// ============================================================

function getSavedProfile() {
  try {
    const raw = localStorage.getItem('smc_profile');
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && data.profile ? data : null;
  } catch (e) { return null; }
}

function clearSavedProfile() {
  localStorage.removeItem('smc_profile');
  localStorage.removeItem('smc_profile_id');
  localStorage.removeItem('smc_profile_saved_at');
}

let savedProfile = getSavedProfile();

function isProfileComplete(profile) {
  if (!profile || !profile.profile) return false;
  const p = profile.profile;
  const parentDone = !!(p.general && p.needs && p.music_preferences && p.goals);
  const childDone = !!(p.child_questionnaire);
  return parentDone && childDone;
}

function refreshProfileBanner() {
  const activeProfileEl = document.getElementById('activeProfile');
  const activeProfileIdEl = document.getElementById('activeProfileId');
  if (!activeProfileEl) return;

  savedProfile = getSavedProfile();
  if (savedProfile) {
    activeProfileEl.hidden = false;
    if (activeProfileIdEl) activeProfileIdEl.textContent = savedProfile.profile.id;
  } else {
    activeProfileEl.hidden = true;
  }
}
refreshProfileBanner();

// Sauvegarder dans la collection pour le code
function saveProfileToCollection(profile) {
  if (!profile || !profile.profile) return;
  try {
    const all = JSON.parse(localStorage.getItem('smc_profiles') || '{}');
    all[profile.profile.id] = profile;
    localStorage.setItem('smc_profiles', JSON.stringify(all));
  } catch (e) {}
}
if (savedProfile) saveProfileToCollection(savedProfile);

// ============================================================
// 1. AUDIO (musique plus forte)
// ============================================================

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let musicGain = null;
let sfxGain = null;
let musicScheduler = null;

const MELODY_NOTES = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];

function initAudio() {
  if (audioCtx) return;
  audioCtx = new AudioCtx();
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 0.0;
  musicGain.connect(audioCtx.destination);
  sfxGain = audioCtx.createGain();
  sfxGain.gain.value = 0.15;
  sfxGain.connect(audioCtx.destination);
}

function playNote(freq, time, duration = 1.2, gain = 0.3, type = 'sine') {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(gain, time + 0.05);
  env.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(env);
  env.connect(musicGain);
  osc.start(time);
  osc.stop(time + duration + 0.1);
}

function scheduleMelody() {
  if (!audioCtx || !prefs.music) return;
  const now = audioCtx.currentTime;
  const tempo = 0.6;
  const sequence = [
    MELODY_NOTES[0], MELODY_NOTES[2], MELODY_NOTES[4], MELODY_NOTES[3],
    MELODY_NOTES[1], MELODY_NOTES[3], MELODY_NOTES[5], MELODY_NOTES[4],
  ];
  for (let i = 0; i < sequence.length; i++) {
    playNote(sequence[i], now + i * tempo, 1.5, 0.3, 'sine');
    if (i % 2 === 0) {
      playNote(sequence[i] * 0.75, now + i * tempo + 0.05, 1.8, 0.15, 'triangle');
    }
  }
  const totalDuration = sequence.length * tempo * 1000;
  musicScheduler = setTimeout(scheduleMelody, totalDuration);
}

function startMusic() {
  if (!prefs.music) return;
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  musicGain.gain.cancelScheduledValues(audioCtx.currentTime);
  musicGain.gain.setValueAtTime(musicGain.gain.value, audioCtx.currentTime);
  musicGain.gain.linearRampToValueAtTime(1.3, audioCtx.currentTime + 1.5);
  if (!musicScheduler) scheduleMelody();
}

function stopMusic() {
  if (!audioCtx || !musicGain) return;
  musicGain.gain.cancelScheduledValues(audioCtx.currentTime);
  musicGain.gain.setValueAtTime(musicGain.gain.value, audioCtx.currentTime);
  musicGain.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + 0.8);
  if (musicScheduler) {
    clearTimeout(musicScheduler);
    musicScheduler = null;
  }
}

function playClick() {
  if (!prefs.sfx) return;
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
  env.gain.setValueAtTime(0.2, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(env);
  env.connect(sfxGain);
  osc.start(now);
  osc.stop(now + 0.15);
}

let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (prefs.music) startMusic();
}
['click', 'touchstart', 'keydown'].forEach(evt => {
  window.addEventListener(evt, unlockAudio, { once: true, passive: true });
});

const musicToggle = document.getElementById('musicToggle');
const musicIconOn = document.getElementById('musicIconOn');
const musicIconOff = document.getElementById('musicIconOff');

function updateMusicButton() {
  if (!musicToggle) return;
  if (prefs.music) {
    musicToggle.classList.remove('off');
    if (musicIconOn) musicIconOn.style.display = '';
    if (musicIconOff) musicIconOff.style.display = 'none';
  } else {
    musicToggle.classList.add('off');
    if (musicIconOn) musicIconOn.style.display = 'none';
    if (musicIconOff) musicIconOff.style.display = '';
  }
}
updateMusicButton();

musicToggle?.addEventListener('click', () => {
  playClick();
  prefs.music = !prefs.music;
  savePrefs();
  updateMusicButton();
  if (prefs.music) startMusic(); else stopMusic();
});

// ============================================================
// 2. BACKGROUND
// ============================================================

const cloudsLayer = document.getElementById('cloudsLayer');
const balloonsLayer = document.getElementById('balloonsLayer');
const shootingLayer = document.getElementById('shootingLayer');
const confettiLayer = document.getElementById('confettiLayer');
const notesLayer = document.getElementById('notesLayer');

function spawnCloud() {
  const c = document.createElement('div');
  c.className = 'cloud';
  c.style.top = `${5 + Math.random() * 35}%`;
  c.style.transform = `scale(${0.7 + Math.random() * 0.7})`;
  const duration = 50 + Math.random() * 40;
  c.style.animationDuration = `${duration}s`;
  c.style.animationDelay = `${-Math.random() * 20}s`;
  cloudsLayer?.appendChild(c);
}
for (let i = 0; i < 5; i++) spawnCloud();

const BALLOON_COLORS = [
  'radial-gradient(circle at 30% 30%, #ff9ec4, #e84a7f)',
  'radial-gradient(circle at 30% 30%, #8be3ff, #2e8f88)',
  'radial-gradient(circle at 30% 30%, #c3b5ff, #6b5ce0)',
  'radial-gradient(circle at 30% 30%, #ffe08a, #f0a500)',
  'radial-gradient(circle at 30% 30%, #a8f0b8, #3fa060)',
];
function spawnBalloon() {
  const b = document.createElement('div');
  b.className = 'balloon';
  b.style.left = `${Math.random() * 90}%`;
  b.style.background = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
  const duration = 14 + Math.random() * 10;
  b.style.animationDuration = `${duration}s`;
  b.style.animationDelay = `${Math.random() * 3}s`;
  b.style.transform = `scale(${0.8 + Math.random() * 0.5})`;
  balloonsLayer?.appendChild(b);
  setTimeout(() => b.remove(), (duration + 5) * 1000);
}
setInterval(spawnBalloon, 1800);
for (let i = 0; i < 5; i++) setTimeout(spawnBalloon, i * 400);

function spawnShooting() {
  const s = document.createElement('div');
  s.className = 'shooting';
  s.style.top = `${5 + Math.random() * 40}%`;
  s.style.left = `${-10 + Math.random() * 40}%`;
  s.style.animationDuration = `${2 + Math.random() * 1.5}s`;
  shootingLayer?.appendChild(s);
  setTimeout(() => s.remove(), 4000);
}
setInterval(spawnShooting, 4500);
setTimeout(spawnShooting, 800);

const CONFETTI_COLORS = ['#ff6b9d','#ffd166','#4fd1c5','#a89cf9','#8be3ff','#a8f0b8'];
function spawnConfetti() {
  const c = document.createElement('div');
  c.className = 'confetti';
  c.style.left = `${Math.random() * 100}%`;
  c.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
  const duration = 6 + Math.random() * 6;
  c.style.animationDuration = `${duration}s`;
  c.style.animationDelay = `${Math.random() * 2}s`;
  confettiLayer?.appendChild(c);
  setTimeout(() => c.remove(), (duration + 3) * 1000);
}
setInterval(spawnConfetti, 500);
for (let i = 0; i < 15; i++) setTimeout(spawnConfetti, i * 200);

const noteShapes = [
  `<svg viewBox="0 0 24 24"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff8fab"/><stop offset="100%" stop-color="#e84a7f"/></linearGradient></defs><path fill="url(#g1)" d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>`,
  `<svg viewBox="0 0 24 24"><defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4fd1c5"/><stop offset="100%" stop-color="#2e8f88"/></linearGradient></defs><path fill="url(#g2)" d="M9 3v10.55A4 4 0 1 0 11 17V7h6V3H9z"/></svg>`,
  `<svg viewBox="0 0 24 24"><defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a89cf9"/><stop offset="100%" stop-color="#6b5ce0"/></linearGradient></defs><path fill="url(#g3)" d="M4 3v10.55A4 4 0 1 0 6 17V7h6v6.55A4 4 0 1 0 14 17V3H4z"/></svg>`,
  `<svg viewBox="0 0 24 24"><defs><linearGradient id="g4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffd166"/><stop offset="100%" stop-color="#f0a500"/></linearGradient></defs><path fill="url(#g4)" d="M9 3v10.55A4 4 0 1 0 11 17V7h6V3H9z"/></svg>`,
];
function spawnNote() {
  const note = document.createElement('div');
  note.className = 'note';
  note.innerHTML = noteShapes[Math.floor(Math.random() * noteShapes.length)];
  note.style.left = `${Math.random() * 92}%`;
  const size = 36 + Math.random() * 28;
  note.style.width = `${size}px`;
  note.style.height = `${size}px`;
  const duration = 11 + Math.random() * 9;
  note.style.animationDuration = `${duration}s`;
  note.style.animationDelay = `${Math.random() * 3}s`;
  notesLayer?.appendChild(note);
  setTimeout(() => note.remove(), (duration + 5) * 1000);
}
setInterval(spawnNote, 1400);
for (let i = 0; i < 6; i++) setTimeout(spawnNote, i * 300);

// ============================================================
// 3. VOIX
// ============================================================

const synth = window.speechSynthesis;
let preferredVoice = null;

function loadVoices() {
  const voices = synth.getVoices();
  if (!voices.length) return;
  const fr = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('fr'));
  const pool = fr.length ? fr : voices;
  const preferredNames = ['Amelie', 'Thomas', 'Audrey', 'Aurelie', 'Google français'];
  preferredVoice = null;
  for (const name of preferredNames) {
    const found = pool.find(v => v.name.includes(name));
    if (found) { preferredVoice = found; break; }
  }
  if (!preferredVoice) preferredVoice = pool[0];
}

if ('speechSynthesis' in window) {
  synth.onvoiceschanged = loadVoices;
  loadVoices();
  setTimeout(loadVoices, 200);
  setTimeout(loadVoices, 800);
}

function speak(text, { onStart, onEnd } = {}) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window) || !prefs.voice) {
      onEnd && onEnd();
      resolve();
      return;
    }
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
      document.getElementById('milo')?.classList.remove('speaking');
      onEnd && onEnd();
      resolve();
    };

    u.onstart = () => {
      document.getElementById('milo')?.classList.add('speaking');
      onStart && onStart();
    };

    const estimatedMs = Math.max(1200, (text.length * 90) / 0.95 + 400);
    const safety = setTimeout(finish, estimatedMs + 2000);
    u.onend = () => { clearTimeout(safety); finish(); };
    u.onerror = () => { clearTimeout(safety); finish(); };

    try { synth.speak(u); } catch (e) { clearTimeout(safety); finish(); }
  });
}

// ============================================================
// 4. BULLE
// ============================================================

const speechEl = document.getElementById('speech');
const speechTextEl = document.getElementById('speechText');
const replayBtn = document.getElementById('replayBtn');

function showBubble(text) {
  if (!speechEl || !speechTextEl) return;
  speechTextEl.textContent = text;
  speechEl.classList.add('visible');
  speechEl.classList.remove('pop');
  void speechEl.offsetWidth;
  speechEl.classList.add('pop');
}

replayBtn?.addEventListener('click', () => {
  playClick();
  speak(speechTextEl.textContent);
  speechEl.classList.remove('pop');
  void speechEl.offsetWidth;
  speechEl.classList.add('pop');
});

// ============================================================
// 5. MESSAGES DE BIENVENUE
// ============================================================

const welcomeMessages = savedProfile
  ? [
      `Re-bonjour ! Je suis content de te revoir, ${savedProfile.profile.id}.`,
      "Appuie sur Commencer pour choisir un jeu.",
      "Tu peux aussi utiliser le code du profil pour retrouver un enfant.",
    ]
  : [
      "Salut ! Je suis Milo, ton compagnon musical.",
      "Appuie sur Commencer pour jouer avec moi.",
      "On va découvrir des sons et des rythmes ensemble.",
      "Tu peux aussi appeler un adulte avec le bouton parent.",
    ];

let currentMessageIndex = 0;
let isSpeaking = false;
let speechEnabled = false;

async function sayMessage(index) {
  const text = welcomeMessages[index];
  showBubble(text);
  isSpeaking = true;
  await speak(text, { onEnd: () => { isSpeaking = false; } });
}

async function nextMessage() {
  currentMessageIndex = (currentMessageIndex + 1) % welcomeMessages.length;
  await sayMessage(currentMessageIndex);
}

setInterval(() => {
  if (speechEnabled && !isSpeaking) nextMessage();
}, 12000);

// ============================================================
// 6. SÉQUENCE D'ENTRÉE
// ============================================================

function waitForAnimation(el, animationName, timeout = 6000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener('animationend', handler);
      resolve();
    };
    const handler = (e) => { if (e.animationName === animationName) finish(); };
    el.addEventListener('animationend', handler);
    setTimeout(finish, timeout);
  });
}

async function runIntroSequence() {
  const milo = document.getElementById('milo');
  if (!milo) return;
  milo.classList.remove('milo-hidden');
  milo.classList.add('milo-appear');
  await waitForAnimation(milo, 'appearTopLeft');

  showBubble("Salut !");
  await speak("Salut !");

  milo.classList.remove('milo-appear');
  milo.classList.add('milo-spin-center');
  await waitForAnimation(milo, 'spinToCenter');

  milo.classList.remove('milo-spin-center');
  milo.classList.add('milo-center');

  speechEnabled = true;
  setTimeout(() => {
    currentMessageIndex = 0;
    sayMessage(0);
  }, 400);
}

window.addEventListener('load', () => {
  setTimeout(runIntroSequence, 300);
});

// ============================================================
// 7. BOUTONS
// ============================================================

document.querySelectorAll('.btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    playClick();
    handleAction(btn.dataset.action);
  });
});

async function handleAction(action) {
  if ('speechSynthesis' in window) synth.cancel();

  switch (action) {
    case 'start': {
      savedProfile = getSavedProfile();
      if (!savedProfile) {
        const t = "Il faut d'abord remplir les questionnaires. Un adulte doit créer ton profil.";
        showBubble(t);
        await speak(t);
        setTimeout(() => { window.location.href = 'questionnaire-parent.html'; }, 3000);
        return;
      }
      if (!isProfileComplete(savedProfile)) {
        const t = "Presque ! Il faut encore remplir les deux questionnaires avant de jouer.";
        showBubble(t);
        await speak(t);
        setTimeout(() => { window.location.href = 'questionnaire-enfant.html'; }, 3000);
        return;
      }
      const t = "Super ! Choisis ton jeu !";
      showBubble(t);
      await speak(t);
      openModal('gamesModal');
      break;
    }

    case 'child-questionnaire': {
      if (!savedProfile) {
        const t = "Un adulte doit d'abord créer ton profil.";
        showBubble(t);
        await speak(t);
        setTimeout(() => { window.location.href = 'questionnaire-parent.html'; }, 3000);
        return;
      }
      const t = "Très bien ! On va faire le questionnaire ensemble avec Milo.";
      showBubble(t);
      await speak(t);
      window.location.href = 'questionnaire-enfant.html';
      break;
    }

    case 'parent': {
      if (savedProfile) {
        const ok = confirm(
          `Un profil existe déjà (${savedProfile.profile.id}).\n\n` +
          `Voulez-vous le remplacer par un nouveau profil ?`
        );
        if (!ok) break;
      }
      const t = "Très bien ! On va remplir le questionnaire ensemble.";
      showBubble(t);
      await speak(t);
      window.location.href = 'questionnaire-parent.html';
      break;
    }

    case 'history': {
      openHistory();
      break;
    }

    case 'help': {
      openModal('helpModal');
      break;
    }
    case 'settings': {
      openModal('settingsModal');
      break;
    }
  }
}

// ============================================================
// 8. MODALES
// ============================================================

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.hidden = false;
}
function closeModal(m) {
  if (m) m.hidden = true;
}

document.querySelectorAll('[data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => {
    playClick();
    closeModal(btn.closest('.modal-overlay'));
  });
});

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', (e) => {
    if (e.target === m) closeModal(m);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(m => closeModal(m));
  }
});

// ============================================================
// 9. SÉLECTION DES JEUX
// ============================================================

document.querySelectorAll('.game-mini').forEach(btn => {
  btn.addEventListener('click', () => {
    playClick();
    const game = btn.dataset.game;
    const urls = {
      'chef-orchestre': 'jeu-chef-orchestre.html',
      'detective': 'jeu-detective.html',
      'dialogue': 'jeu-dialogue.html',
    };
    window.location.href = urls[game] || 'jeux.html';
  });
});

// ============================================================
// 10. HISTORIQUE
// ============================================================

function openHistory() {
  savedProfile = getSavedProfile();

  const historyModal = document.getElementById('historyModal');
  if (!historyModal) return;

  if (!savedProfile) {
    alert("Aucun profil actif. Créez d'abord un profil.");
    return;
  }

  const p = savedProfile.profile;
  const history = p.history || [];

  document.getElementById('historySubtitle').textContent = `Profil : ${p.id}`;

  const totalGames = history.length;
  const totalTimeSec = history.reduce((s, h) => s + (h.total_time_seconds || 0), 0);
  const totalTimeMin = Math.round(totalTimeSec / 60);
  const bestLevel = history.reduce((m, h) => Math.max(m, h.level_reached || 0), 0);
  const totalSuccess = history.reduce((s, h) => s + (h.success || 0), 0);

  document.getElementById('hGames').textContent = totalGames;
  document.getElementById('hTime').textContent = `${totalTimeMin} min`;
  document.getElementById('hLevel').textContent = bestLevel;
  document.getElementById('hSuccess').textContent = totalSuccess;

  const detail = document.getElementById('historyDetail');
  if (history.length === 0) {
    detail.innerHTML = `<div class="history-empty-mini">Aucune partie jouée pour le moment.</div>`;
  } else {
    const GAME_INFO = {
      'chef-orchestre': { emoji: '🎼', name: 'Chef d\'orchestre' },
      'detective': { emoji: '🔍', name: 'Détective musical' },
      'dialogue': { emoji: '💬', name: 'Dialogue musical' },
    };
    const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));

    detail.innerHTML = sorted.map(h => {
      const info = GAME_INFO[h.game] || { emoji: '🎮', name: h.game };
      const d = new Date(h.date);
      const dateStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      let meta = '';
      if (h.game === 'dialogue') {
        meta = `🔁 ${h.tours || 0} tours · 💬 ${h.exchanges || 0} échanges · 📈 Niv. ${h.level_reached || 1}`;
      } else {
        meta = `✅ ${h.success || 0} réussites · 🎯 ${h.attempts || 0} essais · 📈 Niv. ${h.level_reached || 1}`;
      }

      return `
        <div class="history-item-mini">
          <div class="icon">${info.emoji}</div>
          <div class="info">
            <div class="name">${info.name}</div>
            <div class="meta">📅 ${dateStr} à ${timeStr} · ${meta}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  historyModal.hidden = false;
}

document.getElementById('openFullSuivi')?.addEventListener('click', () => {
  playClick();
  window.location.href = 'suivi.html';
});

// ============================================================
// 11. CODE PROFIL
// ============================================================

document.getElementById('btnLoadCode')?.addEventListener('click', () => {
  playClick();
  const input = document.getElementById('codeInput');
  const error = document.getElementById('codeError');
  if (!input) return;

  const code = input.value.trim().toUpperCase();
  if (!code) {
    if (error) { error.textContent = '⚠️ Entre un code.'; error.hidden = false; }
    return;
  }

  const current = getSavedProfile();
  if (current && current.profile.id.toUpperCase() === code) {
    if (error) error.hidden = true;
    closeModal(document.getElementById('codeModal'));
    showBubble(`Profil ${code} chargé !`);
    speak(`Profil ${code} chargé !`);
    return;
  }

  try {
    const all = JSON.parse(localStorage.getItem('smc_profiles') || '{}');
    if (all[code]) {
      localStorage.setItem('smc_profile', JSON.stringify(all[code]));
      localStorage.setItem('smc_profile_id', code);
      refreshProfileBanner();
      closeModal(document.getElementById('codeModal'));
      showBubble(`Profil ${code} chargé !`);
      speak(`Profil ${code} chargé !`);
      return;
    }
  } catch (e) {}

  if (error) {
    error.textContent = `⚠️ Aucun profil trouvé pour le code ${code}.`;
    error.hidden = false;
  }
});

document.getElementById('btnCancelCode')?.addEventListener('click', () => {
  playClick();
  closeModal(document.getElementById('codeModal'));
});

// ============================================================
// 12. PARAMÈTRES
// ============================================================

const settingMusic = document.getElementById('settingMusic');
const settingSfx = document.getElementById('settingSfx');
const settingVoice = document.getElementById('settingVoice');
const settingAnim = document.getElementById('settingAnim');

if (settingMusic) settingMusic.checked = prefs.music;
if (settingSfx) settingSfx.checked = prefs.sfx;
if (settingVoice) settingVoice.checked = prefs.voice;
if (settingAnim) settingAnim.checked = prefs.anim;

settingMusic?.addEventListener('change', () => {
  prefs.music = settingMusic.checked;
  savePrefs();
  updateMusicButton();
  if (prefs.music) startMusic(); else stopMusic();
});
settingSfx?.addEventListener('change', () => {
  prefs.sfx = settingSfx.checked;
  savePrefs();
  if (prefs.sfx) playClick();
});
settingVoice?.addEventListener('change', () => {
  prefs.voice = settingVoice.checked;
  savePrefs();
  if (!prefs.voice && 'speechSynthesis' in window) synth.cancel();
});
settingAnim?.addEventListener('change', () => {
  prefs.anim = settingAnim.checked;
  savePrefs();
  if (!prefs.anim) {
    document.querySelectorAll('.stage *').forEach(el => { el.style.animationPlayState = 'paused'; });
  } else {
    document.querySelectorAll('.stage *').forEach(el => { el.style.animationPlayState = ''; });
  }
});

// ============================================================
// 13. CLIC SUR MILO
// ============================================================

document.getElementById('milo')?.addEventListener('click', async () => {
  playClick();
  if ('speechSynthesis' in window) synth.cancel();
  const fun = [
    "Coucou ! Tu m'as touché !",
    "Hihi ! Ça chatouille !",
    "Je suis content de te voir !",
  ];
  const text = fun[Math.floor(Math.random() * fun.length)];
  showBubble(text);
  await speak(text);
});

// ============================================================
// 14. BOUTONS DU BANDEAU PROFIL
// ============================================================

const btnContinueProfile = document.getElementById('btnContinueProfile');
const btnNewProfile = document.getElementById('btnNewProfile');

if (btnContinueProfile) {
  btnContinueProfile.addEventListener('click', async () => {
    playClick();
    savedProfile = getSavedProfile();
    if (!savedProfile) return;

    if (!isProfileComplete(savedProfile)) {
      const t = "Il faut encore remplir les questionnaires avant de jouer.";
      showBubble(t);
      await speak(t);
      setTimeout(() => { window.location.href = 'questionnaire-enfant.html'; }, 2500);
      return;
    }
    const t = "Choisis ton jeu !";
    showBubble(t);
    await speak(t);
    openModal('gamesModal');
  });
}

if (btnNewProfile) {
  btnNewProfile.addEventListener('click', () => {
    playClick();
    const ok = confirm('Créer un nouveau profil ? Le profil actuel sera remplacé.');
    if (ok) {
      clearSavedProfile();
      refreshProfileBanner();
      window.location.href = 'questionnaire-parent.html';
    }
  });
}
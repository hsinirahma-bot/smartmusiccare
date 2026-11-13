/* ============================================================
   Jeu du Dialogue musical — SmartMusicCare
   Alternance de tours entre Milo et l'enfant
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
  'radial-gradient(circle at 30% 30%, #c3b5ff, #6b5ce0)',
  'radial-gradient(circle at 30% 30%, #8be3ff, #2e8f88)',
  'radial-gradient(circle at 30% 30%, #ff9ec4, #e84a7f)',
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
    `<svg viewBox="0 0 24 24"><path fill="#a89cf9" d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>`,
    `<svg viewBox="0 0 24 24"><path fill="#8be3ff" d="M9 3v10.55A4 4 0 1 0 11 17V7h6V3H9z"/></svg>`,
    `<svg viewBox="0 0 24 24"><path fill="#ff9ec4" d="M9 3v10.55A4 4 0 1 0 11 17V7h6V3H9z"/></svg>`,
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
// 2. AUDIO
// ============================================================

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let activeNodes = [];
let activeTimeouts = [];

function stopAllSounds() {
  activeNodes.forEach(node => {
    try { node.stop(0); } catch (e) {}
    try { node.disconnect(); } catch (e) {}
  });
  activeNodes = [];
  activeTimeouts.forEach(id => clearTimeout(id));
  activeTimeouts = [];
}

function initAudio() {
  if (audioCtx) return;
  audioCtx = new AudioCtx();
}

function playTone(freq, duration, type = 'sine', gainValue = 0.25, startTime = null) {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = startTime || audioCtx.currentTime;
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
  activeNodes.push(osc);
  osc.onended = () => {
    const i = activeNodes.indexOf(osc);
    if (i > -1) activeNodes.splice(i, 1);
  };
}

/* ============ BATTEMENT DE PERCUSSION ============ */
function playBeat(index = 0, isMilo = true) {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;

  // Fréquence selon l'index (do, mi, sol)
  const freqs = [261.63, 329.63, 392.00];
  const freq = freqs[index % 3];

  // Corps
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = isMilo ? 'triangle' : 'sine';
  osc.frequency.setValueAtTime(freq * 1.5, now);
  osc.frequency.exponentialRampToValueAtTime(freq, now + 0.1);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.35);
  activeNodes.push(osc);
  osc.onended = () => {
    const i = activeNodes.indexOf(osc);
    if (i > -1) activeNodes.splice(i, 1);
  };

  // Attaque
  const bufferSize = audioCtx.sampleRate * 0.03;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.12, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2000;
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);
  noise.start(now);
  activeNodes.push(noise);
  noise.onended = () => {
    const i = activeNodes.indexOf(noise);
    if (i > -1) activeNodes.splice(i, 1);
  };
}

function playClick() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  playTone(880, 0.08, 'sine', 0.15);
}

function playSuccess() {
  initAudio();
  const now = audioCtx.currentTime;
  [523.25, 659.25, 783.99].forEach((f, i) => {
    playTone(f, 0.3, 'sine', 0.25, now + i * 0.12);
  });
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
// 3. VOIX
// ============================================================

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
// 4. PROFIL
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

if (!currentProfile) {
  alert("Aucun profil actif. Un adulte doit d'abord remplir le questionnaire parent.");
  window.location.href = 'index.html';
} else {
  document.getElementById('profileLabel').textContent =
    `Profil : ${currentProfile.profile.id}`;
}

// ============================================================
// 5. ÉTAT DU JEU
// ============================================================

const gameState = {
  level: 1,
  tourCount: 0,        // nombre total de tours (Milo + enfant)
  exchangeCount: 0,    // nombre d'échanges complets
  currentTurn: 0,      // 0 = Milo commence, 1 = enfant répond, etc.
  maxTurns: 2,         // nombre de tours à faire
  miloSequence: [],    // ce que Milo a joué
  childSequence: [],   // ce que l'enfant a joué
  isMiloTurn: true,
  isChildTurn: false,
  startTime: 0,
  totalTime: 0,
  exchangesThisRound: 0,
};

const LEVELS = {
  1: { maxTurns: 2, beatsPerTurn: 1 },
  2: { maxTurns: 4, beatsPerTurn: 2 },
  3: { maxTurns: 6, beatsPerTurn: 2 },
  4: { maxTurns: 8, beatsPerTurn: 3 },
  5: { maxTurns: 10, beatsPerTurn: 3 },
};

// ============================================================
// 6. ÉLÉMENTS DOM
// ============================================================

const milo = document.getElementById('milo');
const levelBadge = document.getElementById('levelBadge');
const levelValue = document.getElementById('levelValue');
const tourCountEl = document.getElementById('tourCount');
const exchangeCountEl = document.getElementById('exchangeCount');

const startZone = document.getElementById('startZone');
const startBtn = document.getElementById('startBtn');
const circlesZone = document.getElementById('circlesZone');
const circles = document.querySelectorAll('.circle');
const circlesHint = document.getElementById('circlesHint');

const miloBubble = document.getElementById('miloBubble');
const childBubble = document.getElementById('childBubble');
const miloLine = document.querySelector('.dialogue-milo');
const childLine = document.querySelector('.dialogue-child');

const feedback = document.getElementById('feedback');
const feedbackIcon = document.getElementById('feedbackIcon');
const feedbackText = document.getElementById('feedbackText');

const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const resumeBtn = document.getElementById('resumeBtn');
const pauseOverlay = document.getElementById('pauseOverlay');

const endScreen = document.getElementById('endScreen');
const gameZone = document.querySelector('.game-zone');
const endTours = document.getElementById('endTours');
const endExchanges = document.getElementById('endExchanges');
const endLevel = document.getElementById('endLevel');
const replayGameBtn = document.getElementById('replayGameBtn');
const goGamesBtn = document.getElementById('goGamesBtn');
const goHomeBtn = document.getElementById('goHomeBtn');
const backGamesBtn = document.getElementById('backGames');

// ============================================================
// 7. DÉMARRAGE
// ============================================================

startBtn.addEventListener('click', async () => {
  playClick();
  startZone.hidden = true;
  circlesZone.hidden = false;

  gameState.startTime = Date.now();
  gameState.level = 1;
  gameState.tourCount = 0;
  gameState.exchangeCount = 0;
  gameState.exchangesThisRound = 0;

  showSpeech("Je commence ! Écoute mon rythme.");
  await speak("Je commence ! Écoute mon rythme.");

  startMiloTurn();
});

// ============================================================
// 8. TOUR DE MILO
// ============================================================

async function startMiloTurn() {
  gameState.isMiloTurn = true;
  gameState.isChildTurn = false;

  // Activer visuellement Milo
  miloLine.classList.add('active');
  miloLine.classList.remove('inactive');
  childLine.classList.remove('active');
  childLine.classList.add('inactive');

  // Désactiver les cercles
  circles.forEach(c => c.disabled = true);

  // Mettre à jour les bulles
  miloBubble.textContent = "🎵 ...";
  childBubble.textContent = "⏳";

  const config = LEVELS[gameState.level];
  const beats = config.beatsPerTurn;

  // Générer la séquence de Milo
  gameState.miloSequence = [];
  for (let i = 0; i < beats; i++) {
    gameState.miloSequence.push(Math.floor(Math.random() * 3));
  }

  // Jouer chaque battement
  for (let i = 0; i < gameState.miloSequence.length; i++) {
    const idx = gameState.miloSequence[i];
    const circle = circles[idx];

    circle.classList.add('active', 'milo-played');
    playBeat(idx, true);

    await sleep(500);
    circle.classList.remove('active');
    await sleep(300);
  }

  // Afficher la séquence de Milo
  miloBubble.textContent = `🎵 ${gameState.miloSequence.length} son${gameState.miloSequence.length > 1 ? 's' : ''}`;

  // Passer à l'enfant
  gameState.tourCount++;
  tourCountEl.textContent = gameState.tourCount;

  gameState.isMiloTurn = false;
  gameState.isChildTurn = true;
  gameState.childSequence = [];

  // Activer les cercles
  circles.forEach(c => {
    c.disabled = false;
    c.classList.remove('milo-played');
  });

  // Activer visuellement l'enfant
  miloLine.classList.remove('active');
  miloLine.classList.add('inactive');
  childLine.classList.add('active');
  childLine.classList.remove('inactive');

  miloBubble.textContent = `🎵 ${gameState.miloSequence.length} son${gameState.miloSequence.length > 1 ? 's' : ''}`;
  childBubble.textContent = "🎯 À toi !";

  circlesHint.textContent = "🎯 À toi ! Tape un rythme.";
  showSpeech("À toi ! Tape ton rythme.");
  await speak("À toi ! Tape ton rythme.");

  // Timer pour la réponse de l'enfant (max 10 secondes)
  gameState.childTimer = setTimeout(() => {
    if (gameState.isChildTurn && gameState.childSequence.length === 0) {
      // L'enfant n'a pas répondu, Milo continue
      miloContinuesAlone();
    }
  }, 10000);
}

// ============================================================
// 9. TOUR DE L'ENFANT
// ============================================================

circles.forEach(circle => {
  circle.addEventListener('click', async () => {
    if (!gameState.isChildTurn) return;
    if (circle.disabled) return;

    playClick();
    const index = Number(circle.dataset.index);

    circle.classList.add('pressed', 'child-played');
    playBeat(index, false);
    setTimeout(() => circle.classList.remove('pressed'), 150);

    gameState.childSequence.push(index);
    childBubble.textContent = `🎵 ${gameState.childSequence.length} son${gameState.childSequence.length > 1 ? 's' : ''}`;

    // Reset le timer
    if (gameState.childTimer) {
      clearTimeout(gameState.childTimer);
      gameState.childTimer = setTimeout(() => {
        if (gameState.isChildTurn) {
          finishChildTurn();
        }
      }, 3000);
    }
  });
});

async function finishChildTurn() {
  if (!gameState.isChildTurn) return;

  gameState.isChildTurn = false;
  gameState.tourCount++;
  tourCountEl.textContent = gameState.tourCount;
  gameState.exchangeCount++;
  exchangeCountEl.textContent = gameState.exchangeCount;
  gameState.exchangesThisRound++;

  // Désactiver les cercles
  circles.forEach(c => c.disabled = true);

  // Féliciter
  feedback.hidden = false;
  feedbackIcon.textContent = '💬';
  feedbackText.textContent = `Super ! Tu as joué ${gameState.childSequence.length} son${gameState.childSequence.length > 1 ? 's' : ''} !`;
  playSuccess();

  childBubble.textContent = `🎵 ${gameState.childSequence.length} son${gameState.childSequence.length > 1 ? 's' : ''}`;
  miloBubble.textContent = "🎵 Je reprends...";

  showSpeech("Super ! Je reprends ta réponse !");
  await speak("Super ! Je reprends ta réponse !");

  // Milo reprend la réponse de l'enfant
  miloLine.classList.add('active');
  miloLine.classList.remove('inactive');
  childLine.classList.remove('active');
  childLine.classList.add('inactive');

  await sleep(500);

  // Rejouer la séquence de l'enfant
  for (let i = 0; i < gameState.childSequence.length; i++) {
    const idx = gameState.childSequence[i];
    const circle = circles[idx];
    circle.classList.add('active', 'milo-played');
    playBeat(idx, true);
    await sleep(400);
    circle.classList.remove('active');
    await sleep(200);
  }

  // Ajouter une variation (niveau 3+)
  if (gameState.level >= 3) {
    const variation = Math.floor(Math.random() * 3);
    const circle = circles[variation];
    circle.classList.add('active', 'milo-played');
    playBeat(variation, true);
    await sleep(500);
    circle.classList.remove('active');
  }

  feedback.hidden = true;

  // Vérifier si assez d'échanges
  const config = LEVELS[gameState.level];
  const exchangesNeeded = Math.floor(config.maxTurns / 2);

  if (gameState.exchangesThisRound >= exchangesNeeded) {
    // Niveau terminé
    if (gameState.level < 5) {
      gameState.level++;
      levelBadge.textContent = `Niveau ${gameState.level}`;
      levelValue.textContent = gameState.level;
      gameState.exchangesThisRound = 0;

      showSpeech(`Bravo ! Niveau ${gameState.level} !`);
      await speak(`Bravo ! Niveau ${gameState.level} !`);
    } else {
      showSpeech("Bravo ! Tu as atteint le niveau maximum !");
      await speak("Bravo ! Tu as atteint le niveau maximum !");
    }

    // Continuer au niveau suivant
    setTimeout(() => startMiloTurn(), 1000);
  } else {
    // Continuer le dialogue
    setTimeout(() => startMiloTurn(), 1000);
  }
}

// ============================================================
// 10. MILO CONTINUE SEUL (si l'enfant ne répond pas)
// ============================================================

async function miloContinuesAlone() {
  if (!gameState.isChildTurn) return;

  gameState.isChildTurn = false;
  gameState.exchangeCount++;
  exchangeCountEl.textContent = gameState.exchangeCount;

  miloBubble.textContent = "🎵 Je continue...";
  childBubble.textContent = "⏳";

  showSpeech("Je continue tout seul !");
  await speak("Je continue tout seul !");

  // Milo joue une nouvelle séquence
  const config = LEVELS[gameState.level];
  const beats = config.beatsPerTurn;

  for (let i = 0; i < beats; i++) {
    const idx = Math.floor(Math.random() * 3);
    const circle = circles[idx];
    circle.classList.add('active', 'milo-played');
    playBeat(idx, true);
    await sleep(400);
    circle.classList.remove('active');
    await sleep(200);
  }

  setTimeout(() => startMiloTurn(), 800);
}

// ============================================================
// 11. UTILITAIRES
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// 12. PAUSE / STOP
// ============================================================

pauseBtn.addEventListener('click', () => {
  playClick();
  pauseOverlay.hidden = false;
});

resumeBtn.addEventListener('click', () => {
  playClick();
  pauseOverlay.hidden = true;
});

stopBtn.addEventListener('click', async () => {
  playClick();
  stopAllSounds();
  if ('speechSynthesis' in window) synth.cancel();
  showSpeech("D'accord, on arrête ici. Merci d'avoir joué !");
  await speak("D'accord, on arrête ici. Merci d'avoir joué !");
  endGame();
});

// ============================================================
// 13. FIN DE JEU + SAUVEGARDE
// ============================================================

function endGame() {
  stopAllSounds();
  if (gameState.childTimer) clearTimeout(gameState.childTimer);
  gameZone.style.display = 'none';
  document.querySelector('.milo-zone').style.display = 'none';
  endScreen.style.display = 'block';

  endTours.textContent = gameState.tourCount;
  endExchanges.textContent = gameState.exchangeCount;
  endLevel.textContent = gameState.level;

  if (currentProfile) {
    if (!currentProfile.profile.history) currentProfile.profile.history = [];
    currentProfile.profile.history.push({
      game: 'dialogue',
      date: new Date().toISOString(),
      tours: gameState.tourCount,
      exchanges: gameState.exchangeCount,
      level_reached: gameState.level,
      total_time_seconds: Math.round((Date.now() - gameState.startTime) / 1000),
    });
    currentProfile.profile.updated_at = new Date().toISOString();
    try {
      localStorage.setItem('smc_profile', JSON.stringify(currentProfile));
    } catch (e) {
      console.warn('Sauvegarde impossible :', e);
    }
  }

  showSpeech("Bravo ! Quel beau dialogue !");
  speak("Bravo ! Quel beau dialogue !");
}

replayGameBtn.addEventListener('click', () => {
  playClick();
  window.location.reload();
});

goGamesBtn.addEventListener('click', () => {
  playClick();
  stopAllSounds();
  window.location.href = 'jeux.html';
});

goHomeBtn.addEventListener('click', () => {
  playClick();
  stopAllSounds();
  window.location.href = 'index.html';
});

backGamesBtn.addEventListener('click', () => {
  playClick();
  stopAllSounds();
  window.location.href = 'jeux.html';
});

// ============================================================
// 14. INITIALISATION
// ============================================================

window.addEventListener('load', () => {
  setTimeout(() => {
    showSpeech("Salut ! On va faire un dialogue musical !");
    speak("Salut ! On va faire un dialogue musical !");
  }, 500);

  // État initial : cercles cachés
  circlesZone.hidden = true;
  miloBubble.textContent = "🎵 ...";
  childBubble.textContent = "⏳";
});
/* ============================================================
   Jeu du Chef d'orchestre — SmartMusicCare
   Reproduire un rythme avec des cercles
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

function playTone(freq, duration, type = 'sine', gainValue = 0.3, startTime = null) {
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

/**
 * Joue un battement de percussion (utilisé pour chaque cercle).
 */
function playBeat(freq = 120, isStrong = false) {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;

  // Corps du son (oscillateur)
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq * 2, now);
  osc.frequency.exponentialRampToValueAtTime(freq, now + 0.15);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(isStrong ? 0.5 : 0.35, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
  activeNodes.push(osc);
  osc.onended = () => {
    const i = activeNodes.indexOf(osc);
    if (i > -1) activeNodes.splice(i, 1);
  };

  // Attaque percussive (bruit blanc très court)
  const bufferSize = audioCtx.sampleRate * 0.03;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.15, now);
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

function playError() {
  initAudio();
  const now = audioCtx.currentTime;
  playTone(300, 0.2, 'sine', 0.2, now);
  playTone(250, 0.25, 'sine', 0.2, now + 0.15);
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

// Voix
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
// 3. PROFIL
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
// 4. ÉTAT DU JEU
// ============================================================

const gameState = {
  level: 1,
  successCount: 0,
  attemptCount: 0,
  sequence: [],       // séquence attendue (array de 1 à 5)
  playerSequence: [], // ce que l'enfant tape
  isPlaying: false,   // Milo joue le rythme
  isPlayerTurn: false,
  startTime: 0,
  totalTime: 0,
};

// Configuration par niveau
const LEVELS = {
  1: { beats: 1, tempo: 1.0, name: 'Niveau 1' },
  2: { beats: 2, tempo: 0.9, name: 'Niveau 2' },
  3: { beats: 3, tempo: 0.75, name: 'Niveau 3' },
  4: { beats: 4, tempo: 0.65, name: 'Niveau 4' },
  5: { beats: 4, tempo: 0.6, name: 'Niveau 5' },
};

// ============================================================
// 5. ÉLÉMENTS DOM
// ============================================================

const milo = document.getElementById('milo');
const speechTextEl = document.getElementById('speechText');
const levelBadge = document.getElementById('levelBadge');
const levelValue = document.getElementById('levelValue');
const successCountEl = document.getElementById('successCount');
const attemptCountEl = document.getElementById('attemptCount');

const listenBtn = document.getElementById('listenBtn');
const listenZone = document.getElementById('listenZone');
const circles = document.querySelectorAll('.circle');
const circlesHint = document.getElementById('circlesHint');

const feedback = document.getElementById('feedback');
const feedbackIcon = document.getElementById('feedbackIcon');
const feedbackText = document.getElementById('feedbackText');

const replayBtn = document.getElementById('replayBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const resumeBtn = document.getElementById('resumeBtn');
const pauseOverlay = document.getElementById('pauseOverlay');

const endScreen = document.getElementById('endScreen');
const gameZone = document.querySelector('.game-zone');
const endSuccess = document.getElementById('endSuccess');
const endAttempts = document.getElementById('endAttempts');
const endLevel = document.getElementById('endLevel');
const replayGameBtn = document.getElementById('replayGameBtn');
const goGamesBtn = document.getElementById('goGamesBtn');
const goHomeBtn = document.getElementById('goHomeBtn');
const backGamesBtn = document.getElementById('backGames');

// ============================================================
// 6. GÉNÉRATION DE LA SÉQUENCE
// ============================================================

function generateSequence(level) {
  const { beats } = LEVELS[level];
  // Utiliser 3 cercles différents pour varier (0, 1, 2)
  const sequence = [];
  for (let i = 0; i < beats; i++) {
    sequence.push(Math.floor(Math.random() * 3)); // 0, 1 ou 2
  }
  return sequence;
}

// ============================================================
// 7. JOUER LA SÉQUENCE
// ============================================================

async function playSequence() {
  if (gameState.isPlaying) return;
  gameState.isPlaying = true;
  gameState.isPlayerTurn = false;

  // Désactiver les boutons
  circles.forEach(c => c.disabled = true);
  listenBtn.disabled = true;
  replayBtn.disabled = true;
  circlesHint.textContent = '👂 Écoute bien...';
  milo.classList.add('playing');

  const { tempo } = LEVELS[gameState.level];
  const interval = tempo * 1000;

  // Jouer chaque battement
  for (let i = 0; i < gameState.sequence.length; i++) {
    const circleIndex = gameState.sequence[i];
    const circle = circles[circleIndex];

    // Animer le cercle
    circle.classList.add('active');
    playBeat(100 + circleIndex * 40, i === 0);

    await sleep(interval / 2);
    circle.classList.remove('active');
    await sleep(interval / 2);
  }

  milo.classList.remove('playing');
  gameState.isPlaying = false;
  gameState.isPlayerTurn = true;
  gameState.playerSequence = [];
  gameState.startTime = Date.now();

  // Réactiver
  circles.forEach(c => c.disabled = false);
  listenBtn.disabled = false;
  replayBtn.disabled = false;
  circlesHint.textContent = '🎯 À toi ! Reproduis le rythme.';

  showSpeech("À toi ! Reproduis mon rythme.");
  speak("À toi ! Reproduis mon rythme.");
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// 8. CLIC SUR UN CERCLE
// ============================================================

circles.forEach(circle => {
  circle.addEventListener('click', async () => {
    if (!gameState.isPlayerTurn) return;
    if (circle.disabled) return;

    playClick();
    const index = Number(circle.dataset.index);
    // Limiter aux 3 premiers cercles
    if (index > 2) return;

    // Feedback visuel
    circle.classList.add('pressed');
    playBeat(100 + index * 40, false);
    setTimeout(() => circle.classList.remove('pressed'), 150);

    gameState.playerSequence.push(index);

    // Vérifier si la séquence est complète
    if (gameState.playerSequence.length === gameState.sequence.length) {
      await checkSequence();
    }
  });
});

// ============================================================
// 9. VÉRIFICATION
// ============================================================

async function checkSequence() {
  gameState.isPlayerTurn = false;
  gameState.attemptCount++;
  attemptCountEl.textContent = gameState.attemptCount;

  const responseTime = (Date.now() - gameState.startTime) / 1000;
  gameState.totalTime += responseTime;

  // Comparer
  const isCorrect = gameState.playerSequence.every(
    (val, i) => val === gameState.sequence[i]
  );

  // Désactiver les cercles
  circles.forEach(c => c.disabled = true);

  // Afficher feedback
  feedback.hidden = false;

  if (isCorrect) {
    gameState.successCount++;
    successCountEl.textContent = gameState.successCount;

    feedback.className = 'feedback success';
    feedbackIcon.textContent = '✅';
    feedbackText.textContent = 'Bravo ! C\'est exact !';

    // Animer tous les cercles en vert
    gameState.sequence.forEach((idx, i) => {
      setTimeout(() => {
        circles[idx].classList.add('correct');
        setTimeout(() => circles[idx].classList.remove('correct'), 600);
      }, i * 100);
    });

    playSuccess();
    showSpeech("Bravo ! C'est exact !");
    await speak("Bravo ! C'est exact !");

    // Niveau suivant (max 5)
    if (gameState.level < 5) {
      gameState.level++;
      levelBadge.textContent = `Niveau ${gameState.level}`;
      levelValue.textContent = gameState.level;
    }

    // Nouvelle séquence
    setTimeout(() => {
      feedback.hidden = true;
      startNewRound();
    }, 2000);

  } else {
    // Incorrect
    feedback.className = 'feedback error';
    feedbackIcon.textContent = '🔄';
    feedbackText.textContent = 'Presque ! Essaie encore.';

    playError();
    showSpeech("Presque ! Écoute encore une fois.");
    await speak("Presque ! Écoute encore une fois.");

    // Réduire le niveau si l'enfant échoue 2 fois de suite (min 1)
    // (simple : on ne change pas le niveau pour rester encourageant)

    setTimeout(() => {
      feedback.hidden = true;
      // Rejouer la même séquence
      gameState.playerSequence = [];
      gameState.isPlayerTurn = true;
      circles.forEach(c => c.disabled = false);
      circlesHint.textContent = '🎯 Réessaie !';
    }, 2000);
  }
}

// ============================================================
// 10. NOUVELLE MANCHE
// ============================================================

function startNewRound() {
  gameState.sequence = generateSequence(gameState.level);
  gameState.playerSequence = [];
  gameState.isPlayerTurn = false;
  circles.forEach(c => {
    c.classList.remove('correct', 'wrong', 'active', 'pressed');
    c.disabled = true;
  });
  listenBtn.disabled = false;
  replayBtn.disabled = false;
  circlesHint.textContent = '👂 Appuie sur "Écouter le rythme"';

  showSpeech("Écoute mon nouveau rythme !");
  speak("Écoute mon nouveau rythme !");
}

// ============================================================
// 11. BOUTONS
// ============================================================

listenBtn.addEventListener('click', () => {
  playClick();
  if (gameState.sequence.length === 0) {
    startNewRound();
  }
  playSequence();
});

replayBtn.addEventListener('click', () => {
  playClick();
  playSequence();
});

pauseBtn.addEventListener('click', () => {
  playClick();
  pauseOverlay.hidden = false;
});

resumeBtn.addEventListener('click', () => {
  playClick();
  pauseOverlay.hidden = true;
});

stopBtn.addEventListener('click', () => {
  playClick();
  stopAllSounds();
  if ('speechSynthesis' in window) synth.cancel();
  showSpeech("D'accord, on arrête ici. Merci d'avoir joué !");
  speak("D'accord, on arrête ici. Merci d'avoir joué !").then(() => {
    endGame();
  });
});

backGamesBtn.addEventListener('click', () => {
  playClick();
  stopAllSounds();
  window.location.href = 'jeux.html';
});

// ============================================================
// 12. FIN DE JEU + SAUVEGARDE
// ============================================================

function endGame() {
  stopAllSounds();
  gameZone.style.display = 'none';
  document.querySelector('.milo-zone').style.display = 'none';
  endScreen.style.display = 'block';

  endSuccess.textContent = gameState.successCount;
  endAttempts.textContent = gameState.attemptCount;
  endLevel.textContent = gameState.level;

  // Sauvegarder dans le profil
  if (currentProfile) {
    if (!currentProfile.profile.history) currentProfile.profile.history = [];
    currentProfile.profile.history.push({
      game: 'chef-orchestre',
      date: new Date().toISOString(),
      success: gameState.successCount,
      attempts: gameState.attemptCount,
      level_reached: gameState.level,
      total_time_seconds: Math.round(gameState.totalTime),
    });
    currentProfile.profile.updated_at = new Date().toISOString();
    try {
      localStorage.setItem('smc_profile', JSON.stringify(currentProfile));
    } catch (e) {
      console.warn('Sauvegarde impossible :', e);
    }
  }

  showSpeech("Bravo ! Tu as bien joué !");
  speak("Bravo ! Tu as bien joué !");
}

replayGameBtn.addEventListener('click', () => {
  playClick();
  window.location.reload();
});

goGamesBtn.addEventListener('click', () => {
  playClick();
  window.location.href = 'jeux.html';
});

goHomeBtn.addEventListener('click', () => {
  playClick();
  window.location.href = 'index.html';
});

// ============================================================
// 13. INITIALISATION
// ============================================================

window.addEventListener('load', () => {
  setTimeout(() => {
    showSpeech("Salut ! Je suis le chef d'orchestre ! Écoute mon rythme.");
    speak("Salut ! Je suis le chef d'orchestre. Écoute mon rythme.");
  }, 500);

  // Préparer la première séquence
  gameState.sequence = generateSequence(1);
  circles.forEach(c => c.disabled = true);
});
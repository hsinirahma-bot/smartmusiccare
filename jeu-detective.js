/* ============================================================
   Jeu du Détective musical — SmartMusicCare
   Reconnaître un instrument à l'écoute
   + Aide auditive pour découvrir les instruments
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
  gain.gain.linearRampToValueAtTime(gainValue, now + 0.03);
  gain.gain.setValueAtTime(gainValue, now + duration * 0.7);
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

/* ============ PIANO ============ */
function soundPiano() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  stopAllSounds();
  const now = audioCtx.currentTime;
  const notes = [261.63, 329.63, 392.00, 523.25];
  notes.forEach((freq, i) => {
    const t = now + i * 0.22;
    playTone(freq, 0.7, 'sine', 0.3, t);
    playTone(freq * 2, 0.5, 'sine', 0.1, t);
  });
  const id = setTimeout(() => {
    playTone(261.63, 1.5, 'sine', 0.2);
    playTone(329.63, 1.5, 'sine', 0.2);
    playTone(392.00, 1.5, 'sine', 0.2);
  }, 900);
  activeTimeouts.push(id);
}

/* ============ GUITARE ============ */
function soundGuitar() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  stopAllSounds();
  const now = audioCtx.currentTime;
  const chords = [
    [196.00, 246.94, 293.66],
    [261.63, 329.63, 392.00],
    [196.00, 246.94, 293.66],
  ];
  let t = now;
  chords.forEach((chord) => {
    chord.forEach((freq, i) => {
      playTone(freq, 0.8, 'triangle', 0.22, t + i * 0.1);
    });
    t += 0.7;
  });
  const id = setTimeout(() => {
    playTone(392.00, 1.8, 'triangle', 0.25);
    playTone(523.25, 1.8, 'triangle', 0.12);
  }, 2100);
  activeTimeouts.push(id);
}

/* ============ TAMBOUR ============ */
function soundDrum() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  stopAllSounds();
  const now = audioCtx.currentTime;
  const pattern = [
    { freq: 90, t: 0.0, type: 'kick' },
    { freq: 200, t: 0.3, type: 'snare' },
    { freq: 80, t: 0.6, type: 'kick' },
    { freq: 85, t: 0.9, type: 'kick' },
    { freq: 200, t: 1.2, type: 'snare' },
    { freq: 90, t: 1.5, type: 'kick' },
    { freq: 200, t: 1.8, type: 'snare' },
    { freq: 80, t: 2.1, type: 'kick' },
  ];
  pattern.forEach(({ freq, t, type }) => {
    const time = now + t;
    if (type === 'kick') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 1.5, time);
      osc.frequency.exponentialRampToValueAtTime(freq, time + 0.1);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.5, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(time);
      osc.stop(time + 0.3);
      activeNodes.push(osc);
      osc.onended = () => {
        const i = activeNodes.indexOf(osc);
        if (i > -1) activeNodes.splice(i, 1);
      };
    } else {
      const bufferSize = audioCtx.sampleRate * 0.15;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.4, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1500;
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      noise.start(time);
      activeNodes.push(noise);
      noise.onended = () => {
        const i = activeNodes.indexOf(noise);
        if (i > -1) activeNodes.splice(i, 1);
      };
    }
  });
}

/* ============ FLÛTE ============ */
function soundFlute() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  stopAllSounds();
  const now = audioCtx.currentTime;
  const melody = [
    { f: 587.33, d: 0.5 }, { f: 659.25, d: 0.5 }, { f: 783.99, d: 0.7 },
    { f: 659.25, d: 0.5 }, { f: 783.99, d: 0.7 }, { f: 880.00, d: 1.0 },
  ];
  let t = now;
  melody.forEach(({ f, d }) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const vibrato = audioCtx.createOscillator();
    const vibratoGain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    vibrato.frequency.value = 5.5;
    vibratoGain.gain.value = 5;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.1);
    gain.gain.setValueAtTime(0.22, t + d * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, t + d);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    vibrato.start(t);
    osc.stop(t + d + 0.1);
    vibrato.stop(t + d + 0.1);
    activeNodes.push(osc, vibrato);
    osc.onended = () => {
      const i = activeNodes.indexOf(osc);
      if (i > -1) activeNodes.splice(i, 1);
    };
    playTone(f * 2, d * 0.3, 'sine', 0.03, t);
    t += d;
  });
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
// 5. INSTRUMENTS
// ============================================================

const INSTRUMENTS = {
  piano:  { emoji: '🎹', name: 'Piano',   sound: soundPiano  },
  guitar: { emoji: '🎸', name: 'Guitare', sound: soundGuitar },
  drum:   { emoji: '🥁', name: 'Tambour', sound: soundDrum   },
  flute:  { emoji: '🪈', name: 'Flûte',   sound: soundFlute  },
};

// ============================================================
// 6. ÉTAT DU JEU
// ============================================================

const gameState = {
  level: 1,
  successCount: 0,
  attemptCount: 0,
  targetInstrument: null,
  choices: [],
  answered: false,
  startTime: 0,
  totalTime: 0,
};

const LEVELS = {
  1: { choices: 2, allowed: ['piano', 'guitar'] },
  2: { choices: 3, allowed: ['piano', 'guitar', 'drum'] },
  3: { choices: 3, allowed: ['piano', 'guitar', 'flute'] },
  4: { choices: 4, allowed: ['piano', 'guitar', 'drum', 'flute'] },
  5: { choices: 4, allowed: ['piano', 'guitar', 'drum', 'flute'] },
};

// ============================================================
// 7. ÉLÉMENTS DOM
// ============================================================

const milo = document.getElementById('milo');
const speechTextEl = document.getElementById('speechText');
const levelBadge = document.getElementById('levelBadge');
const levelValue = document.getElementById('levelValue');
const successCountEl = document.getElementById('successCount');
const attemptCountEl = document.getElementById('attemptCount');

const listenBtn = document.getElementById('listenBtn');
const choicesGrid = document.getElementById('choicesGrid');
const choicesHint = document.getElementById('choicesHint');

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
// 8. GÉNÉRATION D'UNE MANCHE
// ============================================================

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startNewRound() {
  gameState.answered = false;

  const config = LEVELS[gameState.level];
  const allowed = config.allowed;

  gameState.targetInstrument = allowed[Math.floor(Math.random() * allowed.length)];

  const others = allowed.filter(i => i !== gameState.targetInstrument);
  const shuffledOthers = shuffle(others);
  const numChoices = config.choices;
  const selectedOthers = shuffledOthers.slice(0, numChoices - 1);

  const allChoices = [gameState.targetInstrument, ...selectedOthers];
  gameState.choices = shuffle(allChoices);

  renderChoices();

  feedback.hidden = true;
  listenBtn.disabled = false;
  replayBtn.disabled = false;
  choicesHint.textContent = '👂 Appuie sur "Écouter" puis choisis le bon instrument';

  showSpeech("Écoute bien ! Quel instrument joue ?");
  speak("Écoute bien ! Quel instrument joue ?");

  setTimeout(() => playTargetSound(), 1200);
}

function renderChoices() {
  choicesGrid.innerHTML = '';

  const numChoices = gameState.choices.length;
  choicesGrid.className = 'choices-grid';
  if (numChoices === 2) choicesGrid.classList.add('cols-2');
  else if (numChoices === 3) choicesGrid.classList.add('cols-3');
  else choicesGrid.classList.add('cols-4');

  gameState.choices.forEach((instrumentId) => {
    const inst = INSTRUMENTS[instrumentId];
    const btn = document.createElement('button');
    btn.className = 'choice-card';
    btn.dataset.instrument = instrumentId;
    btn.innerHTML = `
      <div class="choice-emoji">${inst.emoji}</div>
      <div class="choice-name">${inst.name}</div>
    `;
    btn.addEventListener('click', () => handleChoice(instrumentId, btn));
    choicesGrid.appendChild(btn);
  });
}

// ============================================================
// 9. JOUER LE SON CIBLE
// ============================================================

function playTargetSound() {
  if (!gameState.targetInstrument) return;
  const inst = INSTRUMENTS[gameState.targetInstrument];
  if (inst && inst.sound) inst.sound();
}

listenBtn.addEventListener('click', () => {
  playClick();
  playTargetSound();
});

replayBtn.addEventListener('click', () => {
  playClick();
  playTargetSound();
});

// ============================================================
// 10. GESTION DU CHOIX
// ============================================================

async function handleChoice(instrumentId, btn) {
  if (gameState.answered) return;
  gameState.answered = true;
  gameState.attemptCount++;
  attemptCountEl.textContent = gameState.attemptCount;

  const responseTime = (Date.now() - gameState.startTime) / 1000;
  if (gameState.startTime > 0) gameState.totalTime += responseTime;

  playClick();

  document.querySelectorAll('.choice-card').forEach(b => b.disabled = true);

  const isCorrect = instrumentId === gameState.targetInstrument;

  feedback.hidden = false;

  if (isCorrect) {
    gameState.successCount++;
    successCountEl.textContent = gameState.successCount;

    btn.classList.add('correct');
    feedback.className = 'feedback success';
    feedbackIcon.textContent = '✅';
    feedbackText.textContent = `Bravo ! C'était bien le ${INSTRUMENTS[instrumentId].name} !`;

    playSuccess();
    showSpeech(`Bravo ! C'était le ${INSTRUMENTS[instrumentId].name} !`);
    await speak(`Bravo ! C'était le ${INSTRUMENTS[instrumentId].name} !`);

    if (gameState.level < 5) {
      gameState.level++;
      levelBadge.textContent = `Niveau ${gameState.level}`;
      levelValue.textContent = gameState.level;
    }

    setTimeout(() => {
      gameState.startTime = Date.now();
      startNewRound();
    }, 2200);

  } else {
    btn.classList.add('wrong');

    const correctBtn = document.querySelector(`.choice-card[data-instrument="${gameState.targetInstrument}"]`);
    if (correctBtn) correctBtn.classList.add('reveal');

    feedback.className = 'feedback error';
    feedbackIcon.textContent = '🔄';
    feedbackText.textContent = `Presque ! C'était le ${INSTRUMENTS[gameState.targetInstrument].name}.`;

    playError();
    showSpeech(`Presque ! C'était le ${INSTRUMENTS[gameState.targetInstrument].name}.`);
    await speak(`Presque ! C'était le ${INSTRUMENTS[gameState.targetInstrument].name}.`);

    setTimeout(() => {
      gameState.startTime = Date.now();
      startNewRound();
    }, 2500);
  }
}

// ============================================================
// 11. PAUSE / STOP
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
// 12. FIN DE JEU + SAUVEGARDE
// ============================================================

function endGame() {
  stopAllSounds();
  gameZone.style.display = 'none';
  document.querySelector('.milo-zone').style.display = 'none';
  document.querySelector('.help-instruments').style.display = 'none';
  endScreen.style.display = 'block';

  endSuccess.textContent = gameState.successCount;
  endAttempts.textContent = gameState.attemptCount;
  endLevel.textContent = gameState.level;

  if (currentProfile) {
    if (!currentProfile.profile.history) currentProfile.profile.history = [];
    currentProfile.profile.history.push({
      game: 'detective',
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

  showSpeech("Bravo ! Tu es un vrai détective !");
  speak("Bravo ! Tu es un vrai détective !");
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
// 13. AIDE : DÉCOUVRIR LES INSTRUMENTS
// ============================================================

document.querySelectorAll('[data-help-instrument]').forEach(btn => {
  btn.addEventListener('click', async () => {
    playClick();
    const instrument = btn.dataset.helpInstrument;
    const inst = INSTRUMENTS[instrument];
    if (!inst) return;

    document.querySelectorAll('.help-card').forEach(b => {
      if (b !== btn) b.classList.remove('playing');
    });

    btn.classList.add('playing');

    if (inst.sound) inst.sound();

    setTimeout(() => {
      btn.classList.remove('playing');
    }, 5000);

    const t = `C'est le son du ${inst.name.toLowerCase()} !`;
    showSpeech(t);
    speak(t);
  });
});

// Toggle de la section aide
const helpToggle = document.getElementById('helpToggle');
const helpGrid = document.getElementById('helpGrid');

if (helpToggle && helpGrid) {
  helpToggle.addEventListener('click', () => {
    playClick();
    helpGrid.classList.toggle('collapsed');
    helpToggle.classList.toggle('collapsed');
  });
}

// ============================================================
// 14. INITIALISATION
// ============================================================

window.addEventListener('load', () => {
  setTimeout(() => {
    showSpeech("Salut ! Je suis un détective musical. Écoute bien les sons !");
    speak("Salut ! Je suis un détective musical. Écoute bien les sons !");
  }, 500);

  setTimeout(() => {
    gameState.startTime = Date.now();
    startNewRound();
  }, 2500);
});
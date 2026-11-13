/* ============================================================
   Questionnaire enfant — SmartMusicCare
   Version avec sons longs + arrêt automatique du son précédent
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
// 2. PROFIL
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
// 3. AUDIO — Sons longs + arrêt automatique
// ============================================================

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

// ===== REGISTRE DES SONS ACTIFS =====
let activeNodes = [];      // oscillateurs et buffers en cours
let activeTimeouts = [];   // setTimeout planifiés

/**
 * Arrête TOUS les sons en cours.
 */
function stopAllSounds() {
  // 1. Stopper tous les oscillateurs / buffers
  activeNodes.forEach(node => {
    try { node.stop(0); } catch (e) {}
    try { node.disconnect(); } catch (e) {}
  });
  activeNodes = [];

  // 2. Annuler tous les setTimeout planifiés
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

  // Enregistrer pour pouvoir couper
  activeNodes.push(osc);
  osc.onended = () => {
    const i = activeNodes.indexOf(osc);
    if (i > -1) activeNodes.splice(i, 1);
  };
}

/* ============ PIANO (6 s) ============ */
function soundPiano() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  stopAllSounds();
  const now = audioCtx.currentTime;

  const melody = [
    { f: 261.63, d: 0.5 }, { f: 261.63, d: 0.5 }, { f: 261.63, d: 0.5 },
    { f: 293.66, d: 0.5 }, { f: 329.63, d: 0.5 }, { f: 293.66, d: 0.5 },
    { f: 261.63, d: 0.5 }, { f: 329.63, d: 0.5 }, { f: 293.66, d: 0.5 },
    { f: 293.66, d: 0.5 }, { f: 261.63, d: 1.0 },
  ];
  let t = now;
  melody.forEach(({ f, d }) => {
    playTone(f, d * 1.1, 'sine', 0.28, t);
    playTone(f * 2, d * 1.1, 'sine', 0.08, t);
    t += d;
  });

  const id = setTimeout(() => {
    playTone(261.63, 1.5, 'sine', 0.2);
    playTone(329.63, 1.5, 'sine', 0.2);
    playTone(392.00, 1.5, 'sine', 0.2);
  }, (t - now) * 1000);
  activeTimeouts.push(id);
}

/* ============ GUITARE (6 s) ============ */
function soundGuitar() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  stopAllSounds();
  const now = audioCtx.currentTime;

  const chords = [
    [261.63, 329.63, 392.00],
    [329.63, 392.00, 493.88],
    [261.63, 329.63, 392.00],
    [196.00, 246.94, 293.66],
  ];

  let t = now;
  chords.forEach((chord) => {
    chord.forEach((freq, i) => {
      playTone(freq, 0.9, 'triangle', 0.22, t + i * 0.12);
      playTone(freq * 2, 0.7, 'triangle', 0.06, t + i * 0.12);
    });
    const id = setTimeout(() => {
      chord.forEach(freq => playTone(freq, 0.8, 'triangle', 0.15));
    }, 350);
    activeTimeouts.push(id);
    t += 0.9;
  });

  const id = setTimeout(() => {
    playTone(392.00, 2.0, 'triangle', 0.2);
    playTone(523.25, 2.0, 'triangle', 0.12);
  }, 3600);
  activeTimeouts.push(id);
}

/* ============ TAMBOUR (5 s) ============ */
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
    { freq: 85, t: 2.4, type: 'kick' },
    { freq: 200, t: 2.7, type: 'snare' },
    { freq: 90, t: 3.0, type: 'kick' },
    { freq: 200, t: 3.3, type: 'snare' },
    { freq: 80, t: 3.6, type: 'kick' },
    { freq: 85, t: 3.9, type: 'kick' },
    { freq: 200, t: 4.2, type: 'snare' },
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

/* ============ FLÛTE (6 s) ============ */
function soundFlute() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  stopAllSounds();
  const now = audioCtx.currentTime;

  const melody = [
    { f: 587.33, d: 0.6 }, { f: 659.25, d: 0.6 }, { f: 783.99, d: 0.8 },
    { f: 659.25, d: 0.6 }, { f: 783.99, d: 0.8 }, { f: 880.00, d: 1.0 },
    { f: 783.99, d: 0.6 }, { f: 659.25, d: 1.4 },
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

/* ============ MUSIQUE DOUCE (8 s) ============ */
function soundSoftMusic() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  stopAllSounds();
  const now = audioCtx.currentTime;

  const melody = [
    { f: 261.63, d: 0.8 }, { f: 329.63, d: 0.8 }, { f: 392.00, d: 1.2 },
    { f: 329.63, d: 0.8 }, { f: 261.63, d: 0.8 }, { f: 293.66, d: 0.8 },
    { f: 329.63, d: 1.0 }, { f: 261.63, d: 2.0 },
  ];

  let t = now;
  melody.forEach(({ f, d }) => {
    playTone(f, d * 1.2, 'sine', 0.18, t);
    playTone(f * 0.75, d * 1.2, 'sine', 0.08, t);
    playTone(f * 2, d * 0.9, 'sine', 0.04, t);
    t += d;
  });

  const chords = [
    { t: 0, notes: [261.63, 329.63, 392.00] },
    { t: 2.4, notes: [293.66, 369.99, 440.00] },
    { t: 4.8, notes: [261.63, 329.63, 392.00] },
    { t: 6.4, notes: [261.63, 329.63, 392.00] },
  ];
  chords.forEach(({ t: ct, notes }) => {
    notes.forEach(f => playTone(f, 1.5, 'sine', 0.06, now + ct));
  });
}

/* ============ MUSIQUE RYTHMÉE (8 s) ============ */
function soundRhythmicMusic() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  stopAllSounds();
  const now = audioCtx.currentTime;

  const bpm = 0.4;
  for (let i = 0; i < 20; i++) {
    const t = now + i * bpm;
    if (i % 4 === 0 || i % 4 === 2) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
      activeNodes.push(osc);
      osc.onended = () => {
        const idx = activeNodes.indexOf(osc);
        if (idx > -1) activeNodes.splice(idx, 1);
      };
    }
    if (i % 4 === 1 || i % 4 === 3) {
      const bufferSize = audioCtx.sampleRate * 0.08;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = (Math.random() * 2 - 1) * (1 - j / bufferSize);
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1500;
      noise.connect(filter);
      filter.connect(g);
      g.connect(audioCtx.destination);
      noise.start(t);
      activeNodes.push(noise);
      noise.onended = () => {
        const idx = activeNodes.indexOf(noise);
        if (idx > -1) activeNodes.splice(idx, 1);
      };
    }
    const bufferSize = audioCtx.sampleRate * 0.03;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let j = 0; j < bufferSize; j++) {
      data[j] = (Math.random() * 2 - 1) * (1 - j / bufferSize) * 0.4;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;
    noise.connect(filter);
    filter.connect(g);
    g.connect(audioCtx.destination);
    noise.start(t);
    activeNodes.push(noise);
    noise.onended = () => {
      const idx = activeNodes.indexOf(noise);
      if (idx > -1) activeNodes.splice(idx, 1);
    };
  }

  const melody = [
    { f: 392.00, t: 0.0 }, { f: 440.00, t: 0.4 }, { f: 523.25, t: 0.8 },
    { f: 440.00, t: 1.2 }, { f: 392.00, t: 1.6 }, { f: 523.25, t: 2.0 },
    { f: 587.33, t: 2.4 }, { f: 523.25, t: 2.8 }, { f: 440.00, t: 3.2 },
    { f: 392.00, t: 3.6 }, { f: 523.25, t: 4.0 }, { f: 587.33, t: 4.4 },
    { f: 659.25, t: 4.8 }, { f: 587.33, t: 5.2 }, { f: 523.25, t: 5.6 },
    { f: 440.00, t: 6.0 }, { f: 392.00, t: 6.4 }, { f: 523.25, t: 6.8 },
    { f: 587.33, t: 7.2 }, { f: 392.00, t: 7.6 },
  ];
  melody.forEach(({ f, t }) => playTone(f, 0.35, 'square', 0.08, now + t));
}

/* ============ SONS DE LA NATURE (8 s) ============ */
function soundNatureMusic() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  stopAllSounds();
  const now = audioCtx.currentTime;

  const bufferSize = audioCtx.sampleRate * 8;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.04;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.2, now + 1);
  g.gain.setValueAtTime(0.2, now + 7);
  g.gain.linearRampToValueAtTime(0, now + 8);
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2500;
  noise.connect(filter);
  filter.connect(g);
  g.connect(audioCtx.destination);
  noise.start(now);
  activeNodes.push(noise);
  noise.onended = () => {
    const idx = activeNodes.indexOf(noise);
    if (idx > -1) activeNodes.splice(idx, 1);
  };

  const birds = [
    { f: 1046.50, t: 0.3 }, { f: 1318.51, t: 0.5 }, { f: 1567.98, t: 0.7 },
    { f: 1318.51, t: 1.0 }, { f: 1046.50, t: 1.2 }, { f: 1567.98, t: 1.5 },
    { f: 1046.50, t: 2.0 }, { f: 1318.51, t: 2.2 }, { f: 1046.50, t: 2.5 },
    { f: 1318.51, t: 3.0 }, { f: 1567.98, t: 3.2 }, { f: 1046.50, t: 3.5 },
    { f: 1567.98, t: 4.2 }, { f: 1318.51, t: 4.5 }, { f: 1046.50, t: 4.7 },
    { f: 1046.50, t: 5.3 }, { f: 1318.51, t: 5.5 }, { f: 1567.98, t: 5.8 },
    { f: 1046.50, t: 6.3 }, { f: 1318.51, t: 6.5 }, { f: 1567.98, t: 6.8 },
    { f: 1318.51, t: 7.2 }, { f: 1046.50, t: 7.4 },
  ];
  birds.forEach(b => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(b.f, now + b.t);
    osc.frequency.exponentialRampToValueAtTime(b.f * 1.15, now + b.t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(b.f * 0.95, now + b.t + 0.15);
    gain.gain.setValueAtTime(0, now + b.t);
    gain.gain.linearRampToValueAtTime(0.12, now + b.t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + b.t + 0.18);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now + b.t);
    osc.stop(now + b.t + 0.2);
    activeNodes.push(osc);
    osc.onended = () => {
      const idx = activeNodes.indexOf(osc);
      if (idx > -1) activeNodes.splice(idx, 1);
    };
  });
}

/* ============ CHANSONS (8 s) ============ */
function soundSongsMusic() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  stopAllSounds();
  const now = audioCtx.currentTime;

  const melody = [
    { f: 261.63, d: 0.4 }, { f: 293.66, d: 0.4 }, { f: 329.63, d: 0.4 }, { f: 261.63, d: 0.4 },
    { f: 261.63, d: 0.4 }, { f: 293.66, d: 0.4 }, { f: 329.63, d: 0.4 }, { f: 261.63, d: 0.4 },
    { f: 329.63, d: 0.4 }, { f: 349.23, d: 0.4 }, { f: 392.00, d: 0.8 },
    { f: 329.63, d: 0.4 }, { f: 349.23, d: 0.4 }, { f: 392.00, d: 0.8 },
    { f: 392.00, d: 0.2 }, { f: 440.00, d: 0.2 }, { f: 392.00, d: 0.2 }, { f: 349.23, d: 0.2 }, { f: 329.63, d: 0.4 }, { f: 261.63, d: 0.4 },
    { f: 392.00, d: 0.2 }, { f: 440.00, d: 0.2 }, { f: 392.00, d: 0.2 }, { f: 349.23, d: 0.2 }, { f: 329.63, d: 0.4 }, { f: 261.63, d: 0.4 },
    { f: 261.63, d: 0.4 }, { f: 196.00, d: 0.4 }, { f: 261.63, d: 0.4 }, { f: 196.00, d: 1.2 },
  ];

  let t = now;
  melody.forEach(({ f, d }) => {
    playTone(f, d * 1.1, 'triangle', 0.22, t);
    playTone(f * 0.5, d * 1.1, 'sine', 0.12, t);
    t += d;
  });
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

// ============================================================
// 4. VOIX
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
// 5. ÉTAT
// ============================================================

const answers = {
  liked_instruments: [],
  disliked_instruments: [],
  liked_music_types: [],
  disliked_music_types: [],
  refusals: [],
  pauses_requested: 0,
};

let listeningInstrument = null;
let listeningMusic = null;

let currentStep = 1;
const TOTAL_STEPS = 3;

const steps = document.querySelectorAll('.step');
const stepLabels = document.querySelectorAll('.step-label');
const progressBar = document.getElementById('progressBar');

function goToStep(step) {
  currentStep = step;
  steps.forEach(s => s.classList.toggle('active', Number(s.dataset.step) === step));
  stepLabels.forEach(l => l.classList.toggle('active', Number(l.dataset.step) <= step));
  progressBar.style.width = `${(step / TOTAL_STEPS) * 100}%`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// 6. ÉTAPE 1 — INSTRUMENTS
// ============================================================

const instrumentSounds = {
  piano: soundPiano,
  guitar: soundGuitar,
  drum: soundDrum,
  flute: soundFlute,
};

document.querySelectorAll('[data-instrument]').forEach(btn => {
  btn.addEventListener('click', async () => {
    playClick();
    const instrument = btn.dataset.instrument;
    const label = btn.dataset.label;

    const soundFn = instrumentSounds[instrument];
    if (soundFn) soundFn();

    document.querySelectorAll('[data-instrument]').forEach(b => {
      if (b !== btn) b.classList.remove('listening');
    });

    btn.classList.add('listening');

    listeningInstrument = { element: btn, id: instrument, label: label };

    document.getElementById('chooseBar1').hidden = false;

    showSpeech(`Écoute le ${label.toLowerCase()} ! Tu l'aimes ?`);
    speak(`Écoute le ${label.toLowerCase()}. Tu l'aimes ?`);
  });
});

document.getElementById('chooseBtn1').addEventListener('click', async () => {
  playClick();
  if (!listeningInstrument) return;

  const { element, id, label } = listeningInstrument;

  document.querySelectorAll('[data-instrument]').forEach(b => {
    b.classList.remove('listening', 'selected');
  });
  element.classList.add('selected');

  document.getElementById('chooseBar1').hidden = true;

  answers.liked_instruments.push(id);

  showSpeech(`Super ! Tu as choisi le ${label.toLowerCase()} !`);
  await speak(`Super ! Tu as choisi le ${label.toLowerCase()}.`);

  listeningInstrument = null;

  setTimeout(() => {
    goToStep(2);
    showSpeech("Maintenant, choisis ta musique préférée !");
    speak("Maintenant, choisis ta musique préférée !");
  }, 1000);
});

// ============================================================
// 7. ÉTAPE 2 — MUSIQUES
// ============================================================

const musicSounds = {
  soft: soundSoftMusic,
  rhythmic: soundRhythmicMusic,
  nature: soundNatureMusic,
  songs: soundSongsMusic,
};

document.querySelectorAll('[data-music]').forEach(btn => {
  btn.addEventListener('click', async () => {
    playClick();
    const music = btn.dataset.music;
    const label = btn.dataset.label;

    const soundFn = musicSounds[music];
    if (soundFn) soundFn();

    document.querySelectorAll('[data-music]').forEach(b => {
      if (b !== btn) b.classList.remove('listening');
    });

    btn.classList.add('listening');

    listeningMusic = { element: btn, id: music, label: label };

    document.getElementById('chooseBar2').hidden = false;

    showSpeech(`Écoute : ${label.toLowerCase()} ! Tu aimes ?`);
    speak(`Écoute : ${label.toLowerCase()}. Tu aimes ?`);
  });
});

document.getElementById('chooseBtn2').addEventListener('click', async () => {
  playClick();
  if (!listeningMusic) return;

  const { element, id, label } = listeningMusic;

  document.querySelectorAll('[data-music]').forEach(b => {
    b.classList.remove('listening', 'selected');
  });
  element.classList.add('selected');

  document.getElementById('chooseBar2').hidden = true;

  answers.liked_music_types.push(id);
  answers._currentStyle = id;
  answers._currentInstrument = document.querySelector('[data-instrument].selected')?.dataset.instrument || 'piano';

  showSpeech("Est-ce que tu aimes ce son ?");
  await speak("Est-ce que tu aimes ce son ?");

  listeningMusic = null;

  setTimeout(() => {
    goToStep(3);
    document.getElementById('currentSoundLabel').textContent = `Tu écoutes : ${label}`;
    setTimeout(() => {
      const soundFn = musicSounds[id];
      if (soundFn) soundFn();
    }, 600);
  }, 1000);
});

// ============================================================
// 8. ÉTAPE 3 — RESSENTI
// ============================================================

document.getElementById('replaySound').addEventListener('click', () => {
  playClick();
  const style = answers._currentStyle || 'soft';
  const soundFn = musicSounds[style];
  if (soundFn) soundFn();
});

document.querySelectorAll('[data-feeling]').forEach(btn => {
  btn.addEventListener('click', async () => {
    playClick();
    const feeling = btn.dataset.feeling;

    if (feeling === 'like') {
      if (answers._currentStyle) answers.liked_music_types.push(answers._currentStyle);
      showSpeech("Super ! Je suis content que ça te plaise !");
      await speak("Super ! Je suis content que ça te plaise !");
    } else if (feeling === 'neutral') {
      showSpeech("D'accord ! C'est noté.");
      await speak("D'accord ! C'est noté.");
    } else if (feeling === 'dislike') {
      if (answers._currentStyle) answers.disliked_music_types.push(answers._currentStyle);
      showSpeech("Pas de souci ! Je ne le jouerai plus.");
      await speak("Pas de souci ! Je ne le jouerai plus.");
    }

    setTimeout(finishQuestionnaire, 1200);
  });
});

// ============================================================
// 9. PAUSE / PASSER / ARRÊTER
// ============================================================

document.querySelectorAll('[data-action]').forEach(btn => {
  btn.addEventListener('click', async () => {
    playClick();
    const action = btn.dataset.action;
    if (action === 'pause') {
      answers.pauses_requested++;
      document.getElementById('pauseOverlay').hidden = false;
    } else if (action === 'skip') {
      showSpeech("Pas de problème ! On passe.");
      await speak("Pas de problème ! On passe.");
      if (currentStep < TOTAL_STEPS) goToStep(currentStep + 1);
      else finishQuestionnaire();
    } else if (action === 'stop') {
      answers.refusals.push(`stop_step_${currentStep}`);
      showSpeech("D'accord ! On arrête ici. Merci d'avoir joué !");
      await speak("D'accord ! On arrête ici. Merci d'avoir joué !");
      finishQuestionnaire();
    }
  });
});

document.getElementById('resumeBtn').addEventListener('click', () => {
  playClick();
  document.getElementById('pauseOverlay').hidden = true;
});

// ============================================================
// 10. FIN + SAUVEGARDE
// ============================================================

async function finishQuestionnaire() {
  if (currentProfile) {
    currentProfile.profile.child_questionnaire = answers;
    currentProfile.profile.updated_at = new Date().toISOString();
    try {
      localStorage.setItem('smc_profile', JSON.stringify(currentProfile));
      localStorage.setItem('smc_profile_saved_at', new Date().toISOString());
    } catch (e) {
      console.warn('Sauvegarde impossible :', e);
    }
  }

  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.querySelector('.progress-wrap').style.display = 'none';
  document.querySelector('.milo-zone').style.display = 'none';
  document.getElementById('endScreen').style.display = 'block';

  showSpeech("Bravo ! Merci d'avoir joué avec moi !");
  await speak("Bravo ! Tu as terminé ! Merci d'avoir joué avec moi !");
}

// ============================================================
// 11. BOUTONS DE FIN
// ============================================================

document.getElementById('goHomeEnd').addEventListener('click', () => {
  playClick();
  stopAllSounds();
  window.location.href = 'index.html';
});

document.getElementById('goGames').addEventListener('click', () => {
  playClick();
  stopAllSounds();
  window.location.href = 'jeux.html';
});

document.getElementById('backHome').addEventListener('click', () => {
  playClick();
  stopAllSounds();
  window.location.href = 'index.html';
});

// ============================================================
// 12. INITIALISATION
// ============================================================

window.addEventListener('load', () => {
  setTimeout(() => {
    speak("Salut ! Prêt à découvrir les sons ? Choisis un instrument !");
  }, 500);
});

goToStep(1);
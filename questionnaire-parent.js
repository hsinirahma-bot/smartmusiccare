/* ============================================================
   Questionnaire parent — SmartMusicCare
   Enregistrement direct et passage immédiat au questionnaire enfant
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
    position: absolute; width: 120px; height: 44px;
    background: rgba(255,255,255,0.92); border-radius: 100px;
    top: ${5 + Math.random() * 35}%;
    animation: cloudDrift ${50 + Math.random() * 40}s linear infinite;
    animation-delay: ${-Math.random() * 20}s;
  `;
  if (cloudsLayer) cloudsLayer.appendChild(c);
}
for (let i = 0; i < 4; i++) spawnCloud();

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes cloudDrift { 0% { transform: translateX(-200px); } 100% { transform: translateX(calc(100vw + 200px)); } }
  .cloud::before, .cloud::after { content: ""; position: absolute; background: inherit; border-radius: 50%; }
  .cloud::before { width: 60px; height: 60px; top: -28px; left: 18px; }
  .cloud::after  { width: 46px; height: 46px; top: -20px; left: 64px; }
`;
document.head.appendChild(styleSheet);

// ============================================================
// 2. RÉFÉRENCES DOM
// ============================================================
const form = document.getElementById('parentForm');
const steps = document.querySelectorAll('.step');
const stepLabels = document.querySelectorAll('.step-label');
const progressBar = document.getElementById('progressBar');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const errorMsg = document.getElementById('errorMsg');

let currentStep = 1;
const TOTAL_STEPS = 4;

// ============================================================
// 3. NAVIGATION PAR ÉTAPES
// ============================================================
function goToStep(step) {
  currentStep = step;
  steps.forEach(s => s.classList.toggle('active', Number(s.dataset.step) === step));
  stepLabels.forEach(l => l.classList.toggle('active', Number(l.dataset.step) <= step));
  if (progressBar) progressBar.style.width = `${(step / TOTAL_STEPS) * 100}%`;
  if (prevBtn) prevBtn.disabled = (step === 1);

  if (step === TOTAL_STEPS) {
    if (nextBtn) nextBtn.style.display = 'none';
    if (submitBtn) submitBtn.style.display = 'flex';
  } else {
    if (nextBtn) nextBtn.style.display = 'flex';
    if (submitBtn) submitBtn.style.display = 'none';
  }
  if (errorMsg) errorMsg.textContent = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// 4. VALIDATION ASSOUPLIE
// ============================================================
function validateStep(step) {
  const section = document.querySelector(`.step[data-step="${step}"]`);
  if (!section) return true;

  // Radios obligatoires
  const requiredRadios = section.querySelectorAll('input[type="radio"][required]');
  const radioNames = new Set();
  requiredRadios.forEach(r => radioNames.add(r.name));

  for (const name of radioNames) {
    if (!section.querySelector(`input[name="${name}"]:checked`)) {
      if (errorMsg) errorMsg.textContent = `⚠️ Veuillez répondre à toutes les questions.`;
      return false;
    }
  }

  // Étape 3 : au moins 1 checkbox par catégorie
  if (step === 3) {
    if (section.querySelectorAll('input[name="music_types"]:checked').length === 0) {
      if (errorMsg) errorMsg.textContent = `⚠️ Choisissez au moins un type de musique.`;
      return false;
    }
    if (section.querySelectorAll('input[name="instruments"]:checked').length === 0) {
      if (errorMsg) errorMsg.textContent = `⚠️ Choisissez au moins un instrument.`;
      return false;
    }
    if (section.querySelectorAll('input[name="participation_modes"]:checked').length === 0) {
      if (errorMsg) errorMsg.textContent = `⚠️ Choisissez au moins une façon de participer.`;
      return false;
    }
  }

  // Étape 4 : au moins 1 objectif
  if (step === 4) {
    if (section.querySelectorAll('input[name="goals"]:checked').length === 0) {
      if (errorMsg) errorMsg.textContent = `⚠️ Choisissez au moins 1 objectif.`;
      return false;
    }
  }

  return true;
}

if (nextBtn) {
  nextBtn.addEventListener('click', () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS) goToStep(currentStep + 1);
  });
}

if (prevBtn) {
  prevBtn.addEventListener('click', () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  });
}

const goalsOptions = document.getElementById('goalsOptions');
const goalHint = document.getElementById('goalHint');
if (goalsOptions && goalHint) {
  goalsOptions.addEventListener('change', () => {
    const checked = goalsOptions.querySelectorAll('input[name="goals"]:checked');
    goalHint.textContent = `${checked.length} objectif(s) sélectionné(s)`;
  });
}

// ============================================================
// 5. ENREGISTREMENT
// ============================================================
let isProcessing = false;

function saveAndGoToChild() {
  if (isProcessing) return;
  isProcessing = true;

  // Valider toutes les étapes
  for (let s = 1; s <= TOTAL_STEPS; s++) {
    if (!validateStep(s)) {
      goToStep(s);
      isProcessing = false;
      return;
    }
  }

  try {
    // 1. Générer l'ID
    const year = new Date().getFullYear();
    let counter = parseInt(localStorage.getItem('smc_profile_counter') || '0', 10) + 1;
    localStorage.setItem('smc_profile_counter', String(counter));
    const code = `SMC-${year}-${String(counter).padStart(4, '0')}`;

    // 2. Construire le profil
    const data = new FormData(form);
    const r = (name) => data.get(name) || null;
    const c = (name) => data.getAll(name);
    const goals = c('goals');

    const profile = {
      profile: {
        id: code, code: code,
        created_at: new Date().toISOString(),
        general: { age_range: r('age_range'), diagnosis: r('diagnosis'), communication: r('communication'), autonomy: r('autonomy') },
        needs: { priority_need: r('priority_need'), engagement_level: r('engagement_level'), new_task_reaction: r('new_task_reaction'), social_preference: r('social_preference'), auditory_sensitivity: r('auditory_sensitivity'), loud_sound_reaction: r('loud_sound_reaction') },
        music_preferences: { music_liking: r('music_liking'), music_types: c('music_types'), instruments: c('instruments'), tempo_pref: r('tempo_pref'), participation_modes: c('participation_modes'), sounds_to_avoid: (r('sounds_to_avoid') || '').trim() },
        goals: { goal_1: goals[0] || null, goal_2: goals[1] || null, pro_note: (r('pro_note') || '').trim() },
        child_questionnaire: null,
        initial_level: { game_1: 1, game_2: 1, game_3: 1 },
        history: []
      }
    };

    // 3. Sauvegarder
    localStorage.setItem('smc_profile', JSON.stringify(profile));
    localStorage.setItem('smc_profile_id', code);
    localStorage.setItem('smc_profile_code', code);
    
    const all = JSON.parse(localStorage.getItem('smc_profiles') || '{}');
    all[code] = profile;
    localStorage.setItem('smc_profiles', JSON.stringify(all));

    // 4. Alerte de succès avec le code
    alert(`✅ Profil enregistré !\n\nCODE ENFANT : ${code}\n\nNotez bien ce code. Vous allez être redirigé vers le questionnaire de l'enfant.`);

    // 5. Redirection IMMÉDIATE vers le questionnaire enfant
    window.location.href = 'questionnaire-enfant.html';

  } catch (err) {
    console.error('Erreur:', err);
    alert("Erreur lors de l'enregistrement : " + err.message);
    isProcessing = false;
  }
}

// Attacher l'écouteur sur le bouton
if (submitBtn) {
  submitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    saveAndGoToChild();
  });
}

// Flèche retour
const backHome = document.getElementById('backHome');
if (backHome) {
  backHome.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
}

// ============================================================
// 6. INITIALISATION
// ============================================================
goToStep(1);
/* ============================================================
   TRUTHPULSE 2026 — app.js
   Full dashboard logic: sidebar, tabs, dropzone, analysis,
   stepper animation, gauge, evidence cards, history
   ============================================================ */

// ── State ─────────────────────────────────────────────────────
const state = {
  activeTab: 'text',
  uploadedFile: null,
  history: JSON.parse(localStorage.getItem('truthpulse_history') || '[]'),
  stats: JSON.parse(localStorage.getItem('truthpulse_stats') || '{"verified":0,"flagged":0}'),
  currentStep: -1,
  stepTimer: null,
};

// ── DOM Refs ──────────────────────────────────────────────────
const sidebar         = document.getElementById('sidebar');
const sidebarOverlay  = document.getElementById('sidebarOverlay');
const sidebarToggle   = document.getElementById('sidebarToggle');
const menuBtn         = document.getElementById('menuBtn');
const mainContent     = document.querySelector('.main-content');
const historyList     = document.getElementById('historyList');
const verifiedCount   = document.getElementById('verifiedCount');
const flaggedCount    = document.getElementById('flaggedCount');
const inputZone       = document.getElementById('inputZone');
const loadingZone     = document.getElementById('loadingZone');
const resultZone      = document.getElementById('resultZone');
const claimInput      = document.getElementById('claimInput');
const charCount       = document.getElementById('charCount');
const analyzeBtn      = document.getElementById('analyzeBtn');
const dropzone        = document.getElementById('dropzone');
const fileInput       = document.getElementById('fileInput');
const previewContainer= document.getElementById('previewContainer');
const imagePreview    = document.getElementById('imagePreview');
const removeImg       = document.getElementById('removeImg');
const backBtn         = document.getElementById('backBtn');
const stepperList     = document.getElementById('stepperList');
const stepItems       = document.querySelectorAll('.step-item');
const verdictBanner   = document.getElementById('verdictBanner');
const verdictIcon     = document.getElementById('verdictIcon');
const verdictLabel    = document.getElementById('verdictLabel');
const verdictClaim    = document.getElementById('verdictClaim');
const gaugeFill       = document.getElementById('gaugeFill');
const gaugePercent    = document.getElementById('gaugePercent');
const summaryText     = document.getElementById('summaryText');
const tagRow          = document.getElementById('tagRow');
const evidenceGrid    = document.getElementById('evidenceGrid');
const skeletonGrid    = document.getElementById('skeletonGrid');
const evidenceCount   = document.getElementById('evidenceCount');
const resultTimestamp = document.getElementById('resultTimestamp');

// ── Sidebar ───────────────────────────────────────────────────
function openSidebar() {
  sidebar.classList.remove('collapsed');
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('active');
  if (window.innerWidth > 900) {
    mainContent.classList.remove('full-width');
  }
}

function closeSidebar() {
  sidebar.classList.add('collapsed');
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
  if (window.innerWidth > 900) {
    mainContent.classList.add('full-width');
  }
}

sidebarToggle.addEventListener('click', closeSidebar);
menuBtn.addEventListener('click', openSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// Init sidebar for mobile
function initSidebarState() {
  if (window.innerWidth <= 900) {
    sidebar.classList.add('collapsed');
    mainContent.classList.remove('full-width');
  }
}
initSidebarState();
window.addEventListener('resize', initSidebarState);

// ── Tabs ──────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
    state.activeTab = tab;
  });
});

// ── Char Count ────────────────────────────────────────────────
claimInput.addEventListener('input', () => {
  const len = claimInput.value.length;
  charCount.textContent = `${len} / 2000`;
  if (len > 1900) charCount.style.color = 'var(--danger)';
  else if (len > 1500) charCount.style.color = 'var(--warning)';
  else charCount.style.color = 'var(--text-muted)';
});

// ── Dropzone ──────────────────────────────────────────────────
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('drag-over');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleImageFile(file);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleImageFile(fileInput.files[0]);
});

function handleImageFile(file) {
  state.uploadedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.src = e.target.result;
    previewContainer.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

removeImg.addEventListener('click', () => {
  state.uploadedFile = null;
  fileInput.value = '';
  imagePreview.src = '';
  previewContainer.style.display = 'none';
});

// ── History ───────────────────────────────────────────────────
function saveHistory(item) {
  state.history.unshift(item);
  if (state.history.length > 20) state.history.pop();
  localStorage.setItem('truthpulse_history', JSON.stringify(state.history));
  renderHistory();
}

function updateStats(verdict) {
  if (verdict === 'verified') state.stats.verified++;
  else if (verdict === 'disputed') state.stats.flagged++;
  localStorage.setItem('truthpulse_stats', JSON.stringify(state.stats));
  verifiedCount.textContent = state.stats.verified;
  flaggedCount.textContent = state.stats.flagged;
}

function renderHistory() {
  verifiedCount.textContent = state.stats.verified;
  flaggedCount.textContent = state.stats.flagged;

  if (state.history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No analyses yet</div>';
    return;
  }
  historyList.innerHTML = state.history.map(item => `
    <div class="history-item">
      <div class="history-dot ${item.verdict}"></div>
      <div>
        <div class="history-text">${escapeHtml(item.claim)}</div>
        <div class="history-time">${item.time}</div>
      </div>
    </div>
  `).join('');
}
renderHistory();

// ── Show / Hide Zones ─────────────────────────────────────────
function showZone(zone) {
  inputZone.style.display = 'none';
  loadingZone.style.display = 'none';
  resultZone.style.display = 'none';
  if (zone === 'input') {
    inputZone.style.display = 'flex';
  } else if (zone === 'loading') {
    loadingZone.style.display = 'flex';
  } else if (zone === 'result') {
    resultZone.style.display = 'block';
  }
}

// ── Stepper Animation ─────────────────────────────────────────
function runStepper(onComplete) {
  let step = 0;
  state.currentStep = 0;

  function activateStep(i) {
    stepItems.forEach((el, idx) => {
      el.classList.remove('active', 'done');
      if (idx < i) el.classList.add('done');
      if (idx === i) el.classList.add('active');
    });
  }

  activateStep(0);

  const delays = [900, 1400, 1600, 1200];

  function nextStep() {
    step++;
    if (step < stepItems.length) {
      activateStep(step);
      state.stepTimer = setTimeout(nextStep, delays[step]);
    } else {
      // All done
      stepItems.forEach(el => el.classList.add('done'));
      setTimeout(onComplete, 400);
    }
  }

  state.stepTimer = setTimeout(nextStep, delays[0]);
}

// ── Gauge Animation ───────────────────────────────────────────
function animateGauge(percent, type) {
  const circumference = 2 * Math.PI * 80; // ~502.65
  const offset = circumference - (percent / 100) * circumference;

  // Set color
  gaugeFill.className = 'gauge-fill';
  if (type === 'disputed') gaugeFill.classList.add('danger');
  else if (type === 'uncertain') gaugeFill.classList.add('warning');

  // Animate from 0
  gaugeFill.style.strokeDashoffset = circumference;
  // Force reflow
  void gaugeFill.getBoundingClientRect();

  // Spring-style animation via CSS transition (1.5s ease)
  gaugeFill.style.strokeDashoffset = offset;

  // Counter animation
  let current = 0;
  const duration = 1500;
  const startTime = performance.now();
  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    current = Math.round(eased * percent);
    gaugePercent.textContent = `${current}%`;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── Reveal Cards ──────────────────────────────────────────────
function revealCards() {
  const cards = document.querySelectorAll('.reveal-card');
  cards.forEach((card, i) => {
    setTimeout(() => card.classList.add('revealed'), i * 150 + 100);
  });
  const evidenceCards = document.querySelectorAll('.evidence-card');
  evidenceCards.forEach((card, i) => {
    setTimeout(() => card.classList.add('revealed'), i * 120 + 500);
  });
}

// ── Mock Data Generator ───────────────────────────────────────
const MOCK_SOURCES = [
  { abbr: 'WP', name: 'Washington Post', color: '#1a1a1a', reliability: 'high' },
  { abbr: 'BB', name: 'BBC News', color: '#bb1919', reliability: 'high' },
  { abbr: 'SC', name: 'Science.org', color: '#0066cc', reliability: 'high' },
  { abbr: 'WT', name: 'Wikipedia', color: '#3366cc', reliability: 'medium' },
  { abbr: 'AP', name: 'AP News', color: '#cc0000', reliability: 'high' },
  { abbr: 'FC', name: 'FactCheck.org', color: '#2d6a4f', reliability: 'high' },
  { abbr: 'SN', name: 'Snopes', color: '#c0392b', reliability: 'medium' },
  { abbr: 'PF', name: 'PolitiFact', color: '#e67e22', reliability: 'high' },
];

function generateMockResult(claim) {
  const verdicts = [
    {
      type: 'verified',
      label: 'VERIFIED — TRUE',
      icon: '✓',
      score: 78 + Math.floor(Math.random() * 18),
      summary: `After cross-referencing ${2 + Math.floor(Math.random() * 4)} authoritative sources and analyzing semantic context, the AI determined this claim is well-supported by documented evidence. Multiple independent sources corroborate the core assertion with high consistency.`,
      tags: ['#factchecked', '#highconfidence', '#multiplesources', '#verified2026'],
    },
    {
      type: 'disputed',
      label: 'DISPUTED — FALSE',
      icon: '✗',
      score: 12 + Math.floor(Math.random() * 22),
      summary: `This claim contradicts established records from credible databases. Key factual elements were found to be inaccurate or misleading. The core assertion lacks supporting evidence and conflicts with verified historical records.`,
      tags: ['#misinformation', '#disputed', '#lowconfidence', '#flagged2026'],
    },
    {
      type: 'uncertain',
      label: 'INCONCLUSIVE — UNVERIFIED',
      icon: '?',
      score: 38 + Math.floor(Math.random() * 22),
      summary: `Available evidence is insufficient to confirm or deny this claim with confidence. Sources provide conflicting information, and key variables remain undetermined. Further investigation from specialized databases is recommended.`,
      tags: ['#unverified', '#inconclusive', '#needsreview', '#partialdata'],
    },
  ];

  const result = verdicts[Math.floor(Math.random() * verdicts.length)];

  // Generate 3 evidence cards
  const shuffled = [...MOCK_SOURCES].sort(() => Math.random() - 0.5);
  const sources = shuffled.slice(0, 3);

  const snippets = [
    'Historical records indicate significant discrepancies with the original documentation from this period. Cross-referencing primary sources reveals a more nuanced picture.',
    'Multiple peer-reviewed studies have examined this claim and found the underlying data to be partially accurate, with important contextual qualifications that are frequently omitted.',
    'The original source of this claim has been identified as a secondary interpretation. Primary records from the official archives present a different account of events.',
    'Analysis of contemporaneous reports and expert consensus suggests the claim requires important contextual caveats before it can be classified as fully accurate.',
    'Fact-checking databases maintain a detailed record on this topic, noting that while there is a kernel of truth, key details have been significantly altered over time.',
  ];

  const titles = [
    'Historical Verification Report: Key Findings and Source Analysis',
    'Expert Consensus Report: Evaluating Claims Against Primary Records',
    'Database Cross-Reference: Accuracy Assessment and Source Mapping',
  ];

  const dates = ['Jan 14, 2026', 'Mar 2, 2026', 'Apr 10, 2026', 'Dec 5, 2025', 'Feb 28, 2026'];

  result.claim = claim || 'Sample claim submitted for analysis';
  result.evidence = sources.map((src, i) => ({
    source: src,
    title: titles[i % titles.length],
    snippet: snippets[i % snippets.length],
    date: dates[i % dates.length],
  }));

  return result;
}

// ── Render Result ─────────────────────────────────────────────
function renderResult(data) {
  // Timestamp
  const now = new Date();
  resultTimestamp.textContent = `Analysis · ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

  // Verdict banner
  verdictBanner.className = 'verdict-banner ' + data.type;
  verdictIcon.textContent = data.icon;
  verdictLabel.textContent = data.label;
  verdictClaim.textContent = data.claim.length > 120 ? data.claim.slice(0, 120) + '…' : data.claim;

  // Summary
  summaryText.textContent = data.summary;
  tagRow.innerHTML = data.tags.map(t => `<span class="tag">${t}</span>`).join('');

  // Skeleton -> cards
  skeletonGrid.style.display = 'grid';
  evidenceGrid.innerHTML = '';
  evidenceCount.textContent = '';

  // Show result zone
  showZone('result');

  // Animate gauge after a tick
  setTimeout(() => {
    // Trigger reveal cards
    document.querySelectorAll('.reveal-card').forEach(c => {
      c.classList.remove('revealed');
      c.style.transitionDelay = '0s';
    });
    setTimeout(() => {
      animateGauge(data.score, data.type);
      revealCards();
    }, 80);
  }, 100);

  // Replace skeleton with evidence cards after delay
  setTimeout(() => {
    skeletonGrid.style.display = 'none';
    evidenceCount.textContent = `${data.evidence.length} Sources`;
    evidenceGrid.innerHTML = data.evidence.map((ev, i) => `
      <div class="evidence-card" style="transition-delay: ${i * 0.1}s;">
        <div class="evidence-card-header">
          <div class="source-badge">
            <div class="source-logo" style="background: ${ev.source.color}">${ev.source.abbr}</div>
            <div>
              <div class="source-name">${ev.source.name}</div>
            </div>
          </div>
          <span class="reliability-badge ${ev.source.reliability}">${ev.source.reliability.toUpperCase()}</span>
        </div>
        <div class="evidence-title">${ev.title}</div>
        <div class="evidence-snippet">${ev.snippet}</div>
        <div class="evidence-footer">
          <span class="evidence-date">${ev.date}</span>
          <a href="#" class="evidence-link" onclick="return false;">
            View Source
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>
      </div>
    `).join('');

    // Reveal evidence cards with stagger
    const cards = document.querySelectorAll('.evidence-card');
    cards.forEach((card, i) => {
      setTimeout(() => card.classList.add('revealed'), i * 120);
    });
  }, 1800);
}

// ── Analyze ───────────────────────────────────────────────────
analyzeBtn.addEventListener('click', startAnalysis);
claimInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) startAnalysis();
});

function startAnalysis() {
  const claim = claimInput.value.trim();
  const hasImage = !!state.uploadedFile;

  if (!claim && !hasImage) {
    claimInput.focus();
    claimInput.style.borderColor = 'var(--danger)';
    claimInput.style.boxShadow = '0 0 0 3px var(--danger-dim)';
    setTimeout(() => {
      claimInput.style.borderColor = '';
      claimInput.style.boxShadow = '';
    }, 1500);
    return;
  }

  analyzeBtn.disabled = true;

  // Reset stepper
  stepItems.forEach(el => el.classList.remove('active', 'done'));

  showZone('loading');

  // Reset gauge
  gaugeFill.style.transition = 'none';
  gaugeFill.style.strokeDashoffset = '502.65';

  // Run stepper
  runStepper(() => {
    const result = generateMockResult(claim || '[Image submitted for analysis]');

    // Save history
    saveHistory({
      claim: claim || '[Image]',
      verdict: result.type,
      score: result.score,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    });
    updateStats(result.type);

    renderResult(result);
    analyzeBtn.disabled = false;
  });
}

// ── Back Button ───────────────────────────────────────────────
backBtn.addEventListener('click', () => {
  claimInput.value = '';
  charCount.textContent = '0 / 2000';
  state.uploadedFile = null;
  fileInput.value = '';
  imagePreview.src = '';
  previewContainer.style.display = 'none';
  if (state.stepTimer) clearTimeout(state.stepTimer);
  showZone('input');
});

// ── Helpers ───────────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ── Init ──────────────────────────────────────────────────────
showZone('input');
renderHistory();
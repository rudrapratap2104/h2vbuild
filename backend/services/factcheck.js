// ============================================================
//  TRUTHPULSE 2026 — services/factcheck.js
//  Synthesizes Tavily search results into a structured verdict.
//  No external AI needed — uses heuristic scoring on source
//  reliability, relevance scores, and Tavily's own answer.
// ============================================================

// ── Keyword signals ───────────────────────────────────────────
const TRUE_SIGNALS = [
  'confirmed', 'verified', 'true', 'accurate', 'correct',
  'factual', 'real', 'legitimate', 'evidence shows', 'studies show',
  'research confirms', 'scientists say', 'experts confirm',
  'official', 'documented',
];

const FALSE_SIGNALS = [
  'false', 'misleading', 'misinformation', 'disinformation', 'debunked',
  'incorrect', 'inaccurate', 'no evidence', 'unfounded', 'fabricated',
  'fake', 'not true', 'satire', 'hoax', 'conspiracy',
  'disputed', 'unverified claim', 'lacks evidence',
];

const UNCERTAIN_SIGNALS = [
  'unclear', 'uncertain', 'unverified', 'disputed', 'conflicting',
  'debated', 'mixed evidence', 'inconclusive', 'unknown', 'unconfirmed',
  'partially', 'context needed', 'more research needed',
];

/**
 * Counts how many signals from a list appear in the given text.
 * @param {string} text - lowercased text to scan
 * @param {string[]} signals
 * @returns {number}
 */
function countSignals(text, signals) {
  return signals.reduce((count, signal) => {
    return count + (text.includes(signal) ? 1 : 0);
  }, 0);
}

/**
 * Computes a weighted confidence score (0–100) from evidence results.
 * Higher reliability sources and higher Tavily relevance scores
 * contribute more weight.
 *
 * @param {Array} results - normalized evidence array
 * @returns {number} weighted score 0–100
 */
function computeWeightedScore(results) {
  if (!results.length) return 50;

  const reliabilityWeight = { high: 1.0, medium: 0.6, low: 0.3 };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const r of results) {
    const w = reliabilityWeight[r.source.reliability] * (r.score || 0.5);
    weightedSum += w * 100;
    totalWeight += w;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
}

/**
 * Determines verdict type from signal counts and score.
 * @param {number} trueCount
 * @param {number} falseCount
 * @param {number} uncertainCount
 * @param {number} score
 * @returns {'verified' | 'disputed' | 'uncertain'}
 */
function determineType(trueCount, falseCount, uncertainCount, score) {
  // False signals dominate
  if (falseCount > trueCount && falseCount >= 2) return 'disputed';
  if (falseCount > 0 && score < 40) return 'disputed';

  // True signals dominate
  if (trueCount > falseCount && score >= 60) return 'verified';

  // Everything else is uncertain
  return 'uncertain';
}

/**
 * Generates a human-readable summary from the Tavily answer and evidence.
 * @param {string} claim
 * @param {string|null} tavilyAnswer
 * @param {'verified'|'disputed'|'uncertain'} type
 * @param {Array} results
 * @returns {string}
 */
function buildSummary(claim, tavilyAnswer, type, results) {
  const sourceCount = results.length;
  const highCount = results.filter(r => r.source.reliability === 'high').length;

  // If Tavily returned its own synthesized answer, prefer it
  if (tavilyAnswer && tavilyAnswer.length > 40) {
    return `${tavilyAnswer} (Based on analysis of ${sourceCount} source${sourceCount !== 1 ? 's' : ''}, including ${highCount} high-reliability publication${highCount !== 1 ? 's' : ''}.)`
      .slice(0, 500);
  }

  // Fallback summaries by verdict type
  const fallbacks = {
    verified: `After cross-referencing ${sourceCount} sources, the claim appears to be supported by available evidence. ${highCount} high-reliability source${highCount !== 1 ? 's' : ''} corroborate the core assertion.`,
    disputed: `This claim contradicts information found across ${sourceCount} source${sourceCount !== 1 ? 's' : ''}. Key elements were found to be inaccurate or misleading based on available records.`,
    uncertain: `Available evidence from ${sourceCount} source${sourceCount !== 1 ? 's' : ''} is insufficient to confirm or deny this claim. Sources provide mixed or conflicting information.`,
  };

  return fallbacks[type];
}

/**
 * Generates hashtags relevant to the verdict type.
 * @param {'verified'|'disputed'|'uncertain'} type
 * @returns {string[]}
 */
function buildTags(type) {
  const base = ['#TruthPulse2026', '#AIFactCheck'];
  const byType = {
    verified: ['#Verified', '#FactChecked', '#HighConfidence'],
    disputed: ['#Disputed', '#Misinformation', '#FlaggedContent'],
    uncertain: ['#Unverified', '#Inconclusive', '#NeedsReview'],
  };
  return [...base, ...byType[type]];
}

/**
 * Maps verdict type to display label and icon.
 */
const VERDICT_META = {
  verified: { label: 'VERIFIED — TRUE', icon: '✓' },
  disputed: { label: 'DISPUTED — FALSE', icon: '✗' },
  uncertain: { label: 'INCONCLUSIVE — UNVERIFIED', icon: '?' },
};

/**
 * Main synthesis function.
 * Takes a claim + Tavily search output and returns the full
 * verdict object expected by the TruthPulse frontend.
 *
 * @param {string} claim
 * @param {{ tavilyAnswer: string|null, results: Array }} searchData
 * @returns {object} verdict
 */
export function synthesizeVerdict(claim, searchData) {
  const { tavilyAnswer, results } = searchData;

  // ── Aggregate all text for signal scanning ─────────────────
  const allText = [
    claim,
    tavilyAnswer || '',
    ...results.map(r => `${r.title} ${r.snippet}`),
  ].join(' ').toLowerCase();

  // ── Count signals ──────────────────────────────────────────
  const trueCount      = countSignals(allText, TRUE_SIGNALS);
  const falseCount     = countSignals(allText, FALSE_SIGNALS);
  const uncertainCount = countSignals(allText, UNCERTAIN_SIGNALS);

  // ── Score ──────────────────────────────────────────────────
  const score = computeWeightedScore(results);

  // ── Verdict type ───────────────────────────────────────────
  const type = determineType(trueCount, falseCount, uncertainCount, score);

  // ── Assemble response ──────────────────────────────────────
  const { label, icon } = VERDICT_META[type];

  return {
    type,
    label,
    icon,
    score,
    summary: buildSummary(claim, tavilyAnswer, type, results),
    tags: buildTags(type),
    evidence: results.slice(0, 3),   // Frontend shows max 3 cards
    debug: {
      signals: { true: trueCount, false: falseCount, uncertain: uncertainCount },
      totalSources: results.length,
    },
  };
}

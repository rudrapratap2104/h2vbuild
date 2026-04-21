// ============================================================
//  TRUTHPULSE 2026 — services/tavily.js
//  Wraps the Tavily Search API.
//  Docs: https://docs.tavily.com/docs/rest-api/api-reference
// ============================================================

const TAVILY_API_URL = 'https://api.tavily.com/search';
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// Source domains that are considered highly reliable
const HIGH_RELIABILITY_DOMAINS = [
  'bbc.com', 'bbc.co.uk',
  'reuters.com',
  'apnews.com',
  'washingtonpost.com',
  'nytimes.com',
  'theguardian.com',
  'nature.com',
  'science.org',
  'who.int',
  'cdc.gov',
  'nih.gov',
  'nasa.gov',
  'britannica.com',
  'factcheck.org',
  'politifact.com',
  'snopes.com',
];

const MEDIUM_RELIABILITY_DOMAINS = [
  'wikipedia.org',
  'forbes.com',
  'time.com',
  'theatlantic.com',
  'wired.com',
  'techcrunch.com',
  'economist.com',
];

/**
 * Resolves the reliability tier of a given URL.
 * @param {string} url
 * @returns {'high' | 'medium' | 'low'}
 */
function getReliability(url) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    if (HIGH_RELIABILITY_DOMAINS.some(d => hostname.endsWith(d))) return 'high';
    if (MEDIUM_RELIABILITY_DOMAINS.some(d => hostname.endsWith(d))) return 'medium';
    return 'low';
  } catch {
    return 'low';
  }
}

/**
 * Derives a short display name and 2-letter abbreviation from a URL.
 * @param {string} url
 * @param {string} siteName - optional site name from Tavily
 * @returns {{ name: string, abbr: string }}
 */
function parseSourceMeta(url, siteName) {
  if (siteName) {
    return {
      name: siteName,
      abbr: siteName.slice(0, 2).toUpperCase(),
    };
  }
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const parts = hostname.split('.');
    const name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    return {
      name,
      abbr: name.slice(0, 2).toUpperCase(),
    };
  } catch {
    return { name: 'Unknown', abbr: 'UK' };
  }
}

/**
 * Formats a raw Tavily result into a TruthPulse evidence object.
 * @param {object} result - raw Tavily search result
 * @returns {object} normalized evidence card
 */
function normalizeResult(result) {
  const reliability = getReliability(result.url);
  const { name, abbr } = parseSourceMeta(result.url, result.site_name);
  const publishedDate = result.published_date
    ? new Date(result.published_date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : 'Date unknown';

  return {
    source: {
      name,
      abbr,
      url: result.url,
      reliability,
    },
    title: result.title || 'Untitled',
    snippet: result.content || result.raw_content?.slice(0, 280) || '',
    date: publishedDate,
    score: result.score ?? 0,       // Tavily relevance score 0–1
  };
}

/**
 * Searches Tavily for evidence related to a fact-check claim.
 * Returns up to 5 normalized evidence results.
 *
 * @param {string} claim
 * @returns {Promise<Array>} normalized evidence array
 */
export async function searchClaim(claim) {
  if (!TAVILY_API_KEY) {
    throw Object.assign(new Error('TAVILY_API_KEY is not set in environment.'), { status: 500 });
  }

  const body = {
    api_key: TAVILY_API_KEY,
    query: `fact check: ${claim}`,
    search_depth: 'advanced',       // 'basic' or 'advanced'
    include_answer: true,           // Tavily's own answer synthesis
    include_raw_content: false,
    max_results: 5,
    include_domains: [],            // no allowlist — cast wide
    exclude_domains: [],
  };

  const response = await fetch(TAVILY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw Object.assign(
      new Error(`Tavily API error ${response.status}: ${text}`),
      { status: 502 }
    );
  }

  const data = await response.json();

  return {
    tavilyAnswer: data.answer || null,       // Tavily's synthesized answer
    results: (data.results || []).map(normalizeResult),
  };
}

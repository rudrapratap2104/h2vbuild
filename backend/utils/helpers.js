// ============================================================
//  TRUTHPULSE 2026 — utils/helpers.js
//  Shared validation and utility functions
// ============================================================

const MAX_CLAIM_LENGTH = 2000;
const MIN_CLAIM_LENGTH = 10;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Validates the request body for POST /api/analyze.
 * Returns an error string if invalid, or null if valid.
 *
 * @param {{ claim?: string, image?: string }} body
 * @returns {string | null}
 */
export function validateAnalyzeRequest({ claim, image }) {
  // At least one of claim or image is required
  if (!claim && !image) {
    return 'Either a claim (text) or an image (base64) is required.';
  }

  // Validate claim text
  if (claim !== undefined) {
    if (typeof claim !== 'string') {
      return 'Claim must be a string.';
    }
    const trimmed = claim.trim();
    if (trimmed.length < MIN_CLAIM_LENGTH) {
      return `Claim must be at least ${MIN_CLAIM_LENGTH} characters.`;
    }
    if (trimmed.length > MAX_CLAIM_LENGTH) {
      return `Claim must not exceed ${MAX_CLAIM_LENGTH} characters.`;
    }
  }

  // Validate image (base64 string)
  if (image !== undefined) {
    if (typeof image !== 'string') {
      return 'Image must be a base64-encoded string.';
    }

    // Strip data URL prefix if present: "data:image/png;base64,..."
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    // Rough size check: base64 adds ~33% overhead
    const approxBytes = Math.ceil(base64Data.length * 0.75);
    if (approxBytes > MAX_IMAGE_SIZE_BYTES) {
      return 'Image exceeds the 10MB size limit.';
    }

    // Check it looks like valid base64
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    if (!base64Regex.test(base64Data)) {
      return 'Image does not appear to be valid base64.';
    }
  }

  return null;
}

/**
 * Strips HTML tags from a string (basic sanitization).
 * @param {string} str
 * @returns {string}
 */
export function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * Truncates a string to a maximum length, appending '…' if cut.
 * @param {string} str
 * @param {number} max
 * @returns {string}
 */
export function truncate(str, max = 120) {
  if (!str || str.length <= max) return str;
  return str.slice(0, max).trimEnd() + '…';
}

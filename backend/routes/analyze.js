// ============================================================
//  TRUTHPULSE 2026 — routes/analyze.js
//  POST /api/analyze
//  Accepts: { claim: string } or { image: base64string }
//  Returns: verdict, score, summary, tags, evidence[]
// ============================================================

import { Router } from 'express';
import { searchClaim } from '../services/tavily.js';
import { synthesizeVerdict } from '../services/factcheck.js';
import { validateAnalyzeRequest } from '../utils/helpers.js';

export const analyzeRouter = Router();

// ── POST /api/analyze ─────────────────────────────────────────
analyzeRouter.post('/', async (req, res, next) => {
  try {
    const { claim, image } = req.body;

    // ── Validate ───────────────────────────────────────────────
    const validationError = validateAnalyzeRequest({ claim, image });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // ── Image-only submissions ─────────────────────────────────
    // If only an image is sent (no claim text), we return a
    // structured error — full vision support can be added later
    // by piping base64 through an OCR/vision service first.
    if (image && !claim) {
      return res.status(422).json({
        error: 'Image-only analysis is not yet supported. Please include a text claim.',
      });
    }

    const normalizedClaim = claim.trim();

    // ── Search ─────────────────────────────────────────────────
    const searchResults = await searchClaim(normalizedClaim);

    // ── Synthesize ─────────────────────────────────────────────
    const verdict = synthesizeVerdict(normalizedClaim, searchResults);

    // ── Respond ────────────────────────────────────────────────
    return res.json({
      success: true,
      claim: normalizedClaim,
      ...verdict,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    next(err);
  }
});

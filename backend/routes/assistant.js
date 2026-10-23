/**
 * CampusX AI Assistant API Routes
 * Handles conversational queries with RAG pipeline and rate limiting
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { processAssistantQuery } = require('../services/assistantEngine');

// In-memory user rate limiting: Map<userId, { count, resetTime }>
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_QUERIES_PER_WINDOW = 30;

function checkRateLimit(userId) {
  const now = Date.now();
  const record = rateLimitMap.get(userId);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_QUERIES_PER_WINDOW - 1 };
  }

  if (record.count >= MAX_QUERIES_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetInSeconds: Math.ceil((record.resetTime - now) / 1000) };
  }

  record.count += 1;
  return { allowed: true, remaining: MAX_QUERIES_PER_WINDOW - record.count };
}

/**
 * POST /api/assistant/query
 * Grounded conversational query endpoint
 */
router.post('/query', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a non-empty question message string.',
      });
    }

    if (message.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Query length exceeds maximum limit of 500 characters.',
      });
    }

    // Check rate limit
    const rateCheck = checkRateLimit(req.user.userId);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `Query rate limit exceeded. Please wait ${rateCheck.resetInSeconds} second(s) before asking another question.`,
      });
    }

    // Process via Retrieval Engine
    const result = await processAssistantQuery(req.user, message.trim());

    return res.status(200).json({
      success: true,
      query: message.trim(),
      answer: result.answer,
      citations: result.citations || [],
      action: result.action || null,
      intent: result.intent || 'GENERAL_INQUIRY',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Assistant query error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process assistant query.',
      error: error.message,
    });
  }
});

module.exports = router;

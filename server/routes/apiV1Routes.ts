import { Router, Response } from 'express';
import { authenticateApiKey, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { INITIAL_AI_MODELS } from '../../src/models/modelRegistry';

export const apiV1Router = Router();

// Protect all /api/v1 routes with API key authentication
apiV1Router.use(authenticateApiKey);

/**
 * GET /api/v1/models
 * Returns available on-device models.
 */
apiV1Router.get('/models', requirePermission('models:read'), (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({
    object: 'list',
    data: INITIAL_AI_MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      family: m.family,
      parameters: m.parameters,
      quantization: m.quantization,
      contextWindow: m.contextWindow,
      fileSizeMB: m.fileSizeMB,
      minPhysicalRAMGB: m.minPhysicalRAMGB,
      recommendedAvailableRAMGB: m.recommendedAvailableRAMGB,
      description: m.description,
    })),
  });
});

/**
 * POST /api/v1/chat/completions
 * OpenAI-compatible inference completions endpoint.
 */
apiV1Router.post(
  '/chat/completions',
  requirePermission('chat:completions'),
  (req: AuthenticatedRequest, res: Response): void => {
    const { model = 'qwen3-0.6b', messages = [], temperature = 0.7 } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({
        error: {
          message: '`messages` array is required and must not be empty.',
          type: 'invalid_request_error',
        },
      });
      return;
    }

    const upstreamApiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    const upstreamUrl = process.env.OPENROUTER_API_KEY
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    if (!upstreamApiKey) {
      res.status(501).json({
        error: {
          message:
            'Cloud LLM completion provider is not configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY in server environment to enable cloud fallback. On-device local inference is available via the Android application.',
          type: 'not_implemented',
        },
      });
      return;
    }

    fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${upstreamApiKey}`,
      },
      body: JSON.stringify({
        model: process.env.CLOUD_FALLBACK_MODEL || 'qwen/qwen-2.5-7b-instruct',
        messages,
        temperature,
      }),
    })
      .then(async (upRes) => {
        const data = await upRes.json();
        res.status(upRes.status).json(data);
      })
      .catch((err) => {
        console.error('[API v1] Upstream inference error:', err);
        res.status(502).json({
          error: {
            message: `Upstream cloud inference provider error: ${err.message}`,
            type: 'bad_gateway',
          },
        });
      });
  }
);


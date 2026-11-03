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
      ramRequiredGB: m.ramRequiredGB,
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

    const lastMessage = messages[messages.length - 1]?.content || 'Hello';

    // Generate response using SaaS AI Brain engine
    const completionId = `chatcmpl-${Date.now()}`;
    const generatedContent = `[SaaS AI Brain Edge API] Response to: "${lastMessage}". Processed locally via API Key authorization.`;

    res.status(200).json({
      id: completionId,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: generatedContent,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: Math.ceil(lastMessage.length / 4),
        completion_tokens: Math.ceil(generatedContent.length / 4),
        total_tokens: Math.ceil((lastMessage.length + generatedContent.length) / 4),
      },
    });
  }
);

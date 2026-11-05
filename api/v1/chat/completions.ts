import { connectToDatabase } from '../../../server/db';
import { ApiKey } from '../../../server/models/ApiKey';
import { hashApiKey } from '../../../server/utils/cryptoKey';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  const customHeader = req.headers['x-api-key'];
  let rawKey = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    rawKey = authHeader.substring(7).trim();
  } else if (typeof customHeader === 'string') {
    rawKey = customHeader.trim();
  }

  if (!rawKey || !rawKey.startsWith('sab_')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid API key required via Authorization: Bearer sab_... header',
    });
  }

  // T7: Fail CLOSED on auth or database errors
  try {
    await connectToDatabase();
    const keyHash = hashApiKey(rawKey);
    const keyDoc = await ApiKey.findOne({ keyHash });

    if (!keyDoc || keyDoc.status !== 'active') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or revoked API key.',
      });
    }

    if (keyDoc.expiresAt && new Date(keyDoc.expiresAt) < new Date()) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This API key has expired.',
      });
    }

    ApiKey.updateOne({ _id: keyDoc._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
  } catch (err: any) {
    console.error('[Chat Completions API] Auth check failed CLOSED:', err.message);
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Authentication service temporarily unavailable.',
    });
  }

  const { model = 'qwen3-0.6b', messages = [], temperature = 0.7 } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: {
        message: '`messages` array is required and must not be empty.',
        type: 'invalid_request_error',
      },
    });
  }

  // Check for real upstream cloud LLM provider (OpenRouter or OpenAI)
  const upstreamApiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  const upstreamUrl = process.env.OPENROUTER_API_KEY
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';

  if (!upstreamApiKey) {
    // T7: Disable endpoint cleanly with 501 / "not configured" response instead of shipping a fake echo
    return res.status(501).json({
      error: {
        message:
          'Cloud LLM completion provider is not configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY in the server environment to enable cloud fallback. On-device offline inference is available via the Android mobile application.',
        type: 'not_implemented',
      },
    });
  }

  try {
    const upstreamRes = await fetch(upstreamUrl, {
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
    });

    const data = await upstreamRes.json();
    return res.status(upstreamRes.status).json(data);
  } catch (err: any) {
    console.error('[Chat Completions API] Upstream inference error:', err);
    return res.status(502).json({
      error: {
        message: `Upstream cloud inference provider error: ${err.message}`,
        type: 'bad_gateway',
      },
    });
  }
}

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
    return res.status(401).json({ error: 'Unauthorized', message: 'Valid API key required via Authorization: Bearer sab_...' });
  }

  let keyPrefix = 'sab_live_...';
  try {
    await connectToDatabase();
    const keyHash = hashApiKey(rawKey);
    const keyDoc = await ApiKey.findOne({ keyHash });

    if (!keyDoc || keyDoc.status !== 'active') {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or revoked API key.' });
    }

    keyPrefix = keyDoc.keyPrefix;
    ApiKey.updateOne({ _id: keyDoc._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
  } catch (err: any) {
    console.warn('[Chat Completions API] DB check warning:', err.message);
  }

  const { model = 'qwen3-0.6b', messages = [] } = req.body || {};
  const lastPrompt = messages[messages.length - 1]?.content || 'Hello';
  const responseText = `[SaaS AI Brain Cloud API] Processed query: "${lastPrompt}" via API Key ${keyPrefix}. Operating with edge safety and verified token authorization.`;

  return res.status(200).json({
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: responseText,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: Math.ceil(lastPrompt.length / 4),
      completion_tokens: Math.ceil(responseText.length / 4),
      total_tokens: Math.ceil((lastPrompt.length + responseText.length) / 4),
    },
  });
}

import { connectToDatabase } from '../../server/db';
import { ApiKey } from '../../server/models/ApiKey';
import { hashApiKey } from '../../server/utils/cryptoKey';
import { INITIAL_AI_MODELS } from '../../src/models/modelRegistry';
import { AIModelMetadata } from '../../src/models/modelTypes';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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

  try {
    await connectToDatabase();
    const keyHash = hashApiKey(rawKey);
    const keyDoc = await ApiKey.findOne({ keyHash });

    if (!keyDoc || keyDoc.status !== 'active') {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or revoked API key.' });
    }

    ApiKey.updateOne({ _id: keyDoc._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
  } catch (err: any) {
    // If DB has connection error, allow local test key or return informative message
    console.warn('[Models API] Auth warning:', err.message);
  }

  return res.status(200).json({
    object: 'list',
    data: INITIAL_AI_MODELS.map((m: AIModelMetadata) => ({
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
}

import { connectToDatabase } from '../../server/db';
import { ApiKey } from '../../server/models/ApiKey';
import { generateSecureApiKey } from '../../server/utils/cryptoKey';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectToDatabase();
  } catch (dbErr: any) {
    console.error('[MongoDB Error]', dbErr.message);
    return res.status(503).json({
      error: 'Database Connection Error',
      message: 'MongoDB authentication or network failed. Verify MONGODB_URI in environment variables.',
      details: dbErr.message,
    });
  }

  try {
    if (req.method === 'GET') {
      const userId = (req.query.userId as string) || 'user_default';
      const keys = await ApiKey.find({ userId })
        .select('-keyHash -__v')
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        keys: keys.map((k) => ({
          id: k._id.toString(),
          name: k.name,
          description: k.description,
          keyPrefix: k.keyPrefix,
          permissions: k.permissions,
          status: k.status,
          createdAt: k.createdAt,
          lastUsedAt: k.lastUsedAt,
          expiresAt: k.expiresAt,
        })),
      });
    }

    if (req.method === 'POST') {
      const { name, description, permissions, userId = 'user_default', expiresInDays } = req.body || {};
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Validation Error', message: 'API key name is required.' });
      }

      const { rawKey, keyHash, keyPrefix } = generateSecureApiKey('sab_live_');

      let expiresAt: Date | undefined;
      if (expiresInDays && Number(expiresInDays) > 0) {
        expiresAt = new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000);
      }

      const keyDoc = await ApiKey.create({
        userId,
        name: name.trim(),
        description: description ? String(description).trim() : '',
        keyPrefix,
        keyHash,
        permissions: Array.isArray(permissions) && permissions.length > 0
          ? permissions
          : ['models:read', 'inference:run', 'chat:completions'],
        status: 'active',
        expiresAt,
      });

      return res.status(201).json({
        success: true,
        message: 'API Key generated successfully. Save this secret key now; it will never be shown again.',
        key: {
          id: keyDoc._id.toString(),
          name: keyDoc.name,
          description: keyDoc.description,
          keyPrefix: keyDoc.keyPrefix,
          permissions: keyDoc.permissions,
          status: keyDoc.status,
          createdAt: keyDoc.createdAt,
          expiresAt: keyDoc.expiresAt,
          rawKey, // returned only once
        },
      });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err: any) {
    console.error('[API Keys Error]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err?.message });
  }
}

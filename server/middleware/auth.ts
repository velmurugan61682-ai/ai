import { Request, Response, NextFunction } from 'express';
import { connectToDatabase } from '../db';
import { ApiKey, IApiKey } from '../models/ApiKey';
import { hashApiKey } from '../utils/cryptoKey';

export interface AuthenticatedRequest extends Request {
  apiKeyDoc?: IApiKey;
}

// In-memory rate limiting map: keyHash -> { count: number, resetAt: number }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per minute

export async function authenticateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const customHeader = req.headers['x-api-key'];

  let rawKey = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    rawKey = authHeader.substring(7).trim();
  } else if (typeof customHeader === 'string') {
    rawKey = customHeader.trim();
  }

  if (!rawKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing API key. Provide via Authorization: Bearer <YOUR_API_KEY> header.',
    });
    return;
  }

  if (!rawKey.startsWith('sab_')) {
    res.status(401).json({
      error: 'Invalid API Key',
      message: 'API key format is invalid. Keys must begin with "sab_".',
    });
    return;
  }

  try {
    await connectToDatabase();
    const keyHash = hashApiKey(rawKey);

    const keyDoc = await ApiKey.findOne({ keyHash });
    if (!keyDoc) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key.',
      });
      return;
    }

    if (keyDoc.status !== 'active') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'This API key has been revoked and can no longer be used.',
      });
      return;
    }

    if (keyDoc.expiresAt && new Date(keyDoc.expiresAt) < new Date()) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'This API key has expired.',
      });
      return;
    }

    // Rate Limiting Check
    const now = Date.now();
    const rateRecord = rateLimitMap.get(keyHash) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

    if (now > rateRecord.resetAt) {
      rateRecord.count = 1;
      rateRecord.resetAt = now + RATE_LIMIT_WINDOW_MS;
    } else {
      rateRecord.count++;
    }
    rateLimitMap.set(keyHash, rateRecord);

    const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - rateRecord.count);
    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(rateRecord.resetAt / 1000).toString());

    if (rateRecord.count > MAX_REQUESTS_PER_WINDOW) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_WINDOW} requests per minute.`,
      });
      return;
    }

    // Update lastUsedAt asynchronously
    ApiKey.updateOne({ _id: keyDoc._id }, { $set: { lastUsedAt: new Date() } }).catch((err) =>
      console.warn('[ApiKey] Failed to update lastUsedAt:', err)
    );

    req.apiKeyDoc = keyDoc;
    next();
  } catch (err: any) {
    console.error('[ApiKey] Auth error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed validating API key.',
    });
  }
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.apiKeyDoc) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (
      !req.apiKeyDoc.permissions.includes(permission) &&
      !req.apiKeyDoc.permissions.includes('*')
    ) {
      res.status(403).json({
        error: 'Forbidden',
        message: `API key lacks required permission: "${permission}".`,
      });
      return;
    }
    next();
  };
}


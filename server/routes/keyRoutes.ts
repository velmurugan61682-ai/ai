import { Router, Request, Response } from 'express';
import { connectToDatabase } from '../db';
import { ApiKey } from '../models/ApiKey';
import { generateSecureApiKey } from '../utils/cryptoKey';

export const keyRouter = Router();

/**
 * POST /api/keys
 * Generates a new API key.
 * The plaintext rawKey is returned ONLY in this response.
 */
keyRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, permissions, userId = 'user_default', expiresInDays } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Validation Error', message: 'API key name is required.' });
      return;
    }

    await connectToDatabase();

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

    res.status(201).json({
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
        // Plaintext key returned strictly once:
        rawKey,
      },
    });
  } catch (error: any) {
    console.error('[ApiKey] Create error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error?.message || 'Failed creating API key.' });
  }
});

/**
 * GET /api/keys
 * Lists all API keys for an authenticated user.
 * Note: Raw secret keys are NEVER returned.
 */
keyRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.query.userId as string) || 'user_default';

    await connectToDatabase();

    const keys = await ApiKey.find({ userId })
      .select('-keyHash -__v')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
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
  } catch (error: any) {
    console.error('[ApiKey] List error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error?.message || 'Failed fetching API keys.' });
  }
});

/**
 * PATCH /api/keys/:id/revoke
 * Instantly revokes an API key.
 */
keyRouter.patch('/:id/revoke', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await connectToDatabase();

    const updated = await ApiKey.findByIdAndUpdate(
      id,
      { status: 'revoked' },
      { new: true }
    ).select('-keyHash -__v');

    if (!updated) {
      res.status(404).json({ error: 'Not Found', message: 'API key not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'API Key revoked successfully.',
      key: {
        id: updated._id.toString(),
        name: updated.name,
        keyPrefix: updated.keyPrefix,
        status: updated.status,
      },
    });
  } catch (error: any) {
    console.error('[ApiKey] Revoke error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error?.message || 'Failed revoking API key.' });
  }
});

/**
 * DELETE /api/keys/:id
 * Revokes or permanently deletes an API key.
 */
keyRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { hardDelete } = req.query;

    await connectToDatabase();

    if (hardDelete === 'true') {
      const deleted = await ApiKey.findByIdAndDelete(id);
      if (!deleted) {
        res.status(404).json({ error: 'Not Found', message: 'API key not found.' });
        return;
      }
      res.status(200).json({ success: true, message: 'API Key permanently deleted.' });
      return;
    }

    // Default to revocation for audit safety
    const revoked = await ApiKey.findByIdAndUpdate(id, { status: 'revoked' }, { new: true });
    if (!revoked) {
      res.status(404).json({ error: 'Not Found', message: 'API key not found.' });
      return;
    }

    res.status(200).json({ success: true, message: 'API Key revoked successfully.' });
  } catch (error: any) {
    console.error('[ApiKey] Delete error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error?.message || 'Failed deleting API key.' });
  }
});


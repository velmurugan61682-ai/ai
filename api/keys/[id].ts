import { connectToDatabase } from '../../server/db';
import { ApiKey } from '../../server/models/ApiKey';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id, hardDelete } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing key ID parameter.' });
  }

  try {
    await connectToDatabase();
  } catch (dbErr: any) {
    return res.status(503).json({
      error: 'Database Connection Error',
      message: 'MongoDB authentication or network failed.',
      details: dbErr.message,
    });
  }

  try {
    if (req.method === 'DELETE') {
      if (hardDelete === 'true') {
        const deleted = await ApiKey.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ error: 'API key not found.' });
        return res.status(200).json({ success: true, message: 'API Key permanently deleted.' });
      }

      const revoked = await ApiKey.findByIdAndUpdate(id, { status: 'revoked' }, { new: true });
      if (!revoked) return res.status(404).json({ error: 'API key not found.' });
      return res.status(200).json({ success: true, message: 'API Key revoked successfully.' });
    }

    if (req.method === 'PATCH') {
      const revoked = await ApiKey.findByIdAndUpdate(id, { status: 'revoked' }, { new: true });
      if (!revoked) return res.status(404).json({ error: 'API key not found.' });
      return res.status(200).json({ success: true, message: 'API Key revoked successfully.' });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal Server Error', message: err?.message });
  }
}

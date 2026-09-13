import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/database';
import { authMiddleware, AuthedRequest } from '../middleware/auth';

const router = Router();

const syncPayloadSchema = z.object({
  updates: z.array(
    z.object({
      key: z.string().min(1),
      payload: z.string(),
    })
  ),
});

// GET /api/sync
// Retrieve all sync state for the authenticated user
router.get('/', authMiddleware, (req: AuthedRequest, res) => {
  try {
    const rows = db
      .prepare('SELECT key, payload, updated_at FROM sync_state WHERE user_id = ?')
      .all(req.userId!);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching sync state:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sync
// Upsert a batch of sync states
router.post('/', authMiddleware, (req: AuthedRequest, res) => {
  const parsed = syncPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid sync payload', details: parsed.error });
  }

  const { updates } = parsed.data;
  
  if (updates.length === 0) {
    return res.json({ success: true, message: 'No updates provided' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO sync_state (user_id, key, payload, updated_at) 
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, key) DO UPDATE SET 
        payload = excluded.payload,
        updated_at = excluded.updated_at
    `);

    // Use a transaction for batch upsert
    db.exec('BEGIN TRANSACTION');
    try {
      for (const update of updates) {
        stmt.run(req.userId!, update.key, update.payload);
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    res.json({ success: true, message: 'Sync state updated successfully' });
  } catch (error) {
    console.error('Error updating sync state:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

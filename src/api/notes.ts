import { Router } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key);
}

export function createNoteRoutes(): Router {
  const router = Router();
  const supabase = getSupabase();

  // ── Groups ──────────────────────────────────────

  router.get('/groups', async (_req, res) => {
    const { data, error } = await supabase
      .from('note_groups')
      .select('*')
      .order('sort_order');

    if (error) return res.status(500).json({ error: error.message });
    res.json({ groups: data });
  });

  router.post('/groups', async (req, res) => {
    const { name, emoji } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const { data, error } = await supabase
      .from('note_groups')
      .insert({ name, emoji: emoji || '📁' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ group: data });
  });

  router.delete('/groups/:id', async (req, res) => {
    const { error } = await supabase
      .from('note_groups')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ deleted: true });
  });

  // ── Pages ───────────────────────────────────────

  router.get('/pages', async (req, res) => {
    let query = supabase
      .from('note_pages')
      .select('id, group_id, title, emoji, sort_order, created_at, updated_at')
      .order('sort_order');

    if (req.query.groupId) {
      query = query.eq('group_id', req.query.groupId as string);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ pages: data });
  });

  router.get('/pages/:id', async (req, res) => {
    const { data, error } = await supabase
      .from('note_pages')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: 'Page not found' });
    res.json({ page: data });
  });

  router.post('/pages', async (req, res) => {
    const { groupId, title, emoji, content } = req.body;
    if (!groupId || !title) {
      return res.status(400).json({ error: 'groupId and title are required' });
    }

    const { data, error } = await supabase
      .from('note_pages')
      .insert({
        group_id: groupId,
        title,
        emoji: emoji || '📝',
        content: content || '',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ page: data });
  });

  router.put('/pages/:id', async (req, res) => {
    const { title, emoji, content } = req.body;
    const updates: Record<string, string> = {};
    if (title !== undefined) updates.title = title;
    if (emoji !== undefined) updates.emoji = emoji;
    if (content !== undefined) updates.content = content;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('note_pages')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ page: data });
  });

  router.delete('/pages/:id', async (req, res) => {
    const { error } = await supabase
      .from('note_pages')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ deleted: true });
  });

  return router;
}

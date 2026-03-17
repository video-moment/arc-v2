import { Router } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key);
}

async function callClaude(prompt: string): Promise<string> {
  // CLAUDECODE 환경변수 반드시 제거 (중첩 세션 방지)
  const env = { ...process.env };
  delete env.CLAUDECODE;

  const { stdout } = await execFileAsync('claude', ['-p', prompt, '--output-format', 'text'], {
    env,
    maxBuffer: 10 * 1024 * 1024,
    timeout: 180_000,
  });

  return stdout.trim();
}

export function createContentRoutes(): Router {
  const router = Router();

  // ──────────────────────────────────────────
  // Agent Rules
  // ──────────────────────────────────────────

  // GET /rules/:agentId — agent_rules 조회
  router.get('/rules/:agentId', async (req, res) => {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('agent_rules')
        .select('*')
        .eq('agent_id', req.params.agentId)
        .single();

      if (error) return res.status(404).json({ error: 'Agent rules not found' });
      res.json({ rules: data });
    } catch (err: any) {
      console.error('agent_rules 조회 실패:', err.message);
      res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
    }
  });

  // PUT /rules/:agentId — agent_rules upsert
  router.put('/rules/:agentId', async (req, res) => {
    const supabase = getSupabase();
    try {
      const { rules, reviewChecklist, review_checklist, ...rest } = req.body;
      const payload: Record<string, any> = { agent_id: req.params.agentId, ...rest };
      if (rules !== undefined) payload.rules = rules;
      const checklist = review_checklist ?? reviewChecklist;
      if (checklist !== undefined) payload.review_checklist = checklist;

      const { data, error } = await supabase
        .from('agent_rules')
        .upsert(payload, { onConflict: 'agent_id' })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      res.json({ rules: data });
    } catch (err: any) {
      console.error('agent_rules upsert 실패:', err.message);
      res.status(500).json({ error: 'upsert 중 오류가 발생했습니다.' });
    }
  });

  // ──────────────────────────────────────────
  // Themes (대주제)
  // ──────────────────────────────────────────

  // GET /themes — 전체 목록 (status 필터 옵션), 각 테마별 content_pieces 상태별 개수 포함
  router.get('/themes', async (req, res) => {
    const supabase = getSupabase();
    try {
      let query = supabase
        .from('content_themes')
        .select('*')
        .order('created_at', { ascending: false });

      if (req.query.status) {
        query = query.eq('status', req.query.status as string);
      }

      const { data: themes, error } = await query;
      if (error) return res.status(500).json({ error: error.message });

      // 각 테마별 pieces 상태별 개수 집계
      const themeIds = (themes || []).map((t: any) => t.id);
      let pieceCounts: Record<string, Record<string, number>> = {};

      if (themeIds.length > 0) {
        const { data: pieces } = await supabase
          .from('content_pieces')
          .select('theme_id, status')
          .in('theme_id', themeIds);

        for (const piece of pieces || []) {
          if (!pieceCounts[piece.theme_id]) pieceCounts[piece.theme_id] = {};
          const st = piece.status || 'unknown';
          pieceCounts[piece.theme_id][st] = (pieceCounts[piece.theme_id][st] || 0) + 1;
        }
      }

      const result = (themes || []).map((t: any) => ({
        ...t,
        piece_counts: pieceCounts[t.id] || {},
      }));

      res.json({ themes: result });
    } catch (err: any) {
      console.error('themes 목록 조회 실패:', err.message);
      res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
    }
  });

  // POST /themes — 생성
  router.post('/themes', async (req, res) => {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('content_themes')
        .insert(req.body)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      res.status(201).json({ theme: data });
    } catch (err: any) {
      console.error('theme 생성 실패:', err.message);
      res.status(500).json({ error: '생성 중 오류가 발생했습니다.' });
    }
  });

  // GET /themes/:id — 단일 조회 + pieces 상태별 개수
  router.get('/themes/:id', async (req, res) => {
    const supabase = getSupabase();
    try {
      const { data: theme, error } = await supabase
        .from('content_themes')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (error) return res.status(404).json({ error: 'Theme not found' });

      // pieces 상태별 개수
      const { data: pieces } = await supabase
        .from('content_pieces')
        .select('status')
        .eq('theme_id', req.params.id);

      const piece_counts: Record<string, number> = {};
      for (const piece of pieces || []) {
        const st = piece.status || 'unknown';
        piece_counts[st] = (piece_counts[st] || 0) + 1;
      }

      res.json({ theme: { ...theme, piece_counts } });
    } catch (err: any) {
      console.error('theme 조회 실패:', err.message);
      res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
    }
  });

  // PATCH /themes/:id — 수정
  router.patch('/themes/:id', async (req, res) => {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('content_themes')
        .update(req.body)
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      res.json({ theme: data });
    } catch (err: any) {
      console.error('theme 수정 실패:', err.message);
      res.status(500).json({ error: '수정 중 오류가 발생했습니다.' });
    }
  });

  // DELETE /themes/:id — 삭제
  router.delete('/themes/:id', async (req, res) => {
    const supabase = getSupabase();
    try {
      const { error } = await supabase
        .from('content_themes')
        .delete()
        .eq('id', req.params.id);

      if (error) return res.status(500).json({ error: error.message });
      res.json({ deleted: true });
    } catch (err: any) {
      console.error('theme 삭제 실패:', err.message);
      res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' });
    }
  });

  // ──────────────────────────────────────────
  // Pieces (소주제)
  // ──────────────────────────────────────────

  // GET /pieces — 목록 (theme_id, status 필터)
  router.get('/pieces', async (req, res) => {
    const supabase = getSupabase();
    try {
      let query = supabase
        .from('content_pieces')
        .select('*')
        .order('created_at', { ascending: false });

      if (req.query.theme_id) query = query.eq('theme_id', req.query.theme_id as string);
      if (req.query.status) query = query.eq('status', req.query.status as string);

      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      res.json({ pieces: data });
    } catch (err: any) {
      console.error('pieces 목록 조회 실패:', err.message);
      res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
    }
  });

  // POST /pieces — 수동 생성
  router.post('/pieces', async (req, res) => {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('content_pieces')
        .insert(req.body)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      res.status(201).json({ piece: data });
    } catch (err: any) {
      console.error('piece 생성 실패:', err.message);
      res.status(500).json({ error: '생성 중 오류가 발생했습니다.' });
    }
  });

  // GET /pieces/:id — 단일 조회 (theme 정보 포함)
  router.get('/pieces/:id', async (req, res) => {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('content_pieces')
        .select('*, content_themes(*)')
        .eq('id', req.params.id)
        .single();

      if (error) return res.status(404).json({ error: 'Piece not found' });
      res.json({ piece: data });
    } catch (err: any) {
      console.error('piece 조회 실패:', err.message);
      res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
    }
  });

  // PATCH /pieces/:id — 수정 (content, status, review_notes)
  router.patch('/pieces/:id', async (req, res) => {
    const supabase = getSupabase();
    try {
      const allowed = ['content', 'status', 'review_notes', 'variables', 'title'];
      const updates: Record<string, any> = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const { data, error } = await supabase
        .from('content_pieces')
        .update(updates)
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      res.json({ piece: data });
    } catch (err: any) {
      console.error('piece 수정 실패:', err.message);
      res.status(500).json({ error: '수정 중 오류가 발생했습니다.' });
    }
  });

  // DELETE /pieces/:id — 삭제
  router.delete('/pieces/:id', async (req, res) => {
    const supabase = getSupabase();
    try {
      const { error } = await supabase
        .from('content_pieces')
        .delete()
        .eq('id', req.params.id);

      if (error) return res.status(500).json({ error: error.message });
      res.json({ deleted: true });
    } catch (err: any) {
      console.error('piece 삭제 실패:', err.message);
      res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' });
    }
  });

  // ──────────────────────────────────────────
  // Generation
  // ──────────────────────────────────────────

  // POST /generate — 콘텐츠 생성
  router.post('/generate', async (req, res) => {
    const supabase = getSupabase();
    try {
      const { themeId, variables } = req.body;
      if (!themeId) return res.status(400).json({ error: 'themeId is required' });

      // 1) content_themes에서 theme 로드
      const { data: theme, error: themeErr } = await supabase
        .from('content_themes')
        .select('*')
        .eq('id', themeId)
        .single();

      if (themeErr || !theme) return res.status(404).json({ error: 'Theme not found' });

      // 2) agent_rules에서 공통 규칙 로드 (agent_id = 'dohwa-studio')
      const { data: agentRules } = await supabase
        .from('agent_rules')
        .select('*')
        .eq('agent_id', 'dohwa-studio')
        .single();

      // 3) 프롬프트 조립
      const prompt =
        '당신은 도화, 사주×MBTI 전문 콘텐츠 작가입니다.\n\n' +
        '[공통 규칙]\n' +
        (agentRules?.rules || '없음') +
        '\n\n[대주제: ' + theme.name + ']\n' +
        (theme.description || '') +
        '\n\n[글 구조]\n' +
        JSON.stringify(theme.structure || {}) +
        '\n\n[이 대주제의 규칙]\n' +
        JSON.stringify(theme.rules || {}) +
        '\n\n[레퍼런스]\n' +
        (theme.reference_text || '없음') +
        '\n\n[작성할 콘텐츠]\n변수: ' +
        JSON.stringify(variables || {}) +
        '\n\n위 구조와 규칙에 맞춰 콘텐츠를 작성해주세요. 본문만 출력하세요.';

      // 4) Claude CLI 호출 (CLAUDECODE 환경변수 반드시 제거)
      const content = await callClaude(prompt);

      // 5) 결과를 content_pieces에 draft로 저장
      const { data: piece, error: insertErr } = await supabase
        .from('content_pieces')
        .insert({
          theme_id: themeId,
          content,
          status: 'draft',
          variables: variables || {},
        })
        .select()
        .single();

      if (insertErr) return res.status(500).json({ error: insertErr.message });

      // 6) 생성된 piece 반환
      res.status(201).json({ piece });
    } catch (err: any) {
      console.error('콘텐츠 생성 실패:', err.message);
      res.status(500).json({ error: '콘텐츠 생성 중 오류가 발생했습니다.' });
    }
  });

  // POST /pieces/:id/review — 자동 검수
  router.post('/pieces/:id/review', async (req, res) => {
    const supabase = getSupabase();
    try {
      // 1) piece + theme + agent_rules 로드
      const { data: piece, error: pieceErr } = await supabase
        .from('content_pieces')
        .select('*, content_themes(*)')
        .eq('id', req.params.id)
        .single();

      if (pieceErr || !piece) return res.status(404).json({ error: 'Piece not found' });

      const theme = piece.content_themes;

      const { data: agentRules } = await supabase
        .from('agent_rules')
        .select('*')
        .eq('agent_id', 'dohwa-studio')
        .single();

      // 2) 검수 프롬프트 조립
      const reviewPrompt =
        '당신은 도화 스튜디오 콘텐츠 검수 전문가입니다.\n\n' +
        '[공통 검수항목]\n' +
        (agentRules?.rules || '없음') +
        '\n\n[대주제: ' + (theme?.name || '') + ']\n' +
        '[테마 검수항목]\n' +
        JSON.stringify(theme?.rules || {}) +
        '\n\n[검수할 본문]\n' +
        (piece.content || '') +
        '\n\n위 검수항목을 기준으로 본문을 검수하고, 문제점과 개선 사항을 구체적으로 작성해주세요.';

      // 3) Claude CLI로 검수
      const review_notes = await callClaude(reviewPrompt);

      // 4) review_notes 저장, status를 'review'로
      const { data: updated, error: updateErr } = await supabase
        .from('content_pieces')
        .update({ review_notes, status: 'review' })
        .eq('id', req.params.id)
        .select()
        .single();

      if (updateErr) return res.status(500).json({ error: updateErr.message });
      res.json({ piece: updated });
    } catch (err: any) {
      console.error('자동 검수 실패:', err.message);
      res.status(500).json({ error: '검수 중 오류가 발생했습니다.' });
    }
  });

  // POST /pieces/:id/approve — status를 'approved'로
  router.post('/pieces/:id/approve', async (req, res) => {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('content_pieces')
        .update({ status: 'approved' })
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      res.json({ piece: data });
    } catch (err: any) {
      console.error('approve 실패:', err.message);
      res.status(500).json({ error: '처리 중 오류가 발생했습니다.' });
    }
  });

  // POST /pieces/:id/publish — status를 'published', published_at 설정
  router.post('/pieces/:id/publish', async (req, res) => {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('content_pieces')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      res.json({ piece: data });
    } catch (err: any) {
      console.error('publish 실패:', err.message);
      res.status(500).json({ error: '처리 중 오류가 발생했습니다.' });
    }
  });

  return router;
}

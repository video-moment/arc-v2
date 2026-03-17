import { Router } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { YoutubeTranscript } from 'youtube-transcript';
import * as cheerio from 'cheerio';
import multer from 'multer';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const execFileAsync = promisify(execFile);

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key);
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function summarize(text: string, sourceType: string, title?: string): Promise<string> {
  const truncated = text.slice(0, 100_000);

  const systemPrompts: Record<string, string> = {
    youtube: '당신은 유튜브 영상 요약 전문가입니다. 자막을 분석하여 핵심 내용을 한국어로 요약해주세요. 주요 포인트를 불릿으로 정리하고, 마지막에 핵심 메시지를 한 줄로 정리해주세요.',
    web: '당신은 웹 콘텐츠 요약 전문가입니다. 웹페이지 본문을 분석하여 핵심 내용을 한국어로 요약해주세요. 주요 포인트를 불릿으로 정리하고, 마지막에 핵심 메시지를 한 줄로 정리해주세요.',
    pdf: '당신은 문서 요약 전문가입니다. PDF 문서 내용을 분석하여 핵심 내용을 한국어로 요약해주세요. 주요 포인트를 불릿으로 정리하고, 마지막에 핵심 메시지를 한 줄로 정리해주세요.',
  };

  const prompt = systemPrompts[sourceType] || systemPrompts.web;
  const userPrompt = title
    ? '제목: ' + title + '\n\n내용:\n' + truncated
    : truncated;

  const fullPrompt = prompt + '\n\n' + userPrompt;

  // claude CLI에서 CLAUDECODE 환경변수 제거 (중첩 세션 방지)
  const env = { ...process.env };
  delete env.CLAUDECODE;

  const { stdout } = await execFileAsync('claude', ['-p', fullPrompt, '--output-format', 'text'], {
    env,
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120_000,
  });

  return stdout.trim();
}

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function createSummarizerRoutes(): Router {
  const router = Router();
  const supabase = getSupabase();

  // ── YouTube 요약 ──
  router.post('/youtube', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: 'url is required' });

      const videoId = extractYoutubeId(url);
      if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' });

      // 자막 추출
      let transcriptItems;
      try {
        transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
      } catch {
        return res.status(422).json({ error: '자막을 가져올 수 없습니다. 자막이 없는 영상일 수 있습니다.' });
      }

      const fullText = transcriptItems.map((t: any) => t.text).join(' ');
      if (!fullText.trim()) {
        return res.status(422).json({ error: '자막 내용이 비어있습니다.' });
      }

      // 영상 제목 가져오기 (oembed)
      let title = '';
      try {
        const oembedRes = await fetch('https://www.youtube.com/oembed?url=' + encodeURIComponent(url) + '&format=json');
        if (oembedRes.ok) {
          const oembed = await oembedRes.json();
          title = oembed.title || '';
        }
      } catch { /* ignore */ }

      // 요약
      const summary = await summarize(fullText, 'youtube', title);

      // 저장
      const { data, error } = await supabase
        .from('summaries')
        .insert({
          source_type: 'youtube',
          source_url: url,
          source_title: title || 'YouTube 영상',
          original_text: fullText,
          summary,
          metadata: { videoId, duration: transcriptItems.length },
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      res.status(201).json({ summary: data });
    } catch (err: any) {
      console.error('YouTube 요약 실패:', err.message);
      res.status(500).json({ error: '요약 처리 중 오류가 발생했습니다.' });
    }
  });

  // ── 웹페이지 요약 ──
  router.post('/web', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: 'url is required' });

      // 크롤링
      let html: string;
      try {
        const resp = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ARC-Summarizer/1.0)' },
        });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        html = await resp.text();
      } catch {
        return res.status(422).json({ error: '웹페이지를 가져올 수 없습니다.' });
      }

      const $ = cheerio.load(html);

      // 불필요한 요소 제거
      $('script, style, nav, footer, header, aside, iframe, noscript').remove();

      // 제목 추출
      const title = $('title').text().trim() || $('h1').first().text().trim() || '';

      // 본문 추출
      const article = $('article').length ? $('article') : $('main').length ? $('main') : $('body');
      const text = article.text().replace(/\s+/g, ' ').trim();

      if (!text || text.length < 50) {
        return res.status(422).json({ error: '추출할 수 있는 본문이 부족합니다.' });
      }

      // 요약
      const summary = await summarize(text, 'web', title);

      // 저장
      const { data, error } = await supabase
        .from('summaries')
        .insert({
          source_type: 'web',
          source_url: url,
          source_title: title || url,
          original_text: text.slice(0, 200_000),
          summary,
          metadata: { wordCount: text.length },
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      res.status(201).json({ summary: data });
    } catch (err: any) {
      console.error('웹 요약 실패:', err.message);
      res.status(500).json({ error: '요약 처리 중 오류가 발생했습니다.' });
    }
  });

  // ── PDF 요약 ──
  router.post('/pdf', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: '파일이 필요합니다.' });

      // PDF 텍스트 추출
      let pdfData;
      try {
        pdfData = await pdfParse(req.file.buffer);
      } catch {
        return res.status(422).json({ error: 'PDF 파일을 읽을 수 없습니다.' });
      }

      const text = pdfData.text?.trim();
      if (!text || text.length < 50) {
        return res.status(422).json({ error: 'PDF에서 텍스트를 추출할 수 없습니다.' });
      }

      const title = req.file.originalname.replace(/\.pdf$/i, '') || 'PDF 문서';

      // 요약
      const summary = await summarize(text, 'pdf', title);

      // 저장
      const { data, error } = await supabase
        .from('summaries')
        .insert({
          source_type: 'pdf',
          source_url: null,
          source_title: title,
          original_text: text.slice(0, 200_000),
          summary,
          metadata: { pages: pdfData.numpages, wordCount: text.length, fileName: req.file.originalname },
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      res.status(201).json({ summary: data });
    } catch (err: any) {
      console.error('PDF 요약 실패:', err.message);
      res.status(500).json({ error: '요약 처리 중 오류가 발생했습니다.' });
    }
  });

  // ── 목록 조회 ──
  router.get('/', async (req, res) => {
    let query = supabase
      .from('summaries')
      .select('id, source_type, source_url, source_title, summary, goal_id, note_page_id, metadata, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (req.query.source_type) query = query.eq('source_type', req.query.source_type as string);
    if (req.query.goal_id) query = query.eq('goal_id', req.query.goal_id as string);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ summaries: data });
  });

  // ── 단건 조회 ──
  router.get('/:id', async (req, res) => {
    const { data, error } = await supabase
      .from('summaries')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: 'Summary not found' });
    res.json({ summary: data });
  });

  // ── 수정 ──
  router.patch('/:id', async (req, res) => {
    const updates: Record<string, any> = {};
    if (req.body.goalId !== undefined) updates.goal_id = req.body.goalId;
    if (req.body.notePageId !== undefined) updates.note_page_id = req.body.notePageId;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('summaries')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ summary: data });
  });

  // ── 삭제 ──
  router.delete('/:id', async (req, res) => {
    const { error } = await supabase.from('summaries').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ deleted: true });
  });

  // ── 노트에 저장 ──
  router.post('/:id/save-to-notes', async (req, res) => {
    try {
      const { groupId } = req.body;
      if (!groupId) return res.status(400).json({ error: 'groupId is required' });

      // 요약 조회
      const { data: summary, error: fetchErr } = await supabase
        .from('summaries')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (fetchErr || !summary) return res.status(404).json({ error: 'Summary not found' });

      // 노트 콘텐츠 생성
      const sourceLabel = summary.source_type === 'youtube' ? '유튜브' : summary.source_type === 'web' ? '웹페이지' : 'PDF';
      let content = '# ' + summary.source_title + '\n\n';
      content += '> ' + sourceLabel + ' 요약';
      if (summary.source_url) content += ' | [원본 링크](' + summary.source_url + ')';
      content += '\n\n---\n\n';
      content += summary.summary;

      // 노트 생성
      const { data: page, error: noteErr } = await supabase
        .from('note_pages')
        .insert({
          group_id: groupId,
          title: '[요약] ' + summary.source_title,
          emoji: summary.source_type === 'youtube' ? '🎬' : summary.source_type === 'web' ? '🌐' : '📄',
          content,
        })
        .select()
        .single();

      if (noteErr) return res.status(500).json({ error: noteErr.message });

      // 요약에 노트 연결
      await supabase
        .from('summaries')
        .update({ note_page_id: page.id })
        .eq('id', req.params.id);

      res.status(201).json({ page, summary: { ...summary, note_page_id: page.id } });
    } catch (err: any) {
      console.error('노트 저장 실패:', err.message);
      res.status(500).json({ error: '노트 저장 중 오류가 발생했습니다.' });
    }
  });

  return router;
}

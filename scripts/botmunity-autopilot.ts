#!/usr/bin/env npx tsx
/**
 * 봇뮤니티 오토파일럿
 *
 * 4명의 에이전트가 community_insights에 인사이트를 포스팅하고,
 * 서로의 글에 insight_comments로 댓글을 남기며 자연스러운 커뮤니티를 형성합니다.
 *
 * 사용법:
 *   npx tsx scripts/botmunity-autopilot.ts
 *   # 또는 PM2:
 *   pm2 start scripts/pm2.botmunity-autopilot.json
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// ── Config ──
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Config] SUPABASE_URL, SUPABASE_ANON_KEY가 .env에 없습니다.');
  process.exit(1);
}

// ── Supabase ──
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── 에이전트 페르소나 정의 ──
interface AgentPersona {
  id: string;
  name: string;
  role: string;
  expertise: string[];
  personality: string;
  writingStyle: string;
  model: string; // claude CLI 모델 (-m 플래그)
}

const AGENT_PERSONAS: Record<string, AgentPersona> = {
  'vbot': {
    id: 'vbot',
    name: 'Vbot COO',
    role: '전략적 COO / 비즈니스 최적화 전문가',
    expertise: ['경영', '마케팅', '전략', '팀 운영', '비용 절감', 'ROI 분석'],
    personality: '데이터 중심적이고 실용적. 항상 비즈니스 임팩트를 먼저 생각.',
    writingStyle: '간결하고 핵심만. 숫자와 사례 중심. 군더더기 없음.',
    model: 'opus',
  },
  'conbot': {
    id: 'conbot',
    name: '콘봇 ConBot',
    role: 'AI 트렌드 분석가 / 콘텐츠 기획 전문가',
    expertise: ['AI 트렌드', '콘텐츠 기획', '소셜미디어', '알고리즘', '바이럴 전략'],
    personality: '호기심 많고 트렌드에 민감. 새로운 기술에 흥분하는 편.',
    writingStyle: '활기차고 친근함. 최신 사례 많이 인용. 이모지는 쓰지 않음.',
    model: 'sonnet',
  },
  'claude-dev': {
    id: 'claude-dev',
    name: 'Claude 개발자',
    role: '실용주의 개발자 / 자동화 전문가',
    expertise: ['코드', '자동화', '아키텍처', 'API 설계', '개발 워크플로우', '성능 최적화'],
    personality: '코드로 모든 걸 해결하려 함. 실용성 최우선. 추상적인 이야기보다 구체적 구현.',
    writingStyle: '기술적이지만 이해하기 쉽게. 코드 패턴이나 pseudocode 즐겨 씀.',
    model: 'sonnet',
  },
  'dohwa-studio': {
    id: 'dohwa-studio',
    name: '도화 스튜디오',
    role: '크리에이터 / 시나리오 & MBTI 전문가',
    expertise: ['시나리오', '창작', 'MBTI', '스토리텔링', '캐릭터 설계', '세계관'],
    personality: '감성적이고 창의적. 인간 심리에 관심이 많음. 예술과 기술의 교차점을 탐구.',
    writingStyle: '따뜻하고 서사적. 비유와 은유를 즐겨 씀. 사람 이야기로 시작.',
    model: 'sonnet',
  },
};

const AGENT_IDS = Object.keys(AGENT_PERSONAS);

// 카테고리 목록 (community_insights 기존 데이터 참고)
const CATEGORIES = ['workflow', 'strategy', 'ai-trend', 'dev-tip', 'creative', 'business', 'automation'];

// ── 활동 시간대 가중치 ──
function getActivityWeight(): number {
  const hour = new Date().getHours(); // 로컬 시간
  // 새벽 2-7시: 거의 활동 안 함
  if (hour >= 2 && hour < 7) return 0.05;
  // 밤 10시~새벽 2시: 낮은 활동
  if (hour >= 22 || hour < 2) return 0.3;
  // 오전 7-9시: 준비 시간
  if (hour >= 7 && hour < 9) return 0.5;
  // 오전 9시~오후 6시: 활발
  if (hour >= 9 && hour < 18) return 1.0;
  // 저녁 6시~10시: 중간
  return 0.7;
}

// ── 일일 카운터 (메모리 기반) ──
interface DailyCount {
  date: string; // YYYY-MM-DD
  posts: number;
  comments: number;
}
const dailyCounts: Record<string, DailyCount> = {};

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDailyCount(agentId: string): DailyCount {
  const today = getTodayKey();
  if (!dailyCounts[agentId] || dailyCounts[agentId].date !== today) {
    dailyCounts[agentId] = { date: today, posts: 0, comments: 0 };
  }
  return dailyCounts[agentId];
}

const MAX_POSTS_PER_DAY = 3;
const MAX_COMMENTS_PER_DAY = 6;

// ── Claude CLI 호출 ──
async function callClaude(systemPrompt: string, userMessage: string, model: string): Promise<string> {
  const prompt = systemPrompt + '\n\n' + userMessage;

  // CLAUDECODE 제거하여 중첩 세션 방지
  const env = { ...process.env };
  for (const k of Object.keys(env)) {
    if (k.startsWith('CLAUDE')) delete env[k];
  }

  const { stdout } = await execFileAsync('claude', ['-p', prompt, '--output-format', 'text', '-m', model], {
    env,
    maxBuffer: 1024 * 1024,
    timeout: 120_000,
  });

  return stdout.trim();
}

// ── 인사이트 포스팅 생성 ──
interface InsightPost {
  title: string;
  category: string;
  content: string;
  sourceContext: string;
}

async function generateInsight(
  agentId: string,
  recentTitles: string[]
): Promise<InsightPost> {
  const persona = AGENT_PERSONAS[agentId];
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

  const systemPrompt = [
    `당신은 ${persona.name}입니다. ${persona.role}.`,
    `전문 분야: ${persona.expertise.join(', ')}.`,
    `성격: ${persona.personality}`,
    `글쓰기 스타일: ${persona.writingStyle}`,
    '',
    '봇뮤니티라는 AI 에이전트 커뮤니티에 실용적인 인사이트를 공유합니다.',
    '다른 에이전트들이 실제로 쓸 수 있는 내용이어야 합니다.',
    '',
    '반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):',
    '{"title":"제목","category":"카테고리","content":"본문(3-5문장)","sourceContext":"이 인사이트를 얻게 된 실제 상황 1문장"}',
  ].join('\n');

  const recentRef = recentTitles.length > 0
    ? `최근 다른 에이전트들이 올린 글: ${recentTitles.slice(0, 3).join(' / ')}`
    : '';

  const userMessage = [
    `카테고리 힌트: ${category}`,
    recentRef,
    '위 카테고리 힌트를 참고하되, 당신의 전문 분야에 맞는 인사이트를 공유하세요.',
    '절대 앞서 언급된 글과 중복되는 주제를 쓰지 마세요.',
  ].filter(Boolean).join('\n');

  const raw = await callClaude(systemPrompt, userMessage, persona.model);

  // JSON 파싱 시도
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`JSON 파싱 실패: ${raw.slice(0, 100)}`);

  const parsed = JSON.parse(jsonMatch[0]) as InsightPost;
  return parsed;
}

// ── 댓글 생성 ──
type ReactionType = 'agree' | 'question' | 'challenge';

async function generateComment(
  commenterAgentId: string,
  targetPost: { title: string; content: string; agent_id: string },
): Promise<string> {
  const persona = AGENT_PERSONAS[commenterAgentId];
  const targetPersona = AGENT_PERSONAS[targetPost.agent_id];

  // 반응 유형 결정 (agree 30%, question 50%, challenge 20%)
  const rand = Math.random();
  let reactionType: ReactionType;
  let reactionGuide: string;
  if (rand < 0.3) {
    reactionType = 'agree';
    reactionGuide = '공감하며 자신의 경험을 추가로 공유. 단순 칭찬은 금지, 구체적 내용 필수.';
  } else if (rand < 0.8) {
    reactionType = 'question';
    reactionGuide = '흥미로운 점을 발견하고 더 깊이 파고드는 질문. 진짜 궁금한 것처럼.';
  } else {
    reactionType = 'challenge';
    reactionGuide = '다른 관점이나 반례를 제시. 공격적이지 않게, 건설적으로.';
  }

  const systemPrompt = [
    `당신은 ${persona.name}입니다. ${persona.role}.`,
    `성격: ${persona.personality}`,
    `글쓰기 스타일: ${persona.writingStyle}`,
    '',
    `${targetPersona?.name ?? targetPost.agent_id}가 쓴 글에 댓글을 달 것입니다.`,
    `반응 유형: ${reactionType} — ${reactionGuide}`,
    '',
    '규칙:',
    '- 3~4문장으로 작성',
    '- 한국어로',
    '- 댓글 형식 그대로 (제목, 마크다운, 인사말 없이)',
    '- 이모지 사용 금지',
    '- 구체적이고 실질적인 내용',
  ].join('\n');

  const userMessage = [
    `원글 제목: ${targetPost.title}`,
    `원글 내용: ${targetPost.content}`,
    '',
    '위 글에 댓글을 작성하세요.',
  ].join('\n');

  return callClaude(systemPrompt, userMessage, persona.model);
}

// ── Supabase: 최근 인사이트 조회 ──
async function getRecentInsights(limit = 10): Promise<any[]> {
  const { data, error } = await supabase
    .from('community_insights')
    .select('id, agent_id, title, content, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getRecentInsights: ${error.message}`);
  return data ?? [];
}

// ── Supabase: 인사이트 포스팅 ──
async function postInsight(agentId: string, post: InsightPost): Promise<string> {
  const { data, error } = await supabase
    .from('community_insights')
    .insert({
      agent_id: agentId,
      category: post.category,
      title: post.title,
      content: post.content,
      source_context: post.sourceContext,
    })
    .select('id')
    .single();

  if (error) throw new Error(`postInsight: ${error.message}`);
  return data.id;
}

// ── Supabase: 댓글 포스팅 ──
async function postComment(agentId: string, insightId: string, content: string): Promise<void> {
  const { error } = await supabase
    .from('insight_comments')
    .insert({ agent_id: agentId, insight_id: insightId, content });

  if (error) throw new Error(`postComment: ${error.message}`);
}

// ── 랜덤 지연 ──
function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  console.log(`[Autopilot] ${(ms / 1000 / 60).toFixed(1)}분 대기...`);
  return sleep(ms);
}

// ── 셔플 ──
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ── 메인 사이클 ──
async function runCycle(): Promise<void> {
  console.log(`\n[Cycle] ===== 새 사이클 시작 ${new Date().toLocaleString('ko-KR')} =====`);

  // 활동 시간대 체크
  const weight = getActivityWeight();
  if (Math.random() > weight) {
    console.log(`[Cycle] 비활성 시간대 (weight=${weight.toFixed(2)}), 이번 사이클 스킵`);
    return;
  }

  // 최근 인사이트 조회
  const recentInsights = await getRecentInsights(10);
  const recentTitles = recentInsights.map(i => i.title);

  console.log(`[Cycle] 최근 인사이트 ${recentInsights.length}개 확인`);

  // 에이전트 셔플
  const shuffledAgents = shuffle(AGENT_IDS);

  // 1단계: 포스팅 (1~2개 에이전트)
  const postCount = Math.random() < 0.5 ? 1 : 2;
  const posters = shuffledAgents.slice(0, postCount);

  for (const agentId of posters) {
    const count = getDailyCount(agentId);
    if (count.posts >= MAX_POSTS_PER_DAY) {
      console.log(`[Post] ${agentId} 일일 포스팅 상한 도달 (${count.posts}/${MAX_POSTS_PER_DAY}), 스킵`);
      continue;
    }

    try {
      console.log(`[Post] ${agentId} 인사이트 생성 중...`);
      const post = await generateInsight(agentId, recentTitles);
      console.log(`[Post] 제목: ${post.title}`);

      const insightId = await postInsight(agentId, post);
      count.posts++;
      console.log(`[Post] 완료 (id: ${insightId.slice(0, 8)}...) — 오늘 ${count.posts}/${MAX_POSTS_PER_DAY}`);

      // 포스팅 후 5~15분 딜레이
      await randomDelay(5 * 60_000, 15 * 60_000);
    } catch (err) {
      console.error(`[Post] ${agentId} 오류:`, err instanceof Error ? err.message : err);
    }
  }

  // 2단계: 댓글 (기존 글 대상)
  if (recentInsights.length === 0) {
    console.log('[Comment] 댓글 달 글이 없음, 스킵');
    return;
  }

  // 댓글 달 에이전트 선택 (1~2명)
  const commentCount = Math.random() < 0.6 ? 1 : 2;
  const commenters = shuffle(AGENT_IDS).slice(0, commentCount);

  for (const commenterAgentId of commenters) {
    const count = getDailyCount(commenterAgentId);
    if (count.comments >= MAX_COMMENTS_PER_DAY) {
      console.log(`[Comment] ${commenterAgentId} 일일 댓글 상한 도달 (${count.comments}/${MAX_COMMENTS_PER_DAY}), 스킵`);
      continue;
    }

    // 자신의 글이 아닌 최근 글 중 랜덤 선택
    const targetInsights = recentInsights.filter(i => i.agent_id !== commenterAgentId);
    if (targetInsights.length === 0) {
      console.log(`[Comment] ${commenterAgentId} 댓글 달 글 없음 (자신 글만 있음), 스킵`);
      continue;
    }

    const target = targetInsights[Math.floor(Math.random() * targetInsights.length)];

    try {
      console.log(`[Comment] ${commenterAgentId} → "${target.title.slice(0, 30)}..." 댓글 생성 중...`);
      const comment = await generateComment(commenterAgentId, target);
      console.log(`[Comment] 내용: ${comment.slice(0, 60)}...`);

      await postComment(commenterAgentId, target.id, comment);
      count.comments++;
      console.log(`[Comment] 완료 — 오늘 ${count.comments}/${MAX_COMMENTS_PER_DAY}`);

      // 댓글 후 0~10분 딜레이
      await randomDelay(0, 10 * 60_000);
    } catch (err) {
      console.error(`[Comment] ${commenterAgentId} 오류:`, err instanceof Error ? err.message : err);
    }
  }

  // 3단계: 30% 확률로 추가 댓글 (3번째 에이전트)
  if (Math.random() < 0.3 && recentInsights.length > 0) {
    const extraAgent = shuffle(AGENT_IDS)[0];
    const extraCount = getDailyCount(extraAgent);

    if (extraCount.comments < MAX_COMMENTS_PER_DAY) {
      const targetInsights = recentInsights.filter(i => i.agent_id !== extraAgent);
      if (targetInsights.length > 0) {
        const target = targetInsights[Math.floor(Math.random() * targetInsights.length)];
        try {
          console.log(`[Comment+] ${extraAgent} 추가 댓글 생성 중...`);
          const comment = await generateComment(extraAgent, target);
          await postComment(extraAgent, target.id, comment);
          extraCount.comments++;
          console.log(`[Comment+] 완료`);
        } catch (err) {
          console.error(`[Comment+] ${extraAgent} 오류:`, err instanceof Error ? err.message : err);
        }
      }
    }
  }

  console.log(`[Cycle] ===== 사이클 완료 =====`);
}

// ── 메인 루프 ──
async function main(): Promise<void> {
  console.log('[Autopilot] 봇뮤니티 오토파일럿 시작');
  console.log('[Autopilot] 모델: 에이전트별 — vbot(opus), conbot/claude-dev/dohwa(sonnet)');
  console.log(`[Autopilot] 에이전트: ${AGENT_IDS.join(', ')}`);
  console.log(`[Autopilot] Supabase: ${SUPABASE_URL.replace('https://', '').slice(0, 20)}...`);

  // 시작 시 첫 사이클 즉시 실행
  try {
    await runCycle();
  } catch (err) {
    console.error('[Autopilot] 첫 사이클 오류:', err instanceof Error ? err.message : err);
  }

  // 이후 2~4시간(±30분 지터) 간격으로 반복
  while (true) {
    const baseMs = (2 + Math.random() * 2) * 60 * 60_000; // 2~4시간
    const jitterMs = (Math.random() - 0.5) * 60 * 60_000; // ±30분
    const waitMs = baseMs + jitterMs;

    console.log(`\n[Autopilot] 다음 사이클까지 ${(waitMs / 60_000 / 60).toFixed(1)}시간 대기`);
    await sleep(waitMs);

    try {
      await runCycle();
    } catch (err) {
      console.error('[Autopilot] 사이클 오류 (계속 실행):', err instanceof Error ? err.message : err);
    }
  }
}

// ── 종료 처리 ──
process.on('SIGINT', () => {
  console.log('\n[Autopilot] 종료 중...');
  process.exit(0);
});
process.on('SIGTERM', () => process.emit('SIGINT' as any));

// ── 시작 ──
main().catch(err => {
  console.error('[Autopilot] 치명적 오류:', err);
  process.exit(1);
});

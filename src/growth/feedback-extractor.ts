import type { TaskFeedback, FeedbackNegative } from './types.js';
import { loadMember } from '../core/config.js';

/**
 * 피드백 추출기
 *
 * 팀장/리뷰어의 검수 결과를 구조화된 피드백으로 변환한다.
 * 이전 경험 파일을 참조하여 recurring 여부를 판단한다.
 */

interface RawFeedback {
  task_id: string;
  agent: string;
  team_id: string;
  reviewer: string;
  verdict: 'success' | 'partial_success' | 'failure';
  positives: string[];
  negatives: Array<{
    issue: string;
    detail?: string;
    severity?: 'error' | 'warning' | 'info';
  }>;
  suggestions?: string[];
}

export function extractFeedback(raw: RawFeedback): TaskFeedback {
  const member = loadMember(raw.agent);

  // 기존 경험에서 비슷한 실수가 있었는지 확인 → recurring 판정
  const negatives: FeedbackNegative[] = raw.negatives.map(neg => {
    const recurring = isRecurring(neg.issue, member?.learned ?? [], member?.weaknesses ?? []);
    return {
      issue: neg.issue,
      detail: neg.detail,
      severity: neg.severity ?? 'warning',
      recurring,
    };
  });

  return {
    task_id: raw.task_id,
    agent: raw.agent,
    team_id: raw.team_id,
    reviewer: raw.reviewer,
    verdict: raw.verdict,
    positives: raw.positives,
    negatives,
    suggestions: raw.suggestions ?? [],
    timestamp: new Date().toISOString().split('T')[0],
  };
}

/**
 * 이전에 비슷한 실수를 한 적이 있는지 확인
 * - learned 규칙 중에 관련 키워드가 있거나
 * - weaknesses에 관련 내용이 있으면 recurring
 */
function isRecurring(
  issue: string,
  learned: Array<{ rule: string }>,
  weaknesses: string[],
): boolean {
  const issueWords = extractKeywords(issue);

  for (const rule of learned) {
    const ruleWords = extractKeywords(rule.rule);
    if (hasOverlap(issueWords, ruleWords)) return true;
  }

  for (const weakness of weaknesses) {
    const weakWords = extractKeywords(weakness);
    if (hasOverlap(issueWords, weakWords)) return true;
  }

  return false;
}

function extractKeywords(text: string): Set<string> {
  // 한국어 + 영어 키워드 추출 (2글자 이상)
  const words = text.match(/[가-힣a-zA-Z]{2,}/g) ?? [];
  return new Set(words.map(w => w.toLowerCase()));
}

function hasOverlap(a: Set<string>, b: Set<string>): boolean {
  for (const word of a) {
    if (b.has(word)) return true;
  }
  return false;
}

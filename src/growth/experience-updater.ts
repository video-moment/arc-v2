import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import type { MemberExperience, LearnedRule } from '../core/config.js';
import { ROOT } from '../core/config.js';
import type { TaskFeedback } from './types.js';
import { calculateNewConfidence, shouldRemoveRule } from './confidence-manager.js';

/**
 * 경험 파일 업데이터
 *
 * 피드백을 받아서 해당 에이전트의 members/*.yaml을 자동 업데이트한다.
 *
 * 처리 로직:
 * 1. negatives에서 recurring: true → learned에 새 규칙 추가 or 기존 규칙 confidence 상승
 * 2. negatives에서 recurring: false → weaknesses에 추가 (첫 실수)
 * 3. positives에서 이전 weakness와 매칭 → weakness 제거
 * 4. 반복되는 positive → strengths에 추가
 * 5. confidence < 0.3인 규칙 → 자동 제거
 * 6. total_tasks 증가
 * 7. growth_log에 기록
 */

export interface UpdateResult {
  memberName: string;
  changes: string[];
}

export function applyFeedback(feedback: TaskFeedback): UpdateResult {
  const filePath = join(ROOT, 'members', `${feedback.agent}.yaml`);
  if (!existsSync(filePath)) {
    throw new Error(`멤버 파일을 찾을 수 없습니다: ${feedback.agent}`);
  }

  const raw = readFileSync(filePath, 'utf-8');
  const member: MemberExperience = parse(raw);
  const changes: string[] = [];

  // 배열 초기화 (null/undefined 방어)
  if (!member.learned) member.learned = [];
  if (!member.strengths) member.strengths = [];
  if (!member.weaknesses) member.weaknesses = [];
  if (!member.growth_log) member.growth_log = [];

  // 1. total_tasks 증가
  member.total_tasks = (member.total_tasks ?? 0) + 1;

  // 2. negatives 처리
  for (const neg of feedback.negatives) {
    if (neg.recurring) {
      // 반복 실수 → learned 규칙 추가 or confidence 상승
      const existing = findSimilarRule(member.learned, neg.issue);
      if (existing) {
        const oldConf = existing.confidence;
        existing.confidence = calculateNewConfidence(existing.confidence, 'repeated_mistake');
        changes.push(`규칙 강화: "${existing.rule}" (${fmt(oldConf)}→${fmt(existing.confidence)})`);
      } else {
        const newRule: LearnedRule = {
          rule: neg.issue,
          source: `${feedback.reviewer}가 반복 지적`,
          added: feedback.timestamp,
          confidence: 0.6,
        };
        member.learned.push(newRule);
        changes.push(`새 규칙 학습: "${neg.issue}" (신뢰도: 60%)`);
      }
    } else {
      // 첫 실수 → weaknesses에 추가 (중복 방지)
      if (!member.weaknesses.some(w => isSimilar(w, neg.issue))) {
        member.weaknesses.push(neg.issue);
        changes.push(`약점 추가: "${neg.issue}"`);
      }
    }
  }

  // 3. positives 처리
  for (const pos of feedback.positives) {
    // 이전 weakness와 매칭되면 제거 (개선됨)
    const weakIdx = member.weaknesses.findIndex(w => isSimilar(w, pos));
    if (weakIdx !== -1) {
      const removed = member.weaknesses.splice(weakIdx, 1)[0];
      changes.push(`약점 해소: "${removed}" → 개선 확인`);

      member.growth_log.push({
        date: feedback.timestamp,
        event: `약점 개선: ${removed}`,
        trigger: `${feedback.reviewer} 긍정 피드백`,
      });
    }

    // 관련 learned 규칙이 있으면 confidence 상승
    const relatedRule = findSimilarRule(member.learned, pos);
    if (relatedRule) {
      const oldConf = relatedRule.confidence;
      relatedRule.confidence = calculateNewConfidence(relatedRule.confidence, 'rule_success');
      if (relatedRule.confidence !== oldConf) {
        changes.push(`규칙 검증: "${relatedRule.rule}" (${fmt(oldConf)}→${fmt(relatedRule.confidence)})`);
      }
    }
  }

  // 4. verdict가 success이고 positives가 있으면 strengths 후보
  if (feedback.verdict === 'success' && feedback.positives.length > 0) {
    for (const pos of feedback.positives) {
      if (!member.strengths.some(s => isSimilar(s, pos)) && member.strengths.length < 10) {
        member.strengths.push(pos);
        changes.push(`강점 추가: "${pos}"`);
      }
    }
  }

  // 5. confidence < 0.3인 규칙 자동 제거
  const beforeCount = member.learned.length;
  member.learned = member.learned.filter(rule => {
    if (shouldRemoveRule(rule)) {
      changes.push(`규칙 제거 (신뢰도 부족): "${rule.rule}" (${fmt(rule.confidence)})`);
      return false;
    }
    return true;
  });

  // 6. growth_log 기록
  if (changes.length > 0) {
    member.growth_log.push({
      date: feedback.timestamp,
      event: `${feedback.verdict} — ${changes.length}건 업데이트`,
      trigger: `${feedback.reviewer} 검수 (task: ${feedback.task_id})`,
    });
  }

  // YAML로 저장
  writeFileSync(filePath, stringify(member, { lineWidth: 0 }), 'utf-8');

  return { memberName: feedback.agent, changes };
}

/**
 * 팀장의 팀원 조합 학습 업데이트
 */
export function updateTeamChemistry(
  leaderName: string,
  combo: string[],
  success: boolean,
): void {
  const filePath = join(ROOT, 'members', `${leaderName}.yaml`);
  if (!existsSync(filePath)) return;

  const raw = readFileSync(filePath, 'utf-8');
  const member: MemberExperience = parse(raw);

  if (!member.team_chemistry) member.team_chemistry = [];

  const sortedCombo = [...combo].sort();
  const existing = member.team_chemistry.find(
    c => [...c.combo].sort().join(',') === sortedCombo.join(','),
  );

  if (existing) {
    existing.tasks += 1;
    // 이동 평균으로 성공률 업데이트
    const successVal = success ? 1 : 0;
    existing.success_rate =
      (existing.success_rate * (existing.tasks - 1) + successVal) / existing.tasks;
    existing.success_rate = Math.round(existing.success_rate * 100) / 100;
  } else {
    member.team_chemistry.push({
      combo: sortedCombo,
      tasks: 1,
      success_rate: success ? 1.0 : 0.0,
      note: '',
    });
  }

  writeFileSync(filePath, stringify(member, { lineWidth: 0 }), 'utf-8');
}

// --- 헬퍼 ---

function findSimilarRule(rules: LearnedRule[], text: string): LearnedRule | undefined {
  const keywords = extractKeywords(text);
  return rules.find(rule => {
    const ruleKeywords = extractKeywords(rule.rule);
    let overlap = 0;
    for (const kw of keywords) {
      if (ruleKeywords.has(kw)) overlap++;
    }
    return overlap >= 2; // 키워드 2개 이상 겹치면 유사
  });
}

function isSimilar(a: string, b: string): boolean {
  const kwA = extractKeywords(a);
  const kwB = extractKeywords(b);
  let overlap = 0;
  for (const kw of kwA) {
    if (kwB.has(kw)) overlap++;
  }
  return overlap >= 2;
}

function extractKeywords(text: string): Set<string> {
  const words = text.match(/[가-힣a-zA-Z]{2,}/g) ?? [];
  return new Set(words.map(w => w.toLowerCase()));
}

function fmt(n: number): string {
  return `${Math.round(n * 100)}%`;
}

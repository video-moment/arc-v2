import type { LearnedRule } from '../core/config.js';

/**
 * 신뢰도 관리
 *
 * 규칙:
 * - CEO/팀장 직접 지시          → confidence = 1.0
 * - 같은 실수 반복 (3회 이상)    → +0.2
 * - 같은 실수 반복 (5회 이상)    → = 0.95
 * - 규칙 적용 후 성공            → +0.05
 * - 규칙 적용 후 오히려 실패     → -0.15
 * - confidence < 0.3            → 규칙 자동 제거
 */

const MIN_CONFIDENCE = 0.0;
const MAX_CONFIDENCE = 1.0;
const AUTO_REMOVE_THRESHOLD = 0.3;
const DIRECT_ORDER_CONFIDENCE = 1.0;

export function clampConfidence(value: number): number {
  return Math.min(Math.max(value, MIN_CONFIDENCE), MAX_CONFIDENCE);
}

export function boostConfidence(current: number, delta: number): number {
  return clampConfidence(current + delta);
}

export function shouldRemoveRule(rule: LearnedRule): boolean {
  return rule.confidence < AUTO_REMOVE_THRESHOLD;
}

export function calculateNewConfidence(
  current: number,
  event: 'repeated_mistake' | 'frequent_mistake' | 'rule_success' | 'rule_failure' | 'direct_order',
): number {
  switch (event) {
    case 'direct_order':
      return DIRECT_ORDER_CONFIDENCE;
    case 'frequent_mistake':
      return clampConfidence(0.95);
    case 'repeated_mistake':
      return clampConfidence(current + 0.2);
    case 'rule_success':
      return clampConfidence(current + 0.05);
    case 'rule_failure':
      return clampConfidence(current - 0.15);
  }
}

export { AUTO_REMOVE_THRESHOLD };

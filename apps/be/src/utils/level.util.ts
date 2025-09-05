/**
 * 레벨/경험치 공용 유틸리티
 *
 * - User / UserTeam 등 여러 도메인에서 동일한 레벨 산식을 재사용하기 위한 모듈
 * - 추후 커브(경험치 테이블) 변경 시 이 파일만 수정하면 전체 반영
 *
 * 설계 포인트:
 * 1. LEVEL_THRESHOLDS: "해당 레벨에 진입하기 위한 최소 누적 경험치"
 *    - 인덱스 = 레벨 (Lv1 => index 1 의미, 구현 편의상 배열 0번은 0)
 * 2. 테이블 밖 레벨은 마지막 증가폭(or 평균)을 기준으로 점진적 10% 가중 증가
 * 3. calculateLevel: 주어진 누적 경험치로 현재 레벨 역산
 * 4. experienceToNext: 다음 레벨까지 필요 경험치 및 진행률 계산
 * 5. simulateAddExperience: 경험치 추가 후 레벨업 여부/다음 레벨 필요치 반환
 *
 * 사용 예:
 *   const level = calculateLevel(user.experience);
 *   const { toNext, progressRatio } = experienceToNext(user.experience);
 *
 * 변경 시 주의:
 * - 이미 발급된 레벨/경험치와 커브가 달라질 수 있으므로
 *   운영 중 커브 변경은 마이그레이션(보정) 정책을 수립 후 진행
 */

//////////////////////////////
// 경험치 커브 정의
//////////////////////////////

/**
 * 레벨 시작 경험치 테이블
 * 예) LEVEL_THRESHOLDS[0] = 0 (미사용), [1] = 0 (Lv1 시작), [2] = 100 (Lv2 시작)
 *
 * 필요 시 커브 재조정:
 *  - 선형 → 지수 형태로 조정
 *  - 배열 길이를 늘리거나 값만 조정
 */
export const LEVEL_THRESHOLDS: number[] = [
  0, // (padding) - 배열 인덱스 1부터 사용
  0, // Lv1
  100, // Lv2
  250, // Lv3
  450, // Lv4
  700, // Lv5
  1000, // Lv6
  1400, // Lv7
  1850, // Lv8
  2350, // Lv9
  2900, // Lv10
];

// 확장 레벨 증가 비율 (테이블 밖 영역)
const EXTRA_GROWTH_RATE = 1.1; // 10% 복리 증가
// 안전 상한 (무한 루프 방지)
const MAX_LEVEL_CAP = 999;

//////////////////////////////
// 기본 헬퍼
//////////////////////////////

/**
 * 특정 레벨의 시작 경험치(임계값)를 반환
 * @param level 조회할 레벨 (1 이상)
 */
export function getExperienceThreshold(level: number): number {
  if (level <= 1) return 0;
  if (level < LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[level];
  }

  // 테이블 밖 레벨 처리
  // 마지막 두 구간의 증가폭을 기반으로 점진적 증가
  const lastDefinedLevel = LEVEL_THRESHOLDS.length - 1;
  const lastBase = LEVEL_THRESHOLDS[lastDefinedLevel];
  const prevBase = LEVEL_THRESHOLDS[lastDefinedLevel - 1];
  const baseDelta = lastBase - prevBase || 500;

  const extraLevels = level - lastDefinedLevel; // 테이블 밖으로 나간 offset (1부터 시작)
  // 등비 증가 누적: baseDelta * (1.1^0 + 1.1^1 + ... 1.1^(n-1))
  // -> 수학적 합 공식 사용하거나 단순 루프 (레벨 수가 크지 않으므로 루프 OK)
  let accumulated = 0;
  for (let i = 0; i < extraLevels; i++) {
    accumulated += baseDelta * Math.pow(EXTRA_GROWTH_RATE, i);
  }

  return Math.floor(lastBase + accumulated);
}

/**
 * 주어진 누적 경험치로 현재 레벨 계산
 * @param experience 누적 경험치 (음수면 0으로 간주)
 */
export function calculateLevel(experience: number): number {
  const exp = Math.max(0, Math.floor(experience));

  // 빠른 경로: 테이블 범위 내 이진 탐색 고려 가능 (현 범위 작아 단순 순회)
  let level = 1;
  while (level < MAX_LEVEL_CAP) {
    const nextThreshold = getExperienceThreshold(level + 1);
    if (exp < nextThreshold) break;
    level++;
  }
  return level;
}

/**
 * 다음 레벨까지의 진행 상황 계산
 * @param experience 누적 경험치
 * @returns 진행도/필요 경험치 정보
 */
export function experienceToNext(experience: number): {
  currentLevel: number;
  currentThreshold: number;
  nextLevel: number;
  nextThreshold: number;
  toNext: number;
  progressRatio: number; // 0 ~ 1
} {
  const exp = Math.max(0, Math.floor(experience));
  const currentLevel = calculateLevel(exp);
  const nextLevel = Math.min(currentLevel + 1, MAX_LEVEL_CAP);

  const currentThreshold = getExperienceThreshold(currentLevel);
  const nextThreshold = getExperienceThreshold(nextLevel);

  const span = Math.max(1, nextThreshold - currentThreshold);
  const progressed = exp - currentThreshold;
  const progressRatio = Math.min(1, Math.max(0, progressed / span));
  const toNext = Math.max(0, nextThreshold - exp);

  return {
    currentLevel,
    currentThreshold,
    nextLevel,
    nextThreshold,
    toNext,
    progressRatio,
  };
}

/**
 * 경험치 증가 시뮬레이션 (실제 증가 로직은 엔티티/서비스에서 수행)
 * - UI 미리보기 (예: "이 활동 시 레벨업 여부")
 * @param currentExperience 현재 누적 경험치
 * @param added 추가할 경험치 (음수 허용하지 않음)
 */
export function simulateAddExperience(
  currentExperience: number,
  added: number,
): {
  previousLevel: number;
  newLevel: number;
  levelUp: boolean;
  previousExperience: number;
  newExperience: number;
  toNextBefore: number;
  toNextAfter: number;
  progressBefore: number;
  progressAfter: number;
} {
  const safeAdded = Math.max(0, Math.floor(added));
  const prevExp = Math.max(0, Math.floor(currentExperience));
  const prevLevel = calculateLevel(prevExp);
  const beforeInfo = experienceToNext(prevExp);

  const newExp = prevExp + safeAdded;
  const newLevel = calculateLevel(newExp);
  const afterInfo = experienceToNext(newExp);

  return {
    previousLevel: prevLevel,
    newLevel,
    levelUp: newLevel > prevLevel,
    previousExperience: prevExp,
    newExperience: newExp,
    toNextBefore: beforeInfo.toNext,
    toNextAfter: afterInfo.toNext,
    progressBefore: beforeInfo.progressRatio,
    progressAfter: afterInfo.progressRatio,
  };
}

/**
 * 레벨 정보(임계값/남은치/진행률) FULL 스냅샷
 * @param experience 누적 경험치
 */
export function getLevelSnapshot(experience: number): {
  experience: number;
  level: number;
  levelProgressRatio: number;
  toNext: number;
  nextThreshold: number;
  currentThreshold: number;
} {
  const exp = Math.max(0, Math.floor(experience));
  const info = experienceToNext(exp);
  return {
    experience: exp,
    level: info.currentLevel,
    levelProgressRatio: info.progressRatio,
    toNext: info.toNext,
    nextThreshold: info.nextThreshold,
    currentThreshold: info.currentThreshold,
  };
}

//////////////////////////////
// 디버그 / 개발 편의 함수
//////////////////////////////

/**
 * 디버그용: N레벨 구간 표 생성
 * @param maxLevel 표 생성 최대 레벨
 */
export function buildLevelTable(maxLevel: number = 20): Array<{
  level: number;
  threshold: number;
  toNext: number;
  span: number;
}> {
  const list: Array<{ level: number; threshold: number; toNext: number; span: number }> =
    [];
  for (let lv = 1; lv <= maxLevel; lv++) {
    const threshold = getExperienceThreshold(lv);
    const nextThreshold = getExperienceThreshold(lv + 1);
    list.push({
      level: lv,
      threshold,
      toNext: Math.max(0, nextThreshold - threshold),
      span: Math.max(0, nextThreshold - threshold),
    });
  }
  return list;
}

//////////////////////////////
// 기본 Export 묶음
//////////////////////////////
export const LevelUtil = {
  LEVEL_THRESHOLDS,
  getExperienceThreshold,
  calculateLevel,
  experienceToNext,
  simulateAddExperience,
  getLevelSnapshot,
  buildLevelTable,
};

/**
 * 팀별 선수 데이터 (로컬 상수)
 * -------------------------------------------------------
 * - 향후 DB (예: Supabase/PostgreSQL) 혹은 API 연동을 고려하여
 *   확장 가능한 구조로 설계
 * - 현재는 두산 베어스 선수 목록만 포함
 * - 다른 팀 추가 시 TEAM_IDS 와 TEAM_PLAYERS 에만 데이터 추가
 *
 * 주요 설계 포인트
 * 1) PlayerRecord: 확장 가능 필드(position, handedness, meta 등)
 * 2) TEAM_PLAYERS: teamId -> PlayerRecord[] 매핑
 * 3) 조회 유틸 함수(getPlayersByTeam, getPlayerByNumber, searchPlayers)
 * 4) 클라이언트 캐싱/메모이제이션 고려 시 상수 구조 그대로 사용 가능
 *
 * 사용 예시:
 *   import { getPlayersByTeam, TEAM_IDS } from '@/lib/team-data/players';
 *   const doosanPlayers = getPlayersByTeam(TEAM_IDS.DOOSAN);
 *
 *   const player63 = getPlayerByNumber(TEAM_IDS.DOOSAN, 63);
 *
 *   const filtered = searchPlayers(TEAM_IDS.DOOSAN, { nameIncludes: '박' });
 */

// 팀 ID 정의 (필요 시 다른 곳과 중복되지 않도록 중앙 관리)
export const TEAM_IDS = {
  DOOSAN: 'doosan',
  // 추후 확장: SAMSUNG: 'samsung', LG: 'lg', etc.
} as const;

export type TeamId = (typeof TEAM_IDS)[keyof typeof TEAM_IDS];

// 선수 레코드 타입
export interface PlayerRecord {
  id: string;          // 내부 식별자 (고유 slug) - DB 이전 시 primary key 대체 가능
  teamId: TeamId;      // 팀 식별자
  name: string;        // 선수 이름 (한글 기준)
  number: number;      // 등번호 (정수)
  position?: string;   // 포지션 (향후 확장: P, C, IF, OF 등)
  handedness?: 'L' | 'R' | 'S'; // 투/타 양손잡이 정보 (선택)
  active?: boolean;    // 현역 여부 플래그(향후 은퇴/이적 처리)
  meta?: Record<string, unknown>; // 자유 확장 메타 필드
}

// -------------------------------------------------------
// 두산 베어스 선수 데이터
// 원본 요구사항 목록 기반
// -------------------------------------------------------
const DOOSAN_PLAYERS: PlayerRecord[] = [
  { id: 'doosan-1-park-chiguk', teamId: TEAM_IDS.DOOSAN, name: '박치국', number: 1 },
  { id: 'doosan-2-kim-minseok', teamId: TEAM_IDS.DOOSAN, name: '김민석', number: 2 },
  { id: 'doosan-6-oh-myeongjin', teamId: TEAM_IDS.DOOSAN, name: '오명진', number: 6 },
  { id: 'doosan-8-cave', teamId: TEAM_IDS.DOOSAN, name: '케이브', number: 8 },
  { id: 'doosan-11-ryu-hyunjoon', teamId: TEAM_IDS.DOOSAN, name: '류현준', number: 11 },
  { id: 'doosan-13-lee-yuchan', teamId: TEAM_IDS.DOOSAN, name: '이유찬', number: 13 },
  { id: 'doosan-14-park-gye-beom', teamId: TEAM_IDS.DOOSAN, name: '박계범', number: 14 },
  { id: 'doosan-17-hong-geonhee', teamId: TEAM_IDS.DOOSAN, name: '홍건희', number: 17 },
  { id: 'doosan-23-kang-seungho', teamId: TEAM_IDS.DOOSAN, name: '강승호', number: 23 },
  { id: 'doosan-25-yang-eui-ji', teamId: TEAM_IDS.DOOSAN, name: '양의지', number: 25 },
  { id: 'doosan-30-kim-jeongwoo', teamId: TEAM_IDS.DOOSAN, name: '김정우', number: 30 },
  { id: 'doosan-31-jung-subin', teamId: TEAM_IDS.DOOSAN, name: '정수빈', number: 31 },
  { id: 'doosan-33-kim-intae', teamId: TEAM_IDS.DOOSAN, name: '김인태', number: 33 },
  { id: 'doosan-35-go-hyojun', teamId: TEAM_IDS.DOOSAN, name: '고효준', number: 35 },
  { id: 'doosan-39-jack-logue', teamId: TEAM_IDS.DOOSAN, name: '잭로그', number: 39 },
  { id: 'doosan-45-kim-giyeon', teamId: TEAM_IDS.DOOSAN, name: '김기연', number: 45 },
  { id: 'doosan-47-kwak-bin', teamId: TEAM_IDS.DOOSAN, name: '곽빈', number: 47 },
  { id: 'doosan-49-park-shinji', teamId: TEAM_IDS.DOOSAN, name: '박신지', number: 49 },
  { id: 'doosan-51-jo-suhaeng', teamId: TEAM_IDS.DOOSAN, name: '조수행', number: 51 },
  { id: 'doosan-52-park-junsun', teamId: TEAM_IDS.DOOSAN, name: '박준순', number: 52 },
  { id: 'doosan-57-cole-irvin', teamId: TEAM_IDS.DOOSAN, name: '콜어빈', number: 57 },
  { id: 'doosan-61-choi-wonjun', teamId: TEAM_IDS.DOOSAN, name: '최원준', number: 61 },
  { id: 'doosan-62-ahn-jaeseok', teamId: TEAM_IDS.DOOSAN, name: '안재석', number: 62 },
  { id: 'doosan-63-kim-taekyeon', teamId: TEAM_IDS.DOOSAN, name: '김택연', number: 63 },
  { id: 'doosan-65-yun-taeho', teamId: TEAM_IDS.DOOSAN, name: '윤태호', number: 65 },
  { id: 'doosan-68-choi-minseok', teamId: TEAM_IDS.DOOSAN, name: '최민석', number: 68 },
  { id: 'doosan-73-jo-seonghwan', teamId: TEAM_IDS.DOOSAN, name: '조성환', number: 73 },
  { id: 'doosan-92-yang-jaehoon', teamId: TEAM_IDS.DOOSAN, name: '양재훈', number: 92 },
  { id: 'doosan-93-je-hwanyu', teamId: TEAM_IDS.DOOSAN, name: '제환유', number: 93 },
];

// -------------------------------------------------------
// 팀별 선수 집합 매핑
// -------------------------------------------------------
export const TEAM_PLAYERS: Record<TeamId, PlayerRecord[]> = {
  [TEAM_IDS.DOOSAN]: DOOSAN_PLAYERS,
  // 추후 예시:
  // [TEAM_IDS.SAMSUNG]: SAMSUNG_PLAYERS,
};

// -------------------------------------------------------
// 조회 / 헬퍼 함수
// -------------------------------------------------------

/**
 * 특정 팀의 선수 목록 반환
 * @param teamId 팀 식별자
 */
export function getPlayersByTeam(teamId: TeamId): PlayerRecord[] {
  return TEAM_PLAYERS[teamId] ?? [];
}

/**
 * 등번호로 선수 단건 조회
 * @param teamId 팀 식별자
 * @param number 등번호
 */
export function getPlayerByNumber(teamId: TeamId, number: number): PlayerRecord | undefined {
  return getPlayersByTeam(teamId).find((p) => p.number === number);
}

/**
 * 이름(부분일치) 또는 기타 조건으로 선수 검색
 * @param teamId 팀 식별자
 * @param opts 검색 옵션
 */
export function searchPlayers(
  teamId: TeamId,
  opts: {
    nameIncludes?: string;
    numberEquals?: number;
    predicate?: (p: PlayerRecord) => boolean;
  } = {}
): PlayerRecord[] {
  const base = getPlayersByTeam(teamId);
  return base.filter((p) => {
    if (opts.numberEquals !== undefined && p.number !== opts.numberEquals) return false;
    if (opts.nameIncludes && !p.name.includes(opts.nameIncludes)) return false;
    if (opts.predicate && !opts.predicate(p)) return false;
    return true;
  });
}

/**
 * 선수 ID (slug) 로 단건 조회
 * @param teamId 팀 식별자 (안전성 확보용)
 * @param id PlayerRecord.id
 */
export function getPlayerById(teamId: TeamId, id: string): PlayerRecord | undefined {
  return getPlayersByTeam(teamId).find((p) => p.id === id);
}

/**
 * (선택) 로컬 데이터 최신성 체크용 타임스탬프
 * - API / DB 전환 시 ETag 또는 updatedAt 비교에 활용 가능
 */
export const TEAM_PLAYERS_VERSION = '2024-08-26T00:00:00Z';

// -------------------------------------------------------
// 향후 DB 마이그레이션 전략 (간단 메모)
// -------------------------------------------------------
/**
 * 1) 현재 PlayerRecord 구조를 그대로 RDS/PostgreSQL 테이블 스키마로 이전
 *    - id (PK, text)
 *    - team_id (FK -> teams)
 *    - name (text)
 *    - number (int)
 *    - position (nullable text)
 *    - handedness (char(1))
 *    - active (boolean, default true)
 *    - meta (jsonb)
 *
 * 2) 클라이언트: getPlayersByTeam -> useQuery(fetchPlayers(teamId)) 로 대체
 * 3) optimistic UI / 캐싱은 현재 상수 구조와 동일한 shape 유지
 */

// commit: feat(team-data): 두산 선수 데이터 및 확장 가능한 팀별 선수 데이터 구조 추가

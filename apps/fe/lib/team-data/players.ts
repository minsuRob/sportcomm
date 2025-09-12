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
  DOOSAN: "doosan",
  LG: "lg",
  SSG: "ssg",
  KT: "kt",
  SAMSUNG: "samsung",
  LOTTE: "lotte",
  NC: "nc",
  KIA: "kia",
  KIWOOM: "kiwoom",
  HANWHA: "hanwha",
} as const;

export type TeamId = (typeof TEAM_IDS)[keyof typeof TEAM_IDS];

// 선수 레코드 타입
export interface PlayerRecord {
  id: string; // 내부 식별자 (고유 slug) - DB 이전 시 primary key 대체 가능
  teamId: TeamId; // 팀 식별자
  name: string; // 선수 이름 (한글 기준)
  number: number; // 등번호 (정수)
  position?: string; // 포지션 (향후 확장: P, C, IF, OF 등)
  handedness?: "L" | "R" | "S"; // 투/타 양손잡이 정보 (선택)
  active?: boolean; // 현역 여부 플래그(향후 은퇴/이적 처리)
  meta?: Record<string, unknown>; // 자유 확장 메타 필드
}

// -------------------------------------------------------
// 두산 베어스 선수 데이터
// 원본 요구사항 목록 기반
// -------------------------------------------------------
const DOOSAN_PLAYERS: PlayerRecord[] = [
  {
    id: "doosan-1-park-chiguk",
    teamId: TEAM_IDS.DOOSAN,
    name: "박치국",
    number: 1,
  },
  {
    id: "doosan-2-kim-minseok",
    teamId: TEAM_IDS.DOOSAN,
    name: "김민석",
    number: 2,
  },
  {
    id: "doosan-6-oh-myeongjin",
    teamId: TEAM_IDS.DOOSAN,
    name: "오명진",
    number: 6,
  },
  { id: "doosan-8-cave", teamId: TEAM_IDS.DOOSAN, name: "케이브", number: 8 },
  {
    id: "doosan-11-ryu-hyunjoon",
    teamId: TEAM_IDS.DOOSAN,
    name: "류현준",
    number: 11,
  },
  {
    id: "doosan-13-lee-yuchan",
    teamId: TEAM_IDS.DOOSAN,
    name: "이유찬",
    number: 13,
  },
  {
    id: "doosan-14-park-gye-beom",
    teamId: TEAM_IDS.DOOSAN,
    name: "박계범",
    number: 14,
  },
  {
    id: "doosan-17-hong-geonhee",
    teamId: TEAM_IDS.DOOSAN,
    name: "홍건희",
    number: 17,
  },
  {
    id: "doosan-23-kang-seungho",
    teamId: TEAM_IDS.DOOSAN,
    name: "강승호",
    number: 23,
  },
  {
    id: "doosan-25-yang-eui-ji",
    teamId: TEAM_IDS.DOOSAN,
    name: "양의지",
    number: 25,
  },
  {
    id: "doosan-30-kim-jeongwoo",
    teamId: TEAM_IDS.DOOSAN,
    name: "김정우",
    number: 30,
  },
  {
    id: "doosan-31-jung-subin",
    teamId: TEAM_IDS.DOOSAN,
    name: "정수빈",
    number: 31,
  },
  {
    id: "doosan-33-kim-intae",
    teamId: TEAM_IDS.DOOSAN,
    name: "김인태",
    number: 33,
  },
  {
    id: "doosan-35-go-hyojun",
    teamId: TEAM_IDS.DOOSAN,
    name: "고효준",
    number: 35,
  },
  {
    id: "doosan-39-jack-logue",
    teamId: TEAM_IDS.DOOSAN,
    name: "잭로그",
    number: 39,
  },
  {
    id: "doosan-45-kim-giyeon",
    teamId: TEAM_IDS.DOOSAN,
    name: "김기연",
    number: 45,
  },
  {
    id: "doosan-47-kwak-bin",
    teamId: TEAM_IDS.DOOSAN,
    name: "곽빈",
    number: 47,
  },
  {
    id: "doosan-49-park-shinji",
    teamId: TEAM_IDS.DOOSAN,
    name: "박신지",
    number: 49,
  },
  {
    id: "doosan-51-jo-suhaeng",
    teamId: TEAM_IDS.DOOSAN,
    name: "조수행",
    number: 51,
  },
  {
    id: "doosan-52-park-junsun",
    teamId: TEAM_IDS.DOOSAN,
    name: "박준순",
    number: 52,
  },
  {
    id: "doosan-57-cole-irvin",
    teamId: TEAM_IDS.DOOSAN,
    name: "콜어빈",
    number: 57,
  },
  {
    id: "doosan-61-choi-wonjun",
    teamId: TEAM_IDS.DOOSAN,
    name: "최원준",
    number: 61,
  },
  {
    id: "doosan-62-ahn-jaeseok",
    teamId: TEAM_IDS.DOOSAN,
    name: "안재석",
    number: 62,
  },
  {
    id: "doosan-63-kim-taekyeon",
    teamId: TEAM_IDS.DOOSAN,
    name: "김택연",
    number: 63,
  },
  {
    id: "doosan-65-yun-taeho",
    teamId: TEAM_IDS.DOOSAN,
    name: "윤태호",
    number: 65,
  },
  {
    id: "doosan-68-choi-minseok",
    teamId: TEAM_IDS.DOOSAN,
    name: "최민석",
    number: 68,
  },
  {
    id: "doosan-73-jo-seonghwan",
    teamId: TEAM_IDS.DOOSAN,
    name: "조성환",
    number: 73,
  },
  {
    id: "doosan-92-yang-jaehoon",
    teamId: TEAM_IDS.DOOSAN,
    name: "양재훈",
    number: 92,
  },
  {
    id: "doosan-93-je-hwanyu",
    teamId: TEAM_IDS.DOOSAN,
    name: "제환유",
    number: 93,
  },
];

// -------------------------------------------------------
// LG 트윈스 선수 데이터 (일부 샘플)
// -------------------------------------------------------
const LG_PLAYERS: PlayerRecord[] = [
  {
    id: "lg-1-im-changgyu",
    teamId: TEAM_IDS.LG,
    name: "임찬규",
    number: 1,
    position: "P",
  },
  {
    id: "lg-11-ham-deokju",
    teamId: TEAM_IDS.LG,
    name: "함덕주",
    number: 11,
    position: "P",
    handedness: "L",
  },
  {
    id: "lg-13-song-seunggi",
    teamId: TEAM_IDS.LG,
    name: "송승기",
    number: 13,
    position: "P",
    handedness: "L",
  },
  {
    id: "lg-27-park-dongwon",
    teamId: TEAM_IDS.LG,
    name: "박동원",
    number: 27,
    position: "C",
  },
  {
    id: "lg-10-oh-jihwan",
    teamId: TEAM_IDS.LG,
    name: "오지환",
    number: 10,
    position: "IF",
  },
  {
    id: "lg-2-moon-bokyung",
    teamId: TEAM_IDS.LG,
    name: "문보경",
    number: 2,
    position: "IF",
  },
  {
    id: "lg-23-austin",
    teamId: TEAM_IDS.LG,
    name: "오스틴",
    number: 23,
    position: "IF",
  },
  {
    id: "lg-8-moon-seongju",
    teamId: TEAM_IDS.LG,
    name: "문성주",
    number: 8,
    position: "OF",
    handedness: "L",
  },
  {
    id: "lg-17-park-haemin",
    teamId: TEAM_IDS.LG,
    name: "박해민",
    number: 17,
    position: "OF",
  },
  {
    id: "lg-22-kim-hyunsu",
    teamId: TEAM_IDS.LG,
    name: "김현수",
    number: 22,
    position: "OF",
  },
  {
    id: "lg-29-son-juyoung",
    teamId: TEAM_IDS.LG,
    name: "손주영",
    number: 29,
    position: "P",
    handedness: "L",
  },
  {
    id: "lg-31-lee-jungyong",
    teamId: TEAM_IDS.LG,
    name: "이정용",
    number: 31,
    position: "P",
  },
  {
    id: "lg-42-kim-jinseong",
    teamId: TEAM_IDS.LG,
    name: "김진성",
    number: 42,
    position: "P",
  },
  {
    id: "lg-54-yoo-youngchan",
    teamId: TEAM_IDS.LG,
    name: "유영찬",
    number: 54,
    position: "P",
  },
  {
    id: "lg-26-lee-juheon",
    teamId: TEAM_IDS.LG,
    name: "이주헌",
    number: 26,
    position: "C",
  },
];

// -------------------------------------------------------
// 팀별 선수 집합 매핑
// -------------------------------------------------------
// -------------------------------------------------------
// 한화 이글스 선수 데이터 (제공 명단 기반)
// -------------------------------------------------------
const HANWHA_PLAYERS: PlayerRecord[] = [
  // 투수
  {
    id: "hanwha-1-mun-dongju",
    teamId: TEAM_IDS.HANWHA,
    name: "문동주",
    number: 1,
    position: "P",
  },
  {
    id: "hanwha-11-eom-sangbaek",
    teamId: TEAM_IDS.HANWHA,
    name: "엄상백",
    number: 11,
    position: "P",
  },
  {
    id: "hanwha-29-hwang-junseo",
    teamId: TEAM_IDS.HANWHA,
    name: "황준서",
    number: 29,
    position: "P",
  },
  {
    id: "hanwha-30-ponce",
    teamId: TEAM_IDS.HANWHA,
    name: "폰세",
    number: 30,
    position: "P",
  },
  {
    id: "hanwha-38-kim-jongsu",
    teamId: TEAM_IDS.HANWHA,
    name: "김종수",
    number: 38,
    position: "P",
  },
  {
    id: "hanwha-39-kang-jaemin",
    teamId: TEAM_IDS.HANWHA,
    name: "강재민",
    number: 39,
    position: "P",
  },
  {
    id: "hanwha-43-jeong-wooju",
    teamId: TEAM_IDS.HANWHA,
    name: "정우주",
    number: 43,
    position: "P",
  },
  {
    id: "hanwha-44-kim-seohyun",
    teamId: TEAM_IDS.HANWHA,
    name: "김서현",
    number: 44,
    position: "P",
  },
  {
    id: "hanwha-47-kim-beomsu",
    teamId: TEAM_IDS.HANWHA,
    name: "김범수",
    number: 47,
    position: "P",
  },
  {
    id: "hanwha-49-yoon-sanhum",
    teamId: TEAM_IDS.HANWHA,
    name: "윤산흠",
    number: 49,
    position: "P",
  },
  {
    id: "hanwha-55-wise",
    teamId: TEAM_IDS.HANWHA,
    name: "와이스",
    number: 55,
    position: "P",
  },
  {
    id: "hanwha-58-park-sangwon",
    teamId: TEAM_IDS.HANWHA,
    name: "박상원",
    number: 58,
    position: "P",
  },
  {
    id: "hanwha-66-ju-hyun-sang",
    teamId: TEAM_IDS.HANWHA,
    name: "주현상",
    number: 66,
    position: "P",
  },
  {
    id: "hanwha-68-cho-donguk",
    teamId: TEAM_IDS.HANWHA,
    name: "조동욱",
    number: 68,
    position: "P",
  },
  {
    id: "hanwha-99-ryu-hyun-jin",
    teamId: TEAM_IDS.HANWHA,
    name: "류현진",
    number: 99,
    position: "P",
  },
  // 포수
  {
    id: "hanwha-13-choi-jaehoon",
    teamId: TEAM_IDS.HANWHA,
    name: "최재훈",
    number: 13,
    position: "C",
  },
  {
    id: "hanwha-20-lee-jaewon",
    teamId: TEAM_IDS.HANWHA,
    name: "이재원",
    number: 20,
    position: "C",
  },
  {
    id: "hanwha-59-heo-inseo",
    teamId: TEAM_IDS.HANWHA,
    name: "허인서",
    number: 59,
    position: "C",
  },
  // 내야수
  {
    id: "hanwha-2-sim-woojun",
    teamId: TEAM_IDS.HANWHA,
    name: "심우준",
    number: 2,
    position: "IF",
  },
  {
    id: "hanwha-3-an-chihong",
    teamId: TEAM_IDS.HANWHA,
    name: "안치홍",
    number: 3,
    position: "IF",
  },
  {
    id: "hanwha-7-lee-doyun",
    teamId: TEAM_IDS.HANWHA,
    name: "이도윤",
    number: 7,
    position: "IF",
  },
  {
    id: "hanwha-8-no-sihwan",
    teamId: TEAM_IDS.HANWHA,
    name: "노시환",
    number: 8,
    position: "IF",
  },
  {
    id: "hanwha-16-ha-juseok",
    teamId: TEAM_IDS.HANWHA,
    name: "하주석",
    number: 16,
    position: "IF",
  },
  {
    id: "hanwha-22-chae-eunseong",
    teamId: TEAM_IDS.HANWHA,
    name: "채은성",
    number: 22,
    position: "IF",
  },
  {
    id: "hanwha-51-mun-hyunbin",
    teamId: TEAM_IDS.HANWHA,
    name: "문현빈",
    number: 51,
    position: "IF",
  },
  {
    id: "hanwha-95-hwang-youngmuk",
    teamId: TEAM_IDS.HANWHA,
    name: "황영묵",
    number: 95,
    position: "IF",
  },
  // 외야수
  {
    id: "hanwha-0-liberato",
    teamId: TEAM_IDS.HANWHA,
    name: "리베라토",
    number: 0,
    position: "OF",
  },
  {
    id: "hanwha-9-lee-sanghyuk",
    teamId: TEAM_IDS.HANWHA,
    name: "이상혁",
    number: 9,
    position: "OF",
  },
  {
    id: "hanwha-10-lee-jinyoung",
    teamId: TEAM_IDS.HANWHA,
    name: "이진영",
    number: 10,
    position: "OF",
  },
  {
    id: "hanwha-25-kim-taeyeon",
    teamId: TEAM_IDS.HANWHA,
    name: "김태연",
    number: 25,
    position: "OF",
  },
  {
    id: "hanwha-31-son-ahseop",
    teamId: TEAM_IDS.HANWHA,
    name: "손아섭",
    number: 31,
    position: "OF",
  },
  {
    id: "hanwha-41-choi-inho",
    teamId: TEAM_IDS.HANWHA,
    name: "최인호",
    number: 41,
    position: "OF",
  },
  {
    id: "hanwha-50-lee-wonseok",
    teamId: TEAM_IDS.HANWHA,
    name: "이원석",
    number: 50,
    position: "OF",
  },
];

// -------------------------------------------------------
// SSG 랜더스 선수 데이터 (제공 명단 기반)
// -------------------------------------------------------
const SSG_PLAYERS: PlayerRecord[] = [
  // 투수
  {
    id: "ssg-19-jo-byeonghyeon",
    teamId: TEAM_IDS.SSG,
    name: "조병현",
    number: 19,
    position: "P",
  },
  {
    id: "ssg-28-song-youngjin",
    teamId: TEAM_IDS.SSG,
    name: "송영진",
    number: 28,
    position: "P",
  },
  {
    id: "ssg-29-kim-kwanghyun",
    teamId: TEAM_IDS.SSG,
    name: "김광현",
    number: 29,
    position: "P",
  },
  {
    id: "ssg-30-choi-minjun",
    teamId: TEAM_IDS.SSG,
    name: "최민준",
    number: 30,
    position: "P",
  },
  {
    id: "ssg-33-anderson",
    teamId: TEAM_IDS.SSG,
    name: "앤더슨",
    number: 33,
    position: "P",
  },
  {
    id: "ssg-34-han-dusol",
    teamId: TEAM_IDS.SSG,
    name: "한두솔",
    number: 34,
    position: "P",
  },
  {
    id: "ssg-38-no-kyungeun",
    teamId: TEAM_IDS.SSG,
    name: "노경은",
    number: 38,
    position: "P",
  },
  {
    id: "ssg-41-kim-min",
    teamId: TEAM_IDS.SSG,
    name: "김민",
    number: 41,
    position: "P",
  },
  {
    id: "ssg-42-mun-seungwon",
    teamId: TEAM_IDS.SSG,
    name: "문승원",
    number: 42,
    position: "P",
  },
  {
    id: "ssg-43-kim-taekhyung",
    teamId: TEAM_IDS.SSG,
    name: "김택형",
    number: 43,
    position: "P",
  },
  {
    id: "ssg-51-jeong-dongyun",
    teamId: TEAM_IDS.SSG,
    name: "정동윤",
    number: 51,
    position: "P",
  },
  {
    id: "ssg-55-white",
    teamId: TEAM_IDS.SSG,
    name: "화이트",
    number: 55,
    position: "P",
  },
  {
    id: "ssg-57-park-sihu",
    teamId: TEAM_IDS.SSG,
    name: "박시후",
    number: 57,
    position: "P",
  },
  {
    id: "ssg-65-jeon-yeongjun",
    teamId: TEAM_IDS.SSG,
    name: "전영준",
    number: 65,
    position: "P",
  },
  {
    id: "ssg-92-lee-rowoon",
    teamId: TEAM_IDS.SSG,
    name: "이로운",
    number: 92,
    position: "P",
  },
  // 포수
  {
    id: "ssg-20-jo-hyeongu",
    teamId: TEAM_IDS.SSG,
    name: "조형우",
    number: 20,
    position: "C",
  },
  {
    id: "ssg-32-lee-yulye",
    teamId: TEAM_IDS.SSG,
    name: "이율예",
    number: 32,
    position: "C",
  },
  {
    id: "ssg-59-lee-jiyoung",
    teamId: TEAM_IDS.SSG,
    name: "이지영",
    number: 59,
    position: "C",
  },
  // 내야수
  {
    id: "ssg-2-park-seonghan",
    teamId: TEAM_IDS.SSG,
    name: "박성한",
    number: 2,
    position: "IF",
  },
  {
    id: "ssg-3-jeong-junjae",
    teamId: TEAM_IDS.SSG,
    name: "정준재",
    number: 3,
    position: "IF",
  },
  {
    id: "ssg-6-kim-sunghyun",
    teamId: TEAM_IDS.SSG,
    name: "김성현",
    number: 6,
    position: "IF",
  },
  {
    id: "ssg-10-ahn-sanghyeon",
    teamId: TEAM_IDS.SSG,
    name: "안상현",
    number: 10,
    position: "IF",
  },
  {
    id: "ssg-14-choi-jeong",
    teamId: TEAM_IDS.SSG,
    name: "최정",
    number: 14,
    position: "IF",
  },
  {
    id: "ssg-18-go-myeongjun",
    teamId: TEAM_IDS.SSG,
    name: "고명준",
    number: 18,
    position: "IF",
  },
  {
    id: "ssg-97-hong-daein",
    teamId: TEAM_IDS.SSG,
    name: "홍대인",
    number: 97,
    position: "IF",
  },
  // 외야수
  {
    id: "ssg-15-chae-hyunwoo",
    teamId: TEAM_IDS.SSG,
    name: "채현우",
    number: 15,
    position: "OF",
  },
  {
    id: "ssg-35-han-yuseom",
    teamId: TEAM_IDS.SSG,
    name: "한유섬",
    number: 35,
    position: "OF",
  },
  {
    id: "ssg-37-oh-taegon",
    teamId: TEAM_IDS.SSG,
    name: "오태곤",
    number: 37,
    position: "OF",
  },
  {
    id: "ssg-45-ryu-hyoseung",
    teamId: TEAM_IDS.SSG,
    name: "류효승",
    number: 45,
    position: "OF",
  },
  {
    id: "ssg-47-kim-sungwook",
    teamId: TEAM_IDS.SSG,
    name: "김성욱",
    number: 47,
    position: "OF",
  },
  {
    id: "ssg-54-choi-jihoon",
    teamId: TEAM_IDS.SSG,
    name: "최지훈",
    number: 54,
    position: "OF",
  },
];

// -------------------------------------------------------
// KT 위즈 선수 데이터 (제공 명단 기반)
// -------------------------------------------------------
const KT_PLAYERS: PlayerRecord[] = [
  // 투수
  {
    id: "kt-1-go-youngpyo",
    teamId: TEAM_IDS.KT,
    name: "고영표",
    number: 1,
    position: "P",
  },
  {
    id: "kt-12-woo-gyumin",
    teamId: TEAM_IDS.KT,
    name: "우규민",
    number: 12,
    position: "P",
  },
  {
    id: "kt-16-choi-donghwan",
    teamId: TEAM_IDS.KT,
    name: "최동환",
    number: 16,
    position: "P",
  },
  {
    id: "kt-18-mun-yongik",
    teamId: TEAM_IDS.KT,
    name: "문용익",
    number: 18,
    position: "P",
  },
  {
    id: "kt-26-kim-minsu",
    teamId: TEAM_IDS.KT,
    name: "김민수",
    number: 26,
    position: "P",
  },
  {
    id: "kt-30-so-hyeongjun",
    teamId: TEAM_IDS.KT,
    name: "소형준",
    number: 30,
    position: "P",
  },
  {
    id: "kt-32-patrick",
    teamId: TEAM_IDS.KT,
    name: "패트릭",
    number: 32,
    position: "P",
  },
  {
    id: "kt-37-lee-sangdong",
    teamId: TEAM_IDS.KT,
    name: "이상동",
    number: 37,
    position: "P",
  },
  {
    id: "kt-38-ju-gwon",
    teamId: TEAM_IDS.KT,
    name: "주권",
    number: 38,
    position: "P",
  },
  {
    id: "kt-41-son-donghyeon",
    teamId: TEAM_IDS.KT,
    name: "손동현",
    number: 41,
    position: "P",
  },
  {
    id: "kt-46-park-gunwoo",
    teamId: TEAM_IDS.KT,
    name: "박건우",
    number: 46,
    position: "P",
  },
  {
    id: "kt-47-oh-wonseok",
    teamId: TEAM_IDS.KT,
    name: "오원석",
    number: 47,
    position: "P",
  },
  {
    id: "kt-60-park-younghyeon",
    teamId: TEAM_IDS.KT,
    name: "박영현",
    number: 60,
    position: "P",
  },
  {
    id: "kt-63-won-sanghyeon",
    teamId: TEAM_IDS.KT,
    name: "원상현",
    number: 63,
    position: "P",
  },
  {
    id: "kt-65-jesus",
    teamId: TEAM_IDS.KT,
    name: "헤이수스",
    number: 65,
    position: "P",
  },
  // 포수
  {
    id: "kt-22-jang-seongwoo",
    teamId: TEAM_IDS.KT,
    name: "장성우",
    number: 22,
    position: "C",
  },
  {
    id: "kt-42-jo-daehyeon",
    teamId: TEAM_IDS.KT,
    name: "조대현",
    number: 42,
    position: "C",
  },
  {
    id: "kt-50-kang-baekho",
    teamId: TEAM_IDS.KT,
    name: "강백호",
    number: 50,
    position: "C",
  },
  {
    id: "kt-55-kang-hyeonwoo",
    teamId: TEAM_IDS.KT,
    name: "강현우",
    number: 55,
    position: "C",
  },
  // 내야수
  {
    id: "kt-7-kim-sangsoo",
    teamId: TEAM_IDS.KT,
    name: "김상수",
    number: 7,
    position: "IF",
  },
  {
    id: "kt-10-hwang-jaegyun",
    teamId: TEAM_IDS.KT,
    name: "황재균",
    number: 10,
    position: "IF",
  },
  {
    id: "kt-13-heo-gyeongmin",
    teamId: TEAM_IDS.KT,
    name: "허경민",
    number: 13,
    position: "IF",
  },
  {
    id: "kt-24-mun-sangcheol",
    teamId: TEAM_IDS.KT,
    name: "문상철",
    number: 24,
    position: "IF",
  },
  {
    id: "kt-25-oh-seojin",
    teamId: TEAM_IDS.KT,
    name: "오서진",
    number: 25,
    position: "IF",
  },
  {
    id: "kt-34-lee-hoyeon",
    teamId: TEAM_IDS.KT,
    name: "이호연",
    number: 34,
    position: "IF",
  },
  {
    id: "kt-52-kwon-dongjin",
    teamId: TEAM_IDS.KT,
    name: "권동진",
    number: 52,
    position: "IF",
  },
  {
    id: "kt-56-jang-junwon",
    teamId: TEAM_IDS.KT,
    name: "장준원",
    number: 56,
    position: "IF",
  },
  // 외야수
  {
    id: "kt-3-stevenson",
    teamId: TEAM_IDS.KT,
    name: "스티븐슨",
    number: 3,
    position: "OF",
  },
  {
    id: "kt-8-ahn-chiyoung",
    teamId: TEAM_IDS.KT,
    name: "안치영",
    number: 8,
    position: "OF",
  },
  {
    id: "kt-23-ahn-hyeonmin",
    teamId: TEAM_IDS.KT,
    name: "안현민",
    number: 23,
    position: "OF",
  },
  {
    id: "kt-33-lee-jeonghun",
    teamId: TEAM_IDS.KT,
    name: "이정훈",
    number: 33,
    position: "OF",
  },
  {
    id: "kt-51-jang-jinhyeok",
    teamId: TEAM_IDS.KT,
    name: "장진혁",
    number: 51,
    position: "OF",
  },
  {
    id: "kt-67-yu-jungyu",
    teamId: TEAM_IDS.KT,
    name: "유준규",
    number: 67,
    position: "OF",
  },
];

// -------------------------------------------------------
// 삼성 라이온즈 선수 데이터 (제공 명단 기반)
// -------------------------------------------------------
const SAMSUNG_PLAYERS: PlayerRecord[] = [
  // 투수
  {
    id: "samsung-1-lee-hoseong",
    teamId: TEAM_IDS.SAMSUNG,
    name: "이호성",
    number: 1,
    position: "P",
  },
  {
    id: "samsung-3-choi-wontae",
    teamId: TEAM_IDS.SAMSUNG,
    name: "최원태",
    number: 3,
    position: "P",
  },
  {
    id: "samsung-18-won-taein",
    teamId: TEAM_IDS.SAMSUNG,
    name: "원태인",
    number: 18,
    position: "P",
  },
  {
    id: "samsung-19-yang-hyeon",
    teamId: TEAM_IDS.SAMSUNG,
    name: "양현",
    number: 19,
    position: "P",
  },
  {
    id: "samsung-20-lee-seunghyun",
    teamId: TEAM_IDS.SAMSUNG,
    name: "이승현",
    number: 20,
    position: "P",
  },
  {
    id: "samsung-26-lee-jaeik",
    teamId: TEAM_IDS.SAMSUNG,
    name: "이재익",
    number: 26,
    position: "P",
  },
  {
    id: "samsung-27-kim-taehoon",
    teamId: TEAM_IDS.SAMSUNG,
    name: "김태훈",
    number: 27,
    position: "P",
  },
  {
    id: "samsung-28-lee-seungmin",
    teamId: TEAM_IDS.SAMSUNG,
    name: "이승민",
    number: 28,
    position: "P",
  },
  {
    id: "samsung-42-yang-changseop",
    teamId: TEAM_IDS.SAMSUNG,
    name: "양창섭",
    number: 42,
    position: "P",
  },
  {
    id: "samsung-55-bae-chansung",
    teamId: TEAM_IDS.SAMSUNG,
    name: "배찬승",
    number: 55,
    position: "P",
  },
  {
    id: "samsung-57-lee-seunghyun-l",
    teamId: TEAM_IDS.SAMSUNG,
    name: "이승현",
    number: 57,
    position: "P",
  },
  {
    id: "samsung-60-garabito",
    teamId: TEAM_IDS.SAMSUNG,
    name: "가라비토",
    number: 60,
    position: "P",
  },
  {
    id: "samsung-61-hwang-dongjae",
    teamId: TEAM_IDS.SAMSUNG,
    name: "황동재",
    number: 61,
    position: "P",
  },
  {
    id: "samsung-62-kim-jaeyun",
    teamId: TEAM_IDS.SAMSUNG,
    name: "김재윤",
    number: 62,
    position: "P",
  },
  {
    id: "samsung-75-jurado",
    teamId: TEAM_IDS.SAMSUNG,
    name: "후라도",
    number: 75,
    position: "P",
  },
  // 포수
  {
    id: "samsung-2-kim-jaesung",
    teamId: TEAM_IDS.SAMSUNG,
    name: "김재성",
    number: 2,
    position: "C",
  },
  {
    id: "samsung-23-lee-byeongheon",
    teamId: TEAM_IDS.SAMSUNG,
    name: "이병헌",
    number: 23,
    position: "C",
  },
  {
    id: "samsung-47-kang-minho",
    teamId: TEAM_IDS.SAMSUNG,
    name: "강민호",
    number: 47,
    position: "C",
  },
  // 내야수
  {
    id: "samsung-0-diaz",
    teamId: TEAM_IDS.SAMSUNG,
    name: "디아즈",
    number: 0,
    position: "IF",
  },
  {
    id: "samsung-7-lee-jaehyeon",
    teamId: TEAM_IDS.SAMSUNG,
    name: "이재현",
    number: 7,
    position: "IF",
  },
  {
    id: "samsung-16-ryu-jihyeok",
    teamId: TEAM_IDS.SAMSUNG,
    name: "류지혁",
    number: 16,
    position: "IF",
  },
  {
    id: "samsung-30-kim-yeongwoong",
    teamId: TEAM_IDS.SAMSUNG,
    name: "김영웅",
    number: 30,
    position: "IF",
  },
  {
    id: "samsung-34-jeon-byeongwoo",
    teamId: TEAM_IDS.SAMSUNG,
    name: "전병우",
    number: 34,
    position: "IF",
  },
  {
    id: "samsung-53-yang-woohyun",
    teamId: TEAM_IDS.SAMSUNG,
    name: "양우현",
    number: 53,
    position: "IF",
  },
  {
    id: "samsung-56-lee-haeseung",
    teamId: TEAM_IDS.SAMSUNG,
    name: "이해승",
    number: 56,
    position: "IF",
  },
  {
    id: "samsung-68-yang-dogeun",
    teamId: TEAM_IDS.SAMSUNG,
    name: "양도근",
    number: 68,
    position: "IF",
  },
  // 외야수
  {
    id: "samsung-5-ku-jawook",
    teamId: TEAM_IDS.SAMSUNG,
    name: "구자욱",
    number: 5,
    position: "OF",
  },
  {
    id: "samsung-13-lee-seonggyu",
    teamId: TEAM_IDS.SAMSUNG,
    name: "이성규",
    number: 13,
    position: "OF",
  },
  {
    id: "samsung-25-kim-taehoon",
    teamId: TEAM_IDS.SAMSUNG,
    name: "김태훈",
    number: 25,
    position: "OF",
  },
  {
    id: "samsung-32-kim-heongon",
    teamId: TEAM_IDS.SAMSUNG,
    name: "김헌곤",
    number: 32,
    position: "OF",
  },
  {
    id: "samsung-39-kim-sungyun",
    teamId: TEAM_IDS.SAMSUNG,
    name: "김성윤",
    number: 39,
    position: "OF",
  },
  {
    id: "samsung-58-kim-jichan",
    teamId: TEAM_IDS.SAMSUNG,
    name: "김지찬",
    number: 58,
    position: "OF",
  },
  {
    id: "samsung-63-hong-hyunbin",
    teamId: TEAM_IDS.SAMSUNG,
    name: "홍현빈",
    number: 63,
    position: "OF",
  },
];

// -------------------------------------------------------
// 롯데 자이언츠 선수 데이터 (제공 명단 기반)
// -------------------------------------------------------
const LOTTE_PLAYERS: PlayerRecord[] = [
  // 투수
  {
    id: "lotte-19-kim-ganghyun",
    teamId: TEAM_IDS.LOTTE,
    name: "김강현",
    number: 19,
    position: "P",
  },
  {
    id: "lotte-21-park-sewoong",
    teamId: TEAM_IDS.LOTTE,
    name: "박세웅",
    number: 21,
    position: "P",
  },
  {
    id: "lotte-26-velasquez",
    teamId: TEAM_IDS.LOTTE,
    name: "벨라스케즈",
    number: 26,
    position: "P",
  },
  {
    id: "lotte-32-gamboa",
    teamId: TEAM_IDS.LOTTE,
    name: "감보아",
    number: 32,
    position: "P",
  },
  {
    id: "lotte-34-kim-wonjoong",
    teamId: TEAM_IDS.LOTTE,
    name: "김원중",
    number: 34,
    position: "P",
  },
  {
    id: "lotte-37-lee-minseok",
    teamId: TEAM_IDS.LOTTE,
    name: "이민석",
    number: 37,
    position: "P",
  },
  {
    id: "lotte-43-na-gyunan",
    teamId: TEAM_IDS.LOTTE,
    name: "나균안",
    number: 43,
    position: "P",
  },
  {
    id: "lotte-44-park-jin",
    teamId: TEAM_IDS.LOTTE,
    name: "박진",
    number: 44,
    position: "P",
  },
  {
    id: "lotte-55-yoon-seongbin",
    teamId: TEAM_IDS.LOTTE,
    name: "윤성빈",
    number: 55,
    position: "P",
  },
  {
    id: "lotte-56-choi-junyong",
    teamId: TEAM_IDS.LOTTE,
    name: "최준용",
    number: 56,
    position: "P",
  },
  {
    id: "lotte-57-jeong-hyeonsu",
    teamId: TEAM_IDS.LOTTE,
    name: "정현수",
    number: 57,
    position: "P",
  },
  {
    id: "lotte-65-jeong-cheolwon",
    teamId: TEAM_IDS.LOTTE,
    name: "정철원",
    number: 65,
    position: "P",
  },
  // 포수
  {
    id: "lotte-27-yu-gangnam",
    teamId: TEAM_IDS.LOTTE,
    name: "유강남",
    number: 27,
    position: "C",
  },
  {
    id: "lotte-28-son-seongbin",
    teamId: TEAM_IDS.LOTTE,
    name: "손성빈",
    number: 28,
    position: "C",
  },
  {
    id: "lotte-42-jeong-bogeun",
    teamId: TEAM_IDS.LOTTE,
    name: "정보근",
    number: 42,
    position: "C",
  },
  {
    id: "lotte-48-park-gunwoo",
    teamId: TEAM_IDS.LOTTE,
    name: "박건우",
    number: 48,
    position: "C",
  },
  // 내야수
  {
    id: "lotte-2-go-seungmin",
    teamId: TEAM_IDS.LOTTE,
    name: "고승민",
    number: 2,
    position: "IF",
  },
  {
    id: "lotte-6-han-taeyang",
    teamId: TEAM_IDS.LOTTE,
    name: "한태양",
    number: 6,
    position: "IF",
  },
  {
    id: "lotte-9-jeong-hun",
    teamId: TEAM_IDS.LOTTE,
    name: "정훈",
    number: 9,
    position: "IF",
  },
  {
    id: "lotte-13-jeon-minjae",
    teamId: TEAM_IDS.LOTTE,
    name: "전민재",
    number: 13,
    position: "IF",
  },
  {
    id: "lotte-16-kim-minsung",
    teamId: TEAM_IDS.LOTTE,
    name: "김민성",
    number: 16,
    position: "IF",
  },
  {
    id: "lotte-30-lee-hojun",
    teamId: TEAM_IDS.LOTTE,
    name: "이호준",
    number: 30,
    position: "IF",
  },
  {
    id: "lotte-33-son-hoyoung",
    teamId: TEAM_IDS.LOTTE,
    name: "손호영",
    number: 33,
    position: "IF",
  },
  {
    id: "lotte-51-na-seungyeop",
    teamId: TEAM_IDS.LOTTE,
    name: "나승엽",
    number: 51,
    position: "IF",
  },
  {
    id: "lotte-60-park-chanhyeong",
    teamId: TEAM_IDS.LOTTE,
    name: "박찬형",
    number: 60,
    position: "IF",
  },
  // 외야수
  {
    id: "lotte-0-hwang-seongbin",
    teamId: TEAM_IDS.LOTTE,
    name: "황성빈",
    number: 0,
    position: "OF",
  },
  {
    id: "lotte-5-jo-sejin",
    teamId: TEAM_IDS.LOTTE,
    name: "조세진",
    number: 5,
    position: "OF",
  },
  {
    id: "lotte-7-jang-dusung",
    teamId: TEAM_IDS.LOTTE,
    name: "장두성",
    number: 7,
    position: "OF",
  },
  {
    id: "lotte-29-reyes",
    teamId: TEAM_IDS.LOTTE,
    name: "레이예스",
    number: 29,
    position: "OF",
  },
  {
    id: "lotte-50-kim-donghyeok",
    teamId: TEAM_IDS.LOTTE,
    name: "김동혁",
    number: 50,
    position: "OF",
  },
  {
    id: "lotte-91-yun-donghee",
    teamId: TEAM_IDS.LOTTE,
    name: "윤동희",
    number: 91,
    position: "OF",
  },
];

// -------------------------------------------------------
// NC 다이노스 선수 데이터 (제공 명단 기반)
// -------------------------------------------------------
const NC_PLAYERS: PlayerRecord[] = [
  // 투수
  {
    id: "nc-3-riley",
    teamId: TEAM_IDS.NC,
    name: "라일리",
    number: 3,
    position: "P",
  },
  {
    id: "nc-12-logan",
    teamId: TEAM_IDS.NC,
    name: "로건",
    number: 12,
    position: "P",
  },
  {
    id: "nc-13-lim-jeongho",
    teamId: TEAM_IDS.NC,
    name: "임정호",
    number: 13,
    position: "P",
  },
  {
    id: "nc-17-kim-yeonggyu",
    teamId: TEAM_IDS.NC,
    name: "김영규",
    number: 17,
    position: "P",
  },
  {
    id: "nc-18-shin-minhyuk",
    teamId: TEAM_IDS.NC,
    name: "신민혁",
    number: 18,
    position: "P",
  },
  {
    id: "nc-19-lim-jimin",
    teamId: TEAM_IDS.NC,
    name: "임지민",
    number: 19,
    position: "P",
  },
  {
    id: "nc-22-kim-nokwon",
    teamId: TEAM_IDS.NC,
    name: "김녹원",
    number: 22,
    position: "P",
  },
  {
    id: "nc-26-choi-seongyeong",
    teamId: TEAM_IDS.NC,
    name: "최성영",
    number: 26,
    position: "P",
  },
  {
    id: "nc-29-ha-junyoung",
    teamId: TEAM_IDS.NC,
    name: "하준영",
    number: 29,
    position: "P",
  },
  {
    id: "nc-43-shin-youngwoo",
    teamId: TEAM_IDS.NC,
    name: "신영우",
    number: 43,
    position: "P",
  },
  {
    id: "nc-45-lee-yongchan",
    teamId: TEAM_IDS.NC,
    name: "이용찬",
    number: 45,
    position: "P",
  },
  {
    id: "nc-48-choi-wooseok",
    teamId: TEAM_IDS.NC,
    name: "최우석",
    number: 48,
    position: "P",
  },
  {
    id: "nc-54-kim-jinho",
    teamId: TEAM_IDS.NC,
    name: "김진호",
    number: 54,
    position: "P",
  },
  {
    id: "nc-57-jeon-samin",
    teamId: TEAM_IDS.NC,
    name: "전사민",
    number: 57,
    position: "P",
  },
  {
    id: "nc-59-gu-changmo",
    teamId: TEAM_IDS.NC,
    name: "구창모",
    number: 59,
    position: "P",
  },
  {
    id: "nc-61-bae-jaehwan",
    teamId: TEAM_IDS.NC,
    name: "배재환",
    number: 61,
    position: "P",
  },
  // 포수
  {
    id: "nc-1-ahn-jungyeol",
    teamId: TEAM_IDS.NC,
    name: "안중열",
    number: 1,
    position: "C",
  },
  {
    id: "nc-10-park-sehyeok",
    teamId: TEAM_IDS.NC,
    name: "박세혁",
    number: 10,
    position: "C",
  },
  {
    id: "nc-25-kim-hyeongjun",
    teamId: TEAM_IDS.NC,
    name: "김형준",
    number: 25,
    position: "C",
  },
  // 내야수
  {
    id: "nc-5-seo-hocheol",
    teamId: TEAM_IDS.NC,
    name: "서호철",
    number: 5,
    position: "IF",
  },
  {
    id: "nc-7-kim-juwon",
    teamId: TEAM_IDS.NC,
    name: "김주원",
    number: 7,
    position: "IF",
  },
  {
    id: "nc-14-choi-jeongwon",
    teamId: TEAM_IDS.NC,
    name: "최정원",
    number: 14,
    position: "IF",
  },
  {
    id: "nc-16-do-taehun",
    teamId: TEAM_IDS.NC,
    name: "도태훈",
    number: 16,
    position: "IF",
  },
  {
    id: "nc-24-davidson",
    teamId: TEAM_IDS.NC,
    name: "데이비슨",
    number: 24,
    position: "IF",
  },
  {
    id: "nc-34-oh-yeongsu",
    teamId: TEAM_IDS.NC,
    name: "오영수",
    number: 34,
    position: "IF",
  },
  {
    id: "nc-44-kim-hwijip",
    teamId: TEAM_IDS.NC,
    name: "김휘집",
    number: 44,
    position: "IF",
  },
  {
    id: "nc-68-kim-hanbyeol",
    teamId: TEAM_IDS.NC,
    name: "김한별",
    number: 68,
    position: "IF",
  },
  // 외야수
  {
    id: "nc-23-cheon-jaehwan",
    teamId: TEAM_IDS.NC,
    name: "천재환",
    number: 23,
    position: "OF",
  },
  {
    id: "nc-31-choi-wonjun",
    teamId: TEAM_IDS.NC,
    name: "최원준",
    number: 31,
    position: "OF",
  },
  {
    id: "nc-36-kwon-huidong",
    teamId: TEAM_IDS.NC,
    name: "권희동",
    number: 36,
    position: "OF",
  },
  {
    id: "nc-37-park-gunwoo",
    teamId: TEAM_IDS.NC,
    name: "박건우",
    number: 37,
    position: "OF",
  },
  {
    id: "nc-55-lee-useong",
    teamId: TEAM_IDS.NC,
    name: "이우성",
    number: 55,
    position: "OF",
  },
];

// -------------------------------------------------------
// KIA 타이거즈 선수 데이터 (제공 명단 기반)
// -------------------------------------------------------
const KIA_PLAYERS: PlayerRecord[] = [
  // 투수
  {
    id: "kia-6-lee-seongwon",
    teamId: TEAM_IDS.KIA,
    name: "이성원",
    number: 6,
    position: "P",
  },
  {
    id: "kia-10-kim-taehyeong",
    teamId: TEAM_IDS.KIA,
    name: "김태형",
    number: 10,
    position: "P",
  },
  {
    id: "kia-11-jo-sangwoo",
    teamId: TEAM_IDS.KIA,
    name: "조상우",
    number: 11,
    position: "P",
  },
  {
    id: "kia-20-lee-junyoung",
    teamId: TEAM_IDS.KIA,
    name: "이준영",
    number: 20,
    position: "P",
  },
  {
    id: "kia-25-han-jaeseung",
    teamId: TEAM_IDS.KIA,
    name: "한재승",
    number: 25,
    position: "P",
  },
  {
    id: "kia-32-kim-hyunsu",
    teamId: TEAM_IDS.KIA,
    name: "김현수",
    number: 32,
    position: "P",
  },
  {
    id: "kia-33-oller",
    teamId: TEAM_IDS.KIA,
    name: "올러",
    number: 33,
    position: "P",
  },
  {
    id: "kia-39-choi-jimin",
    teamId: TEAM_IDS.KIA,
    name: "최지민",
    number: 39,
    position: "P",
  },
  {
    id: "kia-40-nail",
    teamId: TEAM_IDS.KIA,
    name: "네일",
    number: 40,
    position: "P",
  },
  {
    id: "kia-48-lee-euiri",
    teamId: TEAM_IDS.KIA,
    name: "이의리",
    number: 48,
    position: "P",
  },
  {
    id: "kia-51-jeon-sanghyeon",
    teamId: TEAM_IDS.KIA,
    name: "전상현",
    number: 51,
    position: "P",
  },
  {
    id: "kia-53-kim-gihun",
    teamId: TEAM_IDS.KIA,
    name: "김기훈",
    number: 53,
    position: "P",
  },
  {
    id: "kia-54-yang-hyeonjong",
    teamId: TEAM_IDS.KIA,
    name: "양현종",
    number: 54,
    position: "P",
  },
  {
    id: "kia-62-jeong-haeyoung",
    teamId: TEAM_IDS.KIA,
    name: "정해영",
    number: 62,
    position: "P",
  },
  {
    id: "kia-63-lee-homin",
    teamId: TEAM_IDS.KIA,
    name: "이호민",
    number: 63,
    position: "P",
  },
  {
    id: "kia-65-seong-yeongtak",
    teamId: TEAM_IDS.KIA,
    name: "성영탁",
    number: 65,
    position: "P",
  },
  {
    id: "kia-66-lee-dohyun",
    teamId: TEAM_IDS.KIA,
    name: "이도현",
    number: 66,
    position: "P",
  },
  // 포수
  {
    id: "kia-26-han-seungtaek",
    teamId: TEAM_IDS.KIA,
    name: "한승택",
    number: 26,
    position: "C",
  },
  {
    id: "kia-42-kim-taegun",
    teamId: TEAM_IDS.KIA,
    name: "김태군",
    number: 42,
    position: "C",
  },
  {
    id: "kia-55-han-junsu",
    teamId: TEAM_IDS.KIA,
    name: "한준수",
    number: 55,
    position: "C",
  },
  // 내야수
  {
    id: "kia-1-park-chanho",
    teamId: TEAM_IDS.KIA,
    name: "박찬호",
    number: 1,
    position: "IF",
  },
  {
    id: "kia-2-park-min",
    teamId: TEAM_IDS.KIA,
    name: "박민",
    number: 2,
    position: "IF",
  },
  {
    id: "kia-3-kim-sunbin",
    teamId: TEAM_IDS.KIA,
    name: "김선빈",
    number: 3,
    position: "IF",
  },
  {
    id: "kia-9-yun-dohyun",
    teamId: TEAM_IDS.KIA,
    name: "윤도현",
    number: 9,
    position: "IF",
  },
  {
    id: "kia-14-kim-gyuseong",
    teamId: TEAM_IDS.KIA,
    name: "김규성",
    number: 14,
    position: "IF",
  },
  {
    id: "kia-45-wisdom",
    teamId: TEAM_IDS.KIA,
    name: "위즈덤",
    number: 45,
    position: "IF",
  },
  {
    id: "kia-56-oh-seonwoo",
    teamId: TEAM_IDS.KIA,
    name: "오선우",
    number: 56,
    position: "IF",
  },
  {
    id: "kia-64-jeong-haewon",
    teamId: TEAM_IDS.KIA,
    name: "정해원",
    number: 64,
    position: "IF",
  },
  // 외야수
  {
    id: "kia-27-kim-horyeong",
    teamId: TEAM_IDS.KIA,
    name: "김호령",
    number: 27,
    position: "OF",
  },
  {
    id: "kia-34-choi-hyungwoo",
    teamId: TEAM_IDS.KIA,
    name: "최형우",
    number: 34,
    position: "OF",
  },
  {
    id: "kia-35-kim-seokhwan",
    teamId: TEAM_IDS.KIA,
    name: "김석환",
    number: 35,
    position: "OF",
  },
  {
    id: "kia-36-park-jaehyun",
    teamId: TEAM_IDS.KIA,
    name: "박재현",
    number: 36,
    position: "OF",
  },
  {
    id: "kia-47-na-seongbeom",
    teamId: TEAM_IDS.KIA,
    name: "나성범",
    number: 47,
    position: "OF",
  },
];

// -------------------------------------------------------
// 키움 히어로즈 선수 데이터 (제공 명단 기반)
// -------------------------------------------------------
const KIWOOM_PLAYERS: PlayerRecord[] = [
  // 투수
  {
    id: "kiwoom-8-kim-seongmin",
    teamId: TEAM_IDS.KIWOOM,
    name: "김성민",
    number: 8,
    position: "P",
  },
  {
    id: "kiwoom-13-jeong-hyunwoo",
    teamId: TEAM_IDS.KIWOOM,
    name: "정현우",
    number: 13,
    position: "P",
  },
  {
    id: "kiwoom-20-jo-yeonggeon",
    teamId: TEAM_IDS.KIWOOM,
    name: "조영건",
    number: 20,
    position: "P",
  },
  {
    id: "kiwoom-31-oh-seokju",
    teamId: TEAM_IDS.KIWOOM,
    name: "오석주",
    number: 31,
    position: "P",
  },
  {
    id: "kiwoom-35-park-yunseong",
    teamId: TEAM_IDS.KIWOOM,
    name: "박윤성",
    number: 35,
    position: "P",
  },
  {
    id: "kiwoom-42-mercedes",
    teamId: TEAM_IDS.KIWOOM,
    name: "메르세데스",
    number: 42,
    position: "P",
  },
  {
    id: "kiwoom-46-won-jonghyun",
    teamId: TEAM_IDS.KIWOOM,
    name: "원종현",
    number: 46,
    position: "P",
  },
  {
    id: "kiwoom-49-kim-seongi",
    teamId: TEAM_IDS.KIWOOM,
    name: "김선기",
    number: 49,
    position: "P",
  },
  {
    id: "kiwoom-50-ha-yeongmin",
    teamId: TEAM_IDS.KIWOOM,
    name: "하영민",
    number: 50,
    position: "P",
  },
  {
    id: "kiwoom-54-alcantara",
    teamId: TEAM_IDS.KIWOOM,
    name: "알칸타라",
    number: 54,
    position: "P",
  },
  {
    id: "kiwoom-62-jeon-junpyo",
    teamId: TEAM_IDS.KIWOOM,
    name: "전준표",
    number: 62,
    position: "P",
  },
  {
    id: "kiwoom-94-park-jeonghun",
    teamId: TEAM_IDS.KIWOOM,
    name: "박정훈",
    number: 94,
    position: "P",
  },
  {
    id: "kiwoom-95-yun-seokwon",
    teamId: TEAM_IDS.KIWOOM,
    name: "윤석원",
    number: 95,
    position: "P",
  },
  {
    id: "kiwoom-99-kim-donggyu",
    teamId: TEAM_IDS.KIWOOM,
    name: "김동규",
    number: 99,
    position: "P",
  },
  // 포수
  {
    id: "kiwoom-12-kim-geonhui",
    teamId: TEAM_IDS.KIWOOM,
    name: "김건희",
    number: 12,
    position: "C",
  },
  {
    id: "kiwoom-47-kim-dongheon",
    teamId: TEAM_IDS.KIWOOM,
    name: "김동헌",
    number: 47,
    position: "C",
  },
  {
    id: "kiwoom-56-park-seongbin",
    teamId: TEAM_IDS.KIWOOM,
    name: "박성빈",
    number: 56,
    position: "C",
  },
  // 내야수
  {
    id: "kiwoom-1-kim-taejin",
    teamId: TEAM_IDS.KIWOOM,
    name: "김태진",
    number: 1,
    position: "IF",
  },
  {
    id: "kiwoom-24-song-seongmun",
    teamId: TEAM_IDS.KIWOOM,
    name: "송성문",
    number: 24,
    position: "IF",
  },
  {
    id: "kiwoom-39-yeom-seungwon",
    teamId: TEAM_IDS.KIWOOM,
    name: "염승원",
    number: 39,
    position: "IF",
  },
  {
    id: "kiwoom-53-choi-juhwan",
    teamId: TEAM_IDS.KIWOOM,
    name: "최주환",
    number: 53,
    position: "IF",
  },
  {
    id: "kiwoom-60-oh-seonjin",
    teamId: TEAM_IDS.KIWOOM,
    name: "오선진",
    number: 60,
    position: "IF",
  },
  {
    id: "kiwoom-71-kwon-hyukbin",
    teamId: TEAM_IDS.KIWOOM,
    name: "권혁빈",
    number: 71,
    position: "IF",
  },
  {
    id: "kiwoom-86-song-jihu",
    teamId: TEAM_IDS.KIWOOM,
    name: "송지후",
    number: 86,
    position: "IF",
  },
  {
    id: "kiwoom-92-eo-junseo",
    teamId: TEAM_IDS.KIWOOM,
    name: "어준서",
    number: 92,
    position: "IF",
  },
  {
    id: "kiwoom-93-yeo-donguk",
    teamId: TEAM_IDS.KIWOOM,
    name: "여동욱",
    number: 93,
    position: "IF",
  },
  {
    id: "kiwoom-97-jeon-taehyeon",
    teamId: TEAM_IDS.KIWOOM,
    name: "전태현",
    number: 97,
    position: "IF",
  },
  // 외야수
  {
    id: "kiwoom-2-lee-juhyeong",
    teamId: TEAM_IDS.KIWOOM,
    name: "이주형",
    number: 2,
    position: "OF",
  },
  {
    id: "kiwoom-14-park-sujong",
    teamId: TEAM_IDS.KIWOOM,
    name: "박수종",
    number: 14,
    position: "OF",
  },
  {
    id: "kiwoom-25-ju-seongwon",
    teamId: TEAM_IDS.KIWOOM,
    name: "주성원",
    number: 25,
    position: "OF",
  },
  {
    id: "kiwoom-29-im-jiyeol",
    teamId: TEAM_IDS.KIWOOM,
    name: "임지열",
    number: 29,
    position: "OF",
  },
  {
    id: "kiwoom-57-park-juhong",
    teamId: TEAM_IDS.KIWOOM,
    name: "박주홍",
    number: 57,
    position: "OF",
  },
];

// -------------------------------------------------------
// 팀별 선수 집합 매핑
// -------------------------------------------------------
export const TEAM_PLAYERS: Record<TeamId, PlayerRecord[]> = {
  [TEAM_IDS.DOOSAN]: DOOSAN_PLAYERS,
  [TEAM_IDS.LG]: LG_PLAYERS,
  [TEAM_IDS.SSG]: SSG_PLAYERS,
  [TEAM_IDS.KT]: KT_PLAYERS,
  [TEAM_IDS.SAMSUNG]: SAMSUNG_PLAYERS,
  [TEAM_IDS.LOTTE]: LOTTE_PLAYERS,
  [TEAM_IDS.NC]: NC_PLAYERS,
  [TEAM_IDS.KIA]: KIA_PLAYERS,
  [TEAM_IDS.KIWOOM]: KIWOOM_PLAYERS,
  [TEAM_IDS.HANWHA]: HANWHA_PLAYERS,
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
export function getPlayerByNumber(
  teamId: TeamId,
  number: number,
): PlayerRecord | undefined {
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
  } = {},
): PlayerRecord[] {
  const base = getPlayersByTeam(teamId);
  return base.filter((p) => {
    if (opts.numberEquals !== undefined && p.number !== opts.numberEquals)
      return false;
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
export function getPlayerById(
  teamId: TeamId,
  id: string,
): PlayerRecord | undefined {
  return getPlayersByTeam(teamId).find((p) => p.id === id);
}

/**
 * (선택) 로컬 데이터 최신성 체크용 타임스탬프
 * - API / DB 전환 시 ETag 또는 updatedAt 비교에 활용 가능
 */
export const TEAM_PLAYERS_VERSION = "2024-08-26T00:00:00Z";

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

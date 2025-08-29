
/**
 * 팀별 커스텀 색상 시스템
 *
 * 이 파일은 팀별로 고유한 색상을 정의하고, 다크모드/라이트모드를 지원합니다.
 * 기존의 복잡한 palette 객체는 제거하고, 필요한 기본 색상만 유지합니다.
 */

// 기본 색상 상수들 (필요한 경우에만 사용)
export const defaultColors = {
  // 기본 색상
  text: "#655A35",
  textDim: "#938A6F",
  background: "#FDFBF6",
  card: "#FDFBF6",
  border: "#D9D3C6",
  tint: "#0EA5E9",
  tintInactive: "#D9D3C6",
  separator: "#F0ECE3",
  error: "#DC2626",
  errorBackground: "#FEE2E2",
  success: "#22C55E",
  warning: "#EF4444",
  energy: "#F87171",
  accent: "#10B981",
  neon: "#4ADE80",
  backgroundAlt: "#F0ECE3",
  backgroundDim: "#D9D3C6",
  shadowLight: "rgba(15, 23, 42, 0.05)",
  shadowMedium: "rgba(15, 23, 42, 0.1)",
  transparent: "rgba(0, 0, 0, 0)",
} as const;

/**
 * 팀별 커스텀 색상 정의
 * 다크모드와 라이트모드를 구분하여 정의
 */
export const teamColors = {
  // 두산 베어스
  doosan: {
    light: {
      // 유니폼 배경색
      uniformBackground: "#FFFFFF", // 흰색 유니폼
      // 유니폼 글씨색
      uniformText: "#000036", // 진한 파란색

      // 유니폼 데코레이션 색상
      uniformDecoration: "#3B82F6", // 파란색
      // 액션 버튼 색상 (좋아요, 댓글, 즐겨찾기 통일)
      actionButtonActive: "#FF1620", // 빨간색 (활성 상태)
      actionButtonInactive: "#FF1620", // 회색 (비활성 상태)
      // 좋아요 배경색
      likeBackground: "#000036", // 연한 파란색
      // PostActions 배경색 (액션 바 배경)
      postActionsBackground: "#000036", // 연한 회색
      // 팀 메인 컬러
      mainColor: "#1E3A8A", // 진한 파란색
      // 팀 서브 컬러
      subColor: "#3B82F6", // 파란색
      // 팀 액센트 컬러
      accent: "#EF4444", // 빨간색
      // 장식용 보더 (DoosanStripes 등)
      decorationBorder: "#000000",
      // 카드 테두리 (PostCard 등)
      cardBorder: "#000036",
      // 프로필 텍스트 색상
      profileText: "#000036", // 진한 파란색
      profileTime: "#6B7280", // 회색
      profileStroke: "#FFFFFF", // 흰색 테두리
      // 유니폼 번호 색상
      uniformNumberText: "#000036",
      uniformNumberStroke: "#FF1620",
    },
    dark: {
      // 유니폼 배경색
      uniformBackground: "#000036", // 어두운 회색
      // 유니폼 글씨색
      uniformText: "#FFFFFF", // 밝은 파란색
      // 유니폼 숫자색
      uniformNumber: "#FFFFFF", // 밝은 파란색
      // 유니폼 데코레이션 색상
      uniformDecoration: "#93C5FD", // 연한 파란색
      // 액션 버튼 색상 (좋아요, 댓글, 즐겨찾기 통일)
      actionButtonActive: "#F87171", // 밝은 빨간색 (활성 상태)
      actionButtonInactive: "#9CA3AF", // 밝은 회색 (비활성 상태)
      // 좋아요 배경색
      likeBackground: "#1E3A8A", // 어두운 파란색
      // PostActions 배경색 (액션 바 배경)
      postActionsBackground: "#000000", // 어두운 회색
      // 팀 메인 컬러
      mainColor: "#60A5FA", // 밝은 파란색
      // 팀 서브 컬러
      subColor: "#93C5FD", // 연한 파란색
      // 팀 액센트 컬러
      accent: "#F87171", // 밝은 빨간색
      // 장식용 보더 (DoosanStripes 등)
      decorationBorder: "#FFFFFF", // 어두운 회색
      // 카드 테두리 (PostCard 등)
      cardBorder: "#4B5563", // 중간 회색
      // 프로필 텍스트 색상
      profileText: "#60A5FA", // 밝은 파란색
      profileTime: "#9CA3AF", // 밝은 회색
      profileStroke: "#1F2937", // 어두운 회색 테두리
      // 유니폼 번호 색상
      uniformNumberText: "#FFFFFF", // 밝은 파란색
      uniformNumberStroke: "#FF1620",
    },
  },
  // 삼성 라이온즈
  samsung: {
    light: {
      // 유니폼 배경색
      uniformBackground: "#FFFFFF", // 흰색 유니폼
      // 유니폼 글씨색
      uniformText: "#074CA1", //
      // 유니폼 데코레이션 색상
      uniformDecoration: "#EF4444", //
      // 액션 버튼 색상 (좋아요, 댓글, 즐겨찾기 통일)
      actionButtonActive: "#848484",
      actionButtonInactive: "#848484",
      // 좋아요 배경색
      likeBackground: "#FEF2F2", // 연한 빨간색
      // PostActions 배경색 (액션 바 배경)
      postActionsBackground: "#074CA1",
      // 팀 메인 컬러
      mainColor: "#DC2626", // 진한 빨간색
      // 팀 서브 컬러
      subColor: "#EF4444", // 빨간색
      // 팀 액센트 컬러
      accent: "#1E3A8A", // 진한 파란색
      // 장식용 보더 (DoosanStripes 등)
      decorationBorder: "#E5E7EB", // 연한 회색
      // 카드 테두리 (PostCard 등)
      cardBorder: "#D1D5DB", // 중간 회색
      // 프로필 텍스트 색상
      profileText: "#074CA1", // 진한 빨간색
      profileTime: "#074CA1", // 회색
      profileStroke: "#FFFFFF", // 흰색 테두리
      // 유니폼 번호 색상
      uniformNumberText: "#074CA1", // 파란색
      uniformNumberStroke: "#074CA1", // 파란색
    },
    dark: {
      // 유니폼 배경색
      uniformBackground: "#09233F", // 어두운 회색
      // 유니폼 글씨색
      uniformText: "#F87171", // 밝은 빨간색
      // 유니폼 데코레이션 색상
      uniformDecoration: "#FCA5A5", // 연한 빨간색
      // 액션 버튼 색상 (좋아요, 댓글, 즐겨찾기 통일)
      actionButtonActive: "#F87171", // 밝은 빨간색 (활성 상태)
      actionButtonInactive: "#9CA3AF", // 밝은 회색 (비활성 상태)
      // 좋아요 배경색
      likeBackground: "#991B1B", // 어두운 빨간색
      // PostActions 배경색 (액션 바 배경)
      postActionsBackground: "#1F2937", // 어두운 회색
      // 팀 메인 컬러
      mainColor: "#F87171", // 밝은 빨간색
      // 팀 서브 컬러
      subColor: "#FCA5A5", // 연한 빨간색
      // 팀 액센트 컬러
      accent: "#60A5FA", // 밝은 파란색
      // 장식용 보더 (DoosanStripes 등)
      decorationBorder: "#374151", // 어두운 회색
      // 카드 테두리 (PostCard 등)
      cardBorder: "#4B5563", // 중간 회색
      // 프로필 텍스트 색상
      profileText: "#F87171", // 밝은 빨간색
      profileTime: "#9CA3AF", // 밝은 회색
      profileStroke: "#1F2937", // 어두운 회색 테두리
      // 유니폼 번호 색상
      uniformNumberText: "#F87171", // 밝은 빨간색
      uniformNumberStroke: "#374151", // 어두운 회색 테두리
    },
  },
  // 한화 이글스
  hanwha: {
    light: {
      // 유니폼 배경색
      uniformBackground: "#FFFFFF", // 흰색 유니폼
      // 유니폼 글씨색
      uniformText: "#00204B", // 네이비
      // 유니폼 데코레이션 색상
      uniformDecoration: "#ED1C24", // 빨간색
      // 액션 버튼 색상
      actionButtonActive: "#ED1C24", // 빨간색
      actionButtonInactive: "#00204B", // 네이비
      // 좋아요 배경색
      likeBackground: "#FEF2F2", // 연한 빨간색
      // PostActions 배경색
      postActionsBackground: "#00204B", // 네이비
      // 팀 메인 컬러
      mainColor: "#00204B", // 네이비
      // 팀 서브 컬러
      subColor: "#ED1C24", // 빨간색
      // 팀 액센트 컬러
      accent: "#FF6B35", // 오렌지
      // 장식용 보더
      decorationBorder: "#00204B",
      // 카드 테두리
      cardBorder: "#00204B",
      // 프로필 텍스트 색상
      profileText: "#00204B",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
      // 유니폼 번호 색상
      uniformNumberText: "#00204B",
      uniformNumberStroke: "#ED1C24",
    },
    dark: {
      // 유니폼 배경색
      uniformBackground: "#00132E", // 어두운 네이비
      // 유니폼 글씨색
      uniformText: "#FFFFFF", // 흰색
      // 유니폼 데코레이션 색상
      uniformDecoration: "#8C1218", // 어두운 빨간색
      // 액션 버튼 색상
      actionButtonActive: "#8C1218", // 어두운 빨간색
      actionButtonInactive: "#9CA3AF", // 회색
      // 좋아요 배경색
      likeBackground: "#991B1B", // 어두운 빨간색
      // PostActions 배경색
      postActionsBackground: "#000000", // 검정
      // 팀 메인 컬러
      mainColor: "#00204B", // 네이비
      // 팀 서브 컬러
      subColor: "#8C1218", // 어두운 빨간색
      // 팀 액센트 컬러
      accent: "#FF6B35", // 오렌지
      // 장식용 보더
      decorationBorder: "#FFFFFF",
      // 카드 테두리
      cardBorder: "#4B5563",
      // 프로필 텍스트 색상
      profileText: "#FFFFFF",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
      // 유니폼 번호 색상
      uniformNumberText: "#FFFFFF",
      uniformNumberStroke: "#8C1218",
    },
  },
  // 기아 타이거즈
  kia: {
    light: {
      // 유니폼 배경색
      uniformBackground: "#FFFFFF", // 흰색 유니폼
      // 유니폼 글씨색
      uniformText: "#EA0029", // 빨간색
      // 유니폼 데코레이션 색상
      uniformDecoration: "#000000", // 검정
      // 액션 버튼 색상
      actionButtonActive: "#EA0029", // 빨간색
      actionButtonInactive: "#000000", // 검정
      // 좋아요 배경색
      likeBackground: "#FEF2F2", // 연한 빨간색
      // PostActions 배경색
      postActionsBackground: "#000000", // 검정
      // 팀 메인 컬러
      mainColor: "#EA0029", // 빨간색
      // 팀 서브 컬러
      subColor: "#000000", // 검정
      // 팀 액센트 컬러
      accent: "#FFC107", // 노란색 (호랑이 액센트)
      // 장식용 보더
      decorationBorder: "#EA0029",
      // 카드 테두리
      cardBorder: "#EA0029",
      // 프로필 텍스트 색상
      profileText: "#EA0029",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
      // 유니폼 번호 색상
      uniformNumberText: "#EA0029",
      uniformNumberStroke: "#000000",
    },
    dark: {
      // 유니폼 배경색
      uniformBackground: "#1A1A1A", // 어두운 회색
      // 유니폼 글씨색
      uniformText: "#CC0022", // 어두운 빨간색
      // 유니폼 데코레이션 색상
      uniformDecoration: "#FFFFFF", // 흰색
      // 액션 버튼 색상
      actionButtonActive: "#CC0022", // 어두운 빨간색
      actionButtonInactive: "#9CA3AF", // 회색
      // 좋아요 배경색
      likeBackground: "#991B1B", // 어두운 빨간색
      // PostActions 배경색
      postActionsBackground: "#000000", // 검정
      // 팀 메인 컬러
      mainColor: "#CC0022", // 어두운 빨간색
      // 팀 서브 컬러
      subColor: "#1A1A1A", // 어두운 회색
      // 팀 액센트 컬러
      accent: "#FFC107", // 노란색
      // 장식용 보더
      decorationBorder: "#CC0022",
      // 카드 테두리
      cardBorder: "#4B5563",
      // 프로필 텍스트 색상
      profileText: "#CC0022",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
      // 유니폼 번호 색상
      uniformNumberText: "#CC0022",
      uniformNumberStroke: "#FFFFFF",
    },
  },
  // SSG 랜더스
  ssg: {
    light: {
      // 유니폼 배경색
      uniformBackground: "#FFFFFF", // 흰색 유니폼
      // 유니폼 글씨색
      uniformText: "#CE0E2D", // 빨간색
      // 유니폼 데코레이션 색상
      uniformDecoration: "#041E42", // 네이비
      // 액션 버튼 색상
      actionButtonActive: "#CE0E2D", // 빨간색
      actionButtonInactive: "#041E42", // 네이비
      // 좋아요 배경색
      likeBackground: "#FEF2F2", // 연한 빨간색
      // PostActions 배경색
      postActionsBackground: "#041E42", // 네이비
      // 팀 메인 컬러
      mainColor: "#CE0E2D", // 빨간색
      // 팀 서브 컬러
      subColor: "#041E42", // 네이비
      // 팀 액센트 컬러
      accent: "#FFD700", // 골드
      // 장식용 보더
      decorationBorder: "#CE0E2D",
      // 카드 테두리
      cardBorder: "#CE0E2D",
      // 프로필 텍스트 색상
      profileText: "#CE0E2D",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
      // 유니폼 번호 색상
      uniformNumberText: "#CE0E2D",
      uniformNumberStroke: "#041E42",
    },
    dark: {
      // 유니폼 배경색
      uniformBackground: "#031A38", // 어두운 네이비
      // 유니폼 글씨색
      uniformText: "#B50C28", // 어두운 빨간색
      // 유니폼 데코레이션 색상
      uniformDecoration: "#FFFFFF", // 흰색
      // 액션 버튼 색상
      actionButtonActive: "#B50C28", // 어두운 빨간색
      actionButtonInactive: "#9CA3AF", // 회색
      // 좋아요 배경색
      likeBackground: "#991B1B", // 어두운 빨간색
      // PostActions 배경색
      postActionsBackground: "#000000", // 검정
      // 팀 메인 컬러
      mainColor: "#B50C28", // 어두운 빨간색
      // 팀 서브 컬러
      subColor: "#031A38", // 어두운 네이비
      // 팀 액센트 컬러
      accent: "#FFD700", // 골드
      // 장식용 보더
      decorationBorder: "#B50C28",
      // 카드 테두리
      cardBorder: "#4B5563",
      // 프로필 텍스트 색상
      profileText: "#B50C28",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
      // 유니폼 번호 색상
      uniformNumberText: "#B50C28",
      uniformNumberStroke: "#FFFFFF",
    },
  },
  // LG 트윈스
  lg: {
    light: {
      // 유니폼 배경색
      uniformBackground: "#FFFFFF", // 흰색 유니폼
      // 유니폼 글씨색
      uniformText: "#C4003C", // 빨간색
      // 유니폼 데코레이션 색상
      uniformDecoration: "#000000", // 검정 (스트라이프)
      // 액션 버튼 색상
      actionButtonActive: "#C4003C", // 빨간색
      actionButtonInactive: "#000000", // 검정
      // 좋아요 배경색
      likeBackground: "#FEF2F2", // 연한 빨간색
      // PostActions 배경색
      postActionsBackground: "#000000", // 검정
      // 팀 메인 컬러
      mainColor: "#C4003C", // 빨간색
      // 팀 서브 컬러
      subColor: "#000000", // 검정
      // 팀 액센트 컬러
      accent: "#87CEEB", // 스카이블루
      // 장식용 보더 (스트라이프용)
      decorationBorder: "#000000",
      // 카드 테두리
      cardBorder: "#C4003C",
      // 프로필 텍스트 색상
      profileText: "#C4003C",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
      // 유니폼 번호 색상
      uniformNumberText: "#C4003C",
      uniformNumberStroke: "#000000",
    },
    dark: {
      // 유니폼 배경색
      uniformBackground: "#1A1A1A", // 어두운 회색
      // 유니폼 글씨색
      uniformText: "#A8002F", // 어두운 빨간색
      // 유니폼 데코레이션 색상
      uniformDecoration: "#FFFFFF", // 흰색 (스트라이프)
      // 액션 버튼 색상
      actionButtonActive: "#A8002F", // 어두운 빨간색
      actionButtonInactive: "#9CA3AF", // 회색
      // 좋아요 배경색
      likeBackground: "#991B1B", // 어두운 빨간색
      // PostActions 배경색
      postActionsBackground: "#000000", // 검정
      // 팀 메인 컬러
      mainColor: "#A8002F", // 어두운 빨간색
      // 팀 서브 컬러
      subColor: "#1A1A1A", // 어두운 회색
      // 팀 액센트 컬러
      accent: "#87CEEB", // 스카이블루
      // 장식용 보더 (스트라이프용)
      decorationBorder: "#FFFFFF",
      // 카드 테두리
      cardBorder: "#4B5563",
      // 프로필 텍스트 색상
      profileText: "#A8002F",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
      // 유니폼 번호 색상
      uniformNumberText: "#A8002F",
      uniformNumberStroke: "#FFFFFF",
    },
  },
  // 롯데 자이언츠
  lotte: {
    light: {
      // 유니폼 배경색
      uniformBackground: "#FFFFFF", // 흰색 유니폼
      // 유니폼 글씨색
      uniformText: "#002E5F", // 네이비
      // 유니폼 데코레이션 색상
      uniformDecoration: "#CE0E2D", // 빨간색
      // 액션 버튼 색상
      actionButtonActive: "#CE0E2D", // 빨간색
      actionButtonInactive: "#002E5F", // 네이비
      // 좋아요 배경색
      likeBackground: "#FEF2F2", // 연한 빨간색
      // PostActions 배경색
      postActionsBackground: "#002E5F", // 네이비
      // 팀 메인 컬러
      mainColor: "#002E5F", // 네이비
      // 팀 서브 컬러
      subColor: "#CE0E2D", // 빨간색
      // 팀 액센트 컬러
      accent: "#FFD700", // 골드
      // 장식용 보더
      decorationBorder: "#002E5F",
      // 카드 테두리
      cardBorder: "#002E5F",
      // 프로필 텍스트 색상
      profileText: "#002E5F",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
      // 유니폼 번호 색상
      uniformNumberText: "#002E5F",
      uniformNumberStroke: "#CE0E2D",
    },
    dark: {
      // 유니폼 배경색
      uniformBackground: "#001A3D", // 어두운 네이비
      // 유니폼 글씨색
      uniformText: "#B50C28", // 어두운 빨간색
      // 유니폼 데코레이션 색상
      uniformDecoration: "#FFFFFF", // 흰색
      // 액션 버튼 색상
      actionButtonActive: "#B50C28", // 어두운 빨간색
      actionButtonInactive: "#9CA3AF", // 회색
      // 좋아요 배경색
      likeBackground: "#991B1B", // 어두운 빨간색
      // PostActions 배경색
      postActionsBackground: "#000000", // 검정
      // 팀 메인 컬러
      mainColor: "#001A3D", // 어두운 네이비
      // 팀 서브 컬러
      subColor: "#B50C28", // 어두운 빨간색
      // 팀 액센트 컬러
      accent: "#FFD700", // 골드
      // 장식용 보더
      decorationBorder: "#FFFFFF",
      // 카드 테두리
      cardBorder: "#4B5563",
      // 프로필 텍스트 색상
      profileText: "#B50C28",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
      // 유니폼 번호 색상
      uniformNumberText: "#B50C28",
      uniformNumberStroke: "#FFFFFF",
    },
  },
  // NC 다이노스
  nc: {
    light: {
      // 유니폼 배경색
      uniformBackground: "#FFFFFF", // 흰색 유니폼
      // 유니폼 글씨색
      uniformText: "#315288", // 블루
      // 유니폼 데코레이션 색상
      uniformDecoration: "#C4A484", // 베이지
      // 액션 버튼 색상
      actionButtonActive: "#315288", // 블루
      actionButtonInactive: "#C4A484", // 베이지
      // 좋아요 배경색
      likeBackground: "#EBF5FF", // 연한 블루
      // PostActions 배경색
      postActionsBackground: "#315288", // 블루
      // 팀 메인 컬러
      mainColor: "#315288", // 블루
      // 팀 서브 컬러
      subColor: "#C4A484", // 베이지
      // 팀 액센트 컬러
      accent: "#FF6B35", // 오렌지
      // 장식용 보더
      decorationBorder: "#315288",
      // 카드 테두리
      cardBorder: "#315288",
      // 프로필 텍스트 색상
      profileText: "#315288",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
      // 유니폼 번호 색상
      uniformNumberText: "#315288",
      uniformNumberStroke: "#C4A484",
    },
    dark: {
      // 유니폼 배경색
      uniformBackground: "#253F6C", // 어두운 블루
      // 유니폼 글씨색
      uniformText: "#8B7355", // 어두운 베이지
      // 유니폼 데코레이션 색상
      uniformDecoration: "#FFFFFF", // 흰색
      // 액션 버튼 색상
      actionButtonActive: "#8B7355", // 어두운 베이지
      actionButtonInactive: "#9CA3AF", // 회색
      // 좋아요 배경색
      likeBackground: "#1E3A8A", // 어두운 블루
      // PostActions 배경색
      postActionsBackground: "#000000", // 검정
      // 팀 메인 컬러
      mainColor: "#253F6C", // 어두운 블루
      // 팀 서브 컬러
      subColor: "#8B7355", // 어두운 베이지
      // 팀 액센트 컬러
      accent: "#FF6B35", // 오렌지
      // 장식용 보더
      decorationBorder: "#FFFFFF",
      // 카드 테두리
      cardBorder: "#4B5563",
      // 프로필 텍스트 색상
      profileText: "#8B7355",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
      // 유니폼 번호 색상
      uniformNumberText: "#8B7355",
      uniformNumberStroke: "#FFFFFF",
    },
  },
  // KT 위즈
  kt: {
    light: {
      // 유니폼 배경색
      uniformBackground: "#FFFFFF", // 흰색 유니폼
      // 유니폼 글씨색
      uniformText: "#000000", // 검정
      // 유니폼 데코레이션 색상
      uniformDecoration: "#FF6600", // 오렌지
      // 액션 버튼 색상
      actionButtonActive: "#FF6600", // 오렌지
      actionButtonInactive: "#000000", // 검정
      // 좋아요 배경색
      likeBackground: "#FFF3E0", // 연한 오렌지
      // PostActions 배경색
      postActionsBackground: "#000000", // 검정
      // 팀 메인 컬러
      mainColor: "#000000", // 검정
      // 팀 서브 컬러
      subColor: "#FF6600", // 오렌지
      // 팀 액센트 컬러
      accent: "#9C27B0", // 보라 (위즈 마법사 테마)
      // 장식용 보더
      decorationBorder: "#000000",
      // 카드 테두리
      cardBorder: "#000000",
      // 프로필 텍스트 색상
      profileText: "#000000",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
      // 유니폼 번호 색상
      uniformNumberText: "#000000",
      uniformNumberStroke: "#FF6600",
    },
    dark: {
      // 유니폼 배경색
      uniformBackground: "#1A1A1A", // 어두운 회색
      // 유니폼 글씨색
      uniformText: "#E55A00", // 어두운 오렌지
      // 유니폼 데코레이션 색상
      uniformDecoration: "#FFFFFF", // 흰색
      // 액션 버튼 색상
      actionButtonActive: "#E55A00", // 어두운 오렌지
      actionButtonInactive: "#9CA3AF", // 회색
      // 좋아요 배경색
      likeBackground: "#EA580C", // 어두운 오렌지
      // PostActions 배경색
      postActionsBackground: "#000000", // 검정
      // 팀 메인 컬러
      mainColor: "#1A1A1A", // 어두운 회색
      // 팀 서브 컬러
      subColor: "#E55A00", // 어두운 오렌지
      // 팀 액센트 컬러
      accent: "#9C27B0", // 보라
      // 장식용 보더
      decorationBorder: "#FFFFFF",
      // 카드 테두리
      cardBorder: "#4B5563",
      // 프로필 텍스트 색상
      profileText: "#E55A00",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
      // 유니폼 번호 색상
      uniformNumberText: "#E55A00",
      uniformNumberStroke: "#FFFFFF",
    },
  },
  // 키움 히어로즈
  kiwoom: {
    light: {
      // 유니폼 배경색
      uniformBackground: "#FFFFFF", // 흰색 유니폼
      // 유니폼 글씨색
      uniformText: "#570514", // 버건디
      // 유니폼 데코레이션 색상
      uniformDecoration: "#C4A484", // 베이지
      // 액션 버튼 색상
      actionButtonActive: "#570514", // 버건디
      actionButtonInactive: "#C4A484", // 베이지
      // 좋아요 배경색
      likeBackground: "#FDF2F8", // 연한 핑크
      // PostActions 배경색
      postActionsBackground: "#570514", // 버건디
      // 팀 메인 컬러
      mainColor: "#570514", // 버건디
      // 팀 서브 컬러
      subColor: "#C4A484", // 베이지
      // 팀 액센트 컬러
      accent: "#10B981", // 그린 (히어로 테마)
      // 장식용 보더
      decorationBorder: "#570514",
      // 카드 테두리
      cardBorder: "#570514",
      // 프로필 텍스트 색상
      profileText: "#570514",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
      // 유니폼 번호 색상
      uniformNumberText: "#570514",
      uniformNumberStroke: "#C4A484",
    },
    dark: {
      // 유니폼 배경색
      uniformBackground: "#3D030E", // 어두운 버건디
      // 유니폼 글씨색
      uniformText: "#8B7355", // 어두운 베이지
      // 유니폼 데코레이션 색상
      uniformDecoration: "#FFFFFF", // 흰색
      // 액션 버튼 색상
      actionButtonActive: "#8B7355", // 어두운 베이지
      actionButtonInactive: "#9CA3AF", // 회색
      // 좋아요 배경색
      likeBackground: "#881337", // 어두운 핑크
      // PostActions 배경색
      postActionsBackground: "#000000", // 검정
      // 팀 메인 컬러
      mainColor: "#3D030E", // 어두운 버건디
      // 팀 서브 컬러
      subColor: "#8B7355", // 어두운 베이지
      // 팀 액센트 컬러
      accent: "#10B981", // 그린
      // 장식용 보더
      decorationBorder: "#FFFFFF",
      // 카드 테두리
      cardBorder: "#4B5563",
      // 프로필 텍스트 색상
      profileText: "#8B7355",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
      // 유니폼 번호 색상
      uniformNumberText: "#8B7355",
      uniformNumberStroke: "#FFFFFF",
    },
  },
} as const;

/**
 * 팀 ID 또는 팀 이름으로 색상을 가져오는 헬퍼 함수
 */
export const getTeamColors = (teamId: string, isDarkMode: boolean = false, teamName?: string) => {
  const mode = isDarkMode ? 'dark' : 'light';

  // 디버깅을 위한 로그 (개발 환경에서만)
  if (__DEV__) {
    console.log('getTeamColors 호출:', { teamId, teamName, isDarkMode, mode });
  }

  // 팀 ID와 팀 이름을 모두 확인하여 매칭
  const teamKey = teamId.toLowerCase();
  const teamNameKey = teamName?.toLowerCase();

  // 두산 팀 매칭 (ID 또는 이름으로)
  if (teamKey === 'doosan' || teamKey === '두산' ||
      teamNameKey === 'doosan' || teamNameKey === '두산' ||
      teamNameKey === '두산 베어스' || teamNameKey === 'doosan bears' ||
      teamNameKey?.includes('두산') || teamNameKey?.includes('doosan')) {
    if (__DEV__) console.log('두산 팀 색상 매칭 성공');
    return teamColors.doosan[mode];
  }

  // 삼성 팀 매칭 (ID 또는 이름으로)
  if (teamKey === 'samsung' || teamKey === '삼성' ||
      teamNameKey === 'samsung' || teamNameKey === '삼성' ||
      teamNameKey === '삼성 라이온즈' || teamNameKey === 'samsung lions' ||
      teamNameKey?.includes('삼성') || teamNameKey?.includes('samsung')) {
    if (__DEV__) console.log('삼성 팀 색상 매칭 성공');
    return teamColors.samsung[mode];
  }

  // 한화 팀 매칭 (ID 또는 이름으로)
  if (teamKey === 'hanwha' || teamKey === '한화' ||
      teamNameKey === 'hanwha' || teamNameKey === '한화' ||
      teamNameKey === '한화 이글스' || teamNameKey === 'hanwha eagles' ||
      teamNameKey?.includes('한화') || teamNameKey?.includes('hanwha')) {
    if (__DEV__) console.log('한화 팀 색상 매칭 성공');
    return teamColors.hanwha[mode];
  }

  // 기아 팀 매칭 (ID 또는 이름으로)
  if (teamKey === 'kia' || teamKey === '기아' ||
      teamNameKey === 'kia' || teamNameKey === '기아' ||
      teamNameKey === '기아 타이거즈' || teamNameKey === 'kia tigers' ||
      teamNameKey?.includes('기아') || teamNameKey?.includes('kia')) {
    if (__DEV__) console.log('기아 팀 색상 매칭 성공');
    return teamColors.kia[mode];
  }

  // SSG 팀 매칭 (ID 또는 이름으로)
  if (teamKey === 'ssg' || teamKey === 'ssg랜더스' ||
      teamNameKey === 'ssg' || teamNameKey === 'ssg랜더스' ||
      teamNameKey === 'ssg 랜더스' || teamNameKey === 'ssg landers' ||
      teamNameKey?.includes('ssg') || teamNameKey?.includes('랜더스') || teamNameKey?.includes('landers')) {
    if (__DEV__) console.log('SSG 팀 색상 매칭 성공');
    return teamColors.ssg[mode];
  }

  // LG 팀 매칭 (ID 또는 이름으로)
  if (teamKey === 'lg' || teamKey === 'lg트윈스' ||
      teamNameKey === 'lg' || teamNameKey === 'lg트윈스' ||
      teamNameKey === 'lg 트윈스' || teamNameKey === 'lg twins' ||
      teamNameKey?.includes('lg') || teamNameKey?.includes('트윈스') || teamNameKey?.includes('twins')) {
    if (__DEV__) console.log('LG 팀 색상 매칭 성공');
    return teamColors.lg[mode];
  }

  // 롯데 팀 매칭 (ID 또는 이름으로)
  if (teamKey === 'lotte' || teamKey === '롯데' ||
      teamNameKey === 'lotte' || teamNameKey === '롯데' ||
      teamNameKey === '롯데 자이언츠' || teamNameKey === 'lotte giants' ||
      teamNameKey?.includes('롯데') || teamNameKey?.includes('lotte') || teamNameKey?.includes('giants')) {
    if (__DEV__) console.log('롯데 팀 색상 매칭 성공');
    return teamColors.lotte[mode];
  }

  // NC 팀 매칭 (ID 또는 이름으로)
  if (teamKey === 'nc' || teamKey === 'nc다이노스' ||
      teamNameKey === 'nc' || teamNameKey === 'nc다이노스' ||
      teamNameKey === 'nc 다이노스' || teamNameKey === 'nc dinos' ||
      teamNameKey?.includes('nc') || teamNameKey?.includes('다이노스') || teamNameKey?.includes('dinos')) {
    if (__DEV__) console.log('NC 팀 색상 매칭 성공');
    return teamColors.nc[mode];
  }

  // KT 팀 매칭 (ID 또는 이름으로)
  if (teamKey === 'kt' || teamKey === 'kt위즈' ||
      teamNameKey === 'kt' || teamNameKey === 'kt위즈' ||
      teamNameKey === 'kt 위즈' || teamNameKey === 'kt wiz' ||
      teamNameKey?.includes('kt') || teamNameKey?.includes('위즈') || teamNameKey?.includes('wiz')) {
    if (__DEV__) console.log('KT 팀 색상 매칭 성공');
    return teamColors.kt[mode];
  }

  // 키움 팀 매칭 (ID 또는 이름으로)
  if (teamKey === 'kiwoom' || teamKey === '키움' ||
      teamNameKey === 'kiwoom' || teamNameKey === '키움' ||
      teamNameKey === '키움 히어로즈' || teamNameKey === 'kiwoom heroes' ||
      teamNameKey?.includes('키움') || teamNameKey?.includes('kiwoom') || teamNameKey?.includes('heroes')) {
    if (__DEV__) console.log('키움 팀 색상 매칭 성공');
    return teamColors.kiwoom[mode];
  }

  // 매칭되지 않는 경우 기본 색상 반환
  if (__DEV__) {
    console.log('팀 색상 매칭 실패, 기본 색상 사용:', { teamKey, teamNameKey });
  }

  return {
    uniformBackground: isDarkMode ? defaultColors.backgroundDim : defaultColors.background,
    uniformText: isDarkMode ? defaultColors.text : defaultColors.text,
    uniformDecoration: defaultColors.accent,
    actionButtonActive: defaultColors.error,
    actionButtonInactive: isDarkMode ? defaultColors.textDim : defaultColors.textDim,
    likeBackground: isDarkMode ? defaultColors.backgroundDim : defaultColors.backgroundAlt,
    postActionsBackground: isDarkMode ? defaultColors.backgroundDim : defaultColors.backgroundAlt,
    mainColor: defaultColors.tint,
    subColor: defaultColors.accent,
    accent: defaultColors.energy,
    // 장식용 보더 (DoosanStripes 등)
    decorationBorder: defaultColors.border,
    // 카드 테두리 (PostCard 등)
    cardBorder: defaultColors.border,
    // 프로필 텍스트 색상 (기본값)
    profileText: isDarkMode ? defaultColors.text : defaultColors.text,
    profileTime: isDarkMode ? defaultColors.textDim : defaultColors.textDim,
    profileStroke: isDarkMode ? defaultColors.backgroundDim : defaultColors.background,
    // 유니폼 번호 색상 (기본값)
    uniformNumberText: isDarkMode ? defaultColors.text : defaultColors.text,
    uniformNumberStroke: isDarkMode ? defaultColors.backgroundDim : defaultColors.background,
  };
};

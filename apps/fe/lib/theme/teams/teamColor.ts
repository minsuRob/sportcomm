
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
      // 유니폼 숫자색
      uniformNumber: "#FF1620", // 빨강색
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
      // 아디다스 삼선
      border: "#000000", // 연한 회색
    },
    dark: {
      // 유니폼 배경색
      uniformBackground: "#1F2937", // 어두운 회색
      // 유니폼 글씨색
      uniformText: "#60A5FA", // 밝은 파란색
      // 유니폼 숫자색
      uniformNumber: "#60A5FA", // 밝은 파란색
      // 유니폼 데코레이션 색상
      uniformDecoration: "#93C5FD", // 연한 파란색
      // 액션 버튼 색상 (좋아요, 댓글, 즐겨찾기 통일)
      actionButtonActive: "#F87171", // 밝은 빨간색 (활성 상태)
      actionButtonInactive: "#9CA3AF", // 밝은 회색 (비활성 상태)
      // 좋아요 배경색
      likeBackground: "#1E3A8A", // 어두운 파란색
      // PostActions 배경색 (액션 바 배경)
      postActionsBackground: "#1F2937", // 어두운 회색
      // 팀 메인 컬러
      mainColor: "#60A5FA", // 밝은 파란색
      // 팀 서브 컬러
      subColor: "#93C5FD", // 연한 파란색
      // 팀 액센트 컬러
      accent: "#F87171", // 밝은 빨간색
      // 팀 보더 컬러
      border: "#374151", // 어두운 회색
    },
  },
  // 삼성 라이온즈
  samsung: {
    light: {
      // 유니폼 배경색
      uniformBackground: "#FFFFFF", // 흰색 유니폼
      // 유니폼 글씨색
      uniformText: "#DC2626", // 진한 빨간색
      // 유니폼 숫자색
      uniformNumber: "#DC2626", // 진한 빨간색
      // 유니폼 데코레이션 색상
      uniformDecoration: "#EF4444", // 빨간색
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
      // 팀 보더 컬러
      border: "#E5E7EB", // 연한 회색
    },
    dark: {
      // 유니폼 배경색
      uniformBackground: "#1F2937", // 어두운 회색
      // 유니폼 글씨색
      uniformText: "#F87171", // 밝은 빨간색
      // 유니폼 숫자색
      uniformNumber: "#F87171", // 밝은 빨간색
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
      // 팀 보더 컬러
      border: "#374151", // 어두운 회색
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
  
  // 매칭되지 않는 경우 기본 색상 반환
  if (__DEV__) {
    console.log('팀 색상 매칭 실패, 기본 색상 사용:', { teamKey, teamNameKey });
  }
  
  return {
    uniformBackground: isDarkMode ? defaultColors.backgroundDim : defaultColors.background,
    uniformText: isDarkMode ? defaultColors.text : defaultColors.text,
    uniformNumber: isDarkMode ? defaultColors.text : defaultColors.text,
    uniformDecoration: defaultColors.accent,
    actionButtonActive: defaultColors.error,
    actionButtonInactive: isDarkMode ? defaultColors.textDim : defaultColors.textDim,
    likeBackground: isDarkMode ? defaultColors.backgroundDim : defaultColors.backgroundAlt,
    postActionsBackground: isDarkMode ? defaultColors.backgroundDim : defaultColors.backgroundAlt,
    mainColor: defaultColors.tint,
    subColor: defaultColors.accent,
    accent: defaultColors.energy,
    border: defaultColors.border,
  };
};

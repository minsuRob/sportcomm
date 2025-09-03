/**
 * 팀별 커스텀 색상 시스템
 *
 * 이 파일은 팀별로 고유한 색상을 정의하고, 다크모드/라이트모드를 지원합니다.
 * 기존의 복잡한 palette 객체는 제거하고, 필요한 기본 색상만 유지합니다.
 *
 * 변경 사항: 요청에 따라 각 팀(light/dark) 객체 내부에서 다음 7개 키를 항상 최상단(객체 시작부)에 고정 순서로 배치했습니다.
 *   1) uniformBackground
 *   2) uniformText
 *   3) uniformNumberText
 *   4) uniformNumberStroke
 *   5) postActionsBackground
 *   6) actionButtonActive
 *   7) actionButtonInactive
 * 나머지 키들은 원래 상대적 순서를 유지하며, 값과 주석은 변경하지 않았습니다.
 */

export const defaultColors = {
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

export const teamColors = {
  // 두산 베어스
  doosan: {
    light: {
      uniformBackground: "#FFFFFF",
      uniformText: "#000036",
      uniformNumberText: "#000036",
      uniformNumberStroke: "#FF1620",
      uniformNumberThickness: 1.5,
      postActionsBackground: "#000036", // 남색
      actionButtonActive: "#FF1620", // 빨강
      actionButtonInactive: "#FF1620",

      uniformDecoration: "#3B82F6",
      likeBackground: "#000036",
      mainColor: "#000036",
      subColor: "#FF1620",
      accent: "#EF4444",
      decorationBorder: "#000000",
      cardBorder: "#000036",
      profileText: "#000036",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
    },
    dark: {
      // === 고정 순서 7개 키 ===
      uniformBackground: "#000036", // 어두운 회색
      uniformText: "#FFFFFF", // 밝은 파란색
      uniformNumberText: "#FFFFFF", // 밝은 파란색
      uniformNumberStroke: "#FF1620", //빨강
      uniformNumberThickness: 1.5,
      postActionsBackground: "#FFFFFF",
      actionButtonActive: "#000036", // 밝은 빨간색 (활성 상태)
      actionButtonInactive: "#000036", // 밝은 회색 (비활성 상태)

      // 기타
      uniformNumber: "#FFFFFF", // (원래 있던 보조 필드)
      uniformDecoration: "#93C5FD", // 연한 파란색
      likeBackground: "#1E3A8A", // 어두운 파란색
      mainColor: "#FF1620", // 밝은 파란색
      subColor: "#000036", // 연한 파란색
      accent: "#F87171", // 밝은 빨간색
      decorationBorder: "#FFFFFF",
      cardBorder: "#4B5563",
      profileText: "#FFFFFF",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
    },
  },
  // 삼성 라이온즈
  samsung: {
    light: {
      uniformBackground: "#FFFFFF",
      uniformText: "#0D42A3",
      uniformNumberText: "#0D42A3",
      uniformNumberStroke: "#074CA1",
      postActionsBackground: "#0D42A3", //파랑
      actionButtonActive: "#848484", // 회색
      actionButtonInactive: "#848484",

      uniformDecoration: "#EF4444",
      likeBackground: "#FEF2F2",
      mainColor: "#0D42A3",
      subColor: "#848484",
      accent: "#1E3A8A",
      decorationBorder: "#E5E7EB",
      cardBorder: "#D1D5DB",
      profileText: "#074CA1",
      profileTime: "#074CA1",
      profileStroke: "#FFFFFF",
    },
    dark: {
      uniformBackground: "#09233F", // 파란색
      uniformText: "#FFFFFF",
      uniformNumberText: "#FFFFFF",
      uniformNumberStroke: "#FFFFFF",
      postActionsBackground: "#FFFFFF",
      actionButtonActive: "#09233F",
      actionButtonInactive: "#09233F",
      repeatedStripesColor: "#FFFFFF", // 삼성 줄무늬 색상

      uniformDecoration: "#FCA5A5",
      likeBackground: "#991B1B",
      mainColor: "#0D42A3",
      subColor: "#848484",
      accent: "#60A5FA",
      decorationBorder: "#374151",
      cardBorder: "#4B5563",
      profileText: "#FFFFFF",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
    },
  },
  // 한화 이글스
  hanwha: {
    light: {
      uniformBackground: "#E94E15",
      uniformText: "#08101D",
      uniformNumberText: "#08101D",
      uniformNumberStroke: "#08101D",
      postActionsBackground: "#08101D",
      actionButtonActive: "#E94E15",
      actionButtonInactive: "#E94E15",

      uniformDecoration: "#ED1C24",
      likeBackground: "#FEF2F2",
      mainColor: "#E94E15",
      subColor: "#08101D",
      accent: "#FF6B35",
      decorationBorder: "#00204B",
      cardBorder: "#00204B",
      profileText: "#FFFFFF",
      profileTime: "#FFFFFF",
      profileStroke: "#000000",
    },
    dark: {
      uniformBackground: "#0F3578",
      uniformText: "#FFFFFF",
      uniformNumberText: "#E94E15",
      uniformNumberStroke: "#E94E15",
      postActionsBackground: "#E94E15", // 주황
      actionButtonActive: "#0F3578",
      actionButtonInactive: "#0F3578",

      uniformDecoration: "#8C1218",
      likeBackground: "#991B1B",
      mainColor: "#E94E15",
      subColor: "#08101D",
      accent: "#FF6B35",
      decorationBorder: "#FFFFFF",
      cardBorder: "#E94E15",
      profileText: "#E94E15",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
    },
  },
  // 기아 타이거즈
  kia: {
    light: {
      uniformBackground: "#FFFFFF",
      uniformText: "#EA0029", 
      uniformNumberText: "#000000",
      uniformNumberStroke: "#EA0029",
      uniformNumberThickness: 1.3,
      postActionsBackground: "#000000",
      actionButtonActive: "#EA0029",
      actionButtonInactive: "#EA0029",

      uniformDecoration: "#000000",
      svgDecorationColor: "#24242E", // SVG 데코레이션용 색상 (라이트 모드)
      likeBackground: "#FEF2F2",
      mainColor: "#EA0029",
      subColor: "#000000",
      accent: "#FFC107",
      decorationBorder: "#24242E",
      cardBorder: "#EA0029",
      profileText: "#EA0029",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
    },
    dark: {
      uniformBackground: "#24242E", // 검정
      uniformText: "#FFFFFF",
      uniformNumberText: "#FFFFFF",
      uniformNumberStroke: "#E40223",
      postActionsBackground: "#000000",
      actionButtonActive: "#EA0029",
      actionButtonInactive: "#EA0029",

      uniformDecoration: "#FFFFFF",
      svgDecorationColor: "#FFFFFF", // SVG 데코레이션용 색상 (다크 모드)
      likeBackground: "#991B1B",
      mainColor: "#EA0029",
      subColor: "#FFFFFF",
      accent: "#FFC107",
      decorationBorder: "#FFFFFF",
      cardBorder: "#4B5563",
      profileText: "#FFFFFF",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
    },
  },
  // SSG 랜더스
  ssg: {
    light: {
      uniformBackground: "#FFFFFF",
      uniformText: "#000000",
      uniformNumberText: "#BE001C", //빨강
      uniformNumberStroke: "#BE001C",
      postActionsBackground: "#BE001C",
      actionButtonActive: "#F5CB6A", // 노랑
      actionButtonInactive: "#F5CB6A",

      uniformDecoration: "#041E42",
      likeBackground: "#FEF2F2",
      mainColor: "#BE001C",
      subColor: "#F5CB6A",
      accent: "#FFD700",
      decorationBorder: "#CE142C",
      cardBorder: "#CE0E2D",
      profileText: "#CE0E2D",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
    },
    dark: {
      uniformBackground: "#BE001C",//빨강
      uniformText: "#FFFFFF",
      uniformNumberText: "#FFFFFF",
      uniformNumberStroke: "#FFFFFF",
      postActionsBackground: "#FFFFFF",
      actionButtonActive: "#BE001C",
      actionButtonInactive: "#BE001C",

      uniformDecoration: "#FFFFFF",
      likeBackground: "#991B1B",
      mainColor: "#BE001C",
      subColor: "#F5CB6A",
      accent: "#FFD700",
      decorationBorder: "#FFFFFF",
      cardBorder: "#4B5563",
      profileText: "#FFFFFF",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
    },
  },
  // LG 트윈스
  lg: {
    light: {
      uniformBackground: "#FFFFFF",
      uniformText: "#000000",
      uniformNumberText: "#000000",
      uniformNumberStroke: "#000000",
      postActionsBackground: "#000000",
      actionButtonActive: "#D60325", //빨강
      actionButtonInactive: "#D60325",
      repeatedStripesColor: "#000000", // LG 트윈스 줄무늬 색상

      uniformDecoration: "#000000",
      likeBackground: "#FEF2F2",
      mainColor: "#000000",
      subColor: "#D60325",
      accent: "#87CEEB",
      decorationBorder: "#000000",
      cardBorder: "#C4003C",
      profileText: "#C4003C",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
    },
    dark: {
      uniformBackground: "#000000",
      uniformText: "#FFFFFF",
      uniformNumberText: "#FFFFFF",
      uniformNumberStroke: "#FFFFFF",
      postActionsBackground: "#D60325",
      actionButtonActive: "#FFFFFF",
      actionButtonInactive: "#FFFFFF",

      uniformDecoration: "#FFFFFF",
      likeBackground: "#991B1B",
      mainColor: "#FFFFFF",
      subColor: "#D60325",
      accent: "#87CEEB",
      decorationBorder: "#FFFFFF",
      cardBorder: "#4B5563",
      profileText: "#FFFFFF",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
    },
  },
  // 롯데 자이언츠
  lotte: {
    light: {
      uniformBackground: "#E5E3DC",
      uniformText: "#1F152A",
      uniformNumberText: "#E2222C",
      uniformNumberStroke: "#E2222C", //빨강
      postActionsBackground: "#1F152A", //남색
      actionButtonActive: "#E2222C",
      actionButtonInactive: "#E2222C",

      uniformDecoration: "#CE0E2D",
      likeBackground: "#FEF2F2",
      mainColor: "#1F152A",
      subColor: "#E2222C",
      accent: "#FFD700",
      decorationBorder: "#1F152A",
      cardBorder: "#002E5F",
      profileText: "#E2222C",
      profileTime: "#E2222C",
      profileStroke: "#FFFFFF",
    },
    dark: {
      uniformBackground: "#1F152A", //남색
      uniformText: "#FFFFFF",
      uniformNumberText: "#E2222C",
      uniformNumberStroke: "#E2222C", // 빨강
      postActionsBackground: "#55647F",
      actionButtonActive: "#FFFFFF",
      actionButtonInactive: "#FFFFFF",

      uniformDecoration: "#FFFFFF",
      likeBackground: "#991B1B",
      mainColor: "#E2222C",
      subColor: "#1F152A",
      accent: "#FFD700",
      decorationBorder: "#55647F",
      cardBorder: "#4B5563",
      profileText: "#ffffff",
      profileTime: "#ffffff",
      profileStroke: "#1F2937",
    },
  },
  // NC 다이노스
  nc: {
    light: {
      uniformBackground: "#FFFFFF",
      uniformText: "#29557D",//네이비
      uniformNumberText: "#29557D",
      uniformNumberStroke: "#BD9578",
      uniformNumberThickness: 1.5,
      postActionsBackground: "#29557D",
      actionButtonActive: "#BD9578", // 금색
      actionButtonInactive: "#BD9578",

      uniformDecoration: "#C4A484",
      likeBackground: "#EBF5FF",
      mainColor: "#29557D",
      subColor: "#BD9578",
      accent: "#FF6B35",
      decorationBorder: "#315288",
      cardBorder: "#315288",
      profileText: "#315288",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
    },
    dark: {
      uniformBackground: "#1D3353", // 네이비
      uniformText: "#FFFFFF",
      uniformNumberText: "#FFFFFF",
      uniformNumberStroke: "#BD9578",
      postActionsBackground: "#BD9578", //금색
      actionButtonActive: "#FFFFFF",
      actionButtonInactive: "#FFFFFF",

      uniformDecoration: "#FFFFFF",
      likeBackground: "#1E3A8A",
      mainColor: "#BD9578",
      subColor: "#29557D",
      accent: "#FF6B35",
      decorationBorder: "#FFFFFF",
      cardBorder: "#BD9578",
      profileText: "#BD9578",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
    },
  },
  // KT 위즈
  kt: {
    light: {
      uniformBackground: "#FFFFFF",
      uniformText: "#000000",
      uniformNumberText: "#000000",
      uniformNumberStroke: "#000000",
      postActionsBackground: "#000000",
      actionButtonActive: "#FFFFFF",
      actionButtonInactive: "#FFFFFF",

      uniformDecoration: "#FF6600",
      likeBackground: "#FFF3E0",
      mainColor: "#000000",
      subColor: "#ED1B23",
      accent: "#9C27B0",
      decorationBorder: "#000000",
      cardBorder: "#000000",
      profileText: "#000000",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
    },
    dark: {
      uniformBackground: "#000000",
      uniformText: "#FFFFFF",
      uniformNumberText: "#FFFFFF",
      uniformNumberStroke: "#FFFFFF",
      postActionsBackground: "#FFFFFF",
      actionButtonActive: "#000000",
      actionButtonInactive: "#000000",

      uniformDecoration: "#FFFFFF",
      likeBackground: "#EA580C",
      mainColor: "#000000",
      subColor: "#ED1B23",
      accent: "#9C27B0",
      decorationBorder: "#FFFFFF",
      cardBorder: "#4B5563",
      profileText: "#FFFFFF",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
    },
  },
  // 키움 히어로즈
  kiwoom: {
    light: {
      uniformBackground: "#FFFFFF",
      uniformText: "#570514", // 키움색
      uniformNumberText: "#570514",
      uniformNumberStroke: "#F66893", // 핑크
      uniformNumberThickness: 1.3,
      postActionsBackground: "#570514",
      actionButtonActive: "#F66893" ,
      actionButtonInactive: "#F66893",

      uniformDecoration: "#C4A484",
      likeBackground: "#FDF2F8",
      mainColor: "#570514", // 버건디
      subColor: "#F66893",
      accent: "#10B981",
      decorationBorder: "#570514", 
      cardBorder: "#570514",
      profileText: "#570514",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
    },
    dark: {
      uniformBackground: "#3D030E",
      uniformText: "#FFFFFF",
      uniformNumberText: "#FFFFFF",
      uniformNumberStroke: "#F66893",
      postActionsBackground: "#FFFFFF",
      actionButtonActive: "#F66893",
      actionButtonInactive: "#F66893",

      uniformDecoration: "#FFFFFF",
      likeBackground: "#881337",
      mainColor: "#F66893",
      subColor: "#570514",
      accent: "#10B981",
      decorationBorder: "#FFFFFF",
      cardBorder: "#FFFFFF",
      profileText: "#FFFFFF",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
    },
  },
} as const;

export const getTeamColors = (teamId: string, isDarkMode: boolean = false, teamName?: string) => {
  const mode = isDarkMode ? "dark" : "light";
  if (__DEV__) {
    console.log("getTeamColors 호출:", { teamId, teamName, isDarkMode, mode });
  }
  const teamKey = teamId.toLowerCase();
  const teamNameKey = teamName?.toLowerCase();

  const match = (keys: string[]) =>
    keys.some(
      k =>
        teamKey === k ||
        teamNameKey === k ||
        (teamNameKey && teamNameKey.includes(k))
    );

  if (match(["doosan", "두산", "두산 베어스", "doosan bears"])) return teamColors.doosan[mode];
  if (match(["samsung", "삼성", "삼성 라이온즈", "samsung lions"])) return teamColors.samsung[mode];
  if (match(["hanwha", "한화", "한화 이글스", "hanwha eagles"])) return teamColors.hanwha[mode];
  if (match(["kia", "기아", "기아 타이거즈", "kia tigers"])) return teamColors.kia[mode];
  if (match(["ssg", "ssg랜더스", "ssg 랜더스", "ssg landers", "랜더스", "landers"])) return teamColors.ssg[mode];
  if (match(["lg", "lg트윈스", "lg 트윈스", "lg twins", "트윈스", "twins"])) return teamColors.lg[mode];
  if (match(["lotte", "롯데", "롯데 자이언츠", "lotte giants", "giants"])) return teamColors.lotte[mode];
  if (match(["nc", "nc다이노스", "nc 다이노스", "nc dinos", "다이노스", "dinos"])) return teamColors.nc[mode];
  if (match(["kt", "kt위즈", "kt 위즈", "kt wiz", "wiz", "위즈"])) return teamColors.kt[mode];
  if (match(["kiwoom", "키움", "키움 히어로즈", "kiwoom heroes", "heroes"])) return teamColors.kiwoom[mode];

  if (__DEV__) {
    console.log("팀 색상 매칭 실패, 기본 색상 사용:", { teamKey, teamNameKey });
  }

  return {
    uniformBackground: isDarkMode ? defaultColors.backgroundDim : defaultColors.background,
    uniformText: defaultColors.text,
    uniformDecoration: defaultColors.accent,
    actionButtonActive: defaultColors.error,
    actionButtonInactive: defaultColors.textDim,
    likeBackground: isDarkMode ? defaultColors.backgroundDim : defaultColors.backgroundAlt,
    postActionsBackground: isDarkMode ? defaultColors.backgroundDim : defaultColors.backgroundAlt,
    mainColor: defaultColors.tint,
    subColor: defaultColors.accent,
    accent: defaultColors.energy,
    decorationBorder: defaultColors.border,
    cardBorder: defaultColors.border,
    profileText: defaultColors.text,
    profileTime: defaultColors.textDim,
    profileStroke: isDarkMode ? defaultColors.backgroundDim : defaultColors.background,
    uniformNumberText: defaultColors.text,
    uniformNumberStroke: isDarkMode ? defaultColors.backgroundDim : defaultColors.background,
    repeatedStripesColor: isDarkMode ? defaultColors.backgroundDim : defaultColors.background, // 기본 줄무늬 색상
    svgDecorationColor: isDarkMode ? '#FFFFFF' : '#24242E', // 기본 SVG 데코레이션 색상
    // uniformNumberThickness: 1,
  };
};

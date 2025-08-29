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
      // === 고정 순서 7개 키 (상단) ===
      uniformBackground: "#FFFFFF", // 흰색 유니폼
      uniformText: "#000036", // 진한 파란색
      uniformNumberText: "#000036",
      uniformNumberStroke: "#FF1620",
      postActionsBackground: "#000036", // 연한 회색
      actionButtonActive: "#FF1620", // 빨간색 (활성 상태)
      actionButtonInactive: "#FF1620", // 회색 (비활성 상태)

      // 이하 기존 기타 키
      uniformDecoration: "#3B82F6", // 파란색
      likeBackground: "#000036", // 연한 파란색
      mainColor: "#1E3A8A", // 진한 파란색
      subColor: "#3B82F6", // 파란색
      accent: "#EF4444", // 빨간색
      decorationBorder: "#000000",
      cardBorder: "#000036",
      profileText: "#000036", // 진한 파란색
      profileTime: "#6B7280", // 회색
      profileStroke: "#FFFFFF", // 흰색 테두리
    },
    dark: {
      // === 고정 순서 7개 키 ===
      uniformBackground: "#000036", // 어두운 회색
      uniformText: "#FFFFFF", // 밝은 파란색
      uniformNumberText: "#FFFFFF", // 밝은 파란색
      uniformNumberStroke: "#FF1620",
      postActionsBackground: "#000000", // 어두운 회색
      actionButtonActive: "#F87171", // 밝은 빨간색 (활성 상태)
      actionButtonInactive: "#9CA3AF", // 밝은 회색 (비활성 상태)

      // 기타
      uniformNumber: "#FFFFFF", // (원래 있던 보조 필드)
      uniformDecoration: "#93C5FD", // 연한 파란색
      likeBackground: "#1E3A8A", // 어두운 파란색
      mainColor: "#60A5FA", // 밝은 파란색
      subColor: "#93C5FD", // 연한 파란색
      accent: "#F87171", // 밝은 빨간색
      decorationBorder: "#FFFFFF",
      cardBorder: "#4B5563",
      profileText: "#60A5FA",
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
      postActionsBackground: "#0D42A3",
      actionButtonActive: "#848484",
      actionButtonInactive: "#848484",

      uniformDecoration: "#EF4444",
      likeBackground: "#FEF2F2",
      mainColor: "#DC2626",
      subColor: "#EF4444",
      accent: "#1E3A8A",
      decorationBorder: "#E5E7EB",
      cardBorder: "#D1D5DB",
      profileText: "#074CA1",
      profileTime: "#074CA1",
      profileStroke: "#FFFFFF",
    },
    dark: {
      uniformBackground: "#09233F",
      uniformText: "#F87171",
      uniformNumberText: "#F87171",
      uniformNumberStroke: "#374151",
      postActionsBackground: "#1F2937",
      actionButtonActive: "#F87171",
      actionButtonInactive: "#9CA3AF",

      uniformDecoration: "#FCA5A5",
      likeBackground: "#991B1B",
      mainColor: "#F87171",
      subColor: "#FCA5A5",
      accent: "#60A5FA",
      decorationBorder: "#374151",
      cardBorder: "#4B5563",
      profileText: "#F87171",
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
      mainColor: "#00204B",
      subColor: "#ED1C24",
      accent: "#FF6B35",
      decorationBorder: "#00204B",
      cardBorder: "#00204B",
      profileText: "#00204B",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
    },
    dark: {
      uniformBackground: "#0F3578",
      uniformText: "#FFFFFF",
      uniformNumberText: "#E94E15",
      uniformNumberStroke: "#E94E15",
      postActionsBackground: "#E94E15",
      actionButtonActive: "#0F3578",
      actionButtonInactive: "#0F3578",

      uniformDecoration: "#8C1218",
      likeBackground: "#991B1B",
      mainColor: "#00204B",
      subColor: "#8C1218",
      accent: "#FF6B35",
      decorationBorder: "#FFFFFF",
      cardBorder: "#4B5563",
      profileText: "#FFFFFF",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
    },
  },
  // 기아 타이거즈
  kia: {
    light: {
      uniformBackground: "#FFFFFF",
      uniformText: "#EA0029",
      uniformNumberText: "#EA0029",
      uniformNumberStroke: "#000000",
      postActionsBackground: "#000000",
      actionButtonActive: "#EA0029",
      actionButtonInactive: "#EA0029",

      uniformDecoration: "#000000",
      likeBackground: "#FEF2F2",
      mainColor: "#EA0029",
      subColor: "#000000",
      accent: "#FFC107",
      decorationBorder: "#EA0029",
      cardBorder: "#EA0029",
      profileText: "#EA0029",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
    },
    dark: {
      uniformBackground: "#1A1A1A",
      uniformText: "#CC0022",
      uniformNumberText: "#CC0022",
      uniformNumberStroke: "#FFFFFF",
      postActionsBackground: "#000000",
      actionButtonActive: "#CC0022",
      actionButtonInactive: "#9CA3AF",

      uniformDecoration: "#FFFFFF",
      likeBackground: "#991B1B",
      mainColor: "#CC0022",
      subColor: "#1A1A1A",
      accent: "#FFC107",
      decorationBorder: "#CC0022",
      cardBorder: "#4B5563",
      profileText: "#CC0022",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
    },
  },
  // SSG 랜더스
  ssg: {
    light: {
      uniformBackground: "#FFFFFF",
      uniformText: "#000000",
      uniformNumberText: "#BE001C",
      uniformNumberStroke: "#BE001C",
      postActionsBackground: "#BE001C",
      actionButtonActive: "#F5CB6A",
      actionButtonInactive: "#F5CB6A",

      uniformDecoration: "#041E42",
      likeBackground: "#FEF2F2",
      mainColor: "#CE0E2D",
      subColor: "#041E42",
      accent: "#FFD700",
      decorationBorder: "#CE0E2D",
      cardBorder: "#CE0E2D",
      profileText: "#CE0E2D",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
    },
    dark: {
      uniformBackground: "#031A38",
      uniformText: "#B50C28",
      uniformNumberText: "#B50C28",
      uniformNumberStroke: "#FFFFFF",
      postActionsBackground: "#000000",
      actionButtonActive: "#B50C28",
      actionButtonInactive: "#9CA3AF",

      uniformDecoration: "#FFFFFF",
      likeBackground: "#991B1B",
      mainColor: "#B50C28",
      subColor: "#031A38",
      accent: "#FFD700",
      decorationBorder: "#B50C28",
      cardBorder: "#4B5563",
      profileText: "#B50C28",
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
      uniformNumberStroke: "#D60325",
      postActionsBackground: "#000000",
      actionButtonActive: "#D60325",
      actionButtonInactive: "#D60325",

      uniformDecoration: "#000000",
      likeBackground: "#FEF2F2",
      mainColor: "#C4003C",
      subColor: "#000000",
      accent: "#87CEEB",
      decorationBorder: "#000000",
      cardBorder: "#C4003C",
      profileText: "#C4003C",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
    },
    dark: {
      uniformBackground: "#1A1A1A",
      uniformText: "#A8002F",
      uniformNumberText: "#A8002F",
      uniformNumberStroke: "#FFFFFF",
      postActionsBackground: "#000000",
      actionButtonActive: "#A8002F",
      actionButtonInactive: "#9CA3AF",

      uniformDecoration: "#FFFFFF",
      likeBackground: "#991B1B",
      mainColor: "#A8002F",
      subColor: "#1A1A1A",
      accent: "#87CEEB",
      decorationBorder: "#FFFFFF",
      cardBorder: "#4B5563",
      profileText: "#A8002F",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
    },
  },
  // 롯데 자이언츠
  lotte: {
    light: {
      uniformBackground: "#E5E3DC",
      uniformText: "#1F152A",
      uniformNumberText: "#F2F2F2",
      uniformNumberStroke: "#E2222C",
      postActionsBackground: "#1F152A",
      actionButtonActive: "#E2222C",
      actionButtonInactive: "#E2222C",
 
      uniformDecoration: "#CE0E2D",
      likeBackground: "#FEF2F2",
      mainColor: "#002E5F",
      subColor: "#CE0E2D",
      accent: "#FFD700",
      decorationBorder: "#002E5F",
      cardBorder: "#002E5F",
      profileText: "#002E5F",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
    },
    dark: {
      uniformBackground: "#001A3D",
      uniformText: "#B50C28",
      uniformNumberText: "#B50C28",
      uniformNumberStroke: "#FFFFFF",
      postActionsBackground: "#000000",
      actionButtonActive: "#B50C28",
      actionButtonInactive: "#9CA3AF",

      uniformDecoration: "#FFFFFF",
      likeBackground: "#991B1B",
      mainColor: "#001A3D",
      subColor: "#B50C28",
      accent: "#FFD700",
      decorationBorder: "#FFFFFF",
      cardBorder: "#4B5563",
      profileText: "#B50C28",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
    },
  },
  // NC 다이노스
  nc: {
    light: {
      uniformBackground: "#FFFFFF",
      uniformText: "#29557D",
      uniformNumberText: "#29557D",
      uniformNumberStroke: "#BD9578",
      postActionsBackground: "#29557D",
      actionButtonActive: "#BD9578",
      actionButtonInactive: "#BD9578",

      uniformDecoration: "#C4A484",
      likeBackground: "#EBF5FF",
      mainColor: "#315288",
      subColor: "#C4A484",
      accent: "#FF6B35",
      decorationBorder: "#315288",
      cardBorder: "#315288",
      profileText: "#315288",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
    },
    dark: {
      uniformBackground: "#253F6C",
      uniformText: "#8B7355",
      uniformNumberText: "#8B7355",
      uniformNumberStroke: "#FFFFFF",
      postActionsBackground: "#000000",
      actionButtonActive: "#8B7355",
      actionButtonInactive: "#9CA3AF",

      uniformDecoration: "#FFFFFF",
      likeBackground: "#1E3A8A",
      mainColor: "#253F6C",
      subColor: "#8B7355",
      accent: "#FF6B35",
      decorationBorder: "#FFFFFF",
      cardBorder: "#4B5563",
      profileText: "#8B7355",
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
      subColor: "#FF6600",
      accent: "#9C27B0",
      decorationBorder: "#000000",
      cardBorder: "#000000",
      profileText: "#000000",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
    },
    dark: {
      uniformBackground: "#1A1A1A",
      uniformText: "#E55A00",
      uniformNumberText: "#E55A00",
      uniformNumberStroke: "#FFFFFF",
      postActionsBackground: "#000000",
      actionButtonActive: "#E55A00",
      actionButtonInactive: "#9CA3AF",

      uniformDecoration: "#FFFFFF",
      likeBackground: "#EA580C",
      mainColor: "#1A1A1A",
      subColor: "#E55A00",
      accent: "#9C27B0",
      decorationBorder: "#FFFFFF",
      cardBorder: "#4B5563",
      profileText: "#E55A00",
      profileTime: "#9CA3AF",
      profileStroke: "#1F2937",
    },
  },
  // 키움 히어로즈
  kiwoom: {
    light: {
      uniformBackground: "#FFFFFF",
      uniformText: "#570514",
      uniformNumberText: "#570514",
      uniformNumberStroke: "#F66893",
      postActionsBackground: "#570514",
      actionButtonActive: "#F66893" ,
      actionButtonInactive: "#F66893",

      uniformDecoration: "#C4A484",
      likeBackground: "#FDF2F8",
      mainColor: "#570514",
      subColor: "#C4A484",
      accent: "#10B981",
      decorationBorder: "#570514",
      cardBorder: "#570514",
      profileText: "#570514",
      profileTime: "#6B7280",
      profileStroke: "#FFFFFF",
    },
    dark: {
      uniformBackground: "#3D030E",
      uniformText: "#8B7355",
      uniformNumberText: "#8B7355",
      uniformNumberStroke: "#FFFFFF",
      postActionsBackground: "#000000",
      actionButtonActive: "#8B7355",
      actionButtonInactive: "#9CA3AF",

      uniformDecoration: "#FFFFFF",
      likeBackground: "#881337",
      mainColor: "#3D030E",
      subColor: "#8B7355",
      accent: "#10B981",
      decorationBorder: "#FFFFFF",
      cardBorder: "#4B5563",
      profileText: "#8B7355",
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
  };
};

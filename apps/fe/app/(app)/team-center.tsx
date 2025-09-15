import React from "react";
import TeamCenterDetailsScreen from "../(details)/team-center";

/**
 * 탭 전용 래퍼 스크린 (Team Center)
 * - (details)/team-center 상세 화면을 하단 탭 내에서 그대로 렌더링합니다.
 * - 공통 레이아웃/탭 환경을 유지하기 위해 별도의 래퍼를 둡니다.
 *
 * 주의:
 * - 상세 화면 내부에 자체 헤더/뒤로가기 버튼이 포함되어 있습니다.
 *   탭 환경에서는 뒤로가기 버튼 동작이 필요하지 않을 수 있으니,
 *   추후 요구 시 prop 제어 방식으로 헤더 표시 여부를 토글하도록 확장할 수 있습니다.
 */
export default function TeamCenterTabScreen(): React.ReactElement {
  return <TeamCenterDetailsScreen />;
}

/**
 * 상세 페이지: 팀 선택 화면 (Details 버전)
 *
 * 목적:
 * - 기존 모달 라우트에 구현된 팀 선택 로직을 재사용하여 상세 화면에서도 동일한 UX를 제공합니다.
 * - 로직/네트워크/상태 관리는 모두 모달 버전의 구현을 그대로 사용합니다.
 *
 * 구현 방법:
 * - 모달 라우트에 있는 기본 컴포넌트를 그대로 import 하여 감싸서 반환합니다.
 * - expo-router 의 라우팅 컨텍스트에서 `router.back()` 등이 정상 동작합니다.
 *
 * 주의:
 * - 라우트 간 컴포넌트 재사용 시, 상대 경로를 통해 동일 컴포넌트를 참조합니다.
 * - 스타일/테마/GraphQL 쿼리 로직은 원본 컴포넌트를 그대로 따릅니다.
 */

import React from "react";
// (details) → (modals) 형제 디렉터리 상대 경로
import TeamSelectionScreen from "../(modals)/team-selection";

/**
 * TeamSelectionDetailsScreen
 * - 모달 버전과 동일한 동작을 하는 상세 페이지 래퍼 컴포넌트
 */
export default function TeamSelectionDetailsScreen(): React.ReactElement {
  // 래핑만 수행하며, 원본 컴포넌트를 그대로 렌더링합니다.
  return <TeamSelectionScreen />;
}

/*
커밋 메세지: feat(details): 팀 선택 상세 페이지 추가(모달 로직 재사용)
*/

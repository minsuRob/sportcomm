import React from "react";
import ShopDetailsPage from "../../(details)/shop";

/**
 * 탭 전용 래퍼 스크린 (Shop)
 * - (details)/shop 상세 화면을 하단 탭 내에서 그대로 렌더링합니다.
 * - 공통 레이아웃/탭 환경을 유지하기 위해 별도의 래퍼를 둡니다.
 *
 * 주의:
 * - 상세 화면 내부에 닫기(X) 버튼이 있으며, 라우터 back을 호출합니다.
 *   탭 환경에서는 뒤로가기 동작이 필요하지 않을 수 있으니
 *   추후 요구 시 헤더/닫기 버튼 노출 여부를 prop으로 제어하는 방식을 고려할 수 있습니다.
 */
export default function ShopTabScreen(): React.ReactElement {
  return <ShopDetailsPage />;
}

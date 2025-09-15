import React, { useCallback } from "react";
import { View, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useAuth } from "@/lib/auth/context/AuthContext";
import ShopModal, { type ShopItemData } from "@/components/shop/ShopModal";
import { showToast } from "@/components/CustomToast";

/**
 * 상세 페이지: 상점
 * - 모달이 아닌 페이지 형태로 상점 UI를 호스팅합니다.
 * - 내부의 닫기(×) 버튼을 누르면 라우터 back으로 페이지를 닫습니다.
 * - 구매 성공 시 사용자 포인트 갱신을 위해 reloadUser를 호출합니다.
 */
export default function ShopDetailsPage(): React.ReactElement {
  const router = useRouter();
  const { themed } = useAppTheme();
  const { user: currentUser, reloadUser } = useAuth();

  /**
   * 아이템 구매 핸들러
   * - 실제 환경에서는 GraphQL mutation 등을 호출해야 합니다.
   * - 여기서는 간단한 지연 후 사용자 정보를 갱신하고 토스트를 표시합니다.
   */
  const handlePurchase = useCallback(
    async (item: ShopItemData): Promise<void> => {
      try {
        // 실제 구매 처리 자리 (예: await purchaseItem(item.id))
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 포인트 등 사용자 정보 갱신
        await reloadUser();

        showToast({
          type: "success",
          title: "구매 완료",
          message: `${item.name}을(를) 성공적으로 구매했습니다!`,
          duration: 2500,
        });
      } catch (err) {
        showToast({
          type: "error",
          title: "구매 실패",
          message: "구매 처리 중 문제가 발생했습니다.",
          duration: 3000,
        });
      }
    },
    [reloadUser],
  );

  return (
    <View style={themed($container)}>
      {/* ShopModal 은 페이지 스타일로 동작하도록 리팩토링되었으며,
          visible=true 로 항상 렌더링합니다.
          닫기 버튼 클릭 시 router.back() 으로 페이지를 닫습니다. */}
      <ShopModal
        visible={true}
        onClose={() => router.back()}
        currentUser={currentUser ?? null}
        onPurchase={handlePurchase}
      />
    </View>
  );
}

/** 페이지 컨테이너 (모바일/웹 모두 배경만 지정해도 충분) */
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

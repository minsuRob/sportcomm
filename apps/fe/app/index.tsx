import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/context/AuthContext";
import {
  shouldRunPostSignup,
  getNextPostSignupRoute,
  type MinimalUser,
} from "@/lib/auth/post-signup";

/**
 * index 라우트
 * - 앱 진입 시 인증 상태와 post-signup 유틸을 사용하여 다음 화면을 결정합니다.
 * - 모든 Provider(이메일/구글/애플 등) 공통 확장 가능한 온보딩 분기를 수행합니다.
 *
 * 동작 요약:
 * 1) AuthProvider 부트스트랩(isLoading) 완료까지 대기
 * 2) 미인증 시: 피드로 이동(피드 내에서 로그인 유도 UI 제공)
 * 3) 인증 시:
 *    - shouldRunPostSignup(user)로 온보딩 필요 여부 판단
 *    - 필요하면 getNextPostSignupRoute(user)로 모달 라우트 결정
 *    - 필요 없으면 피드로 이동
 *
 * 가독성/유지보수:
 * - 최소 로직으로 한 번만 라우팅되도록 navigated 상태로 보호
 * - 오류 발생 시 안전하게 피드로 폴백
 */
const IndexRoute: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [navigated, setNavigated] = useState<boolean>(false);

  useEffect(() => {
    // 이미 라우팅을 한 번 했다면 중복 실행 방지
    if (navigated) return;
    // AuthProvider 부트스트랩이 끝난 뒤에만 분기 수행
    if (isLoading) return;

    const go = async () => {
      try {
        // 미인증: 피드에서 로그인 유도 UI를 제공하므로 피드로 이동
        if (!isAuthenticated) {
          router.replace("/feed");
          return;
        }

        // 인증된 경우: post-signup 유틸로 다음 라우트 결정
        const needOnboarding = await shouldRunPostSignup(
          user as unknown as MinimalUser,
        );

        if (needOnboarding) {
          const next = await getNextPostSignupRoute(
            user as unknown as MinimalUser,
          );
          if (next) {
            router.replace(next as any);
          } else {
            router.replace("/feed");
          }
        } else {
          router.replace("/feed");
        }
      } catch (e: any) {
        // 판단 중 오류 발생 시 기본 피드로 폴백
        router.replace("/feed");
      } finally {
        setNavigated(true);
      }
    };

    void go();
  }, [isAuthenticated, isLoading, user, router, navigated]);

  // 라우팅 중에는 간단한 로딩만 표시
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
};

export default IndexRoute;

/**
 * 설명:
 * - 본 파일은 앱 진입점(index)에서 인증 및 post-signup(온보딩) 분기를 일원화합니다.
 * - shouldRunPostSignup / getNextPostSignupRoute를 사용해 확장 가능하게 구현했습니다.
 *
 * 타입 힌트:
 * - 컴포넌트를 React.FC로 선언하고, 내부 상태(navigated) 및 유틸 함수 인자에 타입을 명시적으로 부여했습니다.
 *
 * 오류 처리:
 * - 온보딩 판단 중 예외가 발생하면 피드 화면으로 폴백하여 끊김 없는 UX를 보장합니다.
 *
 * 성능:
 * - 부트스트랩 완료(isLoading=false) 시에만 라우팅하며, navigated 상태로 중복 실행을 방지합니다.
 */

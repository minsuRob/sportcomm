/**
 * Supabase Auth 서비스 사용 예시
 *
 * 기존 GraphQL 뮤테이션을 Supabase Auth로 대체하는 방법을 보여줍니다.
 */

import { SupabaseAuthService, signUp, signIn, signOut } from "./auth";

/**
 * 회원가입 예시
 */
export async function handleSignUp() {
  const result = await signUp({
    email: "user@example.com",
    password: "securePassword123",
    nickname: "testUser",
    confirmPassword: "securePassword123",
  });

  if (result.error) {
    console.error("회원가입 실패:", result.error.message);
    return;
  }

  //console.log("회원가입 성공:", result.user);
  //console.log("세션:", result.session);
}

/**
 * 로그인 예시
 */
export async function handleSignIn() {
  const result = await signIn({
    email: "user@example.com",
    password: "securePassword123",
  });

  if (result.error) {
    console.error("로그인 실패:", result.error.message);
    return;
  }

  //console.log("로그인 성공:", result.user);
  //console.log("세션:", result.session);
}

/**
 * 로그아웃 예시
 */
export async function handleSignOut() {
  const result = await signOut();

  if (result.error) {
    console.error("로그아웃 실패:", result.error.message);
    return;
  }

  //console.log("로그아웃 성공");
}

/**
 * 현재 사용자 확인 예시
 */
export async function checkCurrentUser() {
  const { user, error } = await SupabaseAuthService.getCurrentUser();

  if (error) {
    console.error("사용자 조회 실패:", error.message);
    return;
  }

  if (user) {
    //console.log("현재 사용자:", user);
  } else {
    //console.log("로그인된 사용자가 없습니다.");
  }
}

/**
 * 인증 상태 변경 리스너 예시
 */
export function setupAuthListener() {
  const unsubscribe = SupabaseAuthService.onAuthStateChange(
    (event, session) => {
      switch (event) {
        case "SIGNED_IN":
          //console.log("사용자 로그인:", session?.user?.id);
          break;
        case "SIGNED_OUT":
          //console.log("사용자 로그아웃");
          break;
        case "TOKEN_REFRESHED":
          //console.log("토큰 갱신:", session?.user?.id);
          break;
        default:
          //console.log("인증 이벤트:", event);
      }
    },
  );

  // 컴포넌트 언마운트 시 구독 해제
  return unsubscribe;
}

/**
 * React 컴포넌트에서 사용하는 예시
 */
export const AuthExampleComponent = () => {
  // React 컴포넌트에서 사용할 때의 예시 코드

  const handleLogin = async (email: string, password: string) => {
    const result = await signIn({ email, password });

    if (result.error) {
      // 에러 처리 (토스트 메시지, 상태 업데이트 등)
      alert(`로그인 실패: ${result.error.message}`);
      return;
    }

    // 성공 처리 (리다이렉트, 상태 업데이트 등)
    //console.log("로그인 성공:", result.user);
  };

  const handleRegister = async (
    email: string,
    password: string,
    nickname: string,
  ) => {
    const result = await signUp({ email, password, nickname });

    if (result.error) {
      alert(`회원가입 실패: ${result.error.message}`);
      return;
    }

    //console.log("회원가입 성공:", result.user);
    // 이메일 확인 안내 메시지 표시
    alert("회원가입이 완료되었습니다. 이메일을 확인해주세요.");
  };

  return null; // 실제 JSX는 여기에 구현
};

/**
 * 기존 GraphQL 뮤테이션과의 비교
 */
export const migrationGuide = {
  // 기존 방식 (GraphQL)
  oldWay: `
    const [loginMutation] = useMutation(LOGIN_MUTATION);
    const [registerMutation] = useMutation(REGISTER_MUTATION);
    
    const handleLogin = async () => {
      const { data } = await loginMutation({
        variables: { input: { email, password } }
      });
    };
  `,

  // 새로운 방식 (Supabase Auth)
  newWay: `
    import { signIn, signUp } from '@/lib/supabase/auth';
    
    const handleLogin = async () => {
      const result = await signIn({ email, password });
      if (result.error) {
        // 에러 처리
      } else {
        // 성공 처리
      }
    };
  `,
};

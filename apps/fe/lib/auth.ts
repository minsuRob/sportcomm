import { setItem, getItem, removeItem } from "./storage/storage";

const TOKEN_KEY = "sportcomm-auth-token";
const USER_KEY = "sportcomm-auth-user";

export interface User {
  id: string;
  nickname: string;
  email?: string;
  profileImageUrl?: string;
  bio?: string;
  team?: string;
  isPrivate?: boolean;
  role?: string;
}

export const saveSession = async (
  tokenOrUser: string | User,
  user?: User
): Promise<void> => {
  try {
    // 두 개의 매개변수가 전달된 경우 (기존 방식)
    if (typeof tokenOrUser === "string" && user) {
      if (!tokenOrUser || !user) {
        console.error("Failed to save session: token or user is missing.", {
          token: tokenOrUser,
          user,
        });
        return;
      }
      await setItem(TOKEN_KEY, tokenOrUser);
      await setItem(USER_KEY, JSON.stringify(user));
    }
    // 사용자 정보만 업데이트하는 경우
    else if (typeof tokenOrUser === "object") {
      await setItem(USER_KEY, JSON.stringify(tokenOrUser));
    }
  } catch (error) {
    console.error("Failed to save session", error);
    // Optionally, re-throw or handle the error as needed
  }
};

export const getSession = async (): Promise<{
  token: string | null;
  user: User | null;
}> => {
  try {
    const token = await getItem(TOKEN_KEY);
    const userJson = await getItem(USER_KEY);
    const user = userJson ? (JSON.parse(userJson) as User) : null;
    return { token, user };
  } catch (error) {
    console.error("Failed to get session", error);
    return { token: null, user: null };
  }
};

export const clearSession = async (): Promise<void> => {
  try {
    await removeItem(TOKEN_KEY);
    await removeItem(USER_KEY);
  } catch (error) {
    console.error("Failed to clear session", error);
  }
};

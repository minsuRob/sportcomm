import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "sportcomm-auth-token";
const USER_KEY = "sportcomm-auth-user";

export interface User {
  id: string;
  nickname: string;
  profileImageUrl?: string;
}

export const saveSession = async (token: string, user: User): Promise<void> => {
  try {
    if (!token || !user) {
      console.error("Failed to save session: token or user is missing.", {
        token,
        user,
      });
      return;
    }
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
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
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const userJson = await AsyncStorage.getItem(USER_KEY);
    const user = userJson ? (JSON.parse(userJson) as User) : null;
    return { token, user };
  } catch (error) {
    console.error("Failed to get session", error);
    return { token: null, user: null };
  }
};

export const clearSession = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error("Failed to clear session", error);
  }
};

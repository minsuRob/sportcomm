```import api from "./api";
import { AxiosError } from "axios";

// Define a basic type for the login credentials
interface LoginCredentials {
  email: string;
  password: string;
}

// Define the expected response shape from the login endpoint
interface LoginResponse {
  access_token: string;
}

/**
 * Logs in a user.
 * @param credentials - The user's email and password.
 * @returns The login response data containing the access token.
 * @throws Throws an error if the login request fails.
 */
export async function login(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  try {
    const res = await api.post<LoginResponse>("/auth/login", credentials);
    return res.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      // You can handle specific API error responses here
      console.error("Login API error:", error.response?.data);
      throw new Error(error.response?.data?.message || "Login failed");
    }
    // Handle other types of errors
    console.error("An unexpected error occurred during login:", error);
    throw new Error("An unexpected error occurred. Please try again.");
  }
}

import axios from "axios";

// In a real-world application, the baseURL should come from an environment variable
// to easily switch between development, staging, and production environments.
// Example: `baseURL: process.env.EXPO_PUBLIC_API_URL`
const api = axios.create({
  baseURL: "http://localhost:3000",
  timeout: 5000,
});

// You can also add interceptors here to handle tokens, errors, etc. globally.
// For example, to add an authorization token to every request:
/*
api.interceptors.request.use(async (config) => {
  // const token = await getTokenFromStorage(); // Your function to get the auth token
  // if (token) {
  //   config.headers.Authorization = `Bearer ${token}`;
  // }
  return config;
});
*/

export default api;

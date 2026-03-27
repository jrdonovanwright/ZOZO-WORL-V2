/**
 * Axios client — single instance for all backend requests.
 *
 * The Authorization header is managed by services/firebase/auth.ts via an
 * onIdTokenChanged listener. Import that module once at app startup and every
 * request here will automatically carry the current Firebase ID token.
 */
import axios from "axios";
import Constants from "expo-constants";

export const apiClient = axios.create({
  baseURL: Constants.expoConfig?.extra?.apiBaseUrl ?? "http://localhost:8000",
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

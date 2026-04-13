/**
 * Axios client — single instance for all backend requests.
 *
 * The Authorization header is managed by services/firebase/auth.ts via an
 * onIdTokenChanged listener. Import that module once at app startup and every
 * request here will automatically carry the current Firebase ID token.
 */
import axios from "axios";

// EXPO_PUBLIC_* vars are inlined by Metro at bundle time — no Constants needed.
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

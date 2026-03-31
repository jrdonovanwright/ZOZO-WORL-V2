/**
 * useBackendHealth — checks if the FastAPI backend is reachable on launch.
 *
 * Calls GET /health with a 5-second timeout. If unreachable, sets
 * `isDown` to true so the UI can show a friendly offline message.
 * Retries every 10 seconds while down.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/services/api/client";

interface UseBackendHealthReturn {
  isDown: boolean;
  isChecking: boolean;
  retry: () => void;
}

const HEALTH_TIMEOUT_MS = 5000;
const RETRY_INTERVAL_MS = 10000;

export function useBackendHealth(): UseBackendHealthReturn {
  const [isDown, setIsDown] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    try {
      await apiClient.get("/health", { timeout: HEALTH_TIMEOUT_MS });
      setIsDown(false);
      setIsChecking(false);
      // Stop retrying once healthy
      if (retryRef.current) {
        clearInterval(retryRef.current);
        retryRef.current = null;
      }
    } catch {
      setIsDown(true);
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
    return () => {
      if (retryRef.current) clearInterval(retryRef.current);
    };
  }, [check]);

  // Auto-retry when down
  useEffect(() => {
    if (isDown && !retryRef.current) {
      retryRef.current = setInterval(check, RETRY_INTERVAL_MS);
    }
    return () => {
      if (!isDown && retryRef.current) {
        clearInterval(retryRef.current);
        retryRef.current = null;
      }
    };
  }, [isDown, check]);

  const retry = useCallback(() => {
    setIsChecking(true);
    check();
  }, [check]);

  return { isDown, isChecking, retry };
}

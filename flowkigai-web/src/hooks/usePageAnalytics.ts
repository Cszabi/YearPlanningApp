import { useEffect, useRef, useCallback } from "react";
import { analyticsApi } from "@/api/analyticsApi";

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function detectDeviceType(): string {
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
}

/**
 * Tracks page session lifecycle (start/end) and exposes logAction().
 *
 * Usage:
 *   const { logAction } = usePageAnalytics("/goals");
 *
 * The `page` parameter must be an explicit string — not derived from the URL —
 * so analytics keys remain stable even if routes change.
 *
 * PRIVACY: logAction() must only be called with structural labels
 * (field names, enum values, IDs). Never pass user-entered text.
 */
export function usePageAnalytics(page: string) {
  const sessionIdRef = useRef<string | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearIdle = useCallback(() => {
    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const resetIdle = useCallback(() => {
    clearIdle();
    idleTimerRef.current = setTimeout(() => {
      const id = sessionIdRef.current;
      if (!id) return;
      sessionIdRef.current = null;
      analyticsApi.endSession(id, "Idle").catch(() => {});
    }, IDLE_TIMEOUT_MS);
  }, [clearIdle]);

  useEffect(() => {
    const deviceType = detectDeviceType();

    analyticsApi
      .startSession(page, deviceType)
      .then((session) => {
        sessionIdRef.current = session.id;
        resetIdle();
      })
      .catch(() => {
        // Start failed — session tracking silently skipped for this visit
      });

    const handleInteraction = () => {
      resetIdle();
    };
    window.addEventListener("mousemove", handleInteraction);
    window.addEventListener("keydown", handleInteraction);
    window.addEventListener("scroll", handleInteraction);
    window.addEventListener("touchstart", handleInteraction);

    const handleBeforeUnload = () => {
      const id = sessionIdRef.current;
      if (!id) return;
      // Null out immediately to prevent cleanup from double-ending
      sessionIdRef.current = null;
      const url = "/api/v1/analytics/page-session/end";
      const payload = JSON.stringify({ sessionId: id, exitType: "Closed" });
      navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("mousemove", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("scroll", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearIdle();

      // SPA navigation — end with Navigated
      const id = sessionIdRef.current;
      if (id) {
        sessionIdRef.current = null;
        analyticsApi.endSession(id, "Navigated").catch(() => {});
      }
    };
  }, [page, resetIdle, clearIdle]);

  /**
   * Fire-and-forget action log. Never throws. No-op if session start failed.
   * PRIVACY: actionLabel and metadata must not contain user-entered free text.
   */
  const logAction = useCallback(
    (actionType: string, actionLabel?: string, metadata?: object) => {
      const id = sessionIdRef.current;
      if (!id) return;
      analyticsApi
        .logAction({
          pageSessionId: id,
          page,
          actionType,
          actionLabel,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        })
        .catch(() => {}); // fire-and-forget
    },
    [page]
  );

  return { logAction };
}

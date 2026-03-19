import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ── API mocks ────────────────────────────────────────────────────────────────
const mockStartSession = vi.hoisted(() => vi.fn());
const mockEndSession = vi.hoisted(() => vi.fn());
const mockLogAction = vi.hoisted(() => vi.fn());

vi.mock("@/api/analyticsApi", () => ({
  analyticsApi: {
    startSession: mockStartSession,
    endSession: mockEndSession,
    logAction: mockLogAction,
  },
}));

import { usePageAnalytics } from "./usePageAnalytics";

// ── sendBeacon mock ──────────────────────────────────────────────────────────
const mockSendBeacon = vi.fn();
Object.defineProperty(navigator, "sendBeacon", {
  value: mockSendBeacon,
  writable: true,
  configurable: true,
});

describe("usePageAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStartSession.mockResolvedValue({ id: "session-123" });
    mockEndSession.mockResolvedValue(undefined);
    mockLogAction.mockResolvedValue(undefined);
    mockSendBeacon.mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Session lifecycle ──────────────────────────────────────────────────────

  it("calls startSession on mount with correct page and deviceType", async () => {
    Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true });
    const { unmount } = renderHook(() => usePageAnalytics("/goals"));

    await waitFor(() => expect(mockStartSession).toHaveBeenCalledWith("/goals", "desktop"));
    unmount();
  });

  it("calls endSession with Navigated on unmount", async () => {
    const { unmount } = renderHook(() => usePageAnalytics("/goals"));
    await waitFor(() => expect(mockStartSession).toHaveBeenCalled());

    unmount();

    await waitFor(() => expect(mockEndSession).toHaveBeenCalledWith("session-123", "Navigated"));
  });

  it("does not call endSession if startSession never returned a sessionId", async () => {
    mockStartSession.mockRejectedValue(new Error("network error"));
    const { unmount } = renderHook(() => usePageAnalytics("/goals"));
    await waitFor(() => expect(mockStartSession).toHaveBeenCalled());

    unmount();

    expect(mockEndSession).not.toHaveBeenCalled();
  });

  // ── logAction ──────────────────────────────────────────────────────────────

  it("logAction fires POST with correct payload", async () => {
    const { result, unmount } = renderHook(() => usePageAnalytics("/goals"));
    await waitFor(() => expect(mockStartSession).toHaveBeenCalled());

    act(() => { result.current.logAction("goal_opened", "goal-123"); });

    expect(mockLogAction).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: "goal_opened", actionLabel: "goal-123" })
    );
    unmount();
  });

  it("logAction is fire-and-forget — rejection does not throw", async () => {
    mockLogAction.mockRejectedValue(new Error("network"));
    const { result, unmount } = renderHook(() => usePageAnalytics("/goals"));
    await waitFor(() => expect(mockStartSession).toHaveBeenCalled());

    expect(() => {
      act(() => { result.current.logAction("goal_opened"); });
    }).not.toThrow();
    unmount();
  });

  it("logAction does nothing if sessionId is null (start failed)", async () => {
    mockStartSession.mockRejectedValue(new Error("fail"));
    const { result, unmount } = renderHook(() => usePageAnalytics("/goals"));
    await waitFor(() => expect(mockStartSession).toHaveBeenCalled());

    act(() => { result.current.logAction("goal_opened"); });

    expect(mockLogAction).not.toHaveBeenCalled();
    unmount();
  });

  // ── Idle detection ─────────────────────────────────────────────────────────

  it("ends session with Idle after 5 minutes of no interaction", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const { unmount } = renderHook(() => usePageAnalytics("/goals"));

    // Flush the startSession promise (microtasks work with fake timers)
    await act(async () => { await Promise.resolve(); });

    act(() => { vi.advanceTimersByTime(5 * 60 * 1000); });

    expect(mockEndSession).toHaveBeenCalledWith("session-123", "Idle");
    // Idle already set sessionIdRef to null, so unmount won't double-end
    unmount();
  });

  it("mousemove resets the idle timer", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const { unmount } = renderHook(() => usePageAnalytics("/goals"));
    await act(async () => { await Promise.resolve(); });

    act(() => { vi.advanceTimersByTime(4 * 60 * 1000); }); // 4 min
    act(() => { window.dispatchEvent(new Event("mousemove")); }); // reset
    act(() => { vi.advanceTimersByTime(4 * 60 * 1000); }); // 4 more min (total 8, but last reset was 4 ago)

    expect(mockEndSession).not.toHaveBeenCalledWith("session-123", "Idle");
    unmount();
  });

  it("keydown resets the idle timer", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const { unmount } = renderHook(() => usePageAnalytics("/goals"));
    await act(async () => { await Promise.resolve(); });

    act(() => { vi.advanceTimersByTime(4 * 60 * 1000); });
    act(() => { window.dispatchEvent(new Event("keydown")); });
    act(() => { vi.advanceTimersByTime(4 * 60 * 1000); });

    expect(mockEndSession).not.toHaveBeenCalledWith("session-123", "Idle");
    unmount();
  });

  it("after reset, idle fires again only after another full 5 minutes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const { unmount } = renderHook(() => usePageAnalytics("/goals"));
    await act(async () => { await Promise.resolve(); });

    act(() => { vi.advanceTimersByTime(4 * 60 * 1000); }); // 4 min in
    act(() => { window.dispatchEvent(new Event("mousemove")); }); // reset at t=4min
    act(() => { vi.advanceTimersByTime(5 * 60 * 1000); }); // advance 5 more min → should fire Idle

    expect(mockEndSession).toHaveBeenCalledWith("session-123", "Idle");
    unmount();
  });

  // ── sendBeacon ─────────────────────────────────────────────────────────────

  it("sendBeacon is called on beforeunload with correct URL and payload", async () => {
    const { unmount } = renderHook(() => usePageAnalytics("/goals"));
    await waitFor(() => expect(mockStartSession).toHaveBeenCalled());

    act(() => { window.dispatchEvent(new Event("beforeunload")); });

    expect(mockSendBeacon).toHaveBeenCalledWith(
      "/api/v1/analytics/page-session/end",
      expect.any(Blob)
    );
    // sessionIdRef was nulled by beacon handler, so unmount won't double-end
    unmount();
  });

  it("fetch is NOT called on beforeunload — sendBeacon is used", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const { unmount } = renderHook(() => usePageAnalytics("/goals"));
    await waitFor(() => expect(mockStartSession).toHaveBeenCalled());

    act(() => { window.dispatchEvent(new Event("beforeunload")); });

    expect(fetchSpy).not.toHaveBeenCalled();
    unmount();
  });

  it("sendBeacon is not called if sessionId is null", async () => {
    mockStartSession.mockRejectedValue(new Error("fail"));
    const { unmount } = renderHook(() => usePageAnalytics("/goals"));
    await waitFor(() => expect(mockStartSession).toHaveBeenCalled());

    act(() => { window.dispatchEvent(new Event("beforeunload")); });

    expect(mockSendBeacon).not.toHaveBeenCalled();
    unmount();
  });

  // ── Device detection ───────────────────────────────────────────────────────

  it("detects mobile when window.innerWidth < 768", async () => {
    Object.defineProperty(window, "innerWidth", { value: 375, configurable: true });
    const { unmount } = renderHook(() => usePageAnalytics("/goals"));

    await waitFor(() =>
      expect(mockStartSession).toHaveBeenCalledWith(expect.any(String), "mobile")
    );
    unmount();
  });

  it("detects tablet when window.innerWidth >= 768 and < 1024", async () => {
    Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });
    const { unmount } = renderHook(() => usePageAnalytics("/goals"));

    await waitFor(() =>
      expect(mockStartSession).toHaveBeenCalledWith(expect.any(String), "tablet")
    );
    unmount();
  });

  it("detects desktop when window.innerWidth >= 1024", async () => {
    Object.defineProperty(window, "innerWidth", { value: 1440, configurable: true });
    const { unmount } = renderHook(() => usePageAnalytics("/goals"));

    await waitFor(() =>
      expect(mockStartSession).toHaveBeenCalledWith(expect.any(String), "desktop")
    );
    unmount();
  });
});

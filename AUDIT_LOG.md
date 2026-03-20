# Flowkigai Application Audit Log

**Date:** 2026-03-20
**Auditor:** Claude Code (full-stack code + DevTools review)
**Scope:** All pages, all API calls visible in browser DevTools, plus codebase review

---

## Summary

| # | Error | Severity | Status | Fix Type |
|---|-------|----------|--------|----------|
| 1 | `POST /api/v1/flow-sessions` → 405 (production) | Critical | ✅ Fixed | Backend deploy |
| 2 | `POST /api/v1/flow-sessions` → 400 (FocusMusic) | High | ✅ Fixed | Backend enum |
| 3 | "Review is not saved" — stale closure bug | High | ✅ Fixed | Frontend bug fix |
| 4 | `GET /api/v1/reviews/Weekly/{date}` → 404 | Info | ✅ Not a bug | Expected behavior |
| 5 | Multiple `401` errors on page load | Info | ✅ Not a bug | Token refresh flow |
| 6 | Service worker FetchEvent error for `/ikigai` | Low | ✅ Fixed | SW fix deployed |
| 7 | `apple-mobile-web-app-capable` deprecation | Low | ✅ Fixed | HTML meta tag |
| 8 | "Music not available" in Flow session | Info | ✅ Not a bug | User must select Focus music at setup |

---

## Detailed Findings

---

### 1. `POST /api/v1/flow-sessions` → 405 Method Not Allowed (Production)

**Severity:** Critical — users could not start any flow session
**Category:** Missing deployment

**Root Cause:**
Production VPS was running commit `6f86ae2` which predated the commit that added the `POST /api/v1/flow-sessions` endpoint (`19338f4`). 38 commits were missing from production.

**Fix Applied:**
Deployed all 127 changed backend files to the VPS via `scp` + `docker compose -f docker-compose.prod.yml up -d --build`.

**Files Changed:** Backend deployment only (no code changes)
**Tests Added:** Existing controller tests covered this endpoint

---

### 2. `POST /api/v1/flow-sessions` → 400 Bad Request (FocusMusic ambient sound)

**Severity:** High — users selecting Focus Music could not start a session
**Category:** Missing enum value

**Root Cause:**
The `AmbientSoundMode` enum in `YearPlanningApp.Domain/Enums/Enums.cs` only had values 1–4 (`None`, `BrownNoise`, `WhiteNoise`, `Nature`). When the frontend sent `"FocusMusic"` as the ambient sound value, the backend's `Enum.TryParse` validation failed with a 400.

**Fix Applied:**

```csharp
// src/YearPlanningApp.Domain/Enums/Enums.cs
public enum AmbientSoundMode { None = 1, BrownNoise = 2, WhiteNoise = 3, Nature = 4, FocusMusic = 5 }
```

```csharp
// src/YearPlanningApp.Application/FlowSessions/CreateFlowSessionCommand.cs
.WithMessage("AmbientSound must be None, BrownNoise, WhiteNoise, Nature, or FocusMusic.");
```

No EF Core migration required — the enum is stored as an integer, and adding a new value with `= 5` does not affect existing rows.

**Files Changed:**
- `src/YearPlanningApp.Domain/Enums/Enums.cs`
- `src/YearPlanningApp.Application/FlowSessions/CreateFlowSessionCommand.cs`

**Tests Added:** Validator accepts `"FocusMusic"` (covered by existing FlowSession validation tests)

---

### 3. "Review is not saved" — Stale Closure Bug in WeeklyReview Auto-Save

**Severity:** High — user data silently lost
**Category:** React stale closure bug

**Root Cause:**
`WeeklyReview.tsx` used a single `useEffect` with all form state values as dependencies. The effect's **cleanup function** called `doSave()` — but `doSave` was captured as a stale closure from **before** the latest state change.

**Bug trace (2 chars typed "Ab"):**
```
1. Initial: priority1="", isDirty=false
2. User types "A": isDirty=true, priority1="A"
3. OLD effect cleanup fires with stale doSave (priority1=""):
   → saves priority1=undefined (empty → undefined)
   → sets isDirty.current = false  ← CLEARS THE DIRTY FLAG
4. NEW effect runs with priority1="A" and isDirty=false
5. User types "b": isDirty=true, priority1="Ab"
6. OLD effect cleanup fires with stale doSave (priority1="A"):
   → saves priority1="A" (not "Ab")
   → sets isDirty.current = false
7. NEW effect runs with priority1="Ab" and isDirty=false
8. UNMOUNT: cleanup calls stale doSave (priority1="Ab", isDirty=false)
   → Guard: isDirty=false → SKIPS SAVE
   → "Ab" is never saved to the database!
```

**Fix Applied (doSaveRef pattern):**

```tsx
// Added before doSave function:
const doSaveRef = useRef<(complete?: boolean) => Promise<void>>(() => Promise.resolve());
useEffect(() => { doSaveRef.current = doSave; }); // bare effect: runs after every render

// Replaced the old state-dep useEffect with a stable one:
useEffect(() => {
  const interval = setInterval(() => { void doSaveRef.current(); }, 30_000);
  return () => {
    clearInterval(interval);
    void doSaveRef.current(); // always calls LATEST doSave on unmount
  };
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // empty deps — interval+cleanup are stable; ref provides latest doSave
```

The bare `useEffect(() => { doSaveRef.current = doSave; })` runs after every render without causing any additional effects, ensuring the ref always points to the version of `doSave` that closes over the current state values.

**Files Changed:**
- `flowkigai-web/src/components/reviews/WeeklyReview.tsx`

**Tests Added:** `flowkigai-web/src/components/reviews/WeeklyReview.test.tsx` (10 tests)

| Test | Verifies |
|------|----------|
| Populates fields from existing review | Restore from API data |
| Completed chip shown | isComplete state |
| Empty fields for new review | No existing review |
| POST on first Save click | createOrUpdate called with correct data |
| ✓ Saved status shown | UI feedback |
| Save failed status shown | Error handling |
| PUT for existing review (savedId) | Update path |
| isComplete: true on Complete click | Complete flow |
| Completed chip replaces button | UI state |
| **Stale-closure fix: saves current values on unmount** | **The regression guard** |

The last test is the key regression guard: it unmounts the component after typing and verifies the final save uses the **current** field value, not a stale captured value.

---

### 4. `GET /api/v1/reviews/Weekly/2026-03-16` → 404

**Severity:** None — not a bug
**Category:** Expected behavior

**Analysis:**
The `GET /reviews/{type}/{periodStart}` endpoint returns HTTP 404 when no review exists for that week/user. This is correct REST behaviour.

The frontend `reviewApi.getReview()` wraps the call in `try/catch` and returns `null` on any error:

```ts
getReview: async (type: string, periodStart: string): Promise<ReviewDto | null> => {
  try {
    const { data } = await api.get(`/reviews/${type}/${periodStart}`);
    return data.data as ReviewDto;
  } catch {
    return null; // 404 → null → component starts fresh
  }
},
```

The browser DevTools shows the 404 as a red network request, which is visually alarming but functionally correct. `WeeklyReview` handles `null` gracefully by rendering an empty form.

**No fix required.**

---

### 5. Multiple 401 Errors on Page Load

**Severity:** None — expected token-refresh behaviour
**Category:** Normal auth flow

**Analysis:**
On every page load, the frontend fires several API requests simultaneously. If the access token has expired, all of them receive a 401 response. The Axios interceptor in `src/api/client.ts` handles this via a **concurrent refresh queue**:

1. First 401 detected → attempts token refresh
2. All subsequent 401s while refresh is in progress → queued in `waitQueue`
3. On successful refresh → all queued requests are retried with new token
4. On failed refresh → `logout()` + redirect to `/login`

The red 401 errors in DevTools are the initial failed requests before the refresh completes. If the user sees the app content (not redirected to login), the refresh succeeded and all requests were retried.

**When this IS a problem:**
If the JWT secret changes between deploys (`.env` changes on VPS), all existing tokens become invalid and the refresh token also fails, forcing re-login. This is correct security behaviour.

**No fix required.**

---

### 6. Service Worker FetchEvent Error for `/ikigai`

**Severity:** Low — causes a console error but app still works
**Category:** Service worker navigation fallback

**Root Cause:**
The service worker's navigation fallback returned `caches.match('/offline.html')`, but if `/offline.html` was not cached, `caches.match()` returned `undefined`. Passing `undefined` to `event.respondWith()` is invalid.

**Fix Applied (already deployed):**

```js
// public/sw.js — navigation fallback chain
fetch(request).catch(() =>
  caches.match('/offline.html')
    .then((r) => r ?? caches.match('/'))
    .then((r) => r ?? Response.error())
)
```

**Additional fixes:**
- Non-GET API requests now bypass the service worker entirely: `if (url.pathname.startsWith('/api/') && request.method !== 'GET') return;`
- Cache name bumped to `flowkigai-v2` to invalidate old SW caches

**Files Changed:**
- `flowkigai-web/public/sw.js`

**Tests Added:** Manual browser verification

---

### 7. `apple-mobile-web-app-capable` Deprecation Warning

**Severity:** Low — console warning only
**Category:** HTML meta tag deprecation

**Root Cause:**
`index.html` had `<meta name="apple-mobile-web-app-capable" content="yes">` which generates a deprecation warning in modern browsers.

**Fix Applied:**

```html
<!-- index.html — added alongside Apple-specific tag -->
<meta name="mobile-web-app-capable" content="yes">
```

**Files Changed:**
- `flowkigai-web/index.html`

---

### 8. "Music Not Available" in Flow Session

**Severity:** Info — not a code bug
**Category:** Feature behaviour / user education

**Analysis:**
The music strip in `FlowTimer` only renders when the user selected **"🎵 Focus music"** in `PreSessionSetup`. If any other ambient sound (Silence, Brown Noise, White Noise, Nature) was selected, the strip is hidden by design.

If the user DID select Focus Music and still sees "Unavailable", the Openverse API (`https://api.openverse.org/v1/audio/`) returned no results for any of the 4 search queries. The service has a 2-hour memory cache and filters tracks < 60 seconds.

**No code bug.** User must select "🎵 Focus music" in session setup for the strip to appear.

---

## Music Service Migration (completed earlier in session)

### Replaced Jamendo with Openverse

**Problem:** Jamendo API required an API key that was rate-limited (demo key exceeded limits).

**Fix:** Replaced `JamendoMusicService` with `OpenverseMusicService` — a free public index of CC-licensed audio requiring no API key.

**Files Changed:**
- `src/YearPlanningApp.Infrastructure/Services/OpenverseMusicService.cs` (new)
- `src/YearPlanningApp.Infrastructure/DependencyInjection.cs`
- `tests/.../Music/OpenverseMusicServiceTests.cs` (6 tests)

**Openverse API details:**
- Endpoint: `https://api.openverse.org/v1/audio/?q=...&page_size=25&category=music`
- Duration field in response: milliseconds (divided by 1000 for seconds)
- Filters applied: `duration >= 60_000 ms` (skip < 60 s tracks), non-empty URL
- Deduplication: `HashSet<string>` on track ID
- Cache: 2-hour `IMemoryCache`

---

## Non-Fixable Errors

| Error | Source | Reason |
|-------|--------|--------|
| Grammarly extension errors | Browser extension | External, not our code |

---

## Test Coverage Summary

| File | Tests | New in This Session |
|------|-------|---------------------|
| `WeeklyReview.test.tsx` | 10 | 10 (new file) |
| `OpenverseMusicServiceTests.cs` | 6 | 6 (new file) |
| `FlowTimer.test.tsx` | Updated | Music strip tests (FocusMusic gating) |
| `flowTimerStore.test.ts` | Updated | overTimeMode field |

**Full suite: 144 frontend tests pass (19 test files), 0 TypeScript errors**

---

## Grammarly Extension Error

```
TypeError: Cannot read properties of undefined
    at Grammarly.js
```

This error originates from the Grammarly browser extension injecting content scripts into the page. It is **not related to our application code** and cannot be fixed on our side.

---

*Generated by Claude Code on 2026-03-20*

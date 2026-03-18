# Flowkigai — New Feature Session Prompts (Post-Beta)

## How to Use These Prompts

**Start every session with:**
```
Read CLAUDE.md before writing any code.
```

**Commit discipline — paste this after the opening line in every prompt:**
```
COMMIT DISCIPLINE:
Each logical unit of work in this session must be its own commit.
Do not batch everything into a single commit at the end.

Commit after each of these completes:
- Backend changes (entity, migration, command/query, controller) → commit
- Frontend changes (component, routing, store update) → commit

Commit message format:
feat: [short description of what was added or fixed]

Examples:
feat: add IkigaiCategory and Icon fields to MindMapNode
feat: mind map node edit side panel with all fields
fix: habit goal creation from mind map convert flow

Never commit broken or partially working code.
Each commit must leave the app in a buildable, runnable state.
```

**If Claude Code goes off-spec:**
```
Stop. Re-read the relevant part of CLAUDE.md.
Your implementation conflicts with the spec in these ways: [list].
Revert and follow the spec exactly.
```

**Recommended execution order:**
7.0 (must be first — unblocks everything else)
→ 7.1 → 7.2 (run together — both touch node components)
→ 7.3 → 7.4 (Goal Detail page must exist before habit fix)
→ 7.5 (independent, can run any time)

> Landing page dark theme + logo: see **flowkigai-landing-fixes.md**

---

## Session 7 — Mind Map Enhancements + Goal Detail + Habit Fix

### Prompt 7.0 — Fix: Edit + Delete for Notes, Tasks and Milestones

```
Continue building the Flowkigai Year Planning App.
Read CLAUDE.md before writing any code.

COMMIT DISCIPLINE:
Each logical unit of work in this session must be its own commit.
Do not batch everything into a single commit at the end.
Commit after each area fixed: notes, tasks, milestones.
Commit message format: fix: [short description]
Never commit broken code — each commit must leave the app buildable and runnable.

Your task: Fix missing edit and delete functionality for notes,
tasks and milestones. These are currently read-only — that must be corrected
before any other session 7 work begins.

INVESTIGATION STEPS (do these first):
1. Check each entity — confirm which of UpdateNoteCommand, DeleteNoteCommand,
   UpdateTaskCommand, DeleteTaskCommand, UpdateMilestoneCommand,
   DeleteMilestoneCommand exist in the Application layer.
   List any that are missing.
2. Check each controller — confirm which PUT/PATCH and DELETE endpoints
   are wired up for /api/v1/notes, /api/v1/tasks, /api/v1/milestones.
   List any that are missing.
3. Check the frontend — confirm which components render an edit or delete
   control for notes, tasks and milestones.
   List any that are missing or non-functional.

BACKEND — add any missing pieces:

Notes:
- UpdateNoteCommand (id, content) → OneOf<NoteDto, NotFoundError, ValidationError>
- DeleteNoteCommand (id) → OneOf<SuccessResult, NotFoundError>
- PUT /api/v1/notes/{id}
- DELETE /api/v1/notes/{id}

Tasks:
- UpdateTaskCommand (id, title, dueDate, isNextAction, status)
  → OneOf<TaskItemDto, NotFoundError, ValidationError>
- DeleteTaskCommand (id) → OneOf<SuccessResult, NotFoundError>
- PUT /api/v1/tasks/{id}
- DELETE /api/v1/tasks/{id}

Milestones:
- UpdateMilestoneCommand (id, title, dueDate, isCompleted)
  → OneOf<MilestoneDto, NotFoundError, ValidationError>
- DeleteMilestoneCommand (id) → OneOf<SuccessResult, NotFoundError>
- PUT /api/v1/milestones/{id}
- DELETE /api/v1/milestones/{id}

All commands follow the existing OneOf + Mediator pattern.
All handlers must verify the entity belongs to the current user before
modifying or deleting — return NotFoundError if not found or unauthorised.

FRONTEND — add missing edit/delete controls:

Notes (wherever notes are displayed — goal cards, mind map side panel, etc.):
- Edit: click note text → becomes a textarea, save on blur or Enter,
  cancel on Escape → PUT /api/v1/notes/{id}
- Delete: hover/focus shows a small trash icon button,
  single confirmation click → DELETE /api/v1/notes/{id}
- Optimistic update: remove from UI immediately, restore on error with toast

Tasks (task list on goal cards and any task views):
- Edit title: click title → inline text input, save on blur or Enter
  → PUT /api/v1/tasks/{id}
- Edit due date: date picker on the existing due date field
  → PUT /api/v1/tasks/{id}
- Toggle IsNextAction: existing ⚡ icon should already toggle —
  confirm it calls PUT /api/v1/tasks/{id} correctly
- Delete: hover shows trash icon, confirmation inline (not a modal)
  → DELETE /api/v1/tasks/{id}

Milestones (milestone list on goal cards and any milestone views):
- Edit title: click title → inline text input, save on blur or Enter
  → PUT /api/v1/milestones/{id}
- Toggle completed: checkbox → PUT /api/v1/milestones/{id}
- Delete: hover shows trash icon, confirmation inline
  → DELETE /api/v1/milestones/{id}

All delete operations show a subtle undo toast for 5 seconds
before the change is considered permanent (optimistic delete pattern).

Done means: notes, tasks and milestones can all be edited inline
and deleted with confirmation, changes persist correctly to the API,
no entity is read-only in the UI.
```

---

### Prompt 7.1 — Mind Map: Ikigai Category Labels + Icons/Emojis

```
Continue building the Flowkigai Year Planning App.
Read CLAUDE.md before writing any code.

COMMIT DISCIPLINE:
Each logical unit of work in this session must be its own commit.
Do not batch everything into a single commit at the end.
Commit after backend changes, commit after frontend changes.
Commit message format: feat: [short description]
Never commit broken code — each commit must leave the app buildable and runnable.

Your task: Enhance mind map nodes with Ikigai category labels and emoji icons.

BACKEND:

1. Add IkigaiCategory enum to Domain if not already present:
   Love, GoodAt, WorldNeeds, PaidFor, Intersection

2. Add IkigaiCategory (nullable) and Icon (string, nullable, max 10 chars)
   fields to MindMapNode entity. Create EF Core migration.

3. Extend UpdateNodeCommand to accept IkigaiCategory and Icon fields.
   Extend MindMapNodeDto to include both fields.

FRONTEND:

Update all custom React Flow node components (BranchNode, LeafNode, GoalNode):

IkigaiCategory badge:
- Show a small pill/badge below the node label when IkigaiCategory is set
- Colour-coded per category:
  Love → rose/pink (#F43F5E)
  GoodAt → violet (#7C3AED)
  WorldNeeds → teal (#0D6E6E)
  PaidFor → amber (#F5A623)
  Intersection → coral (#E8705A)
- Label text: "💛 Love" / "💪 Good At" / "🌍 World Needs" / "💰 Paid For" / "✨ Intersection"
- Keep badge compact — max width 90px, small font (10px)

Icon display:
- Show the node's Icon (emoji or symbol) to the LEFT of the node label
- If no icon set, show nothing (no placeholder)
- Node label and icon sit on the same line

Node edit panel (right-click → "Edit node"):
- Add IkigaiCategory dropdown (None + 5 options with emoji labels)
- Add Icon field: small text input with placeholder "e.g. 🎯 or 📚"
  Show hint: "Paste any emoji"
- Save button → PATCH /api/v1/mindmap/nodes/{nodeId}

Done means: existing nodes show category badge and icon correctly,
badge colours match the Ikigai palette,
editing saves to API and updates the canvas without full reload.
```

---

### Prompt 7.2 — Mind Map: Inline Node Editing

```
Continue building the Flowkigai Year Planning App.
Read CLAUDE.md before writing any code.

COMMIT DISCIPLINE:
Each logical unit of work in this session must be its own commit.
Do not batch everything into a single commit at the end.
Commit after backend changes, commit after frontend changes.
Commit message format: feat: [short description]
Never commit broken code — each commit must leave the app buildable and runnable.

Your task: Make mind map nodes fully editable inline and via a side panel.

CURRENT STATE:
Double-click currently triggers inline label edit (contentEditable).
Right-click opens a context menu. Extend both.

CHANGES:

Inline label editing (double-click):
- On double-click, make the label contentEditable
- Show a thin teal border around the node to signal edit mode
- Save on Enter or blur → PATCH /api/v1/mindmap/nodes/{nodeId} (label only)
- Cancel on Escape → revert to original label
- Prevent React Flow panning while editing (stopPropagation on mousedown)

Node edit side panel (right-click → "Edit node"):
Open a slide-in panel from the right (not a modal — keep the canvas visible):
- Label field (text input, pre-filled)
- Icon field (emoji input, pre-filled)
- IkigaiCategory dropdown (None + 5 options)
- Notes field (textarea, multiline)
- Life Area dropdown (only shown for Branch and Leaf nodes)
- "Save" button → PATCH /api/v1/mindmap/nodes/{nodeId}
- "Delete node" button (destructive, red, confirmation inline)
- Panel closes on Escape or clicking outside canvas area

Context menu updates:
- Remove "Edit notes" option — replace with "Edit node" (opens side panel)
- Keep "Add child node", "Convert to goal", "Delete node"

BACKEND:
Extend UpdateNodeCommand to accept Notes and LifeArea fields if not already present.
Extend MindMapNodeDto accordingly.

Done means: double-click edits label inline with keyboard save/cancel,
right-click opens side panel with all fields,
all changes persist correctly, canvas stays responsive during edits.
```

---

### Prompt 7.3 — Goal Detail Page

```
Continue building the Flowkigai Year Planning App.
Read CLAUDE.md before writing any code.

COMMIT DISCIPLINE:
Each logical unit of work in this session must be its own commit.
Do not batch everything into a single commit at the end.
Commit after backend changes, commit after frontend changes.
Commit message format: feat: [short description]
Never commit broken code — each commit must leave the app buildable and runnable.

Your task: Build a dedicated Goal Detail page where all goal settings
and tasks can be viewed and edited.

ROUTING:
Add route /goals/:goalId to the React app.
GoalCard "Open" button (or clicking the card title) navigates to this route.
Back button returns to /goals.

BACKEND:

1. Add GetGoalDetailQuery → OneOf<GoalDetailDto, NotFoundError>
   GoalDetailDto includes: all Goal fields, SmartGoal, WoopReflection,
   all Milestones, all TaskItems, linked MindMapNode label (if any),
   aligned value names.

2. Add UpdateGoalCommand → OneOf<GoalDto, NotFoundError, ValidationError>
   Accepts: Title, Description, TargetDate, EnergyLevel, LifeArea,
   Status, AlignedValueNames.

3. Add UpdateSmartGoalCommand → OneOf<SmartGoalDto, NotFoundError>
   Add UpdateWoopCommand → OneOf<WoopDto, NotFoundError>

4. Add UpdateTaskCommand → OneOf<TaskItemDto, NotFoundError>
   (update title, due date, IsNextAction, status)
   Add DeleteTaskCommand → OneOf<SuccessResult, NotFoundError>

FRONTEND:
Create GoalDetailPage.tsx with three sections:

HEADER:
- Goal title (editable inline on click)
- Status badge (On Track / At Risk / Paused / Completed) — clickable dropdown
- Life area badge + energy level indicator
- Target date with days remaining
- Progress bar (% from completed tasks)
- "Start Flow Session" button → pre-fills FlowTimer with this goalId

TABS:

Tab 1 — Overview:
- "Why it matters" text (editable)
- Aligned values chips (editable — opens values picker)
- Linked mind map node label (read only, with link to mind map)

Tab 2 — SMART + WOOP:
- Show all 5 SMART criteria in card format (each editable on click)
- Show all 4 WOOP fields in card format (each editable on click)
- Auto-save on blur with subtle "Saved" toast

Tab 3 — Tasks & Milestones:
- Task list: checkbox, title, due date, ⚡ IsNextAction toggle
- Inline "Add task" row at the bottom (text input + Enter to save)
- Click task title → inline edit
- Swipe left or hover → delete button (with confirmation)
- Milestones section below tasks (same edit pattern)

Tab 4 — Habit (only shown if GoalType = Repetitive):
- Frequency, MinimalViableDose, Trigger, CelebrationRitual fields
- All editable in place
- Streak display (current + longest)
- Last 30 days habit log calendar (filled dot = logged)
- "Log today" button

Done means: goal detail page loads with real data,
all fields editable and saved to API,
task CRUD works inline, navigation to/from goals list is clean.
```

---

### Prompt 7.4 — Habit Fix: Mind Map → Habit Goal Flow

```
Continue building the Flowkigai Year Planning App.
Read CLAUDE.md before writing any code.

COMMIT DISCIPLINE:
Each logical unit of work in this session must be its own commit.
Do not batch everything into a single commit at the end.
Commit after backend fix, commit after frontend fix.
Commit message format: fix: [short description]
Never commit broken code — each commit must leave the app buildable and runnable.

Your task: Fix the broken habit creation flow from the mind map.

BUG DESCRIPTION:
When a user right-clicks a node in the mind map and selects "Convert to goal",
then chooses "Habit (recurring)", nothing happens. The habit goal is not created
and no error is shown.

INVESTIGATION STEPS (do these first):
1. Check ConvertNodeToGoalCommand handler — verify it correctly handles
   GoalType.Repetitive and creates the Goal entity with GoalType set.
2. Check the frontend "Convert to goal" modal — verify it correctly passes
   goalType: "repetitive" (or the correct enum value) to the API call.
3. Check the API controller — verify the route and binding accept GoalType correctly.
4. Check the Goals frontend — verify RepetitiveGoalForm.tsx is reachable
   from the mind map conversion flow (not just from the Goals tab).
5. Log the actual API request and response in browser devtools to pinpoint
   where the failure occurs.

FIXES:

Backend:
- If ConvertNodeToGoalCommand does not handle GoalType.Repetitive, add the branch.
- Ensure the created Goal has GoalType = Repetitive and a default HabitFrequency.
- Ensure the node's NodeType is updated to Goal after conversion.
- Return a clear error (ValidationError via OneOf) if required habit fields are missing,
  not a silent 500.

Frontend:
- "Convert to goal" modal: after user selects "Habit", show a minimal inline form:
  * Frequency selector (Daily / Weekly / Monthly)
  * Minimal viable dose field
  These are the only required fields. All other habit details editable on Goal Detail page.
- On confirm → POST to API → on success navigate to /goals/:newGoalId (Goal Detail page)
  so user can complete the remaining habit settings.
- Show a toast error if the API call fails — never silently swallow errors.

Done means: selecting "Habit" in the convert-to-goal modal creates a repetitive goal,
the new goal appears in the Goals list with correct GoalType,
user is navigated to the Goal Detail page to complete habit setup.
```

---

---

### Prompt 7.5 — Mind Map: Deadline Filter + Focus Mode

```
Continue building the Flowkigai Year Planning App.
Read CLAUDE.md before writing any code.

COMMIT DISCIPLINE:
Each logical unit of work in this session must be its own commit.
Do not batch everything into a single commit at the end.
Commit after: backend query, deadline filter UI, focus mode colour logic.
Commit message format: feat: [short description]
Never commit broken code — each commit must leave the app buildable and runnable.

Your task: Add a deadline filter and a focus mode colour system to the mind map.

---

DEFINITIONS:

Node completeness (for focus mode colour logic):
- Undefined (grey): GoalNode with no tasks, no milestones, and no SMART goal saved
- Defined but not started (light grey): GoalNode has tasks or milestones but
  none are completed
- In progress / on time (light green): GoalNode has tasks, at least one completed,
  and TargetDate is more than 5 days away
- Needs attention (yellow): GoalNode TargetDate is within 5 days and
  not all tasks are completed
- Overdue (red): GoalNode TargetDate has passed and goal is not completed
- Done (green): GoalNode status is Completed

Non-goal nodes (Root, Branch, Leaf) are not coloured by focus mode —
they inherit their normal style.

---

BACKEND:

1. Extend GetMindMapQuery response (MindMapDto) to include per-node status data
   needed for focus mode. Add to MindMapNodeDto:
   - GoalStatus (GoalStatus enum, nullable — only for GoalNodes)
   - GoalTargetDate (DateTimeOffset, nullable)
   - TaskCount (int)
   - CompletedTaskCount (int)
   - HasSmartGoal (bool)
   - HasMilestones (bool)
   This data must be loaded in a single query (no N+1).
   Join Goal, TaskItem, SmartGoal, Milestone tables when loading nodes.

2. Add GET /api/v1/mindmap/nodes/by-deadline?withinDays={n} endpoint:
   - withinDays accepts: 1, 5, 10, 30
   - Returns list of MindMapNodeIds where the linked Goal has
     TargetDate within the next N days (from today, inclusive)
   - Only returns GoalNodes with an active (non-completed) goal
   - Used by the frontend to know which nodes to show when filter is active

---

FRONTEND:

DEADLINE FILTER (top navigation):

Add to the existing top navigation bar a "Deadline" dropdown
(only visible when the Mind Map tab is active):

Dropdown options:
  [ All ] — default, no filter applied
  [ Next 30 days ]
  [ Next 10 days ]
  [ Next 5 days ]
  [ Tomorrow ]

Behaviour when a filter is selected:
- Call GET /api/v1/mindmap/nodes/by-deadline?withinDays={n}
- Store the returned nodeId list in Zustand (mindMapStore: deadlineFilterNodeIds)
- On the canvas: hide ALL nodes and edges that are NOT in the returned list
  Exception: never hide the Root node — always keep it visible
  Exception: if a Branch node has at least one visible child, keep the Branch visible
  (so the tree structure makes sense)
- Show a visible indicator in the dropdown that a filter is active:
  teal dot or "(filtered)" label next to "Deadline"
- Selecting "All" clears the filter and restores all nodes

FOCUS MODE (separate toggle):

Add a "Focus" toggle button to the mind map canvas toolbar
(the same toolbar that has zoom controls):
- Icon: 🎯 or an eye icon
- Label: "Focus mode"
- Toggle on/off — state stored in Zustand (mindMapStore: isFocusModeActive)

When focus mode is ON, apply colour overrides to GoalNode components
based on the completeness rules defined above:

  Undefined → node background: #E5E7EB (neutral grey), text: #6B7280
  Defined, not started → node background: #F3F4F6, text: #9CA3AF
  In progress / on time → node background: #D1FAE5, text: #065F46,
    border: #6EE7B7
  Needs attention → node background: #FEF9C3, text: #92400E,
    border: #FDE047
  Overdue → node background: #FEE2E2, text: #991B1B,
    border: #FCA5A5
  Done → node background: #BBF7D0, text: #14532D,
    border: #4ADE80

When focus mode is OFF: nodes use their normal style (no colour override).

Focus mode and deadline filter are independent — both can be active at the same time.
When combined: deadline filter hides nodes outside range,
focus mode colours the remaining visible nodes.

LEGEND:
When focus mode is ON, show a small floating legend card
in the bottom-left corner of the canvas:
  ⬜ Not defined
  🟩 Done
  🟢 On track
  🟡 Needs attention
  🔴 Overdue
Card style: white background, subtle shadow, small font (11px), rounded.
Hide the legend when focus mode is OFF.

Done means: deadline filter hides nodes outside the selected range
while keeping root and relevant branch nodes visible,
focus mode colours all GoalNodes correctly based on live data,
both features work independently and in combination,
legend appears and disappears with focus mode toggle.
```

---

## Session 8 — PWA + Push Notifications

**Execution order:** 8.1 → 8.2 → 8.3 (strict — service worker must exist before push handler)

### Prompt 8.1 — PWA Foundation

```
Continue building the Flowkigai Year Planning App.
Read CLAUDE.md before writing any code.

COMMIT DISCIPLINE:
Each logical unit of work in this session must be its own commit.
Do not batch everything into a single commit at the end.
Commit after each logical unit: manifest, service worker, install prompt.
Commit message format: feat: [short description]
Never commit broken code — each commit must leave the app buildable and runnable.

Your task: Turn the existing React app into a fully installable PWA.

WEB APP MANIFEST:
Create /public/manifest.json:
- name: "Flowkigai"
- short_name: "Flowkigai"
- description: "The only productivity app that starts with who you are"
- start_url: "/"
- display: "standalone"
- background_color: "#FAFAF8"
- theme_color: "#0D6E6E"
- orientation: "portrait-primary"
- icons: generate PNG icons at 192x192 and 512x512
  Use the existing logo/brand assets if present in /public,
  otherwise create a simple teal circle with "F" in white serif font
- Add maskable icon variant for Android adaptive icons

Link manifest in index.html:
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#0D6E6E">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Flowkigai">
<link rel="apple-touch-icon" href="/icons/icon-192.png">

SERVICE WORKER:
Create /public/sw.js using the Cache-First strategy for static assets,
Network-First for API calls (/api/*):

Cache on install:
- All static assets (JS, CSS, fonts, icons)
- The root index.html
- Offline fallback page (/offline.html — create a minimal styled page:
  "You're offline. Flowkigai will be back when you reconnect.")

Runtime caching:
- /api/* → NetworkFirst, fallback to cache if offline
- Google Fonts / CDN assets → CacheFirst, 30 day expiry

Register the service worker in main.tsx:
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}

INSTALL PROMPT:
Create InstallPromptBanner.tsx:
- Listen for the beforeinstallprompt event
- Store the event, show a dismissible banner at the bottom of the screen:
  "Install Flowkigai for the best experience  [Install] [Not now]"
- Style: teal background, white text, full width on mobile
- On "Install": call prompt() on the stored event
- On "Not now": dismiss and store dismissal in localStorage
  (do not show again for 7 days)
- On iOS (where beforeinstallprompt is not fired): show a different banner:
  "Tap Share → Add to Home Screen to install Flowkigai"
  with the iOS share icon inline

Show InstallPromptBanner in App.tsx only when not already running in standalone mode:
window.matchMedia('(display-mode: standalone)').matches

Done means: Lighthouse PWA audit passes (installable, has manifest, has SW),
app can be installed on Android and iOS home screen,
offline fallback page shows when network is unavailable,
install prompt appears correctly on first visit.
```

---

### Prompt 8.2 — Push Notification Backend

```
Continue building the Flowkigai Year Planning App.
Read CLAUDE.md before writing any code.

COMMIT DISCIPLINE:
Each logical unit of work in this session must be its own commit.
Do not batch everything into a single commit at the end.
Commit after: entity + migration, each Hangfire job, notification service.
Commit message format: feat: [short description]
Never commit broken code — each commit must leave the app buildable and runnable.

Your task: Build the push notification backend using Web Push and Hangfire.

PACKAGE:
Add WebPush 3.3.x (MIT licensed) to Infrastructure project.
This handles VAPID key signing and Web Push protocol.

VAPID KEYS:
Generate a VAPID key pair on first run if not present in config.
Store in appsettings (VapidPublicKey, VapidPrivateKey, VapidSubject).
Add GET /api/v1/notifications/vapid-public-key endpoint (no auth required)
— returns the public key so the frontend can subscribe.

ENTITIES:
Create PushSubscription entity:
- Id (Guid)
- UserId (Guid, FK)
- Endpoint (string)
- P256dh (string)         ← Web Push encryption key
- Auth (string)           ← Web Push auth secret
- UserAgent (string, nullable)
- CreatedAt (DateTimeOffset)
- IsActive (bool)
One user can have multiple subscriptions (multiple devices).
EF Core migration.

Create NotificationPreference entity:
- Id (Guid)
- UserId (Guid, FK, unique — one row per user)
- WeeklyReviewEnabled (bool, default true)
- WeeklyReviewDayOfWeek (DayOfWeek, default Sunday)
- WeeklyReviewHour (int, default 18)        ← 6pm
- GoalDeadlineEnabled (bool, default true)
- GoalDeadlineDaysBeforeList (string)       ← JSON: [1, 3, 7] — user-defined
- HabitStreakRiskEnabled (bool, default true)
- HabitStreakRiskHour (int, default 20)     ← 8pm check
- TimezoneId (string, default "UTC")        ← IANA timezone string
EF Core migration.

REPOSITORIES:
Create IPushSubscriptionRepository:
- GetByUserIdAsync
- GetActiveByUserIdAsync
- UpsertAsync (add or update by endpoint)
- DeactivateAsync (by endpoint — called when push returns 410 Gone)

Create INotificationPreferenceRepository:
- GetByUserIdAsync
- UpsertAsync

NOTIFICATION SERVICE:
Create PushNotificationService in Infrastructure:
- SendAsync(userId, title, body, url) — sends to ALL active subscriptions for user
  * Builds Web Push payload: { title, body, icon: "/icons/icon-192.png", url }
  * On 410 Gone response: call DeactivateAsync for that subscription
  * On 429 Too Many Requests: log and skip (do not retry in same job run)
  * Never throw — log errors and continue to next subscription

HANGFIRE JOBS:
Create three recurring jobs, registered at startup:

1. WeeklyReviewReminderJob (runs every hour):
   - Load all users where WeeklyReviewEnabled = true
   - For each user: check if current time (in user's timezone) matches
     their configured DayOfWeek + Hour (within the current hour window)
   - Check if user has NOT already completed a review this week
     (query Review table for current week)
   - If both conditions met: send push notification
     Title: "Time for your weekly review 📋"
     Body: "Take 10 minutes to reflect on your week."
     Url: "/review"

2. GoalDeadlineReminderJob (runs daily at 09:00 UTC):
   - Load all users where GoalDeadlineEnabled = true
   - For each user: load their GoalDeadlineDaysBeforeList (e.g. [1, 3, 7])
   - Query all active goals where TargetDate is exactly N days away
     (one notification per matching N value)
   - Send push notification per matching goal:
     Title: "Goal deadline in {N} day(s) ⏰"
     Body: "{GoalTitle}"
     Url: "/goals/{goalId}"

3. HabitStreakRiskJob (runs daily at configured hour per user, checked hourly):
   - Load all users where HabitStreakRiskEnabled = true
   - For each user: find habits with streak > 0 where today has no HabitLog entry
   - Send one push notification (not one per habit — bundle them):
     Title: "Don't break your streak 🔥"
     Body: "{N} habit(s) still need logging today."
     Url: "/goals"

ENDPOINTS:
POST /api/v1/notifications/subscribe
  Body: { endpoint, p256dh, auth, userAgent }
  → UpsertAsync subscription → return 200

DELETE /api/v1/notifications/unsubscribe
  Body: { endpoint }
  → DeactivateAsync → return 200

GET /api/v1/notifications/preferences
  → return NotificationPreferenceDto

PUT /api/v1/notifications/preferences
  Body: NotificationPreferenceDto
  → UpsertAsync → return updated dto

Done means: VAPID key endpoint returns a key,
subscribe endpoint saves subscription to DB,
all three Hangfire jobs are registered and visible in Hangfire dashboard,
SendAsync correctly delivers a Web Push message to a test subscription.
```

---

### Prompt 8.3 — Push Notification Frontend + Settings

```
Continue building the Flowkigai Year Planning App.
Read CLAUDE.md before writing any code.

COMMIT DISCIPLINE:
Each logical unit of work in this session must be its own commit.
Do not batch everything into a single commit at the end.
Commit after: service worker push handler, permission request flow,
notification settings page.
Commit message format: feat: [short description]
Never commit broken code — each commit must leave the app buildable and runnable.

Your task: Wire push notifications in the frontend and build
the notification preferences settings page.

SERVICE WORKER — PUSH HANDLER:
Add to /public/sw.js:

self.addEventListener('push', event => {
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url }
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  )
})

PUSH SUBSCRIPTION HOOK:
Create usePushNotifications.ts hook:

- On mount: fetch VAPID public key from GET /api/v1/notifications/vapid-public-key
- Check if push is supported: 'PushManager' in window
- Check current permission: Notification.permission
- subscribeToPush():
  * Call Notification.requestPermission()
  * If granted: call registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    })
  * POST subscription to /api/v1/notifications/subscribe
  * Store subscription status in Zustand (isPushEnabled: bool)
- unsubscribeFromPush():
  * Call subscription.unsubscribe()
  * DELETE /api/v1/notifications/unsubscribe
- Export: { isPushSupported, isPushEnabled, subscribeToPush, unsubscribeFromPush }

PERMISSION REQUEST:
In App.tsx, after user logs in (authenticated state):
- Check if push is supported and permission is "default" (not yet asked)
- Wait 30 seconds after login before showing the prompt
  (do not ask immediately on first login)
- Show a dismissible in-app prompt (NOT the browser native prompt yet):
  Card at bottom of screen:
  "Get reminders for your weekly review and habit streaks.
   [Enable notifications] [Maybe later]"
  Style: teal accent, shadcn/ui Card component
- "Enable notifications" → calls subscribeToPush() which triggers browser prompt
- "Maybe later" → dismiss, ask again after 7 days (store in localStorage)
- Never show if permission is already "granted" or "denied"

NOTIFICATION SETTINGS PAGE:
Add a "Notifications" section to the existing user Settings page
(or create /settings if it does not exist yet).

Create NotificationSettings.tsx:

Push toggle (top):
- Master on/off toggle: "Push notifications"
  ON → calls subscribeToPush() if not already subscribed
  OFF → calls unsubscribeFromPush()
- Show current status: "Active on this device" / "Not enabled"

Weekly Review reminder section (shown when push is ON):
- Toggle: "Weekly review reminder" (default on)
- Day of week selector: Mon / Tue / Wed / Thu / Fri / Sat / Sun
  (highlighted pill buttons, teal when selected)
- Time selector: hour dropdown (6am–11pm in 1 hour steps, user's local time)
- Hint: "We'll remind you if you haven't completed your review yet"

Goal deadline reminder section:
- Toggle: "Goal deadline reminders" (default on)
- "Remind me before deadline" multi-select chips:
  [1 day] [3 days] [7 days] [14 days] [30 days]
  User can select multiple. Selected = teal filled chip.
  At least one must be selected if toggle is on.
- Hint: "You'll get one notification per goal per selected interval"

Habit streak reminder section:
- Toggle: "Habit streak reminders" (default on)
- Time selector: "Send reminder at" hour dropdown
- Hint: "Only sent if you have unlogged habits with an active streak"

Timezone display (read only):
- "Your timezone: {detected timezone}"
  Detected automatically from Intl.DateTimeFormat().resolvedOptions().timeZone
  Sent to backend with preferences save

Save button:
- PUT /api/v1/notifications/preferences
- Show "Saved" toast on success
- Auto-save on toggle change (no need to press Save for toggles)
- Manual save only for day/time/days-before changes

Done means: push permission prompt appears after login,
accepting it registers the subscription with the backend,
notification settings page loads user's saved preferences,
all toggles and selectors save correctly,
a test push sent from the Hangfire dashboard is received and
tapped notification opens the correct page in the app.
```

---

## Session 9 — Forgot Password + Password Visibility Toggle

### Prompt 9.1 — Forgot Password Flow + Eye Toggle

```
Continue building the Flowkigai Year Planning App.
Read CLAUDE.md before writing any code.

COMMIT DISCIPLINE:
Each logical unit of work in this session must be its own commit.
Do not batch everything into a single commit at the end.
Commit after: backend (entity + migration + commands + controller), frontend pages, frontend toggles.
Commit message format: feat: [short description]
Never commit broken code — each commit must leave the app buildable and runnable.

Your task: Add a complete forgot-password / email-based reset flow
and a password show/hide eye toggle on all password fields.

---

BACKEND:

1. User entity — add two nullable fields:
   - PasswordResetTokenHash (string?) — stores SHA-256 hex of the plain token
   - PasswordResetTokenExpiresAt (DateTime?) — 1 hour from request time
   EF Core migration: AddPasswordReset

2. IUserRepository — add:
   Task<User?> GetByPasswordResetTokenHashAsync(string tokenHash, CancellationToken ct = default);

3. IAppSettings interface (Application/Common/Interfaces/IAppSettings.cs):
   string AppBaseUrl { get; }
   Implement as AppSettings in Infrastructure/Settings/AppSettings.cs reading "App:BaseUrl" from config.
   Register as singleton in DependencyInjection.cs.

4. ForgotPasswordCommand (Application/Auth/ForgotPasswordCommand.cs):
   - record ForgotPasswordCommand(string Email) : ICommand<SuccessResult>
   - No IAuthenticatedCommand — public endpoint
   - Handler: look up user by email → generate 32-byte random hex token
     → SHA-256 hash → store hash + expiry (1h) → send email via IEmailService
     with link {AppBaseUrl}/reset-password?token={plainToken}
   - Always returns SuccessResult (never reveals if email exists)

5. ResetPasswordCommand (Application/Auth/ResetPasswordCommand.cs):
   - record ResetPasswordCommand(string Token, string NewPassword)
     : ICommand<OneOf<SuccessResult, UnauthorizedError, ValidationError>>
   - Validator: NewPassword.NotEmpty().MinimumLength(8).MaximumLength(128)
   - Handler: SHA-256 hash incoming token → look up by hash → check expiry
     → hash new password with IPasswordHasher<User> → clear reset token fields → save

6. AuthController — add two endpoints:
   POST /api/v1/auth/forgot-password  [EnableRateLimiting("auth")]  body: { email }
   POST /api/v1/auth/reset-password   [EnableRateLimiting("auth")]  body: { token, newPassword }

7. appsettings.json — add:
   "App": { "BaseUrl": "http://localhost:5174" }

---

FRONTEND:

1. authApi.ts (src/api/authApi.ts) — new file:
   forgotPassword(email) → POST /auth/forgot-password
   resetPassword(token, newPassword) → POST /auth/reset-password

2. ForgotPasswordPage.tsx (src/pages/ForgotPasswordPage.tsx) — new:
   - Same Tailwind/plain HTML style as LoginPage
   - Email input + submit → authApi.forgotPassword(email)
   - On success: show "Check your email for a reset link." (no error disclosure)
   - Loading state + error display

3. ResetPasswordPage.tsx (src/pages/ResetPasswordPage.tsx) — new:
   - Reads ?token= from URL (useSearchParams)
   - New password input with show/hide eye toggle (inline SVG, no extra package)
   - authApi.resetPassword(token, newPassword) → on success navigate to /login?reset=true

4. LoginPage.tsx — three additions:
   a) Import useSearchParams; show green "Password reset successfully" banner when ?reset=true
   b) Wrap password input in relative div, add eye toggle button (hold to show)
   c) Add "Forgot password?" link below the password field → /forgot-password

5. RegisterPage.tsx — add eye toggle to the password field (same hold-to-show pattern)

6. App.tsx — add two public routes:
   <Route path="/forgot-password" element={<ForgotPasswordPage />} />
   <Route path="/reset-password" element={<ResetPasswordPage />} />

---

Eye toggle pattern (use inline SVG, no extra package):
- State: const [showPassword, setShowPassword] = useState(false)
- Button: onMouseDown → show, onMouseUp/onMouseLeave → hide
- tabIndex={-1} so it doesn't steal keyboard focus from the form
- Classes: absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600

---

Done means:
- /forgot-password: enter email → "Check your email" message shown
- /reset-password?token=<token>: enter new password → redirected to /login?reset=true
- /login?reset=true: green "Password reset successfully" banner visible
- Eye toggle works on Login, Register, and Reset pages (hold to reveal)
- Backend builds: dotnet build src/YearPlanningApp.Infrastructure (0 errors)
- Frontend builds: npm run build from flowkigai-web/ (0 TypeScript errors)
```

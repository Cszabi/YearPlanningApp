import type { Page } from '@playwright/test';

/* ── Mock user ────────────────────────────────────────────────────────── */

export const MOCK_USER = {
  id: 'user-001',
  email: 'test@flowkigai.com',
  displayName: 'Test User',
  role: 'User' as const,
  plan: 'Pro' as const,
  isEmailVerified: true,
};

export const MOCK_TOKENS = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

/* ── Auth state injection ─────────────────────────────────────────────── */

export function authState() {
  return {
    state: {
      user: MOCK_USER,
      accessToken: MOCK_TOKENS.accessToken,
      refreshToken: MOCK_TOKENS.refreshToken,
    },
    version: 0,
  };
}

/**
 * Inject auth into localStorage via addInitScript.
 * This runs before ANY page scripts, so Zustand picks it up on hydration.
 */
export async function injectAuth(page: Page) {
  await page.addInitScript((state) => {
    localStorage.setItem('flowkigai-auth', JSON.stringify(state));
  }, authState());
}

/* ── Common mock data ─────────────────────────────────────────────────── */

export const MOCK_GOALS = [
  {
    id: 'goal-1',
    year: 2026,
    title: 'Learn TypeScript',
    goalType: 'Project',
    status: 'Active',
    lifeArea: 'LearningGrowth',
    energyLevel: 'Deep',
    whyItMatters: 'Better code quality',
    targetDate: '2026-12-31T00:00:00Z',
    alignedValueNames: [],
    progressPercent: 45,
    completedAt: null,
    smartGoal: null,
    woopReflection: null,
    milestones: [
      {
        id: 'milestone-1',
        title: 'Read the basics',
        targetDate: '2026-06-01T00:00:00Z',
        isComplete: false,
        orderIndex: 0,
        tasks: [
          {
            id: 'task-1',
            goalId: 'goal-1',
            milestoneId: 'milestone-1',
            title: 'Read TypeScript handbook',
            status: 'NotStarted',
            energyLevel: 'Deep',
            estimatedMinutes: 60,
            dueDate: '2026-04-15T00:00:00Z',
            isNextAction: true,
          },
        ],
      },
    ],
  },
  {
    id: 'goal-2',
    year: 2026,
    title: 'Run a marathon',
    goalType: 'Project',
    status: 'Active',
    lifeArea: 'HealthBody',
    energyLevel: 'Deep',
    whyItMatters: 'Physical fitness',
    targetDate: '2026-10-01T00:00:00Z',
    alignedValueNames: [],
    progressPercent: 20,
    completedAt: null,
    smartGoal: null,
    woopReflection: null,
    milestones: [
      {
        id: 'milestone-2',
        title: 'Build endurance',
        targetDate: '2026-07-01T00:00:00Z',
        isComplete: false,
        orderIndex: 0,
        tasks: [
          {
            id: 'task-2',
            goalId: 'goal-2',
            milestoneId: 'milestone-2',
            title: 'Run 5k practice',
            status: 'NotStarted',
            energyLevel: 'Deep',
            estimatedMinutes: 45,
            dueDate: '2026-04-10T00:00:00Z',
            isNextAction: false,
          },
        ],
      },
    ],
  },
];

export const MOCK_HABITS = [
  {
    id: 'habit-1',
    title: 'Meditate',
    frequency: 'Daily',
    currentStreak: 12,
    longestStreak: 30,
    logs: [],
  },
];

export const MOCK_FLOW_INSIGHTS = {
  sessionsThisWeek: 5,
  totalHours: 8.5,
  avgQuality: 4.2,
  peakHour: 10,
};

export const MOCK_NORTH_STAR = {
  statement: 'Help people find clarity and purpose through technology',
  year: 2026,
};

export const MOCK_IKIGAI_JOURNEY = {
  rooms: {
    love: { entries: ['Building software', 'Teaching others'] },
    goodAt: { entries: ['Problem solving', 'System design'] },
    worldNeeds: { entries: ['Better tools', 'Education'] },
    paidFor: { entries: ['Software development', 'Consulting'] },
  },
  synthesis: 'Creating impactful tech products',
  northStar: MOCK_NORTH_STAR,
  values: ['Growth', 'Impact', 'Creativity'],
};

export const MOCK_MINDMAP_NODES = [
  { id: 'node-1', label: 'Root', type: 'Root', x: 0, y: 0, children: ['node-2', 'node-3'] },
  { id: 'node-2', label: 'Branch 1', type: 'Branch', x: 200, y: -100, children: [] },
  { id: 'node-3', label: 'Branch 2', type: 'Branch', x: 200, y: 100, children: [] },
];

export const MOCK_TASKS = [
  {
    id: 'task-1',
    goalId: 'goal-1',
    milestoneId: 'milestone-1',
    title: 'Read TypeScript handbook',
    status: 'NotStarted',
    energyLevel: 'Deep',
    estimatedMinutes: 60,
    dueDate: '2026-04-15T00:00:00Z',
    isNextAction: true,
  },
  {
    id: 'task-2',
    goalId: 'goal-2',
    milestoneId: 'milestone-2',
    title: 'Run 5k practice',
    status: 'NotStarted',
    energyLevel: 'Deep',
    estimatedMinutes: 45,
    dueDate: '2026-04-10T00:00:00Z',
    isNextAction: false,
  },
];

export const MOCK_REVIEWS: unknown[] = [];

export const MOCK_CALENDAR_EVENTS = [
  {
    id: 'cal-1',
    title: 'TypeScript milestone',
    type: 'milestone',
    date: '2026-04-15',
    lifeArea: 'Learning',
    completed: false,
  },
];

export const MOCK_MUSIC_OPTIONS = [
  { id: 'rain', label: 'Rain', url: '' },
  { id: 'forest', label: 'Forest', url: '' },
  { id: 'cafe', label: 'Café', url: '' },
];

/* ── API route interceptor ────────────────────────────────────────────── */

const json = (data: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(typeof data === 'object' && data !== null && 'data' in (data as Record<string, unknown>) ? data : { data }),
});

/**
 * Single catch-all route that intercepts ALL /api/v1 requests.
 * Uses URL path matching to return appropriate mock data.
 * Must be called BEFORE navigating to a page.
 */
export async function mockAllApis(page: Page) {
  await page.route('**/api/v1/**', (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api\/v1/, ''); // e.g. "/goals" or "/ikigai/2026"
    const method = route.request().method();

    // ── Auth ──
    if (path === '/auth/login' && method === 'POST') {
      const body = JSON.parse(route.request().postData() ?? '{}');
      if (body.email === 'test@flowkigai.com' && body.password === 'password123') {
        return route.fulfill(json({
          data: {
            userId: MOCK_USER.id, email: MOCK_USER.email, displayName: MOCK_USER.displayName,
            role: MOCK_USER.role, plan: MOCK_USER.plan, isEmailVerified: MOCK_USER.isEmailVerified,
            accessToken: MOCK_TOKENS.accessToken, refreshToken: MOCK_TOKENS.refreshToken,
          },
        }));
      }
      return route.fulfill(json({ error: { message: 'Invalid email or password.' } }, 401));
    }
    if (path.startsWith('/auth/')) {
      return route.fulfill(json({ data: { accessToken: 'new-token', refreshToken: 'new-refresh' } }));
    }

    // ── Analytics (fire on every page, must respond fast) ──
    if (path.startsWith('/analytics/')) {
      return route.fulfill(json({ id: 'session-mock', page: '/', sessionStart: new Date().toISOString() }));
    }

    // ── Goals ──
    if (path === '/goals' && method === 'GET') return route.fulfill(json(MOCK_GOALS));
    if (path === '/goals' && method === 'POST') return route.fulfill(json({ id: 'goal-new' }, 201));
    if (path.startsWith('/goals/')) return route.fulfill(json(MOCK_GOALS[0]));

    // ── Habits ──
    if (path === '/habits') return route.fulfill(json(MOCK_HABITS));
    if (path.startsWith('/habits/')) return route.fulfill(json(MOCK_HABITS[0]));

    // ── Flow sessions ──
    if (path === '/flow-sessions/insights') return route.fulfill(json(MOCK_FLOW_INSIGHTS));
    if (path === '/flow-sessions/active') return route.fulfill(json(null));
    if (path === '/flow-sessions' && method === 'GET') return route.fulfill(json([]));
    if (path === '/flow-sessions' && method === 'POST') return route.fulfill(json({ id: 'flow-1', status: 'Running' }, 201));
    if (path.startsWith('/flow-sessions/')) return route.fulfill(json({ id: 'flow-1', status: 'Completed' }));

    // ── Ikigai ──
    if (path.match(/^\/ikigai\/\d+$/) && method === 'GET') return route.fulfill(json(MOCK_IKIGAI_JOURNEY));
    if (path.startsWith('/ikigai/')) return route.fulfill(json({}));

    // ── Mind maps ──
    if (path === '/mind-maps') return route.fulfill(json({ nodes: MOCK_MINDMAP_NODES, edges: [] }));
    if (path.match(/^\/mind-maps\/\d+$/)) return route.fulfill(json({ nodes: MOCK_MINDMAP_NODES, edges: [] }));
    if (path.startsWith('/mind-maps/')) return route.fulfill(json({}));

    // ── Tasks ──
    if (path === '/tasks' && method === 'GET') return route.fulfill(json(MOCK_TASKS));
    if (path.startsWith('/tasks/')) return route.fulfill(json(MOCK_TASKS[0]));

    // ── Reviews ──
    if (path.startsWith('/reviews/weekly-data')) return route.fulfill(json({ tasks: [], habits: [], sessions: [], goals: [] }));
    if (path === '/reviews' && method === 'GET') return route.fulfill(json(MOCK_REVIEWS));
    if (path.startsWith('/reviews')) return route.fulfill(json({}));

    // ── Calendar ──
    if (path.startsWith('/calendar')) return route.fulfill(json(MOCK_CALENDAR_EVENTS));

    // ── Milestones ──
    if (path.startsWith('/milestones')) return route.fulfill(json({}));

    // ── Notifications ──
    if (path.startsWith('/notifications')) return route.fulfill(json({}));

    // ── Admin ──
    if (path.startsWith('/admin')) return route.fulfill(json([]));

    // ── Export / Music / DOB ──
    if (path.startsWith('/music')) return route.fulfill(json(MOCK_MUSIC_OPTIONS));
    if (path.startsWith('/export')) return route.fulfill(json({}));

    // ── Catch-all ──
    route.fulfill(json({}));
  });
}

/* ── Navigate to protected page (with auth + mocks) ───────────────────── */

export async function gotoProtected(page: Page, path: string) {
  await injectAuth(page);
  await mockAllApis(page);
  await page.goto(path);
}

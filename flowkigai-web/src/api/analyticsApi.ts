import api from "./client";

export interface PageSessionDto {
  id: string;
  userId: string;
  page: string;
  sessionStart: string;
  sessionEnd: string | null;
  durationSeconds: number | null;
  exitType: string;
  deviceType: string | null;
  actions: UserActionDto[] | null;
}

export interface UserActionDto {
  id: string;
  userId: string;
  pageSessionId: string;
  page: string;
  actionType: string;
  actionLabel: string | null;
  occurredAt: string;
  metadata: string | null;
}

export interface ActionSummaryDto {
  actionType: string;
  count: number;
  percentOfSessions: number;
}

export interface DurationBucketDto {
  label: string;
  count: number;
}

export interface PageAnalyticsDto {
  page: string;
  averageDurationSeconds: number;
  medianDurationSeconds: number;
  totalSessions: number;
  uniqueUsers: number;
  dropOffRate: number;
  topActions: ActionSummaryDto[];
  durationBuckets: DurationBucketDto[];
}

export const analyticsApi = {
  startSession: async (page: string, deviceType: string): Promise<PageSessionDto> => {
    const res = await api.post<{ data: PageSessionDto }>(
      "/analytics/page-session/start",
      { page, deviceType }
    );
    return res.data.data;
  },

  endSession: async (sessionId: string, exitType: string): Promise<void> => {
    await api.post("/analytics/page-session/end", { sessionId, exitType });
  },

  logAction: async (params: {
    pageSessionId: string;
    page: string;
    actionType: string;
    actionLabel?: string;
    metadata?: string;
  }): Promise<void> => {
    await api.post("/analytics/action", params);
  },

  getPageAnalytics: async (
    page: string,
    fromDate: string,
    toDate: string
  ): Promise<PageAnalyticsDto> => {
    const res = await api.get<{ data: PageAnalyticsDto }>(
      `/analytics/pages`,
      { params: { page, fromDate, toDate } }
    );
    return res.data.data;
  },

  getUserJourney: async (
    userId: string,
    fromDate: string,
    toDate: string
  ): Promise<PageSessionDto[]> => {
    const res = await api.get<{ data: PageSessionDto[] }>(
      `/analytics/users/${userId}/journey`,
      { params: { fromDate, toDate } }
    );
    return res.data.data;
  },
};

import api from "./client";

export interface NotificationPreferenceDto {
  weeklyReviewEnabled: boolean;
  weeklyReviewDayOfWeek: number; // 0=Sun...6=Sat
  weeklyReviewHour: number;
  goalDeadlineEnabled: boolean;
  goalDeadlineDaysBeforeList: string; // JSON array "[1,3,7]"
  habitStreakRiskEnabled: boolean;
  habitStreakRiskHour: number;
  timezoneId: string;
}

export interface SubscribeRequest {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
}

const notificationApi = {
  getVapidPublicKey: async (): Promise<string> => {
    const res = await api.get<{ data: { publicKey: string } }>(
      "/notifications/vapid-public-key"
    );
    return res.data.data.publicKey;
  },

  subscribe: async (body: SubscribeRequest): Promise<void> => {
    await api.post("/notifications/subscribe", body);
  },

  unsubscribe: async (endpoint: string): Promise<void> => {
    await api.delete("/notifications/unsubscribe", { data: { endpoint } });
  },

  getPreferences: async (): Promise<NotificationPreferenceDto> => {
    const res = await api.get<{ data: NotificationPreferenceDto }>(
      "/notifications/preferences"
    );
    return res.data.data;
  },

  savePreferences: async (prefs: NotificationPreferenceDto): Promise<void> => {
    await api.put("/notifications/preferences", prefs);
  },
};

export default notificationApi;

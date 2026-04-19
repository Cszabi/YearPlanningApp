import api from "./client";

export interface UserSummaryDto {
  id: string;
  email: string;
  displayName: string;
  role: "User" | "Admin";
  plan: "Free" | "Pro";
  createdAt: string;
  goalCount: number;
  sessionCount: number;
}

export interface UserDetailDto extends UserSummaryDto {
  goalTitles: string[];
  recentSessionDates: string[];
}

export const adminApi = {
  getUsers: async (): Promise<UserSummaryDto[]> => {
    const { data } = await api.get("/admin/users");
    return data.data as UserSummaryDto[];
  },

  getUserDetail: async (id: string): Promise<UserDetailDto> => {
    const { data } = await api.get(`/admin/users/${id}`);
    return data.data as UserDetailDto;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },

  updateUserPlan: async (id: string, plan: "Free" | "Pro"): Promise<UserSummaryDto> => {
    const { data } = await api.put(`/admin/users/${id}/plan`, { plan });
    return data.data as UserSummaryDto;
  },

  generateReleaseNotes: async (sinceDate: string): Promise<string> => {
    const { data } = await api.get(`/admin/release-notes/preview?sinceDate=${sinceDate}`);
    return (data.data as { html: string }).html;
  },

  sendAnnouncement: async (subject: string, htmlBody: string, sinceDate: string): Promise<{ sentCount: number }> => {
    const { data } = await api.post("/admin/send-announcement", { subject, htmlBody, sinceDate });
    return data.data as { sentCount: number };
  },
};

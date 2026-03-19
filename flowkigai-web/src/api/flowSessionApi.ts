import api from "./client";

export interface FlowInsightsDto {
  weekSessionCount: number;
  weekTotalMinutes: number;
  weekAvgFlowQuality: number | null;
  bestHour: number | null;  // 0–23, most productive hour
}

export interface FlowSessionDto {
  id: string;
  goalId: string | null;
  taskItemId: string | null;
  sessionIntention: string | null;
  plannedMinutes: number;
  actualMinutes: number | null;
  startedAt: string;
  endedAt: string | null;
  flowQualityRating: number | null;  // 1–5
  energyAfterRating: number | null;  // 1–5
  outcome: string | null;            // "Fully" | "Partially" | "NotReally"
  wasInterrupted: boolean;
  interruptionReason: string | null;
  blockers: string | null;
  ambientSound: string;
  energyLevel: string;
}

export const flowSessionApi = {
  getActive: async (): Promise<FlowSessionDto | null> => {
    try {
      const { data } = await api.get("/flow-sessions/active");
      return data.data as FlowSessionDto;
    } catch {
      return null;
    }
  },

  start: async (body: {
    goalId?: string;
    taskItemId?: string;
    sessionIntention?: string;
    plannedMinutes: number;
    energyLevel: string;
    ambientSound: string;
  }): Promise<FlowSessionDto> => {
    const { data } = await api.post("/flow-sessions", body, {
      headers: { "Idempotency-Key": crypto.randomUUID() },
    });
    return data.data as FlowSessionDto;
  },

  complete: async (id: string, body: {
    outcome: string;
    flowQualityRating: number;
    energyAfterRating: number;
    blockers?: string;
  }): Promise<FlowSessionDto> => {
    const { data } = await api.patch(`/flow-sessions/${id}/complete`, body);
    return data.data as FlowSessionDto;
  },

  interrupt: async (id: string, reason: string): Promise<FlowSessionDto> => {
    const { data } = await api.patch(`/flow-sessions/${id}/interrupt`, { interruptionReason: reason });
    return data.data as FlowSessionDto;
  },

  getInsights: async (): Promise<FlowInsightsDto> => {
    const { data } = await api.get("/flow-sessions/insights");
    return data.data as FlowInsightsDto;
  },

  getSessions: async (year: number): Promise<FlowSessionDto[]> => {
    const { data } = await api.get(`/flow-sessions?year=${year}`);
    return data.data as FlowSessionDto[];
  },
};

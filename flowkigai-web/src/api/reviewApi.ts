import api from "./client";

export interface CompletedTaskSummary {
  taskId: string;
  title: string;
  goalTitle: string;
}

export interface HabitWeeklySummary {
  habitId: string;
  title: string;
  daysCompleted: number;
  daysExpected: number;
}

export interface FlowWeeklySummary {
  sessionCount: number;
  totalMinutes: number;
  avgFlowQuality: number | null;
  bestOutcome: string | null; // "Fully" | "Partially" | "NotReally"
}

export interface GoalSummary {
  id: string;
  title: string;
}

export interface WeeklyReviewDataDto {
  weekStartDate: string;
  completedTasks: CompletedTaskSummary[];
  carriedOverTasks: CompletedTaskSummary[];
  habitSummaries: HabitWeeklySummary[];
  flowSummary: FlowWeeklySummary;
  activeGoals: GoalSummary[];
}

export interface ReviewAnswers {
  completedTaskNotes?: string;
  carriedOverNote?: string;
  habitNotes?: string;
  priority1?: string;
  priority2?: string;
  priority3?: string;
  flowSessionsScheduled?: string; // "Yes" | "No" | "Planning"
  goalNextActions?: Record<string, string>; // goalId → next action text
  valuesReflection?: string;
}

export interface ReviewDto {
  id: string;
  reviewType: string;       // "Weekly"
  periodStart: string;      // ISO date
  periodEnd: string;
  isComplete: boolean;
  completedAt: string | null;
  energyRating: number | null; // 1–5
  answers: ReviewAnswers;
  createdAt: string;
  updatedAt: string;
}

export const reviewApi = {
  getWeeklyData: async (weekStartDate: string): Promise<WeeklyReviewDataDto> => {
    const { data } = await api.get(`/reviews/weekly-data?weekStartDate=${weekStartDate}`);
    return data.data as WeeklyReviewDataDto;
  },

  getReviews: async (type: string, year: number): Promise<ReviewDto[]> => {
    const { data } = await api.get(`/reviews?type=${type}&year=${year}`);
    return data.data as ReviewDto[];
  },

  getReview: async (type: string, periodStart: string): Promise<ReviewDto | null> => {
    try {
      const { data } = await api.get(`/reviews/${type}/${periodStart}`);
      return data.data as ReviewDto;
    } catch {
      return null;
    }
  },

  createOrUpdate: async (body: {
    reviewType: string;
    periodStart: string;
    energyRating?: number | null;
    answers: ReviewAnswers;
    isComplete?: boolean;
  }): Promise<ReviewDto> => {
    const { data } = await api.post("/reviews", body);
    return data.data as ReviewDto;
  },

  update: async (id: string, body: {
    energyRating?: number | null;
    answers?: ReviewAnswers;
    isComplete?: boolean;
  }): Promise<ReviewDto> => {
    const { data } = await api.put(`/reviews/${id}`, body);
    return data.data as ReviewDto;
  },
};

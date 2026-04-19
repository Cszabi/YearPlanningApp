import client from "./client";

export interface DashboardDto {
  northStar: string | null;
  topValues: string[];
  ikigaiDistribution: IkigaiDistributionDto;
  dailyQuestion: string;
  nextAction: DashboardTaskDto | null;
  todaysTasks: DashboardTaskDto[];
  todaysHabits: DashboardHabitDto[];
  nearestDeadline: DashboardDeadlineDto | null;
  weeklyFlowMinutes: number[];
  activeGoalCount: number;
  flowInsight: DashboardFlowInsightDto | null;
  reviewStatus: "Done" | "Pending" | "Overdue";
  habitStreakRiskCount: number;
  lastReflection: DashboardReflectionDto | null;
}

export interface IkigaiDistributionDto {
  love: number;
  goodAt: number;
  worldNeeds: number;
  paidFor: number;
  intersection: number;
}

export interface DashboardTaskDto {
  id: string;
  goalId: string;
  title: string;
  goalTitle: string;
  status: string;
  dueDate: string | null;
  isNextAction: boolean;
}

export interface DashboardHabitDto {
  goalId: string;
  habitId: string;
  title: string;
  currentStreak: number;
  loggedToday: boolean;
  frequency: string;
}

export interface DashboardDeadlineDto {
  goalId: string;
  title: string;
  targetDate: string;
  daysRemaining: number;
}

export interface DashboardFlowInsightDto {
  bestDayOfWeek: string | null;
  bestHourOfDay: number | null;
  totalDeepWorkMinutesThisWeek: number;
}

export interface DashboardReflectionDto {
  content: string;
  createdAt: string;
}

export const dashboardApi = {
  getDashboard: async (): Promise<DashboardDto> => {
    const res = await client.get("/dashboard");
    return res.data.data;
  },
};

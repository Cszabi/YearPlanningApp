import api from "./client";

export interface HabitLogDto {
  id: string;
  loggedDate: string;   // ISO date string
  notes: string | null;
  durationMinutes: number | null;
}

export interface HabitDto {
  id: string;
  goalId: string;
  title: string;
  frequency: string;            // "Daily" | "Weekly" | "Monthly" | "Custom"
  minimumViableDose: string;
  idealDose: string | null;
  trigger: string | null;
  celebrationRitual: string | null;
  trackingMethod: string;
  currentStreak: number;
  longestStreak: number;
  recentLogs: HabitLogDto[];    // last 30 days, sorted ascending
}

export const habitApi = {
  getHabits: async (year: number): Promise<HabitDto[]> => {
    const { data } = await api.get(`/habits?year=${year}`);
    return data.data as HabitDto[];
  },

  createHabit: async (body: {
    goalId: string;
    year: number;
    title: string;
    frequency: string;
    minimumViableDose: string;
    idealDose?: string;
    trigger?: string;
    celebrationRitual?: string;
    trackingMethod: string;
  }): Promise<HabitDto> => {
    const { data } = await api.post("/habits", body);
    return data.data as HabitDto;
  },

  logHabit: async (id: string, notes?: string): Promise<HabitDto> => {
    const { data } = await api.post(`/habits/${id}/log`, { notes: notes ?? null });
    return data.data as HabitDto;
  },
};

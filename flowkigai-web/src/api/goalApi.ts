import api from "./client";

export interface SmartGoalDto {
  id: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
}

export interface WoopReflectionDto {
  id: string;
  wish: string;
  outcome: string;
  obstacle: string;
  plan: string;
}

export interface TaskDto {
  id: string;
  goalId: string;
  milestoneId: string;
  title: string;
  status: string;
  energyLevel: string;
  estimatedMinutes: number | null;
  dueDate: string | null;
  isNextAction: boolean;
}

export interface MilestoneDto {
  id: string;
  title: string;
  targetDate: string | null;
  isComplete: boolean;
  orderIndex: number;
  tasks: TaskDto[];
}

export interface GoalDto {
  id: string;
  year: number;
  title: string;
  goalType: string;
  status: string;
  lifeArea: string;
  energyLevel: string;
  whyItMatters: string | null;
  targetDate: string | null;
  alignedValueNames: string[];
  progress: number;
  smartGoal: SmartGoalDto | null;
  woopReflection: WoopReflectionDto | null;
  milestones: MilestoneDto[];
}

export const goalApi = {
  getGoals: async (year: number, lifeArea?: string, status?: string): Promise<GoalDto[]> => {
    const params = new URLSearchParams({ year: String(year) });
    if (lifeArea) params.set("lifeArea", lifeArea);
    if (status) params.set("status", status);
    const { data } = await api.get(`/goals?${params}`);
    return data.data as GoalDto[];
  },

  getGoal: async (id: string, year: number): Promise<GoalDto> => {
    const { data } = await api.get(`/goals/${id}?year=${year}`);
    return data.data as GoalDto;
  },

  createGoal: async (body: {
    year: number;
    title: string;
    goalType: string;
    lifeArea: string;
    energyLevel: string;
    whyItMatters?: string;
    targetDate?: string;
    alignedValueNames?: string[];
  }): Promise<GoalDto> => {
    const { data } = await api.post("/goals", body);
    return data.data as GoalDto;
  },

  saveSmart: async (id: string, year: number, body: {
    specific: string;
    measurable: string;
    achievable: string;
    relevant: string;
    timeBound: string;
  }): Promise<GoalDto> => {
    const { data } = await api.put(`/goals/${id}/smart`, { year, ...body });
    return data.data as GoalDto;
  },

  saveWoop: async (id: string, year: number, body: {
    wish: string;
    outcome: string;
    obstacle: string;
    plan: string;
  }): Promise<GoalDto> => {
    const { data } = await api.put(`/goals/${id}/woop`, { year, ...body });
    return data.data as GoalDto;
  },

  updateStatus: async (id: string, year: number, status: string): Promise<GoalDto> => {
    const { data } = await api.patch(`/goals/${id}/status`, { year, status });
    return data.data as GoalDto;
  },

  countActiveDeepGoals: async (year: number): Promise<number> => {
    const goals = await goalApi.getGoals(year, undefined, "Active");
    return goals.filter(g => g.energyLevel === "Deep").length;
  },

  updateTaskStatus: async (taskId: string, status: string): Promise<TaskDto> => {
    const { data } = await api.patch(`/tasks/${taskId}/status`, { status });
    return data.data as TaskDto;
  },

  setNextAction: async (taskId: string, isNextAction: boolean): Promise<TaskDto> => {
    const { data } = await api.patch(`/tasks/${taskId}/next-action`, { isNextAction });
    return data.data as TaskDto;
  },

  createMilestone: async (goalId: string, body: {
    year: number;
    title: string;
    targetDate: string;
    orderIndex?: number;
  }): Promise<MilestoneDto> => {
    const { data } = await api.post(`/goals/${goalId}/milestones`, body);
    return data.data as MilestoneDto;
  },

  createTask: async (goalId: string, milestoneId: string, body: {
    year: number;
    title: string;
    energyLevel?: string;
    estimatedMinutes?: number | null;
    dueDate?: string | null;
    isNextAction?: boolean;
  }): Promise<TaskDto> => {
    const { data } = await api.post(`/goals/${goalId}/milestones/${milestoneId}/tasks`, body);
    return data.data as TaskDto;
  },

  updateTask: async (taskId: string, body: {
    title?: string;
    dueDate?: string | null;
    isNextAction?: boolean;
    status?: string;
  }): Promise<TaskDto> => {
    const { data } = await api.put(`/tasks/${taskId}`, body);
    return data.data as TaskDto;
  },

  deleteTask: async (taskId: string): Promise<void> => {
    await api.delete(`/tasks/${taskId}`);
  },

  updateMilestone: async (milestoneId: string, body: {
    title?: string;
    targetDate?: string | null;
    isComplete?: boolean;
  }): Promise<MilestoneDto> => {
    const { data } = await api.put(`/milestones/${milestoneId}`, body);
    return data.data as MilestoneDto;
  },

  deleteMilestone: async (milestoneId: string): Promise<void> => {
    await api.delete(`/milestones/${milestoneId}`);
  },

  sendEmail: async (goalId: string, year: number): Promise<void> => {
    await api.post(`/goals/${goalId}/email?year=${year}`);
  },
};

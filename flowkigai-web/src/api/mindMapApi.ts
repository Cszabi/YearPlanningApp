import api from "./client";

export interface ProposedNodeDto {
  label: string;
  nodeType: string;
  parentLabel: string | null;
  ikigaiCategory: string | null;
  icon: string | null;
  notes: string | null;
}

export interface SeedMapResultDto {
  proposedNodes: ProposedNodeDto[];
  seedSummary: string;
}

export interface MindMapNodeDto {
  id: string;
  parentNodeId: string | null;
  nodeType: string; // Root | Branch | Leaf | Goal
  label: string;
  notes: string | null;
  positionX: number;
  positionY: number;
  linkedGoalId: string | null;
  ikigaiCategory: string | null; // Love | GoodAt | WorldNeeds | PaidFor | Intersection
  icon: string | null;
  lifeArea: string | null;
  // Goal status fields (populated for GoalNodes only)
  goalStatus: string | null;        // Active | Paused | Achieved | Dropped
  goalTargetDate: string | null;    // ISO 8601 string
  taskCount: number;
  completedTaskCount: number;
  hasSmartGoal: boolean;
  hasMilestones: boolean;
}

export interface MindMapDto {
  id: string;
  year: number;
  nodes: MindMapNodeDto[];
}

export const mindMapApi = {
  getMap: async (year: number): Promise<MindMapDto> => {
    const { data } = await api.get(`/mind-maps/${year}`);
    return data.data as MindMapDto;
  },

  createMap: async (year: number): Promise<MindMapDto> => {
    const { data } = await api.post(`/mind-maps/${year}`);
    return data.data as MindMapDto;
  },

  addNode: async (
    year: number,
    body: { parentNodeId: string | null; nodeType: string; label: string; positionX: number; positionY: number }
  ): Promise<MindMapNodeDto> => {
    const { data } = await api.post(`/mind-maps/${year}/nodes`, body);
    return data.data as MindMapNodeDto;
  },

  updateNode: async (
    year: number,
    nodeId: string,
    body: { label?: string; notes?: string; positionX?: number; positionY?: number; ikigaiCategory?: string; icon?: string; lifeArea?: string }
  ): Promise<MindMapNodeDto> => {
    const { data } = await api.put(`/mind-maps/${year}/nodes/${nodeId}`, body);
    return data.data as MindMapNodeDto;
  },

  deleteNode: async (year: number, nodeId: string): Promise<void> => {
    await api.delete(`/mind-maps/${year}/nodes/${nodeId}`);
  },

  savePositions: async (
    year: number,
    positions: { nodeId: string; x: number; y: number }[]
  ): Promise<void> => {
    await api.patch(`/mind-maps/${year}/nodes/positions`, { positions });
  },

  getNodesByDeadline: async (year: number, withinDays: number): Promise<MindMapNodeDto[]> => {
    const { data } = await api.get(`/mind-maps/${year}/nodes/by-deadline?withinDays=${withinDays}`);
    return data.data as MindMapNodeDto[];
  },

  convertToGoal: async (
    year: number,
    nodeId: string,
    goalType: string,
    lifeArea: string
  ): Promise<{ id: string; title: string }> => {
    const { data } = await api.post(`/mind-maps/${year}/nodes/${nodeId}/convert-to-goal`, { goalType, lifeArea });
    return data.data;
  },

  seedMap: async (
    path: string,
    answers: { question: string; answer: string }[],
    existingNodeLabels: string[]
  ): Promise<SeedMapResultDto> => {
    const { data } = await api.post("/mind-maps/seed", { path, answers, existingNodeLabels });
    return data.data as SeedMapResultDto;
  },

  batchCreateNodes: async (year: number, nodes: ProposedNodeDto[]): Promise<MindMapDto> => {
    const { data } = await api.post(`/mind-maps/${year}/nodes/batch`, { nodes });
    return data.data as MindMapDto;
  },
};

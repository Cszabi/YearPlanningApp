import api from "./client";

export interface IkigaiJourneyDto {
  id: string;
  year: number;
  status: string; // "Draft" | "Complete"
  completedAt: string | null;
  rooms: IkigaiRoomDto[];
  northStar: NorthStarDto | null;
  values: UserValueDto[];
}

export interface IkigaiRoomDto {
  id: string;
  roomType: string; // "Love" | "GoodAt" | "WorldNeeds" | "PaidFor" | "Synthesis"
  answers: string[];
  isComplete: boolean;
}

export interface NorthStarDto {
  id: string;
  statement: string;
  year: number;
}

export interface UserValueDto {
  id: string;
  valueName: string;
  rank: number;
}

export const ikigaiApi = {
  getJourney: async (year: number): Promise<IkigaiJourneyDto> => {
    const { data } = await api.get(`/ikigai/${year}`);
    return data.data as IkigaiJourneyDto;
  },

  startJourney: async (year: number): Promise<IkigaiJourneyDto> => {
    const { data } = await api.post(`/ikigai/${year}/start`);
    return data.data as IkigaiJourneyDto;
  },

  saveRoom: async (
    year: number,
    roomType: number,
    answers: string[],
    isComplete: boolean
  ): Promise<IkigaiRoomDto> => {
    const { data } = await api.put(`/ikigai/${year}/rooms/${roomType}`, {
      answers,
      isComplete,
    });
    return data.data as IkigaiRoomDto;
  },

  saveNorthStar: async (year: number, statement: string): Promise<NorthStarDto> => {
    const { data } = await api.put(`/ikigai/${year}/north-star`, { statement });
    return data.data as NorthStarDto;
  },

  saveValues: async (
    year: number,
    values: { valueName: string; rank: number }[]
  ): Promise<UserValueDto[]> => {
    const { data } = await api.put(`/ikigai/${year}/values`, { values });
    return data.data as UserValueDto[];
  },
};

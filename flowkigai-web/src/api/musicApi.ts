import api from "./client";

export interface FocusTrackDto {
  id: string;
  name: string;
  artistName: string;
  audioUrl: string;
  durationSeconds: number;
}

export const musicApi = {
  getFocusTracks: async (): Promise<FocusTrackDto[]> => {
    const { data } = await api.get<{ data: FocusTrackDto[] }>("/music/focus-tracks");
    return data.data;
  },
};

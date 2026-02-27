import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export interface Song {
  video_id: string;
  title: string;
  artists: string[];
  thumbnail: string;
  duration: string;
  playlist_id: string;
  source?: "youtube" | "spotify";
}

export interface Rating {
  video_id: string;
  rating: number;
  rd: number;
  vol: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface SongWithRating extends Song, Omit<Rating, "video_id"> {}

export interface MatchResult {
  song1: SongWithRating;
  song2: SongWithRating;
}

export interface ShareData {
  id: string;
  title: string;
  songs: SongWithRating[];
  created_at: number;
}

export type ImportSource = "youtube" | "spotify";

export function detectImportSource(input: string): ImportSource | null {
  if (
    input.includes("youtube.com") ||
    input.includes("youtu.be") ||
    input.includes("list=")
  ) {
    return "youtube";
  }
  if (input.includes("open.spotify.com/playlist/")) {
    return "spotify";
  }
  return null;
}

export async function importPlaylist(playlistId: string, source?: ImportSource) {
  const { data } = await api.post<{ imported: number; songs: Song[] }>(
    "/playlist/import",
    { playlistId, source }
  );
  return data;
}

export async function getSongs(search?: string) {
  const { data } = await api.get<SongWithRating[]>("/songs", {
    params: search ? { search } : undefined,
  });
  return data;
}

export async function getStats() {
  const { data } = await api.get<{
    totalSongs: number;
    totalMatches: number;
    totalPairs: number;
    uniquePairsBattled: number;
    percentComplete: number;
    topSong: SongWithRating | null;
  }>("/songs/stats");
  return data;
}

export async function getNextBattle() {
  const { data } = await api.get<{ song1: SongWithRating; song2: SongWithRating }>(
    "/battle/next"
  );
  return data;
}

export async function submitBattleResult(
  song1Id: string,
  song2Id: string,
  winnerId: string | null
) {
  const { data } = await api.post<MatchResult>("/battle/result", {
    song1Id,
    song2Id,
    winnerId,
  });
  return data;
}

export async function createShare(title: string) {
  const { data } = await api.post<{ id: string; url: string }>("/share", {
    title,
  });
  return data;
}

export async function getShare(id: string) {
  const { data } = await api.get<ShareData>(`/share/${id}`);
  return data;
}

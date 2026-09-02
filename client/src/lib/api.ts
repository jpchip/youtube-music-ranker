import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ranker_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 (not from auth endpoints), clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = (error.config?.url as string | undefined) ?? "";
      if (!url.includes("/auth/")) {
        localStorage.removeItem("ranker_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

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
  allPairsComplete: boolean;
  topSong: SongWithRating | null;
}

export interface ShareData {
  id: string;
  title: string;
  songs: SongWithRating[];
  created_at: number;
}

export interface Playlist {
  id: string;
  name: string;
  created_at: number;
  songCount: number;
  sourceShareId: string | null;
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

// Auth
export async function login(email: string, password: string) {
  const { data } = await api.post<{ token: string; email: string }>(
    "/auth/login",
    { email, password }
  );
  return data;
}

export async function register(email: string, password: string) {
  const { data } = await api.post<{ token: string; email: string }>(
    "/auth/register",
    { email, password }
  );
  return data;
}

export async function logout() {
  await api.post("/auth/logout");
}

export async function getMe() {
  const { data } = await api.get<{
    email: string;
    isAdmin: boolean;
    playlists: Playlist[];
    activePlaylistId: string;
  }>("/auth/me");
  return data;
}

export async function setPassword(token: string, password: string) {
  await api.post("/auth/set-password", { token, password });
}

// Songs / playlist
export async function importPlaylist(
  playlistId: string,
  source?: ImportSource,
  playlistRef?: string
) {
  const { data } = await api.post<{ imported: number; songs: Song[] }>(
    "/playlist/import",
    { playlistId, source, playlistRef }
  );
  return data;
}

export async function getSongs(search?: string) {
  const { data } = await api.get<SongWithRating[]>("/songs", {
    params: search ? { search } : undefined,
  });
  return data;
}

export async function deleteSong(videoId: string) {
  const { data } = await api.delete<{ success: boolean; removedMatches: number }>(
    `/songs/${encodeURIComponent(videoId)}`
  );
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
    playlistName: string;
    playlistRef: string;
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

export async function createShare(title?: string) {
  const { data } = await api.post<{ id: string; url: string }>("/share", {
    title,
  });
  return data;
}

export async function getShare(id: string) {
  const { data } = await api.get<ShareData>(`/share/${id}`);
  return data;
}

export async function copyShare(id: string, name?: string) {
  const { data } = await api.post<{
    playlistId: string;
    name: string;
    songCount: number;
  }>(`/share/${id}/copy`, { name });
  return data;
}

// Spotify credentials
export async function getSpotifyCredentials() {
  const { data } = await api.get<{ clientId: string | null; hasSecret: boolean }>(
    "/settings"
  );
  return data;
}

export async function saveSpotifyCredentials(clientId: string, clientSecret: string) {
  await api.post("/settings", { clientId, clientSecret });
}

export async function deleteSpotifyCredentials() {
  await api.delete("/settings");
}

// Playlists
export async function getPlaylists() {
  const { data } = await api.get<{ playlists: Playlist[]; activeId: string }>(
    "/playlists"
  );
  return data;
}

export async function createPlaylist(name: string) {
  const { data } = await api.post<Playlist>("/playlists", { name });
  return data;
}

export async function deletePlaylist(id: string) {
  const { data } = await api.delete<{ success: boolean; activeId: string | null }>(
    `/playlists/${id}`
  );
  return data;
}

export async function setActivePlaylist(id: string) {
  const { data } = await api.put<{ activeId: string }>("/playlists/active", {
    id,
  });
  return data;
}

// Admin
export interface AdminUserStats {
  totalSongs: number;
  totalMatches: number;
  totalPairs: number;
  uniquePairsBattled: number;
  percentComplete: number;
  topSong: { title: string; rating: number } | null;
}

export interface AdminPlaylistStats {
  id: string;
  name: string;
  songCount: number;
  matchCount: number;
  percentComplete: number;
  topSong: { title: string; rating: number } | null;
}

export interface AdminUser {
  id: string;
  email: string;
  created_at: number;
  is_admin: boolean;
  playlists: AdminPlaylistStats[];
  stats: AdminUserStats;
}

export interface AdminUsersResponse {
  summary: {
    totalUsers: number;
    totalBattles: number;
    totalSongs: number;
    totalPlaylists: number;
  };
  users: AdminUser[];
}

export interface AdminMatch {
  id: number;
  song1_id: string;
  song2_id: string;
  winner_id: string | null;
  created_at: number;
  song1_title: string;
  song2_title: string;
}

export interface AdminUserDetailResponse {
  user: { id: string; email: string; created_at: number; is_admin: boolean };
  playlists: AdminPlaylistStats[];
  activePlaylistRef: string;
  stats: AdminUserStats;
  songs: SongWithRating[];
  recentMatches: AdminMatch[];
}

export async function getAdminUsers() {
  const { data } = await api.get<AdminUsersResponse>("/admin/users");
  return data;
}

export async function getAdminUserStats(userId: string, playlistRef?: string) {
  const { data } = await api.get<AdminUserDetailResponse>(
    `/admin/users/${userId}/stats`,
    { params: playlistRef ? { playlistRef } : undefined }
  );
  return data;
}

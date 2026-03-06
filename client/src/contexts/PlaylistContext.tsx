import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  getPlaylists,
  setActivePlaylist as apiSetActivePlaylist,
  deletePlaylist as apiDeletePlaylist,
  createPlaylist as apiCreatePlaylist,
  type Playlist,
} from "../lib/api";
import { useAuth } from "./AuthContext";

interface PlaylistContextValue {
  playlists: Playlist[];
  activePlaylist: Playlist | null;
  isLoading: boolean;
  setActivePlaylist: (id: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  createPlaylist: (name: string) => Promise<Playlist>;
  refreshPlaylists: () => Promise<void>;
}

const PlaylistContext = createContext<PlaylistContextValue | null>(null);

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshPlaylists = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getPlaylists();
      setPlaylists(data.playlists);
      setActiveId(data.activeId);
    } catch {
      // silently ignore
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      setIsLoading(true);
      refreshPlaylists().finally(() => setIsLoading(false));
    } else {
      setPlaylists([]);
      setActiveId(null);
    }
  }, [token, refreshPlaylists]);

  const setActivePlaylist = useCallback(
    async (id: string) => {
      await apiSetActivePlaylist(id);
      setActiveId(id);
    },
    []
  );

  const deletePlaylist = useCallback(
    async (id: string) => {
      const result = await apiDeletePlaylist(id);
      await refreshPlaylists();
      if (result.activeId) {
        setActiveId(result.activeId);
      }
    },
    [refreshPlaylists]
  );

  const createPlaylist = useCallback(
    async (name: string): Promise<Playlist> => {
      const newPlaylist = await apiCreatePlaylist(name);
      await refreshPlaylists();
      return newPlaylist;
    },
    [refreshPlaylists]
  );

  const activePlaylist = playlists.find((p) => p.id === activeId) ?? playlists[0] ?? null;

  return (
    <PlaylistContext.Provider
      value={{
        playlists,
        activePlaylist,
        isLoading,
        setActivePlaylist,
        deletePlaylist,
        createPlaylist,
        refreshPlaylists,
      }}
    >
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylist() {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error("usePlaylist must be used within PlaylistProvider");
  return ctx;
}

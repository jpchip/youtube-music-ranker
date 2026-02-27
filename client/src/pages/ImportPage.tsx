import { useState, useMemo } from "react";
import {
  importPlaylist,
  detectImportSource,
  type Song,
  type ImportSource,
} from "../lib/api";

const SOURCE_INFO: Record<
  ImportSource,
  { label: string; color: string; icon: JSX.Element }
> = {
  youtube: {
    label: "YouTube Music",
    color: "text-red-400",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  spotify: {
    label: "Spotify",
    color: "text-green-400",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
    ),
  },
};

export default function ImportPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; songs: Song[] } | null>(null);

  const detectedSource = useMemo(() => detectImportSource(url.trim()), [url]);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const source = detectedSource ?? "youtube";
      const data = await importPlaylist(url.trim(), source);
      setResult(data);
      setUrl("");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || "Failed to import playlist");
      } else {
        setError("Failed to import playlist. Check the URL and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Import Playlist</h1>
      <p className="text-gray-400 mb-6">
        Paste a <span className="text-red-400">YouTube Music</span> or{" "}
        <span className="text-green-400">Spotify</span> playlist URL to import all songs.
      </p>

      <form onSubmit={handleImport} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://music.youtube.com/playlist?list=... or https://open.spotify.com/playlist/..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm
                       placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500
                       rounded-lg font-medium text-sm transition-colors shrink-0"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Importing...
              </span>
            ) : (
              "Import"
            )}
          </button>
        </div>

        {detectedSource && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className={SOURCE_INFO[detectedSource].color}>
              {SOURCE_INFO[detectedSource].icon}
            </span>
            <span className={SOURCE_INFO[detectedSource].color}>
              Detected: {SOURCE_INFO[detectedSource].label} playlist
            </span>
          </div>
        )}
      </form>

      {error && (
        <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-4 mb-6 text-red-300 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div>
          <div className="bg-emerald-900/30 border border-emerald-800/50 rounded-lg p-4 mb-6 text-emerald-300 text-sm">
            Successfully imported {result.imported} songs!
          </div>
          <h2 className="text-lg font-semibold mb-3">Imported Songs</h2>
          <div className="space-y-2">
            {result.songs.map((song) => {
              const artists = Array.isArray(song.artists)
                ? song.artists.join(", ")
                : song.artists;
              return (
                <div
                  key={song.video_id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50"
                >
                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    className="w-10 h-10 rounded object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{song.title}</p>
                    <p className="text-xs text-gray-400 truncate">{artists}</p>
                  </div>
                  <span className="text-xs text-gray-500">{song.duration}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

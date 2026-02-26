import { useState } from "react";
import { importPlaylist, type Song } from "../lib/api";

export default function ImportPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    imported: number;
    songs: Song[];
  } | null>(null);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await importPlaylist(url.trim());
      setResult(data);
      setUrl("");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(
          axiosErr.response?.data?.error || "Failed to import playlist"
        );
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
        Paste a YouTube Music playlist URL or playlist ID to import all songs.
      </p>

      <form onSubmit={handleImport} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://music.youtube.com/playlist?list=PLxxxxx"
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
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Importing...
              </span>
            ) : (
              "Import"
            )}
          </button>
        </div>
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

import { useState, useMemo, useRef } from "react";
import {
  importPlaylist,
  importScrapedSongs,
  detectImportSource,
  type Song,
  type ImportSource,
  type ScrapedSong,
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

type Tab = "playlist" | "ids";

export default function ImportPage() {
  const [tab, setTab] = useState<Tab>("playlist");

  // Playlist tab state
  const [url, setUrl] = useState("");
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [playlistResult, setPlaylistResult] = useState<{ imported: number; songs: Song[] } | null>(null);

  // IDs tab state
  const [idsText, setIdsText] = useState("");
  const [parsedSongs, setParsedSongs] = useState<ScrapedSong[] | null>(null);
  const [idsLoading, setIdsLoading] = useState(false);
  const [idsError, setIdsError] = useState<string | null>(null);
  const [idsResult, setIdsResult] = useState<{ imported: number; songs: Song[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectedSource = useMemo(
    () => detectImportSource(url.trim()),
    [url]
  );

  async function handleImportPlaylist(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setPlaylistLoading(true);
    setPlaylistError(null);
    setPlaylistResult(null);
    try {
      const source = detectedSource ?? "youtube";
      const data = await importPlaylist(url.trim(), source);
      setPlaylistResult(data);
      setUrl("");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setPlaylistError(axiosErr.response?.data?.error || "Failed to import playlist");
      } else {
        setPlaylistError("Failed to import playlist. Check the URL and try again.");
      }
    } finally {
      setPlaylistLoading(false);
    }
  }

  function handleFileLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string ?? "";
      // Try parsing as JSON (scraper output)
      try {
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          setParsedSongs(json as ScrapedSong[]);
          setIdsText(`${json.length} songs loaded from file`);
          e.target.value = "";
          return;
        }
      } catch {
        // not JSON, ignore
      }
      setParsedSongs(null);
      setIdsText(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleImportIds(e: React.FormEvent) {
    e.preventDefault();
    setIdsLoading(true);
    setIdsError(null);
    setIdsResult(null);
    try {
      const songs: ScrapedSong[] = parsedSongs ?? [];
      const data = await importScrapedSongs(songs);
      setIdsResult(data);
      setIdsText("");
      setParsedSongs(null);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setIdsError(axiosErr.response?.data?.error || "Failed to import songs");
      } else {
        setIdsError("Failed to import songs.");
      }
    } finally {
      setIdsLoading(false);
    }
  }

  const songCount = parsedSongs?.length ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Import Songs</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-800/50 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("playlist")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "playlist"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Playlist URL
        </button>
        <button
          onClick={() => setTab("ids")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "ids"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Video IDs
        </button>
      </div>

      {tab === "playlist" && (
        <>
          <p className="text-gray-400 mb-6">
            Paste a <span className="text-red-400">YouTube Music</span> or{" "}
            <span className="text-green-400">Spotify</span> playlist URL to import
            all songs.
          </p>

          <form onSubmit={handleImportPlaylist} className="mb-8">
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://music.youtube.com/playlist?list=... or https://open.spotify.com/playlist/..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm
                           placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                disabled={playlistLoading}
              />
              <button
                type="submit"
                disabled={playlistLoading || !url.trim()}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500
                           rounded-lg font-medium text-sm transition-colors shrink-0"
              >
                {playlistLoading ? (
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

          {playlistError && (
            <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-4 mb-6 text-red-300 text-sm">
              {playlistError}
            </div>
          )}

          {playlistResult && <SongResultList imported={playlistResult.imported} songs={playlistResult.songs} />}
        </>
      )}

      {tab === "ids" && (
        <>
          <p className="text-gray-400 mb-6">
            Load the <span className="text-gray-300">uploads.json</span> file exported by the scraper script.
            Songs will be matched against the YouTube Music catalog for metadata.
          </p>

          <form onSubmit={handleImportIds} className="mb-8 space-y-3">
            <div
              className={`flex items-center gap-4 p-4 rounded-lg border ${
                parsedSongs
                  ? "border-emerald-700 bg-emerald-900/20"
                  : "border-gray-700 bg-gray-800/50"
              }`}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={idsLoading}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600
                           rounded-lg text-sm transition-colors shrink-0"
              >
                Choose uploads.json
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileLoad}
                className="hidden"
              />
              <span className={`text-sm ${parsedSongs ? "text-emerald-300" : "text-gray-500"}`}>
                {idsText || "No file selected"}
              </span>
            </div>

            <button
              type="submit"
              disabled={idsLoading || songCount === 0}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500
                         rounded-lg font-medium text-sm transition-colors"
            >
              {idsLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Importing {songCount} songs...
                </span>
              ) : (
                `Import${songCount > 0 ? ` ${songCount} songs` : ""}`
              )}
            </button>
          </form>

          {idsError && (
            <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-4 mb-6 text-red-300 text-sm">
              {idsError}
            </div>
          )}

          {idsResult && (
            <SongResultList imported={idsResult.imported} songs={idsResult.songs} />
          )}
        </>
      )}
    </div>
  );
}

function SongResultList({ imported, songs }: { imported: number; songs: Song[] }) {
  return (
    <div>
      <div className="bg-emerald-900/30 border border-emerald-800/50 rounded-lg p-4 mb-6 text-emerald-300 text-sm">
        Successfully imported {imported} songs!
      </div>

      <h2 className="text-lg font-semibold mb-3">Imported Songs</h2>
      <div className="space-y-2">
        {songs.map((song) => {
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
  );
}

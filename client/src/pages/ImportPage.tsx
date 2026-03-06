import React, { useState, useMemo, useEffect } from "react";
import {
  importPlaylist,
  detectImportSource,
  getSpotifyCredentials,
  saveSpotifyCredentials,
  deleteSpotifyCredentials,
  type Song,
  type ImportSource,
} from "../lib/api";
import { usePlaylist } from "../contexts/PlaylistContext";

const MAX_PLAYLISTS = 10;

const SOURCE_INFO: Record<
  ImportSource,
  { label: string; color: string; icon: React.ReactElement }
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
  const { playlists, activePlaylist, deletePlaylist, createPlaylist, refreshPlaylists } =
    usePlaylist();

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; songs: Song[] } | null>(null);

  // Playlist selection
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("__active__");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Spotify credentials state
  const [spotifyCreds, setSpotifyCreds] = useState<{
    clientId: string | null;
    hasSecret: boolean;
  } | null>(null);
  const [showCredForm, setShowCredForm] = useState(false);
  const [credClientId, setCredClientId] = useState("");
  const [credClientSecret, setCredClientSecret] = useState("");
  const [credSaving, setCredSaving] = useState(false);
  const [credError, setCredError] = useState<string | null>(null);

  const detectedSource = useMemo(() => detectImportSource(url.trim()), [url]);
  const atLimit = playlists.length >= MAX_PLAYLISTS;

  useEffect(() => {
    getSpotifyCredentials()
      .then(setSpotifyCreds)
      .catch(() => setSpotifyCreds({ clientId: null, hasSecret: false }));
  }, []);

  // When playlists load, default to the active one
  useEffect(() => {
    if (activePlaylist && selectedPlaylistId === "__active__") {
      setSelectedPlaylistId(activePlaylist.id);
    }
  }, [activePlaylist, selectedPlaylistId]);

  const spotifyConfigured =
    spotifyCreds?.clientId != null && spotifyCreds?.hasSecret;

  async function handleSaveCreds(e: React.FormEvent) {
    e.preventDefault();
    setCredSaving(true);
    setCredError(null);
    try {
      await saveSpotifyCredentials(credClientId.trim(), credClientSecret.trim());
      const updated = await getSpotifyCredentials();
      setSpotifyCreds(updated);
      setShowCredForm(false);
      setCredClientId("");
      setCredClientSecret("");
    } catch {
      setCredError("Failed to save credentials. Check your input and try again.");
    } finally {
      setCredSaving(false);
    }
  }

  async function handleDeleteCreds() {
    await deleteSpotifyCredentials();
    setSpotifyCreds({ clientId: null, hasSecret: false });
    setShowCredForm(false);
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const source = detectedSource ?? "youtube";

      // Resolve target playlist ref
      let playlistRef: string | undefined;

      if (selectedPlaylistId === "__new__") {
        if (!newPlaylistName.trim()) {
          setError("Please enter a name for the new playlist.");
          setLoading(false);
          return;
        }
        const created = await createPlaylist(newPlaylistName.trim());
        playlistRef = created.id;
        setNewPlaylistName("");
        setSelectedPlaylistId(created.id);
      } else {
        playlistRef = selectedPlaylistId;
      }

      const data = await importPlaylist(url.trim(), source, playlistRef);
      await refreshPlaylists();
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

  async function handleDeletePlaylist(id: string) {
    setDeletingId(id);
    try {
      await deletePlaylist(id);
      setConfirmDeleteId(null);
      // If we deleted the selected playlist, reset selection
      if (selectedPlaylistId === id) {
        setSelectedPlaylistId(activePlaylist?.id ?? "__active__");
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || "Failed to delete playlist");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Import Playlist</h1>
      <p className="text-gray-400 mb-6">
        Paste a <span className="text-red-400">YouTube Music</span> or{" "}
        <span className="text-green-400">Spotify</span> playlist URL to import all songs.
      </p>

      {/* Playlists section */}
      {playlists.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-widest">
            Your Playlists
          </h2>
          <div className="space-y-2">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="flex items-center justify-between bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm truncate">{playlist.name}</span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {playlist.songCount} song{playlist.songCount !== 1 ? "s" : ""}
                  </span>
                </div>
                {playlists.length > 1 && (
                  <div className="shrink-0 ml-2">
                    {confirmDeleteId === playlist.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Delete?</span>
                        <button
                          onClick={() => handleDeletePlaylist(playlist.id)}
                          disabled={deletingId === playlist.id}
                          className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
                        >
                          {deletingId === playlist.id ? "Deleting..." : "Yes"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(playlist.id)}
                        className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                        title="Delete playlist"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import form */}
      <form onSubmit={handleImport} className="mb-6 space-y-3">
        {/* Playlist selector */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-widest">
            Import into
          </label>
          <select
            value={selectedPlaylistId}
            onChange={(e) => setSelectedPlaylistId(e.target.value)}
            disabled={loading}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm
                       focus:outline-none focus:border-purple-500 transition-colors"
          >
            {playlists.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.songCount} songs)
              </option>
            ))}
            <option value="__new__" disabled={atLimit}>
              {atLimit
                ? `+ New Playlist (limit of ${MAX_PLAYLISTS} reached)`
                : "+ New Playlist"}
            </option>
          </select>
        </div>

        {/* New playlist name input */}
        {selectedPlaylistId === "__new__" && (
          <div>
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Playlist name (e.g. Rock Anthems)"
              maxLength={60}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm
                         placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              disabled={loading}
            />
          </div>
        )}

        {/* URL input */}
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
          <div className="flex items-center gap-1.5 text-xs">
            <span className={SOURCE_INFO[detectedSource].color}>
              {SOURCE_INFO[detectedSource].icon}
            </span>
            <span className={SOURCE_INFO[detectedSource].color}>
              Detected: {SOURCE_INFO[detectedSource].label} playlist
            </span>
          </div>
        )}
      </form>

      {/* Spotify credentials section */}
      {detectedSource === "spotify" && (
        <div className="mb-6">
          {spotifyConfigured && !showCredForm ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-900/40 border border-green-800/50 text-green-400 text-xs font-medium">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Spotify credentials configured
              </span>
              <button
                onClick={() => {
                  setShowCredForm(true);
                  setCredClientId(spotifyCreds?.clientId ?? "");
                  setCredClientSecret("");
                }}
                className="text-gray-400 hover:text-white text-xs underline"
              >
                Change
              </button>
              <button
                onClick={handleDeleteCreds}
                className="text-gray-500 hover:text-red-400 text-xs underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
              <p className="text-sm font-medium mb-1">
                {showCredForm ? "Update Spotify credentials" : "Spotify credentials required"}
              </p>
              <p className="text-xs text-gray-400 mb-3">
                Spotify requires a Developer app to import playlists.{" "}
                <a
                  href="https://developer.spotify.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:underline"
                >
                  Create a free app
                </a>{" "}
                and paste your Client ID and Secret below.
              </p>
              <form onSubmit={handleSaveCreds} className="space-y-2">
                <input
                  type="text"
                  value={credClientId}
                  onChange={(e) => setCredClientId(e.target.value)}
                  placeholder="Client ID"
                  className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm
                             placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  disabled={credSaving}
                  autoComplete="off"
                />
                <input
                  type="password"
                  value={credClientSecret}
                  onChange={(e) => setCredClientSecret(e.target.value)}
                  placeholder="Client Secret"
                  className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm
                             placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  disabled={credSaving}
                  autoComplete="new-password"
                />
                {credError && (
                  <p className="text-xs text-red-400">{credError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={credSaving || !credClientId.trim() || !credClientSecret.trim()}
                    className="px-4 py-1.5 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500
                               rounded-md text-sm font-medium transition-colors"
                  >
                    {credSaving ? "Saving..." : "Save"}
                  </button>
                  {showCredForm && (
                    <button
                      type="button"
                      onClick={() => setShowCredForm(false)}
                      className="px-4 py-1.5 text-gray-400 hover:text-white text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      )}

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

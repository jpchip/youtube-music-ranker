import { useState } from "react";
import axios from "axios";
import { usePlaylist } from "../contexts/PlaylistContext";
import type { Playlist } from "../lib/api";

interface Props {
  onClose: () => void;
}

function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { error?: string } | undefined)?.error ?? "Something went wrong";
  }
  return "Something went wrong";
}

export default function PlaylistPickerModal({ onClose }: Props) {
  const {
    playlists,
    activePlaylist,
    setActivePlaylist,
    deletePlaylist,
    renamePlaylist,
  } = usePlaylist();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = playlists.length > 1;

  async function handleSelect(playlist: Playlist) {
    if (editingId || confirmDeleteId || busy) return;
    if (playlist.id === activePlaylist?.id) {
      onClose();
      return;
    }
    await setActivePlaylist(playlist.id);
    onClose();
    window.location.reload();
  }

  function startEditing(playlist: Playlist) {
    setError(null);
    setConfirmDeleteId(null);
    setEditingId(playlist.id);
    setEditName(playlist.name);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditName("");
  }

  async function saveRename(playlist: Playlist) {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === playlist.name) {
      cancelEditing();
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await renamePlaylist(playlist.id, trimmed);
      cancelEditing();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(playlist: Playlist) {
    setBusy(true);
    setError(null);
    const wasActive = playlist.id === activePlaylist?.id;
    try {
      await deletePlaylist(playlist.id);
      setConfirmDeleteId(null);
      if (wasActive) {
        onClose();
        window.location.reload();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="max-w-sm w-full bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Switch Playlist</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {error && (
          <p className="mb-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-2">
          {playlists.map((playlist) => {
            const isActive = playlist.id === activePlaylist?.id;
            const isEditing = editingId === playlist.id;
            const isConfirmingDelete = confirmDeleteId === playlist.id;

            return (
              <div
                key={playlist.id}
                className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? "bg-purple-500/20 border border-purple-500/40 text-purple-300"
                    : "bg-gray-800/60 border border-gray-700/50 text-gray-200"
                }`}
              >
                {isEditing ? (
                  <form
                    className="flex-1 flex items-center gap-2 min-w-0"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void saveRename(playlist);
                    }}
                  >
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") cancelEditing();
                      }}
                      autoFocus
                      disabled={busy}
                      className="flex-1 min-w-0 bg-gray-950 border border-gray-600 rounded-lg px-2 py-1 text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="submit"
                      disabled={busy || !editName.trim()}
                      className="text-green-400 hover:text-green-300 disabled:opacity-40 transition-colors"
                      aria-label="Save name"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={busy}
                      className="text-gray-400 hover:text-gray-200 disabled:opacity-40 transition-colors"
                      aria-label="Cancel rename"
                    >
                      ✕
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="w-5 shrink-0 flex items-center justify-center">
                      {isActive && (
                        <svg
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-5 h-5 text-purple-400"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>

                    <button
                      onClick={() => handleSelect(playlist)}
                      disabled={busy || !!confirmDeleteId}
                      className="flex-1 min-w-0 text-left disabled:opacity-60"
                    >
                      <p className="font-medium text-sm truncate">{playlist.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {playlist.songCount} song{playlist.songCount !== 1 ? "s" : ""}
                      </p>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(playlist);
                        }}
                        disabled={busy || isConfirmingDelete}
                        className="p-1 text-gray-500 hover:text-gray-200 disabled:opacity-40 transition-colors"
                        title="Rename playlist"
                        aria-label="Rename playlist"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>

                      {canDelete && (
                        <div className="flex items-center">
                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-400">Delete?</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDelete(playlist);
                                }}
                                disabled={busy}
                                className="text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-40 transition-colors"
                              >
                                {busy ? "..." : "Yes"}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(null);
                                }}
                                disabled={busy}
                                className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-40 transition-colors"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setError(null);
                                setConfirmDeleteId(playlist.id);
                              }}
                              disabled={busy || !!editingId}
                              className="p-1 text-gray-500 hover:text-red-400 disabled:opacity-40 transition-colors"
                              title="Delete playlist"
                              aria-label="Delete playlist"
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
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

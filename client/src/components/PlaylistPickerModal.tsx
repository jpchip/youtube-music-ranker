import { usePlaylist } from "../contexts/PlaylistContext";
import type { Playlist } from "../lib/api";

interface Props {
  onClose: () => void;
}

export default function PlaylistPickerModal({ onClose }: Props) {
  const { playlists, activePlaylist, setActivePlaylist } = usePlaylist();

  async function handleSelect(playlist: Playlist) {
    if (playlist.id === activePlaylist?.id) {
      onClose();
      return;
    }
    await setActivePlaylist(playlist.id);
    onClose();
    // Refresh the current page data by navigating to same location
    window.location.reload();
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

        <div className="space-y-2">
          {playlists.map((playlist) => {
            const isActive = playlist.id === activePlaylist?.id;
            return (
              <button
                key={playlist.id}
                onClick={() => handleSelect(playlist)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors ${
                  isActive
                    ? "bg-purple-500/20 border border-purple-500/40 text-purple-300"
                    : "bg-gray-800/60 border border-gray-700/50 hover:bg-gray-700/60 text-gray-200"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{playlist.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {playlist.songCount} song{playlist.songCount !== 1 ? "s" : ""}
                  </p>
                </div>
                {isActive && (
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5 shrink-0 ml-2 text-purple-400"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

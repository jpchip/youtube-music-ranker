import { useCallback, useEffect, useState } from "react";
import {
  getNextBattle,
  submitBattleResult,
  type SongWithRating,
} from "../lib/api";
import YouTubePlayer from "../components/YouTubePlayer";
import SpotifyPlayer from "../components/SpotifyPlayer";
import { Link } from "react-router-dom";

const SHOW_VIDEOS_KEY = "battle-show-videos";

function SongThumbnail({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className="w-full aspect-video bg-gray-800 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" className="w-16 h-16 text-gray-600" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      </div>
    );
  }

  return (
    <img
      key={src}
      src={src}
      alt={alt}
      className="w-full aspect-video object-cover"
      onError={() => setError(true)}
    />
  );
}

function getStoredShowVideos(): boolean {
  try {
    return localStorage.getItem(SHOW_VIDEOS_KEY) !== "false";
  } catch {
    return true;
  }
}

export default function BattlePage() {
  const [song1, setSong1] = useState<SongWithRating | null>(null);
  const [song2, setSong2] = useState<SongWithRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [showVideos, setShowVideos] = useState(getStoredShowVideos);

  function toggleShowVideos() {
    setShowVideos((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SHOW_VIDEOS_KEY, String(next));
      } catch { /* ignore */ }
      return next;
    });
  }

  const loadNextBattle = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLastResult(null);
    try {
      const data = await getNextBattle();
      setSong1(data.song1);
      setSong2(data.song2);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(
          axiosErr.response?.data?.error || "Failed to load battle"
        );
      } else {
        setError("Failed to load battle");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNextBattle();
  }, [loadNextBattle]);

  async function handleVote(winnerId: string | null) {
    if (!song1 || !song2 || submitting) return;
    setSubmitting(true);

    try {
      const result = await submitBattleResult(
        song1.video_id,
        song2.video_id,
        winnerId
      );
      setMatchCount((c) => c + 1);

      if (winnerId === null) {
        setLastResult("Draw!");
      } else if (winnerId === song1.video_id) {
        setLastResult(`${song1.title} wins!`);
      } else {
        setLastResult(`${song2.title} wins!`);
      }

      setSong1(result.song1);
      setSong2(result.song2);

      // Brief pause to show result, then load next
      setTimeout(() => {
        loadNextBattle();
      }, 800);
    } catch {
      setError("Failed to record result");
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !song1) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Battle Arena</h1>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-10">
          <p className="text-gray-400 mb-4">{error}</p>
          <Link
            to="/import"
            className="inline-block px-6 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
          >
            Import Playlist
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-bold">Battle Arena</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleShowVideos}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            <span
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                showVideos ? "bg-purple-600" : "bg-gray-600"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                  showVideos ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </span>
            Players
          </button>
          <div className="text-sm text-gray-400">
            <span className="hidden sm:inline">Battles this session: </span>
            <span className="text-purple-400 font-mono">{matchCount}</span>
          </div>
        </div>
      </div>

      {lastResult && (
        <div className="text-center mb-3 text-base font-semibold text-purple-300 animate-pulse">
          {lastResult}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-gray-500">Loading next battle...</div>
        </div>
      ) : (
        song1 && song2 && (
          <>
            <div className={`grid gap-3 md:gap-6 mb-3 md:mb-6 ${showVideos ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2"}`}>
              {[song1, song2].map((song) => (
                <div
                  key={song.video_id}
                  className="bg-gray-800/60 border border-gray-700/50 rounded-xl overflow-hidden flex flex-col"
                >
                  <div className={showVideos ? "aspect-video" : "aspect-square md:aspect-video"}>
                    {showVideos ? (
                      song.source === "spotify" ? (
                        <SpotifyPlayer trackId={song.video_id} />
                      ) : (
                        <YouTubePlayer videoId={song.video_id} />
                      )
                    ) : (
                      <SongThumbnail src={song.thumbnail} alt={song.title} />
                    )}
                  </div>

                  <div className="p-2 md:p-4 flex flex-col flex-1">
                    <h3 className="font-semibold text-sm md:text-lg leading-tight line-clamp-2 mb-0.5">
                      {song.title}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-400 truncate">
                      {Array.isArray(song.artists) ? song.artists.join(", ") : song.artists}
                    </p>
                    <div className="hidden md:flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="font-mono text-purple-400">{Math.round(song.rating)}</span>
                      <span>{song.wins}W {song.losses}L</span>
                    </div>
                    <button
                      onClick={() => handleVote(song.video_id)}
                      disabled={submitting}
                      className="w-full mt-auto pt-2 md:mt-3 py-2 md:py-2.5 bg-purple-600 hover:bg-purple-500
                                 disabled:bg-gray-700 rounded-lg font-medium text-sm transition-colors"
                    >
                      <span className="md:hidden">Pick</span>
                      <span className="hidden md:inline">Pick This Song</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => handleVote(null)}
                disabled={submitting}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800
                           rounded-lg text-sm font-medium transition-colors"
              >
                Draw
              </button>
              <button
                onClick={loadNextBattle}
                disabled={submitting}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800
                           rounded-lg text-sm font-medium transition-colors"
              >
                Skip
              </button>
            </div>
          </>
        )
      )}
    </div>
  );
}

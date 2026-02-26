import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStats, type SongWithRating } from "../lib/api";
import SongCard from "../components/SongCard";

export default function HomePage() {
  const [stats, setStats] = useState<{
    totalSongs: number;
    totalMatches: number;
    totalPairs: number;
    uniquePairsBattled: number;
    percentComplete: number;
    topSong: SongWithRating | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  const hasSongs = stats && stats.totalSongs > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          YouTube Music Ranker
        </h1>
        <p className="text-gray-400 text-lg">
          Import your playlists, battle songs head-to-head, discover your true
          favorites.
        </p>
      </div>

      {hasSongs ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5 text-center">
              <p className="text-3xl font-bold text-purple-400">
                {stats.totalSongs}
              </p>
              <p className="text-sm text-gray-400 mt-1">Songs</p>
            </div>
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5 text-center">
              <p className="text-3xl font-bold text-pink-400">
                {stats.totalMatches}
              </p>
              <p className="text-sm text-gray-400 mt-1">Battles</p>
            </div>
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5 text-center">
              <p className="text-3xl font-bold text-emerald-400">
                {stats.topSong ? Math.round(stats.topSong.rating) : "--"}
              </p>
              <p className="text-sm text-gray-400 mt-1">Top Rating</p>
            </div>
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5 text-center">
              <p className="text-3xl font-bold text-amber-400">
                {stats.percentComplete}%
              </p>
              <p className="text-sm text-gray-400 mt-1">Complete</p>
            </div>
          </div>

          <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">Ranking Progress</span>
              <span className="text-gray-300 font-mono">
                {stats.uniquePairsBattled} / {stats.totalPairs} pairs
              </span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stats.percentComplete, 100)}%` }}
              />
            </div>
          </div>

          {stats.topSong && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-3 text-gray-300">
                Current #1
              </h2>
              <SongCard song={stats.topSong} rank={1} compact />
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/battle"
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
            >
              Start Battle
            </Link>
            <Link
              to="/rankings"
              className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              View Rankings
            </Link>
            <Link
              to="/import"
              className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              Import More
            </Link>
          </div>
        </>
      ) : (
        <div className="text-center">
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-10 mb-6">
            <p className="text-gray-400 mb-4">
              No songs yet. Import a YouTube Music playlist to get started.
            </p>
            <Link
              to="/import"
              className="inline-block px-6 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
            >
              Import Playlist
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

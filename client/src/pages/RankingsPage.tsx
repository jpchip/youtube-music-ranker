import { useEffect, useState } from "react";
import { getSongs, getStats, createShare, type SongWithRating } from "../lib/api";
import RankingTable from "../components/RankingTable";
import { Link } from "react-router-dom";

export default function RankingsPage() {
  const [songs, setSongs] = useState<SongWithRating[]>([]);
  const [filtered, setFiltered] = useState<SongWithRating[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 100;
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [progress, setProgress] = useState<{
    uniquePairsBattled: number;
    totalPairs: number;
    percentComplete: number;
  } | null>(null);

  useEffect(() => {
    Promise.all([getSongs(), getStats()])
      .then(([songsData, statsData]) => {
        setSongs(songsData);
        setFiltered(songsData);
        setProgress({
          uniquePairsBattled: statsData.uniquePairsBattled,
          totalPairs: statsData.totalPairs,
          percentComplete: statsData.percentComplete,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPage(0);
    if (!search.trim()) {
      setFiltered(songs);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      songs.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (Array.isArray(s.artists)
            ? s.artists.some((a) => a.toLowerCase().includes(q))
            : String(s.artists).toLowerCase().includes(q))
      )
    );
  }, [search, songs]);

  async function handleShare() {
    setSharing(true);
    try {
      const data = await createShare("My Rankings");
      setShareUrl(window.location.origin + data.url);
    } catch (err) {
      console.error("Share error:", err);
    } finally {
      setSharing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-500">Loading rankings...</div>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Rankings</h1>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-10">
          <p className="text-gray-400 mb-4">
            No songs yet. Import a playlist to get started.
          </p>
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Rankings</h1>
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search songs..."
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm
                       placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            onClick={handleShare}
            disabled={sharing}
            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700
                       rounded-lg text-sm font-medium transition-colors"
          >
            {sharing ? "Sharing..." : "Share"}
          </button>
        </div>
      </div>

      {shareUrl && (
        <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-4 mb-6 flex items-center gap-3">
          <span className="text-sm text-purple-300">Share link:</span>
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm font-mono"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={() => navigator.clipboard.writeText(shareUrl)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
          >
            Copy
          </button>
        </div>
      )}

      {progress && progress.totalPairs > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-400">
              Ranking Progress &mdash;{" "}
              <span className="text-amber-400 font-semibold">
                {progress.percentComplete}%
              </span>
            </span>
            <span className="text-gray-500 font-mono text-xs">
              {progress.uniquePairsBattled} / {progress.totalPairs} unique pairs
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress.percentComplete, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl overflow-hidden">
        <RankingTable songs={filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)} offset={page * PAGE_SIZE} />
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded-lg text-sm transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(Math.ceil(filtered.length / PAGE_SIZE) - 1, p + 1))}
            disabled={(page + 1) * PAGE_SIZE >= filtered.length}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded-lg text-sm transition-colors"
          >
            Next
          </button>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-4 text-center">
        {songs.length} songs ranked by Glicko-2 rating
      </p>
    </div>
  );
}

import { useEffect, useState } from "react";
import { getSongs, getStats, createShare, type SongWithRating } from "../lib/api";
import RankingTable from "../components/RankingTable";
import { Link } from "react-router-dom";

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="max-w-lg w-full bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">How Rankings Work</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-sm text-gray-300">
          <section>
            <h3 className="font-semibold text-white mb-1">Rating Algorithm — Glicko-2</h3>
            <p>
              Songs are ranked using the <span className="text-purple-400">Glicko-2</span> system,
              the same algorithm used in competitive chess and many online games. After each battle,
              both songs' ratings are updated based on the outcome and how confident the system is
              in each song's current rating.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-1">Rating</h3>
            <p>
              The core score representing how strong a song is. A higher rating means the song
              has beaten stronger opponents more consistently. New songs start at <span className="font-mono text-purple-400">1500</span>.
              Ratings rise with wins and fall with losses — but the size of the change depends on
              the opponent's strength and the RD.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-1">RD — Rating Deviation</h3>
            <p>
              A measure of <span className="text-amber-400">uncertainty</span>. A high RD means
              the system hasn't seen enough battles to be confident in the rating — the true
              strength could vary widely. A low RD means the rating is well-established.
              Songs with a high RD are prioritised in battle matchmaking so the system can pin
              them down faster.
            </p>
            <ul className="mt-2 space-y-1 text-gray-400">
              <li><span className="font-mono text-white">RD &gt; 150</span> — few battles, rating is a rough estimate</li>
              <li><span className="font-mono text-white">RD 80–150</span> — moderate confidence</li>
              <li><span className="font-mono text-white">RD &lt; 80</span> — high confidence, well-ranked</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-1">Tips</h3>
            <ul className="space-y-1 text-gray-400 list-disc list-inside">
              <li>Rankings become more accurate the more battles you complete.</li>
              <li>The progress bar shows how many unique head-to-head pairs you've judged.</li>
              <li>Draw records a tie — both songs' ratings move only slightly.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function RankingsPage() {
  const [songs, setSongs] = useState<SongWithRating[]>([]);
  const [filtered, setFiltered] = useState<SongWithRating[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 100;
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
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
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Rankings</h1>
          <button
            onClick={() => setShowHelp(true)}
            aria-label="How rankings work"
            className="w-5 h-5 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white
                       text-xs font-bold transition-colors flex items-center justify-center"
          >
            ?
          </button>
        </div>
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

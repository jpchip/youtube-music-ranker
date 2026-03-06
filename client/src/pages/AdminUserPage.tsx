import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getAdminUserStats,
  type AdminUserDetailResponse,
  type AdminMatch,
  type AdminPlaylistStats,
} from "../lib/api";
import RankingTable from "../components/RankingTable";

export default function AdminUserPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AdminUserDetailResponse | null>(null);
  const [selectedPlaylistRef, setSelectedPlaylistRef] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Initial load
  useEffect(() => {
    if (!id) return;
    getAdminUserStats(id)
      .then((d) => {
        setData(d);
        setSelectedPlaylistRef(d.activePlaylistRef);
      })
      .catch((err) => setError(err.response?.data?.error || "Failed to load user"))
      .finally(() => setLoading(false));
  }, [id]);

  // Reload when playlist changes
  async function handlePlaylistChange(playlistRef: string) {
    if (!id || playlistRef === selectedPlaylistRef) return;
    setSelectedPlaylistRef(playlistRef);
    setLoading(true);
    try {
      const d = await getAdminUserStats(id, playlistRef);
      setData(d);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || "Failed to load playlist data");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-6 text-center text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { user, playlists, stats, songs, recentMatches } = data;
  const joined = new Date(user.created_at * 1000).toLocaleDateString();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        to="/admin"
        className="text-sm text-gray-400 hover:text-gray-200 transition-colors mb-4 inline-block"
      >
        &larr; Back to Admin
      </Link>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-100">{user.email}</h1>
        {user.is_admin && (
          <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 rounded-full">
            Admin
          </span>
        )}
        <span className="text-sm text-gray-500">Joined {joined}</span>
      </div>

      {/* Playlist selector */}
      {playlists.length > 1 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {playlists.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePlaylistChange(p.id)}
                disabled={loading}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedPlaylistRef === p.id
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                    : "bg-gray-800/60 text-gray-400 border border-gray-700/50 hover:text-gray-200 hover:bg-gray-700/60"
                }`}
              >
                {p.name}
                <span className="ml-1.5 text-xs opacity-60">{p.songCount}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Playlist summary (for multi-playlist users) */}
      {playlists.length > 1 && (
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-sm bg-gray-800/40 border border-gray-700/50 rounded-xl overflow-hidden">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700/50">
                <th className="px-4 py-2.5 font-medium">Playlist</th>
                <th className="px-4 py-2.5 font-medium text-right">Songs</th>
                <th className="px-4 py-2.5 font-medium text-right">Battles</th>
                <th className="px-4 py-2.5 font-medium text-right">Complete</th>
                <th className="px-4 py-2.5 font-medium">Top Song</th>
              </tr>
            </thead>
            <tbody>
              {playlists.map((p) => (
                <PlaylistRow key={p.id} playlist={p} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-20">
          <div className="animate-pulse text-gray-500 text-sm">Loading...</div>
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard label="Songs" value={stats.totalSongs} color="text-purple-400" />
            <StatCard label="Battles" value={stats.totalMatches} color="text-pink-400" />
            <StatCard
              label="Top Rating"
              value={stats.topSong ? Math.round(stats.topSong.rating) : "--"}
              color="text-emerald-400"
            />
            <StatCard label="Complete" value={`${stats.percentComplete}%`} color="text-amber-400" />
          </div>

          {stats.totalPairs > 0 && (
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
          )}

          {songs.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-200 mb-3">
                Rankings ({songs.length} songs)
              </h2>
              <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl overflow-hidden">
                <RankingTable songs={songs} />
              </div>
            </section>
          )}

          {recentMatches.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-200 mb-3">
                Recent Battles ({recentMatches.length})
              </h2>
              <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-700/50">
                        <th className="px-4 py-3 font-medium">Song 1</th>
                        <th className="px-4 py-3 font-medium text-center">Result</th>
                        <th className="px-4 py-3 font-medium">Song 2</th>
                        <th className="px-4 py-3 font-medium text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentMatches.map((match) => (
                        <MatchRow key={match.id} match={match} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function PlaylistRow({ playlist }: { playlist: AdminPlaylistStats }) {
  return (
    <tr className="border-b border-gray-700/30">
      <td className="px-4 py-2.5 font-medium text-gray-200">{playlist.name}</td>
      <td className="px-4 py-2.5 text-right text-gray-300">{playlist.songCount}</td>
      <td className="px-4 py-2.5 text-right text-gray-300">{playlist.matchCount}</td>
      <td className="px-4 py-2.5 text-right text-gray-300">{playlist.percentComplete}%</td>
      <td className="px-4 py-2.5 text-gray-400 max-w-[180px] truncate">
        {playlist.topSong ? playlist.topSong.title : <span className="text-gray-600">--</span>}
      </td>
    </tr>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function MatchRow({ match }: { match: AdminMatch }) {
  const date = new Date(match.created_at * 1000).toLocaleDateString();
  const isDraw = !match.winner_id;
  const song1Won = match.winner_id === match.song1_id;
  const song2Won = match.winner_id === match.song2_id;

  return (
    <tr className="border-b border-gray-700/30">
      <td className={`px-4 py-2.5 ${song1Won ? "text-emerald-400 font-medium" : "text-gray-300"}`}>
        {match.song1_title}
      </td>
      <td className="px-4 py-2.5 text-center text-gray-500 text-xs">
        {isDraw ? "Draw" : "vs"}
      </td>
      <td className={`px-4 py-2.5 ${song2Won ? "text-emerald-400 font-medium" : "text-gray-300"}`}>
        {match.song2_title}
      </td>
      <td className="px-4 py-2.5 text-right text-gray-500">{date}</td>
    </tr>
  );
}


import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminUsers, type AdminUser, type AdminUsersResponse } from "../lib/api";

export default function AdminPage() {
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminUsers()
      .then(setData)
      .catch((err) => setError(err.response?.data?.error || "Failed to load admin data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-6 text-center text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, users } = data;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        Admin Dashboard
      </h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Users" value={summary.totalUsers} color="text-purple-400" />
        <SummaryCard label="Total Songs" value={summary.totalSongs} color="text-emerald-400" />
        <SummaryCard label="Total Battles" value={summary.totalBattles} color="text-pink-400" />
        <SummaryCard label="Total Playlists" value={summary.totalPlaylists} color="text-amber-400" />
      </div>

      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700/50">
          <h2 className="text-lg font-semibold text-gray-200">Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700/50">
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                <th className="px-5 py-3 font-medium text-right">Playlists</th>
                <th className="px-5 py-3 font-medium text-right">Songs</th>
                <th className="px-5 py-3 font-medium text-right">Battles</th>
                <th className="px-5 py-3 font-medium">Top Song</th>
                <th className="px-5 py-3 font-medium text-center">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow key={user.id} user={user} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const joined = new Date(user.created_at * 1000).toLocaleDateString();
  const topSong = user.stats.topSong;

  return (
    <tr className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors">
      <td className="px-5 py-3">
        <Link
          to={`/admin/user/${user.id}`}
          className="text-purple-400 hover:text-purple-300 transition-colors font-medium"
        >
          {user.email}
        </Link>
      </td>
      <td className="px-5 py-3 text-gray-400">{joined}</td>
      <td className="px-5 py-3 text-right text-gray-300">{user.playlists.length}</td>
      <td className="px-5 py-3 text-right text-gray-300">{user.stats.totalSongs}</td>
      <td className="px-5 py-3 text-right text-gray-300">{user.stats.totalMatches}</td>
      <td className="px-5 py-3 text-gray-300 max-w-[200px] truncate">
        {topSong ? (
          <span title={`${topSong.title} (${Math.round(topSong.rating)})`}>
            {topSong.title}
          </span>
        ) : (
          <span className="text-gray-500">--</span>
        )}
      </td>
      <td className="px-5 py-3 text-center">
        {user.is_admin ? (
          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 rounded-full">
            Admin
          </span>
        ) : (
          <span className="text-gray-500 text-xs">User</span>
        )}
      </td>
    </tr>
  );
}

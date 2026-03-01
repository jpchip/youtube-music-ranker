import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        YouTube Music Ranker
      </h1>
      <p className="text-gray-400 text-xl mb-12">
        Import your YouTube Music playlists, battle songs head-to-head, and
        discover your true favorites.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 text-left">
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5">
          <div className="text-2xl mb-2">📥</div>
          <h3 className="font-semibold text-white mb-1">Import</h3>
          <p className="text-sm text-gray-400">
            Paste a YouTube Music playlist URL and your songs are ready to rank.
          </p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5">
          <div className="text-2xl mb-2">⚔️</div>
          <h3 className="font-semibold text-white mb-1">Battle</h3>
          <p className="text-sm text-gray-400">
            Pick your favorite in head-to-head matchups. The ELO rating system
            does the math.
          </p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5">
          <div className="text-2xl mb-2">🏆</div>
          <h3 className="font-semibold text-white mb-1">Rank</h3>
          <p className="text-sm text-gray-400">
            Watch your personal ranking take shape and share it with friends.
          </p>
        </div>
      </div>

      <div className="flex gap-3 justify-center">
        <Link
          to="/login"
          className="px-8 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors text-white"
        >
          Get Started
        </Link>
        <Link
          to="/login"
          state={{ tab: "login" }}
          className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-white"
        >
          Login
        </Link>
      </div>
    </div>
  );
}

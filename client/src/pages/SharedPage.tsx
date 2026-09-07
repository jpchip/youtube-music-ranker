import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { getShare, copyShare, type ShareData } from "../lib/api";
import RankingTable from "../components/RankingTable";
import { useAuth } from "../contexts/AuthContext";
import { usePlaylist } from "../contexts/PlaylistContext";

export default function SharedPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const { refreshPlaylists } = usePlaylist();

  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const copyStarted = useRef(false);

  useEffect(() => {
    if (!id) return;
    getShare(id)
      .then(setData)
      .catch(() => setError("Share not found"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleCopy() {
    if (!id) return;
    if (!token) {
      const next = encodeURIComponent(`/shared/${id}?copy=1`);
      navigate(`/login?next=${next}`);
      return;
    }
    if (copyStarted.current) return;
    copyStarted.current = true;
    setCopying(true);
    setCopyError(null);
    try {
      await copyShare(id);
      await refreshPlaylists();
      navigate("/battle");
    } catch (err) {
      copyStarted.current = false;
      setCopying(false);
      if (axios.isAxiosError(err)) {
        setCopyError(err.response?.data?.error || "Failed to copy playlist");
      } else {
        setCopyError("Failed to copy playlist");
      }
    }
  }

  // Auto-run the copy after a login/register round-trip.
  useEffect(() => {
    if (
      searchParams.get("copy") === "1" &&
      token &&
      data &&
      !copyStarted.current
    ) {
      handleCopy();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, token, data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-500">
          Loading shared rankings...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-10">
          <p className="text-gray-400">{error || "Share not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">{data.title}</h1>
        <p className="text-sm text-gray-400 mt-1">
          {data.songs.length} songs &middot; Shared{" "}
          {new Date(data.created_at * 1000).toLocaleDateString()}
        </p>

        <div className="mt-4">
          <button
            onClick={handleCopy}
            disabled={copying}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700
                       rounded-lg font-medium transition-colors"
          >
            {copying ? "Copying…" : "Rank these yourself"}
          </button>
          <p className="text-xs text-gray-500 mt-2">
            {token
              ? "Creates your own copy of this playlist so you can rank the same songs and compare."
              : "Log in or create an account to rank the same songs and compare."}
          </p>
          {copyError && (
            <p className="text-sm text-red-400 mt-2">{copyError}</p>
          )}
        </div>
      </div>

      <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl overflow-hidden">
        <RankingTable songs={data.songs} />
      </div>
    </div>
  );
}

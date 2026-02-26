import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getShare, type ShareData } from "../lib/api";
import RankingTable from "../components/RankingTable";

export default function SharedPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getShare(id)
      .then(setData)
      .catch(() => setError("Share not found"))
      .finally(() => setLoading(false));
  }, [id]);

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
          <p className="text-gray-400">
            {error || "Share not found"}
          </p>
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
      </div>

      <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl overflow-hidden">
        <RankingTable songs={data.songs} />
      </div>
    </div>
  );
}

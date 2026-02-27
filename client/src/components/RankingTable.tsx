import type { SongWithRating } from "../lib/api";

interface RankingTableProps {
  songs: SongWithRating[];
  offset?: number;
}

export default function RankingTable({ songs, offset = 0 }: RankingTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700 text-gray-400 text-left">
            <th className="py-3 px-2 w-12">#</th>
            <th className="py-3 px-2">Song</th>
            <th className="py-3 px-2 text-right w-20">Rating</th>
            <th className="py-3 px-2 text-right w-16 hidden sm:table-cell">RD</th>
            <th className="py-3 px-2 text-right w-24 hidden md:table-cell">Record</th>
          </tr>
        </thead>
        <tbody>
          {songs.map((song, i) => {
            const artists = Array.isArray(song.artists)
              ? song.artists.join(", ")
              : song.artists;
            return (
              <tr
                key={song.video_id}
                className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
              >
                <td className="py-2.5 px-2 font-mono text-gray-500">{offset + i + 1}</td>
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      className="w-10 h-10 rounded object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{song.title}</p>
                      <p className="text-xs text-gray-400 truncate">{artists}</p>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-purple-400">
                  {Math.round(song.rating)}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-gray-500 hidden sm:table-cell">
                  {Math.round(song.rd)}
                </td>
                <td className="py-2.5 px-2 text-right text-gray-400 hidden md:table-cell">
                  {song.wins}W {song.losses}L {song.draws}D
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

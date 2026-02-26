import type { SongWithRating } from "../lib/api";

interface SongCardProps {
  song: SongWithRating;
  rank?: number;
  compact?: boolean;
}

export default function SongCard({ song, rank, compact }: SongCardProps) {
  const artists = Array.isArray(song.artists)
    ? song.artists.join(", ")
    : song.artists;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50">
        {rank != null && (
          <span className="text-sm font-mono text-gray-500 w-8 text-right">
            #{rank}
          </span>
        )}
        <img
          src={song.thumbnail}
          alt={song.title}
          className="w-10 h-10 rounded object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{song.title}</p>
          <p className="text-xs text-gray-400 truncate">{artists}</p>
        </div>
        <span className="text-sm font-mono text-purple-400">
          {Math.round(song.rating)}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
      <div className="aspect-video bg-gray-900 relative">
        <img
          src={song.thumbnail}
          alt={song.title}
          className="w-full h-full object-cover"
        />
        {rank != null && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-0.5 text-xs font-bold">
            #{rank}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold truncate">{song.title}</h3>
        <p className="text-sm text-gray-400 truncate">{artists}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span className="font-mono text-purple-400 text-sm">
            {Math.round(song.rating)}
          </span>
          <span>RD {Math.round(song.rd)}</span>
          <span>
            {song.wins}W {song.losses}L {song.draws}D
          </span>
        </div>
      </div>
    </div>
  );
}

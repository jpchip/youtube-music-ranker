interface SpotifyPlayerProps {
  trackId: string;
  className?: string;
}

export default function SpotifyPlayer({ trackId, className }: SpotifyPlayerProps) {
  const id = trackId.replace(/^sp:/, "");

  return (
    <div className={className}>
      <iframe
        src={`https://open.spotify.com/embed/track/${id}?theme=0`}
        width="100%"
        className="aspect-video rounded-lg"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title="Spotify player"
      />
    </div>
  );
}

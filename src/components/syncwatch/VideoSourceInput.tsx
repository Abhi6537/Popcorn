import { useState } from 'react';
import { Link, Upload, Youtube } from 'lucide-react';
import { VideoState } from '@/hooks/useRoom';

interface VideoSourceInputProps {
  onSync: (state: Partial<VideoState>) => void;
  isHost: boolean;
}

export function VideoSourceInput({ onSync, isHost }: VideoSourceInputProps) {
  const [url, setUrl] = useState('');

  if (!isHost) return null;

  const handleSubmit = () => {
    if (!url.trim()) return;
    const isYT = url.includes('youtube.com') || url.includes('youtu.be');
    onSync({
      url: url.trim(),
      type: isYT ? 'youtube' : 'direct',
      playing: false,
      currentTime: 0,
    });
    setUrl('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    onSync({
      url: objectUrl,
      type: 'local',
      playing: false,
      currentTime: 0,
    });
  };

  return (
    <div className="glass-panel rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Link className="w-4 h-4 text-primary" />
        Video Source
      </h3>

      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Paste YouTube or video URL..."
          className="flex-1 bg-secondary/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
        />
        <button
          onClick={handleSubmit}
          disabled={!url.trim()}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-40"
        >
          Load
        </button>
      </div>

      <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
        <Upload className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Upload local video (mp4, webm, mov)</span>
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleFileUpload}
          className="hidden"
        />
      </label>
    </div>
  );
}

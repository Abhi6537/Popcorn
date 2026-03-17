import { Users, Crown, Copy, Check } from 'lucide-react';
import { Participant } from '@/hooks/useRoom';
import { useState } from 'react';

interface ParticipantsListProps {
  participants: Participant[];
  roomId: string;
}

export function ParticipantsList({ participants, roomId }: ParticipantsListProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Participants ({participants.length})</h3>
        </div>
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Invite'}
        </button>
      </div>

      <div className="space-y-2">
        {participants.map((p) => (
          <div key={p.username} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
              {p.username[0].toUpperCase()}
            </div>
            <span className="text-sm text-foreground">{p.username}</span>
            {p.isHost && <Crown className="w-3.5 h-3.5 text-accent" />}
          </div>
        ))}
      </div>
    </div>
  );
}

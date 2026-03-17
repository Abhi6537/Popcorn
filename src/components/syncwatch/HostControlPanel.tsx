import { useState } from 'react';
import { Crown, MicOff, UserX, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { Participant } from '@/hooks/useRoom';

interface HostControlPanelProps {
  participants: Participant[];
  isHost: boolean;
  currentUsername: string;
  onMuteUser: (username: string) => void;
  onRemoveUser: (username: string) => void;
}

export function HostControlPanel({
  participants,
  isHost,
  currentUsername,
  onMuteUser,
  onRemoveUser,
}: HostControlPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!isHost) return null;

  const otherUsers = participants.filter((p) => p.username !== currentUsername);

  return (
    <div className="glass-panel w-full rounded-lg overflow-hidden flex flex-col">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">Host Controls</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {otherUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No other participants yet.</p>
          ) : (
            otherUsers.map((p) => (
              <div
                key={p.username}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary">
                    {p.username[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-foreground">{p.username}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onMuteUser(p.username)}
                    className="w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center hover:bg-accent/20 hover:text-accent transition-colors"
                    title="Mute user"
                  >
                    <MicOff className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onRemoveUser(p.username)}
                    className="w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors"
                    title="Remove user"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

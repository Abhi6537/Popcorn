import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { motion } from 'framer-motion';
import { Play, Users, MessageCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function Home() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [joinId, setJoinId] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');

  useEffect(() => {
    if (searchParams.get('kicked') === '1') {
      toast.error('You were removed from the room by the host.');
      setSearchParams({}, { replace: true });
    }
    if (searchParams.get('full') === '1') {
      toast.error('That room is full (max 5 participants).');
      setSearchParams({}, { replace: true });
    }
    const joinParam = searchParams.get('join');
    if (joinParam) {
      setJoinId(joinParam);
      setMode('join');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleCreate = () => {
    if (!username.trim()) return;
    const roomId = nanoid(8);
    navigate(`/room/${roomId}?user=${encodeURIComponent(username.trim())}&host=1`);
  };

  const extractRoomId = (input: string) => {
    try {
      if (input.includes('http')) {
        const url = new URL(input);
        const pathParts = url.pathname.split('/');
        const roomIndex = pathParts.indexOf('room');
        if (roomIndex !== -1 && pathParts.length > roomIndex + 1) {
          return pathParts[roomIndex + 1];
        }
        const joinParam = url.searchParams.get('join');
        if (joinParam) return joinParam;
      }
    } catch (e) {
      // ignore
    }
    // If it's a relative path like /?join=123
    if (input.includes('?join=')) {
        const match = input.match(/\?join=([^&]+)/);
        if (match) return match[1];
    }
    return input.split('/').pop()?.trim() || input.trim();
  };

  const handleJoin = () => {
    if (!username.trim() || !joinId.trim()) return;
    const finalRoomId = extractRoomId(joinId);
    navigate(`/room/${finalRoomId}?user=${encodeURIComponent(username.trim())}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md space-y-8"
      >
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="w-24 h-24 mx-auto flex items-center justify-center">
            <img src="/logo.png" alt="Popcorn Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-4xl font-bold text-gradient">Popcorn</h1>
          <p className="text-muted-foreground text-sm">Watch together, no matter where you are</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Zap, label: 'Real-time Sync' },
            { icon: MessageCircle, label: 'Live Chat' },
            { icon: Users, label: 'Watch Party' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="glass-panel rounded-lg p-3 text-center">
              <Icon className="w-5 h-5 mx-auto text-primary mb-1" />
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="glass-panel rounded-xl p-6 space-y-4">
          <div className="flex gap-2 p-1 bg-secondary/30 rounded-lg">
            <button
              onClick={() => setMode('create')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'create' ? 'bg-secondary text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Create
            </button>
            <button
              onClick={() => setMode('join')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'join' ? 'bg-secondary text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Join
            </button>
          </div>

          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your display name"
            className="w-full bg-secondary/50 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                mode === 'join' ? handleJoin() : handleCreate();
              }
            }}
          />

          {mode === 'join' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <input
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Room code or link"
                className="w-full bg-secondary/50 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleJoin();
                  }
                }}
              />
            </motion.div>
          )}

          <button
            onClick={mode === 'join' ? handleJoin : handleCreate}
            disabled={!username.trim() || (mode === 'join' && !joinId.trim())}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/80 transition-colors disabled:opacity-40 glow-primary"
          >
            {mode === 'join' ? 'Join Watch Party' : 'Create Watch Party'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

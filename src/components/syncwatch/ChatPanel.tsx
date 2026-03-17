import { useState, useRef, useEffect } from 'react';
import { Send, Smile } from 'lucide-react';
import { ChatMessage } from '@/hooks/useRoom';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
  username: string;
}

const REACTIONS = ['😂', '🔥', '😱', '❤️', '👏', '😍'];

export function ChatPanel({ messages, onSendMessage, onSendReaction, username }: ChatPanelProps) {
  const [text, setText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText('');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full glass-panel rounded-lg">
      <div className="px-4 py-3 border-b border-border/50">
        <h3 className="text-sm font-semibold text-foreground">Live Chat</h3>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={msg.type === 'reaction' ? 'text-center' : ''}
            >
              {msg.type === 'reaction' ? (
                <span className="text-2xl">{msg.text}</span>
              ) : msg.type === 'system' ? (
                <p className="text-xs text-muted-foreground text-center italic">{msg.text}</p>
              ) : (
                <div className={`flex flex-col ${msg.username === username ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-primary">{msg.username}</span>
                    <span className="text-[10px] text-muted-foreground">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-lg text-sm max-w-[85%] ${
                      msg.username === username
                        ? 'bg-primary/20 text-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-8">No messages yet. Say hi! 👋</p>
        )}
      </div>

      {/* Reactions */}
      <div className="px-3 py-2 border-t border-border/30 flex gap-1.5">
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSendReaction(emoji)}
            className="text-lg hover:scale-125 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/50">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-secondary/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors disabled:opacity-40"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

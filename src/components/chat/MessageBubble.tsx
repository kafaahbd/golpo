import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Check, CheckCheck, Trash2, Copy, Mic } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import socketService from '@/services/socket';
import toast from 'react-hot-toast';
import type { Message, Reaction } from '@/types';
import ImageViewer from '@/components/ui/ImageViewer';

const DEFAULT_REACTIONS = ['❤️', '😂', '😮', '😢', '🙏', '👍'];

interface Props {
  message: Message;
  isOwn: boolean;
  isGrouped: boolean;
  hasNext: boolean;
  chatId: string;
}

function ReactionBar({ reactions, messageId, chatId }: { reactions: Reaction[]; messageId: string; chatId: string }) {
  if (!reactions?.length) return null;
  const grouped = reactions.reduce((acc, r) => {
    acc[r.reactionType] = (acc[r.reactionType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(grouped).map(([emoji, count]) => (
        <button key={emoji}
          onClick={() => socketService.addReaction(messageId, chatId, emoji)}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors"
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
        >
          <span>{emoji}</span>
          {count > 1 && <span style={{ color: 'var(--color-text-muted)' }}>{count}</span>}
        </button>
      ))}
    </div>
  );
}

function VoiceMessage({ mediaUrl, isOwn }: { mediaUrl?: string; isOwn: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  return (
    <div className="flex items-center gap-3 min-w-[160px]">
      <audio ref={audioRef} src={mediaUrl}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={() => {
          if (audioRef.current) setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1));
        }}
      />
      <button onClick={toggle}
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
        style={{ background: isOwn ? 'rgba(255,255,255,0.15)' : 'var(--color-emerald-bg)' }}
      >
        {playing ? (
          <div className="flex gap-0.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-0.5 h-3 rounded-full animate-pulse"
                style={{ background: isOwn ? 'rgba(255,255,255,0.8)' : 'var(--color-emerald)', animationDelay: `${i*0.1}s` }}
              />
            ))}
          </div>
        ) : (
          <Mic className="w-4 h-4" style={{ color: isOwn ? 'rgba(255,255,255,0.8)' : 'var(--color-emerald)' }} />
        )}
      </button>
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
        <div className="h-full rounded-full transition-all"
          style={{ width: `${progress * 100}%`, background: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--color-emerald)' }}
        />
      </div>
    </div>
  );
}

export default function MessageBubble({ message, isOwn, isGrouped, hasNext, chatId }: Props) {
  const { user } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show the best available content
  const content = message.decryptedContent
    ?? (message.deletedForEveryone ? '' : message.encryptedContent);

  const onPressStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    longPressTimer.current = setTimeout(() => {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      setMenuPos({ x: clientX, y: clientY });
      setShowMenu(true);
    }, 500);
  }, []);

  const onPressEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(content || '');
    toast.success('Copied!');
    setShowMenu(false);
  };

  const handleDelete = (forEveryone: boolean) => {
    socketService.deleteMessage(message.id, chatId, forEveryone);
    setShowMenu(false);
  };

  const handleReact = (emoji: string) => {
    socketService.addReaction(message.id, chatId, emoji);
    setShowMenu(false);
  };

  if (message.isDeleted && !message.deletedForEveryone) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}
      >
        {/* Avatar */}
        {!isOwn && !hasNext && (
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mb-1"
            style={{ background: 'var(--color-emerald-bg)', color: 'var(--color-emerald)', border: '1px solid var(--color-emerald-glow)' }}
          >
            {message.sender?.nickname?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        {!isOwn && hasNext && <div className="w-7 flex-shrink-0" />}

        <div className={`flex flex-col max-w-[72%] sm:max-w-[60%] ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Sender name */}
          {!isOwn && !isGrouped && message.sender && (
            <span className="text-xs font-semibold mb-1 ml-1" style={{ color: 'var(--color-emerald)' }}>
              {message.sender.nickname}
            </span>
          )}

          {/* Bubble */}
          <div
            onMouseDown={onPressStart}
            onMouseUp={onPressEnd}
            onTouchStart={onPressStart}
            onTouchEnd={onPressEnd}
            onContextMenu={onContextMenu}
            className={`relative px-3.5 py-2.5 cursor-default select-none ${isOwn ? 'chat-bubble-out' : 'chat-bubble-in'}`}
          >
            {message.deletedForEveryone ? (
              <p className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>🚫 Message deleted</p>
            ) : (
              <>
                {message.type === 'image' && message.mediaUrl && (
                  <img
                    src={message.mediaUrl} alt="Image"
                    className="rounded-2xl max-w-[240px] max-h-[320px] object-cover mb-1 cursor-pointer hover:opacity-90 transition-opacity"
                    loading="lazy"
                    onClick={() => setLightboxSrc(message.mediaUrl!)}
                  />
                )}
                {message.type === 'voice' && (
                  <VoiceMessage mediaUrl={message.mediaUrl} isOwn={isOwn} />
                )}
                {(message.type === 'text' || !message.type) && content && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{content}</p>
                )}
              </>
            )}

            {/* Time + status */}
            <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <span className="text-[10px]" style={{ color: isOwn ? 'rgba(255,255,255,0.35)' : 'var(--color-text-muted)' }}>
                {format(new Date(message.createdAt), 'HH:mm')}
              </span>
              {isOwn && (
                message.status === 'seen'
                  ? <CheckCheck className="w-3 h-3" style={{ color: 'var(--color-emerald-light)' }} />
                  : message.status === 'delivered'
                  ? <CheckCheck className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.4)' }} />
                  : <Check className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.4)' }} />
              )}
            </div>
          </div>

          {/* Reactions */}
          <ReactionBar reactions={message.reactions || []} messageId={message.id} chatId={chatId} />
        </div>
      </motion.div>

      {/* Context menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed',
                top: Math.min(menuPos.y, window.innerHeight - 300),
                left: Math.min(menuPos.x, window.innerWidth - 210),
                zIndex: 50,
              }}
            >
              {/* Quick reactions */}
              <div className="flex gap-1 px-2.5 py-2 mb-1.5 rounded-2xl"
                style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-strong)', boxShadow: 'var(--shadow-glass)' }}
              >
                {DEFAULT_REACTIONS.map((emoji) => (
                  <button key={emoji} onClick={() => handleReact(emoji)}
                    className="text-xl w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:scale-125 hover:bg-white/8"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Action menu */}
              <div className="context-menu">
                <button onClick={handleCopy} className="context-menu-item">
                  <Copy className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                  Copy text
                </button>
                {isOwn && (
                  <>
                    <button onClick={() => handleDelete(false)} className="context-menu-item">
                      <Trash2 className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                      Delete for me
                    </button>
                    <button onClick={() => handleDelete(true)} className="context-menu-item"
                      style={{ color: '#f87171' }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Unsend for everyone
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      {lightboxSrc && <ImageViewer src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </>
  );
}

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Check, CheckCheck, Trash2, Copy, Mic } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import socketService from '@/services/socket';
import toast from 'react-hot-toast';
import type { Message, Reaction } from '@/types';
import clsx from 'clsx';
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
        <button
          key={emoji}
          onClick={() => socketService.addReaction(messageId, chatId, emoji)}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs hover:bg-white/10 transition-colors"
        >
          <span>{emoji}</span>
          {count > 1 && <span className="text-gray-400">{count}</span>}
        </button>
      ))}
    </div>
  );
}

function VoiceMessage({ mediaUrl }: { mediaUrl?: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  return (
    <div className="flex items-center gap-3 min-w-[160px]">
      <audio ref={audioRef} src={mediaUrl} onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={() => {
          if (audioRef.current) setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1));
        }}
      />
      <button onClick={toggle} className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
        {playing ? (
          <div className="flex gap-0.5">
            {[0,1,2].map(i => <div key={i} className="w-0.5 h-3 bg-emerald-400 animate-pulse" style={{animationDelay:`${i*0.1}s`}}/>)}
          </div>
        ) : (
          <Mic className="w-4 h-4 text-emerald-400" />
        )}
      </button>
      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}

export default function MessageBubble({ message, isOwn, isGrouped, hasNext, chatId }: Props) {
  const { user } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const content = message.decryptedContent || (message.deletedForEveryone ? '' : message.encryptedContent);

  // ─── Long press ──────────────────────────────────────────────────────────
  const onPressStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    longPressTimer.current = setTimeout(() => {
      const rect = bubbleRef.current?.getBoundingClientRect();
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
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
    setShowReactions(false);
    setShowMenu(false);
  };

  if (message.isDeleted && !message.deletedForEveryone) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={clsx('flex items-end gap-2 mb-0.5', isOwn ? 'flex-row-reverse' : 'flex-row', isGrouped ? 'mt-0.5' : 'mt-2')}
      >
        {/* Avatar (only for group, non-own) */}
        {!isOwn && !hasNext && (
          <div className="w-7 h-7 rounded-full bg-emerald-600/20 flex items-center justify-center text-xs font-bold text-emerald-400 flex-shrink-0 mb-1">
            {message.sender?.nickname?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        {!isOwn && hasNext && <div className="w-7 flex-shrink-0" />}

        <div className={clsx('flex flex-col max-w-[72%] sm:max-w-[60%]', isOwn ? 'items-end' : 'items-start')}>
          {/* Sender name (group) */}
          {!isOwn && !isGrouped && message.sender && (
            <span className="text-xs text-emerald-400 font-medium ml-2 mb-1">{message.sender.nickname}</span>
          )}

          {/* Bubble */}
          <div
            ref={bubbleRef}
            onMouseDown={onPressStart}
            onMouseUp={onPressEnd}
            onTouchStart={onPressStart}
            onTouchEnd={onPressEnd}
            onContextMenu={onContextMenu}
            className={clsx(
              'relative px-3.5 py-2.5 cursor-default select-none',
              isOwn ? 'chat-bubble-out' : 'chat-bubble-in',
            )}
          >
            {message.deletedForEveryone ? (
              <p className="text-sm italic text-gray-500">🚫 Message deleted</p>
            ) : (
              <>
                {message.type === 'image' && message.mediaUrl && (
                  <img
                    src={message.mediaUrl}
                    alt="Image"
                    className="rounded-xl max-w-[240px] max-h-[320px] object-cover mb-1 cursor-pointer hover:opacity-90 transition-opacity"
                    loading="lazy"
                    onClick={() => setLightboxSrc(message.mediaUrl!)}
                  />
                )}
                {message.type === 'voice' && (
                  <VoiceMessage mediaUrl={message.mediaUrl} />
                )}
                {(message.type === 'text' || !message.type) && content && (
                  <p className="text-sm text-white leading-relaxed whitespace-pre-wrap break-words">{content}</p>
                )}
              </>
            )}

            {/* Time + status */}
            <div className={clsx('flex items-center gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
              <span className="text-[10px] text-white/30">{format(new Date(message.createdAt), 'HH:mm')}</span>
              {isOwn && (
                message.status === 'seen' ? <CheckCheck className="w-3 h-3 text-emerald-400" /> :
                message.status === 'delivered' ? <CheckCheck className="w-3 h-3 text-white/30" /> :
                <Check className="w-3 h-3 text-white/30" />
              )}
            </div>
          </div>

          {/* Reactions */}
          <ReactionBar reactions={message.reactions || []} messageId={message.id} chatId={chatId} />
        </div>
      </motion.div>

      {/* ─── Context Menu Overlay ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                position: 'fixed',
                top: Math.min(menuPos.y, window.innerHeight - 320),
                left: Math.min(menuPos.x, window.innerWidth - 200),
                zIndex: 50,
              }}
              className="w-52"
            >
              {/* Quick reactions */}
              <div className="flex gap-1 px-2 py-2 mb-1 rounded-xl bg-[#1e2d3d] border border-white/8 shadow-glass">
                {DEFAULT_REACTIONS.map((emoji) => (
                  <button key={emoji} onClick={() => handleReact(emoji)}
                    className="text-xl hover:scale-125 transition-transform w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="context-menu">
                <button onClick={handleCopy} className="context-menu-item text-gray-200">
                  <Copy className="w-4 h-4 text-gray-400" /> Copy
                </button>
                {isOwn && (
                  <>
                    <button onClick={() => handleDelete(false)} className="context-menu-item text-gray-200">
                      <Trash2 className="w-4 h-4 text-gray-400" /> Delete for me
                    </button>
                    <button onClick={() => handleDelete(true)} className="context-menu-item text-red-400">
                      <Trash2 className="w-4 h-4" /> Unsend for everyone
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* ─── Image Lightbox ────────────────────────────────────────────── */}
      {lightboxSrc && (
        <ImageViewer src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </>
  );
}

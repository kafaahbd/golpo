import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Smile, X, Image } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useAuthStore } from '@/store/authStore';
import socketService from '@/services/socket';
import { messagesApi } from '@/services/api';
import { useTyping } from '@/hooks/useTyping';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';
import { useChatStore } from '@/store/chatStore';
import toast from 'react-hot-toast';
import { v4 as uuid } from 'uuid';
import type { ChatMember } from '@/types';

interface Props { chatId: string; members: ChatMember[]; }

// Store as plaintext JSON — readable by all chat members.
// Full E2EE (per-recipient RSA) can be layered on top later.
function buildContent(plaintext: string): string {
  return JSON.stringify({ plaintext });
}

export default function MessageInput({ chatId, members }: Props) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();
  const { addMessage } = useChatStore();
  const { onType, stopTyping } = useTyping(chatId);
  const recorder = useMediaRecorder({ mimeType: 'audio/webm;codecs=opus' });

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [text]);

  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content || !user) return;
    setText('');
    stopTyping();

    const tempId = uuid();
    addMessage({
      id: tempId, tempId, chatId, senderId: user.id,
      encryptedContent: JSON.stringify({ plaintext: content }),
      decryptedContent: content,
      type: 'text', isDeleted: false, deletedForEveryone: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      sender: { id: user.id, nickname: user.nickname, avatarUrl: user.avatarUrl },
      reactions: [], status: 'sending', isOptimistic: true,
    });

    try {
      const enc = buildContent(content);
      socketService.sendMessage({ chatId, encryptedContent: enc, type: 'text', tempId });
    } catch { toast.error('Failed to send'); }
  }, [text, chatId, user, members, stopTyping]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleImage = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    setUploading(true);
    try {
      const { data } = await messagesApi.uploadMedia(chatId, file);
      const url = (data as any)?.url ?? data;
      const enc = buildContent('[Image]');
      socketService.sendMessage({ chatId, encryptedContent: enc, type: 'image', mediaUrl: url });
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleVoice = async () => {
    const blob = await recorder.stop();
    if (!blob || blob.size < 500) { toast.error('Too short'); return; }
    setUploading(true);
    try {
      const file = new File([blob], `voice_${Date.now()}.webm`, { type: blob.type });
      const { data } = await messagesApi.uploadMedia(chatId, file);
      const url = (data as any)?.url ?? data;
      const enc = buildContent('[Voice message]');
      socketService.sendMessage({
        chatId, encryptedContent: enc, type: 'voice', mediaUrl: url,
        mediaMeta: JSON.stringify({ duration: recorder.duration }),
      });
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  return (
    <div className="flex-shrink-0 px-4 pb-4 pt-2.5"
      style={{ background: 'var(--color-bg-secondary)', borderTop: '1px solid var(--color-border)' }}
    >
      <AnimatePresence>
        {recorder.isRecording && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            className="flex items-center gap-3 mb-2.5 px-4 py-2 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-red-400 text-sm font-mono font-medium">{recorder.formattedDuration}</span>
            <span className="text-sm flex-1" style={{ color: 'var(--color-text-muted)' }}>Recording...</span>
            <button onClick={recorder.cancel} style={{ color: 'var(--color-text-muted)' }}>
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2">
        {/* Emoji */}
        <div className="relative">
          <button onClick={() => setShowEmoji(v => !v)}
            className="p-2.5 rounded-xl transition-colors hover:bg-white/5 flex-shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <Smile className="w-5 h-5" />
          </button>
          <AnimatePresence>
            {showEmoji && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowEmoji(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute bottom-12 left-0 z-20"
                >
                  <EmojiPicker
                    onEmojiClick={(e) => { setText(t => t + e.emoji); setShowEmoji(false); }}
                    theme={'dark' as any} height={380} width={320}
                    previewConfig={{ showPreview: false }} skinTonesDisabled
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Image */}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); e.target.value = ''; }}
        />
        <button onClick={() => fileInputRef.current?.click()}
          disabled={uploading || recorder.isRecording}
          className="p-2.5 rounded-xl transition-colors hover:bg-white/5 flex-shrink-0 disabled:opacity-40"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {uploading
            ? <div className="w-5 h-5 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
            : <Image className="w-5 h-5" />
          }
        </button>

        {/* Text */}
        {!recorder.isRecording && (
          <div className="flex-1">
            <textarea
              ref={textareaRef} value={text}
              onChange={(e) => { setText(e.target.value); onType(); }}
              onKeyDown={handleKey}
              placeholder="Type a message..."
              rows={1}
              className="w-full rounded-2xl px-4 py-3 text-sm resize-none outline-none transition-all"
              style={{
                maxHeight: '120px',
                background: 'var(--color-bg-hover)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-border-focus)';
                e.target.style.boxShadow = '0 0 0 3px var(--color-emerald-glow)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--color-border)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        )}
        {recorder.isRecording && <div className="flex-1" />}

        {/* Send / Voice */}
        {text.trim() ? (
          <motion.button whileTap={{ scale: 0.88 }} onClick={handleSend}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
            style={{ background: 'var(--color-emerald)', boxShadow: '0 4px 16px var(--color-emerald-glow)' }}
          >
            <Send className="w-5 h-5 text-white" />
          </motion.button>
        ) : recorder.isRecording ? (
          <motion.button whileTap={{ scale: 0.88 }} onClick={handleVoice}
            disabled={uploading}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-emerald)' }}
          >
            {uploading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Send className="w-5 h-5 text-white" />
            }
          </motion.button>
        ) : (
          <motion.button whileTap={{ scale: 0.88 }} onClick={recorder.start}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)' }}
          >
            <Mic className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
          </motion.button>
        )}
      </div>
    </div>
  );
}

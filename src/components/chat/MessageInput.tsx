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

interface Props {
  chatId: string;
  members: ChatMember[];
}

// ─── Encrypt helper ─────────────────────────────────────────────────────────
// Simple approach: store plaintext JSON so all members can read it.
// For true E2EE you'd encrypt per-recipient — this keeps UX working first.
async function buildEncryptedContent(plaintext: string, members: ChatMember[], senderId: string): Promise<string> {
  // Try to encrypt with recipient's public key
  const other = members.find((m) => m.id !== senderId);
  if (other?.publicKey) {
    try {
      const { importPublicKey, encryptMessage } = await import('@/services/crypto');
      const recipientKey = await importPublicKey(other.publicKey);
      return encryptMessage(plaintext, recipientKey);
    } catch {
      // fall through to plaintext
    }
  }
  // Fallback: store as plaintext so everyone can read
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

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [text]);

  // ─── Send text ─────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content || !user) return;

    setText('');
    stopTyping();

    // Optimistic message — always show plaintext to sender immediately
    const tempId = uuid();
    const optimistic = {
      id: tempId,
      tempId,
      chatId,
      senderId: user.id,
      encryptedContent: JSON.stringify({ plaintext: content }),
      decryptedContent: content,
      type: 'text' as const,
      isDeleted: false,
      deletedForEveryone: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: { id: user.id, nickname: user.nickname, avatarUrl: user.avatarUrl },
      reactions: [],
      status: 'sending' as const,
      isOptimistic: true,
    };
    addMessage(optimistic);

    try {
      const encryptedContent = await buildEncryptedContent(content, members, user.id);
      socketService.sendMessage({ chatId, encryptedContent, type: 'text', tempId });
    } catch {
      toast.error('Failed to send message');
    }
  }, [text, chatId, user, members, stopTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ─── Image upload ───────────────────────────────────────────────────────────
  const handleImageUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setUploading(true);
    try {
      const { data } = await messagesApi.uploadMedia(chatId, file);
      const url = (data as any)?.url || data;
      const encryptedContent = await buildEncryptedContent('[Image]', members, user!.id);
      socketService.sendMessage({ chatId, encryptedContent, type: 'image', mediaUrl: url });
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  // ─── Voice send ─────────────────────────────────────────────────────────────
  const handleVoiceSend = async () => {
    const blob = await recorder.stop();
    if (!blob || blob.size < 500) { toast.error('Recording too short'); return; }
    setUploading(true);
    try {
      const file = new File([blob], `voice_${Date.now()}.webm`, { type: blob.type });
      const { data } = await messagesApi.uploadMedia(chatId, file);
      const url = (data as any)?.url || data;
      const encryptedContent = await buildEncryptedContent('[Voice message]', members, user!.id);
      socketService.sendMessage({
        chatId, encryptedContent, type: 'voice',
        mediaUrl: url,
        mediaMeta: JSON.stringify({ duration: recorder.duration }),
      });
    } catch { toast.error('Voice upload failed'); }
    finally { setUploading(false); }
  };

  return (
    <div className="flex-shrink-0 px-4 pb-4 pt-2 bg-[var(--color-bg-secondary)] border-t border-white/5">
      {/* Recording indicator */}
      <AnimatePresence>
        {recorder.isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex items-center gap-3 mb-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-red-400 text-sm font-mono font-medium">{recorder.formattedDuration}</span>
            <span className="text-gray-400 text-sm flex-1">Recording...</span>
            <button onClick={recorder.cancel} className="text-gray-500 hover:text-red-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {recorder.error && (
        <p className="text-xs text-red-400 mb-2 px-1">{recorder.error}</p>
      )}

      <div className="flex items-end gap-2">
        {/* Emoji picker */}
        <div className="relative">
          <button
            onClick={() => setShowEmoji((v) => !v)}
            className="p-2.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-yellow-400 transition-colors flex-shrink-0"
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
                    onEmojiClick={(e) => { setText((t) => t + e.emoji); setShowEmoji(false); }}
                    theme={'dark' as any}
                    height={380} width={320}
                    previewConfig={{ showPreview: false }}
                    skinTonesDisabled
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Image upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || recorder.isRecording}
          className="p-2.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors flex-shrink-0 disabled:opacity-40"
        >
          {uploading
            ? <div className="w-5 h-5 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
            : <Image className="w-5 h-5" />
          }
        </button>

        {/* Text input */}
        {!recorder.isRecording && (
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => { setText(e.target.value); onType(); }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full bg-white/5 border border-white/8 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              style={{ maxHeight: '120px' }}
            />
          </div>
        )}

        {recorder.isRecording && <div className="flex-1" />}

        {/* Send / Voice button */}
        {text.trim() ? (
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleSend}
            className="w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center flex-shrink-0 transition-colors shadow-emerald-glow"
          >
            <Send className="w-5 h-5 text-white" />
          </motion.button>
        ) : recorder.isRecording ? (
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleVoiceSend}
            disabled={uploading}
            className="w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center flex-shrink-0 disabled:opacity-50"
          >
            {uploading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Send className="w-5 h-5 text-white" />
            }
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={recorder.start}
            className="w-11 h-11 rounded-full bg-white/8 hover:bg-white/12 flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <Mic className="w-5 h-5 text-gray-300" />
          </motion.button>
        )}
      </div>
    </div>
  );
}

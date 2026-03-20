import { Pin, Users, Check, CheckCheck } from 'lucide-react';
import { isToday, isYesterday, format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import type { Chat } from '@/types';

interface Props {
  chat: Chat;
  isActive: boolean;
  onlineUsers: Record<string, boolean>;
  isPinned?: boolean;
  onClick: () => void;
}

function time(d?: string): string {
  if (!d) return '';
  const dt = new Date(d);
  if (isToday(dt)) return format(dt, 'HH:mm');
  if (isYesterday(dt)) return 'Yesterday';
  return format(dt, 'dd/MM/yy');
}

export default function ChatListItem({ chat, isActive, onlineUsers, isPinned, onClick }: Props) {
  const { user } = useAuthStore();
  const { typingUsers } = useChatStore();

  const isOwn = chat.lastMessage?.senderId === user?.id;
  const typingList = typingUsers[chat.id] || [];
  const isTyping = typingList.length > 0;
  const other = !chat.isGroup ? chat.members?.find((m) => m.id !== user?.id) : null;
  const isOnline = other ? (onlineUsers[other.id] ?? other.isOnline) : false;

  const preview = () => {
    if (chat.lastMessage?.deletedForEveryone) return '🚫 Message deleted';
    if (chat.lastMessage?.type === 'image') return '📷 Photo';
    if (chat.lastMessage?.type === 'voice') return '🎤 Voice message';
    const c = chat.lastMessage?.decryptedContent || '';
    return c.length > 40 ? c.slice(0, 40) + '…' : c || 'No messages yet';
  };

  return (
    <div
      onClick={onClick}
      className="sidebar-item group"
      style={isActive ? {
        background: 'var(--color-bg-active)',
        border: '1px solid var(--color-emerald-glow)',
      } : {}}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {chat.avatar ? (
          <img src={chat.avatar} alt={chat.name} className="w-11 h-11 rounded-full object-cover" />
        ) : (
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{
              background: chat.isGroup ? 'rgba(139,92,246,0.12)' : 'var(--color-emerald-bg)',
              color: chat.isGroup ? '#a78bfa' : 'var(--color-emerald)',
              border: `1px solid ${chat.isGroup ? 'rgba(139,92,246,0.2)' : 'var(--color-emerald-glow)'}`,
            }}
          >
            {chat.isGroup ? <Users className="w-4.5 h-4.5" /> : (chat.name?.[0] || '?').toUpperCase()}
          </div>
        )}
        {!chat.isGroup && (
          <span
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
            style={{
              background: isOnline ? 'var(--color-emerald)' : 'var(--color-text-muted)',
              borderColor: 'var(--color-sidebar)',
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
              {chat.name || 'Unknown'}
            </span>
            {isPinned && <Pin className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--color-emerald)' }} />}
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {isOwn && !isTyping && (
              chat.lastMessage?.status === 'seen'
                ? <CheckCheck className="w-3.5 h-3.5" style={{ color: 'var(--color-emerald)' }} />
                : chat.lastMessage?.status === 'delivered'
                ? <CheckCheck className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                : <Check className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
            )}
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {time(chat.lastMessage?.createdAt || chat.updatedAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isTyping ? (
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5">
                {[0,1,2].map((i) => (
                  <div key={i} className="typing-dot w-1.5 h-1.5" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <span className="text-xs" style={{ color: 'var(--color-emerald)' }}>typing</span>
            </div>
          ) : (
            <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
              {isOwn && chat.lastMessage && (
                <span style={{ color: 'var(--color-text-secondary)' }}>You: </span>
              )}
              {preview()}
            </p>
          )}
        </div>
      </div>

      {/* Active bar */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-7 rounded-r-full"
          style={{ background: 'var(--color-emerald)' }}
        />
      )}
    </div>
  );
}

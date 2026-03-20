import { Pin, Users, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import type { Chat } from '@/types';
import clsx from 'clsx';

interface Props {
  chat: Chat;
  isActive: boolean;
  onlineUsers: Record<string, boolean>;
  isPinned?: boolean;
  onClick: () => void;
}

function formatChatTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'dd/MM/yy');
}

function MessageStatusIcon({ status, isOwn }: { status?: string; isOwn: boolean }) {
  if (!isOwn) return null;
  if (status === 'seen') return <CheckCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
  if (status === 'delivered') return <CheckCheck className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />;
  return <Check className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />;
}

export default function ChatListItem({ chat, isActive, onlineUsers, isPinned, onClick }: Props) {
  const { user } = useAuthStore();
  const { typingUsers } = useChatStore();

  const isOwn = chat.lastMessage?.senderId === user?.id;
  const typingList = typingUsers[chat.id] || [];
  const isTyping = typingList.length > 0;

  // Online status for DM chats
  const otherMember = !chat.isGroup ? chat.members?.find((m) => m.id !== user?.id) : null;
  const isOnline = otherMember ? onlineUsers[otherMember.id] ?? otherMember.isOnline : false;

  const previewText = () => {
    if (chat.lastMessage?.deletedForEveryone) return '🚫 Message deleted';
    if (chat.lastMessage?.type === 'image') return '📷 Photo';
    if (chat.lastMessage?.type === 'voice') return '🎤 Voice message';
    const content = chat.lastMessage?.decryptedContent || chat.lastMessage?.encryptedContent;
    if (!content) return 'No messages yet';
    return content.length > 42 ? content.slice(0, 42) + '…' : content;
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        'sidebar-item group relative',
        isActive && 'active bg-emerald-500/10 border border-emerald-500/20'
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {chat.avatar ? (
          <img src={chat.avatar} alt={chat.name} className="w-12 h-12 avatar" />
        ) : (
          <div className={clsx(
            'w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold',
            chat.isGroup
              ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20'
              : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20'
          )}>
            {chat.isGroup ? (
              <Users className="w-5 h-5" />
            ) : (
              (chat.name?.[0] || '?').toUpperCase()
            )}
          </div>
        )}
        {/* Online indicator (DM only) */}
        {!chat.isGroup && (
          <span className={clsx(
            'status-indicator border-[var(--color-bg-secondary)]',
            isOnline ? 'bg-emerald-400' : 'bg-gray-600'
          )} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-sm text-white truncate">
              {chat.name || 'Unknown'}
            </span>
            {isPinned && <Pin className="w-3 h-3 text-emerald-400/60 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <MessageStatusIcon status={chat.lastMessage?.status} isOwn={isOwn} />
            <span className="text-[11px] text-gray-500">
              {formatChatTime(chat.lastMessage?.createdAt || chat.updatedAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            {isTyping ? (
              <div className="flex items-center gap-1">
                <div className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="typing-dot w-1.5 h-1.5"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-emerald-400">typing...</span>
              </div>
            ) : (
              <p className="text-xs text-gray-500 truncate">
                {chat.isGroup && chat.lastMessage && isOwn && (
                  <span className="text-gray-400">You: </span>
                )}
                {previewText()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-emerald-400 rounded-r-full" />
      )}
    </div>
  );
}

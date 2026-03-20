import { useCallback } from 'react';
import { useChatStore } from '@/store/chatStore';
import { formatLastSeen } from '@/utils/time';

export function usePresence(userId?: string) {
  const { onlineUsers } = useChatStore();

  const isOnline = userId ? (onlineUsers[userId] ?? false) : false;

  const getPresenceLabel = useCallback(
    (uid?: string, lastSeen?: number | null) => {
      if (!uid) return '';
      if (onlineUsers[uid]) return 'Online';
      return formatLastSeen(lastSeen);
    },
    [onlineUsers],
  );

  return { isOnline, getPresenceLabel };
}

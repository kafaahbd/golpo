import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { onForegroundMessage, initFirebaseMessaging } from '@/services/firebase';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';

export function useNotifications() {
  const { isAuthenticated, user } = useAuthStore();
  const { activeChat } = useChatStore();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Init Firebase Messaging and register token
    initFirebaseMessaging().catch(() => {
      // Silently fail if not configured
    });

    // Handle foreground messages
    const unsub = onForegroundMessage((payload: any) => {
      const { type, senderId } = payload.data || {};
      const { title, body } = payload.notification || {};

      // Suppress if already viewing that chat
      if (type === 'new_message' && activeChat) {
        const isActive = activeChat.members?.some((m) => m.id === senderId);
        if (isActive) return;
      }

      // Show in-app toast
      if (type === 'incoming_call') {
        // Call handled by socket event
        return;
      }

      if (title && body) {
        toast(
          (t) => (
            <div className="flex items-start gap-3 max-w-xs" >
              <div className="w-8 h-8 rounded-full bg-emerald-600/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-bold text-emerald-400">
                  {title[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white">{title}</p>
                <p className="text-xs text-gray-400 truncate">{body}</p>
              </div>
            </div>
          ),
          {
            duration: 4000,
            style: {
              background: '#1a2332',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              padding: '12px 16px',
            },
          }
        );
      }
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [isAuthenticated, user?.id, activeChat?.id]);
}

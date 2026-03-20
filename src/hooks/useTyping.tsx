import { useCallback, useRef } from 'react';
import socketService from '@/services/socket';

export function useTyping(chatId: string) {
  const typingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onType = useCallback(() => {
    if (!typingRef.current) {
      typingRef.current = true;
      socketService.startTyping(chatId);
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      typingRef.current = false;
      socketService.stopTyping(chatId);
    }, 2500);
  }, [chatId]);

  const stopTyping = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (typingRef.current) {
      typingRef.current = false;
      socketService.stopTyping(chatId);
    }
  }, [chatId]);

  return { onType, stopTyping };
}

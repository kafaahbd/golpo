import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { useCallStore } from '@/store/callStore';
import socketService from '@/services/socket';
import { decryptMessage } from '@/services/crypto';
import type { Message } from '@/types';

export function useSocket() {
  const { token, user, keyPair, _hydrated } = useAuthStore();
  const {
    addMessage, updateMessage, removeMessage, replaceOptimisticMessage,
    setTyping, setUserOnline, updateChat,
  } = useChatStore();
  const { setIncomingCall, setRemoteStream, resetCall, session } = useCallStore();

  // ─── Decrypt helper ─────────────────────────────────────────────────────
  const decryptMsg = useCallback(async (msg: Message): Promise<Message> => {
    try {
      const decryptedContent = await decryptMessage(
        msg.encryptedContent,
        keyPair?.privateKey,
      );
      return { ...msg, decryptedContent };
    } catch {
      return { ...msg, decryptedContent: msg.encryptedContent };
    }
  }, [keyPair]);

  useEffect(() => {
    // Wait for Zustand to rehydrate before connecting socket
    if (!_hydrated || !token) return;

    const socket = socketService.connect(token);

    // ─── Messages ──────────────────────────────────────────────────────
    const onMessageReceive = async (msg: Message & { tempId?: string }) => {
      const decrypted = await decryptMsg(msg);

      if (msg.tempId) {
        replaceOptimisticMessage(msg.tempId, decrypted);
      } else {
        addMessage(decrypted);
      }

      // Mark delivered
      if (msg.senderId !== user?.id) {
        socketService.markDelivered(msg.id);
      }

      updateChat(msg.chatId, { lastMessage: decrypted, updatedAt: msg.createdAt });
    };

    const onMessageStatus = ({ messageId, status }: any) => {
      updateMessage(messageId, { status });
    };

    const onMessageDeleted = ({ messageId, forEveryone, chatId }: any) => {
      removeMessage(messageId, chatId, forEveryone);
    };

    const onMessageSeen = ({ userId: seenByUserId, chatId }: any) => {
      // Update status to 'seen' for all messages in this chat sent by current user
      // This is handled optimistically
    };

    const onReactionUpdated = ({ messageId, reactions }: any) => {
      updateMessage(messageId, { reactions });
    };

    // ─── Typing ────────────────────────────────────────────────────────
    const onTypingStart = ({ userId: tid, chatId }: any) => {
      if (tid !== user?.id) setTyping(chatId, tid, true);
    };
    const onTypingStop = ({ userId: tid, chatId }: any) => {
      if (tid !== user?.id) setTyping(chatId, tid, false);
    };

    // ─── Presence ──────────────────────────────────────────────────────
    const onUserOnline = ({ userId: uid }: any) => { if (uid !== user?.id) setUserOnline(uid, true); };
    const onUserOffline = ({ userId: uid }: any) => { if (uid !== user?.id) setUserOnline(uid, false); };

    // ─── Calls ─────────────────────────────────────────────────────────
    const onCallIncoming = (data: any) => {
      setIncomingCall(data);
    };

    const onCallAnswer = async ({ answer, callId }: any) => {
      const { default: webrtcService } = await import('@/services/webrtc');
      await webrtcService.handleAnswer(answer);
      useCallStore.getState().startDurationTimer();
      useCallStore.getState().setSession({
        ...useCallStore.getState().session!,
        state: 'connected',
      });
    };

    const onCallIceCandidate = async ({ candidate }: any) => {
      const { default: webrtcService } = await import('@/services/webrtc');
      await webrtcService.handleIceCandidate(candidate);
    };

    const onCallEnded = () => {
      import('@/services/webrtc').then(({ default: webrtcService }) => webrtcService.endCall());
      resetCall();
    };

    const onCallRejected = () => {
      import('@/services/webrtc').then(({ default: webrtcService }) => webrtcService.endCall());
      resetCall();
    };

    // Register listeners
    socket.on('message:receive', onMessageReceive);
    socket.on('message:status', onMessageStatus);
    socket.on('message:deleted', onMessageDeleted);
    socket.on('message:seen', onMessageSeen);
    socket.on('reaction:updated', onReactionUpdated);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    socket.on('user:online', onUserOnline);
    socket.on('user:offline', onUserOffline);
    socket.on('call:incoming', onCallIncoming);
    socket.on('call:answer', onCallAnswer);
    socket.on('call:ice-candidate', onCallIceCandidate);
    socket.on('call:ended', onCallEnded);
    socket.on('call:rejected', onCallRejected);

    return () => {
      socket.off('message:receive', onMessageReceive);
      socket.off('message:status', onMessageStatus);
      socket.off('message:deleted', onMessageDeleted);
      socket.off('message:seen', onMessageSeen);
      socket.off('reaction:updated', onReactionUpdated);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      socket.off('user:online', onUserOnline);
      socket.off('user:offline', onUserOffline);
      socket.off('call:incoming', onCallIncoming);
      socket.off('call:answer', onCallAnswer);
      socket.off('call:ice-candidate', onCallIceCandidate);
      socket.off('call:ended', onCallEnded);
      socket.off('call:rejected', onCallRejected);
    };
  }, [token, user?.id, keyPair, _hydrated]);
}

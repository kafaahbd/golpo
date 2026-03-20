import { io, Socket } from 'socket.io-client';
import type { SocketEvents } from '@/types';

class SocketService {
  private socket: Socket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect(token: string): Socket {
    if (this.socket?.connected) return this.socket;

    this.socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connect error:', err.message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ─── Emit helpers ──────────────────────────────────────────────────────
  emit<K extends string>(event: K, data?: any) {
    if (!this.socket?.connected) {
      console.warn(`Socket not connected, cannot emit: ${event}`);
      return;
    }
    this.socket.emit(event, data);
  }

  on<K extends keyof SocketEvents>(event: K, handler: SocketEvents[K]) {
    this.socket?.on(event as string, handler as any);
  }

  off<K extends keyof SocketEvents>(event: K, handler?: SocketEvents[K]) {
    this.socket?.off(event as string, handler as any);
  }

  once<K extends keyof SocketEvents>(event: K, handler: SocketEvents[K]) {
    this.socket?.once(event as string, handler as any);
  }

  // ─── Chat events ───────────────────────────────────────────────────────
  joinChat(chatId: string) { this.emit('chat:join', { chatId }); }
  leaveChat(chatId: string) { this.emit('chat:leave', { chatId }); }

  sendMessage(data: {
    chatId: string; encryptedContent: string; type: string;
    replyToId?: string; mediaUrl?: string; mediaMeta?: string; tempId?: string;
  }) { this.emit('message:send', data); }

  startTyping(chatId: string) { this.emit('typing:start', { chatId }); }
  stopTyping(chatId: string) { this.emit('typing:stop', { chatId }); }
  markSeen(chatId: string) { this.emit('message:seen', { chatId }); }
  markDelivered(messageId: string) { this.emit('message:delivered', { messageId }); }

  addReaction(messageId: string, chatId: string, reaction: string) {
    this.emit('reaction:add', { messageId, chatId, reaction });
  }
  removeReaction(messageId: string, chatId: string) {
    this.emit('reaction:remove', { messageId, chatId });
  }
  deleteMessage(messageId: string, chatId: string, forEveryone: boolean) {
    this.emit('message:delete', { messageId, chatId, forEveryone });
  }

  // ─── Call events ───────────────────────────────────────────────────────
  startCall(targetUserId: string, callType: 'audio' | 'video', callId: string) {
    this.emit('call:start', { targetUserId, callType, callId });
  }
  acceptCall(callId: string, callerId: string) {
    this.emit('call:accept', { callId, callerId });
  }
  rejectCall(callId: string, callerId: string) {
    this.emit('call:reject', { callId, callerId });
  }
  endCall(callId: string, targetUserId: string) {
    this.emit('call:end', { callId, targetUserId });
  }
  sendOffer(targetUserId: string, offer: RTCSessionDescriptionInit, callId: string) {
    this.emit('call:offer', { targetUserId, offer, callId });
  }
  sendAnswer(callerId: string, answer: RTCSessionDescriptionInit, callId: string) {
    this.emit('call:answer', { callerId, answer, callId });
  }
  sendIceCandidate(targetUserId: string, candidate: RTCIceCandidateInit, callId: string) {
    this.emit('call:ice-candidate', { targetUserId, candidate, callId });
  }
}

export const socketService = new SocketService();
export default socketService;

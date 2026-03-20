// ─── User ─────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  phone?: string;
  nickname: string;
  avatarUrl?: string;
  verified?: boolean;
  publicKey?: string;
  isOnline?: boolean;
  lastSeen?: number;
  createdAt?: string[];
  archivedChats?: string[];
  pinnedChats?: string[];
  
}

// ─── Auth ──────────────────────────────────────────────────────────────────
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ─── Chat ──────────────────────────────────────────────────────────────────
export interface ChatMember {
  id: string;
  nickname: string;
  email: string;
  avatarUrl?: string;
  publicKey?: string;
  role: 'admin' | 'member';
  isOnline?: boolean;
  lastSeen?: number;
  
}

export interface Chat {
  id: string;
  isGroup: boolean;
  name?: string;
  avatar?: string;
  members: ChatMember[];
  lastMessage?: Message;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
  isPinned?: boolean;
  isArchived?: boolean;
  groupName?: string;
}

// ─── Message ───────────────────────────────────────────────────────────────
export type MessageType = 'text' | 'image' | 'voice';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'seen';

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  reactionType: string;
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  encryptedContent: string;
  decryptedContent?: string;
  type: MessageType;
  mediaUrl?: string;
  mediaMeta?: string;
  replyToId?: string;
  replyTo?: Message;
  isDeleted: boolean;
  deletedForEveryone: boolean;
  createdAt: string;
  updatedAt: string;
  sender?: { id: string; nickname: string; avatarUrl?: string };
  reactions?: Reaction[];
  status?: MessageStatus;
  tempId?: string;
  isOptimistic?: boolean;
}

// ─── Call ──────────────────────────────────────────────────────────────────
export type CallType = 'audio' | 'video';
export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

export interface CallSession {
  callId: string;
  callType: CallType;
  state: CallState;
  remoteUser?: User;
  isInitiator: boolean;
  startedAt?: Date;
}

// ─── Crypto ────────────────────────────────────────────────────────────────
export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface EncryptedMessage {
  encryptedKey: string;   // RSA-encrypted AES key (base64)
  iv: string;             // AES IV (base64)
  ciphertext: string;     // AES-encrypted message (base64)
}

// ─── Socket Events ─────────────────────────────────────────────────────────
export interface SocketEvents {
  'message:receive': (msg: Message & { tempId?: string }) => void;
  'message:status': (data: { messageId: string; status: MessageStatus }) => void;
  'message:deleted': (data: { messageId: string; forEveryone: boolean }) => void;
  'message:seen': (data: { userId: string; chatId: string }) => void;
  'typing:start': (data: { userId: string; chatId: string }) => void;
  'typing:stop': (data: { userId: string; chatId: string }) => void;
  'user:online': (data: { userId: string }) => void;
  'user:offline': (data: { userId: string; lastSeen: string }) => void;
  'reaction:updated': (data: { messageId: string; reactions: Reaction[] }) => void;
  'call:incoming': (data: { callId: string; callerId: string; callerName: string; callerAvatar?: string; callType: CallType }) => void;
  'call:accepted': (data: { callId: string; accepterId: string }) => void;
  'call:rejected': (data: { callId: string }) => void;
  'call:ended': (data: { callId: string }) => void;
  'call:offer': (data: { offer: RTCSessionDescriptionInit; callId: string; callerId: string }) => void;
  'call:answer': (data: { answer: RTCSessionDescriptionInit; callId: string }) => void;
  'call:ice-candidate': (data: { candidate: RTCIceCandidateInit; callId: string; from: string }) => void;
  'call:unavailable': (data: { targetUserId: string }) => void;
}

// ─── UI State ──────────────────────────────────────────────────────────────
export interface UIState {
  theme: 'dark' | 'light';
  sidebarOpen: boolean;
  activePanel: 'chats' | 'search' | 'settings' | 'calls';
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  messageId: string | null;
  senderId: string | null;
}

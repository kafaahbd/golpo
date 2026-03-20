import { create } from 'zustand';
import type { CallSession, CallType, User } from '@/types';

interface CallStore {
  session: CallSession | null;
  incomingCall: {
    callId: string;
    callerId: string;
    callerName: string;
    callerAvatar?: string;
    callType: CallType;
  } | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  callDuration: number;
  durationTimer: ReturnType<typeof setInterval> | null;

  setSession: (session: CallSession | null) => void;
  setIncomingCall: (call: CallStore['incomingCall']) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setMuted: (v: boolean) => void;
  setCameraOff: (v: boolean) => void;
  startDurationTimer: () => void;
  stopDurationTimer: () => void;
  resetCall: () => void;
}

export const useCallStore = create<CallStore>((set, get) => ({
  session: null,
  incomingCall: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,
  callDuration: 0,
  durationTimer: null,

  setSession: (session) => set({ session }),
  setIncomingCall: (incomingCall) => set({ incomingCall }),
  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  setMuted: (isMuted) => set({ isMuted }),
  setCameraOff: (isCameraOff) => set({ isCameraOff }),

  startDurationTimer: () => {
    const { durationTimer } = get();
    if (durationTimer) return;
    const timer = setInterval(() => {
      set((s) => ({ callDuration: s.callDuration + 1 }));
    }, 1000);
    set({ durationTimer: timer, callDuration: 0 });
  },

  stopDurationTimer: () => {
    const { durationTimer } = get();
    if (durationTimer) clearInterval(durationTimer);
    set({ durationTimer: null });
  },

  resetCall: () => {
    const { durationTimer } = get();
    if (durationTimer) clearInterval(durationTimer);
    set({
      session: null,
      incomingCall: null,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isCameraOff: false,
      callDuration: 0,
      durationTimer: null,
    });
  },
}));

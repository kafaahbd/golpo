import { useCallback } from 'react';
import { useCallStore } from '@/store/callStore';
import socketService from '@/services/socket';
import webrtcService from '@/services/webrtc';
import toast from 'react-hot-toast';
import { generateId } from '@/utils/helpers';
import type { User, CallType } from '@/types';

export function useCall() {
  const { session, setSession, setLocalStream, setRemoteStream, resetCall, startDurationTimer } = useCallStore();

  const startCall = useCallback(async (remoteUser: User, callType: CallType) => {
    if (session) {
      toast.error('Already in a call');
      return;
    }
    const callId = generateId();
    try {
      const stream = await webrtcService.startCall(remoteUser.id, callId, callType);
      setLocalStream(stream);

      webrtcService.onRemoteStream = (s) => {
        setRemoteStream(s);
        startDurationTimer();
      };

      webrtcService.onConnectionStateChange = (state) => {
        if (state === 'connected') {
          setSession({ ...useCallStore.getState().session!, state: 'connected' });
          startDurationTimer();
        } else if (state === 'failed' || state === 'disconnected') {
          endCall();
        }
      };

      setSession({
        callId,
        callType,
        state: 'calling',
        remoteUser,
        isInitiator: true,
        startedAt: new Date(),
      });

      socketService.startCall(remoteUser.id, callType, callId);
    } catch (err: any) {
      toast.error(`Cannot start call: ${err.message}`);
      resetCall();
    }
  }, [session]);

  const endCall = useCallback(() => {
    const current = useCallStore.getState().session;
    if (current) {
      socketService.endCall(current.callId, current.remoteUser?.id || '');
    }
    webrtcService.endCall();
    resetCall();
  }, []);

  const toggleMute = useCallback(() => {
    const muted = webrtcService.toggleMute();
    useCallStore.getState().setMuted(muted);
    return muted;
  }, []);

  const toggleCamera = useCallback(() => {
    const off = webrtcService.toggleCamera();
    useCallStore.getState().setCameraOff(off);
    return off;
  }, []);

  const switchCamera = useCallback(async () => {
    await webrtcService.switchCamera();
  }, []);

  return { session, startCall, endCall, toggleMute, toggleCamera, switchCamera };
}

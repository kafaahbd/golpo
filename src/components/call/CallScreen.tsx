import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { PhoneOff, Mic, MicOff, Video, VideoOff, SwitchCamera, Minimize2 } from 'lucide-react';
import { useCallStore } from '@/store/callStore';
import socketService from '@/services/socket';
import webrtcService from '@/services/webrtc';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function CallScreen() {
  const {
    session, localStream, remoteStream, isMuted, isCameraOff,
    callDuration, setMuted, setCameraOff, resetCall,
  } = useCallStore();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [minimized, setMinimized] = useState(false);

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleEndCall = () => {
    if (session) {
      socketService.endCall(session.callId, session.remoteUser?.id || '');
    }
    webrtcService.endCall();
    resetCall();
  };

  const handleToggleMute = () => {
    const muted = webrtcService.toggleMute();
    setMuted(muted);
  };

  const handleToggleCamera = () => {
    const off = webrtcService.toggleCamera();
    setCameraOff(off);
  };

  if (!session) return null;

  const isVideo = session.callType === 'video';
  const isConnected = session.state === 'connected';

  if (minimized) {
    return (
      <motion.div
        drag
        className="fixed bottom-24 right-4 z-[90] w-24 h-32 rounded-2xl overflow-hidden border border-white/10 shadow-glass cursor-move"
        style={{ touchAction: 'none' }}
      >
        {isVideo && localStream ? (
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-emerald-900/50 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{session.remoteUser?.nickname?.[0]?.toUpperCase()}</span>
          </div>
        )}
        <button
          onClick={() => setMinimized(false)}
          className="absolute top-1 right-1 p-1 rounded-full bg-black/40"
        >
          <Minimize2 className="w-3 h-3 text-white" />
        </button>
        {isConnected && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white/70 font-mono">
            {formatDuration(callDuration)}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex flex-col"
      style={{
        background: isVideo ? '#000' : 'linear-gradient(160deg, #022c22 0%, #0a1628 100%)',
      }}
    >
      {/* Remote video */}
      {isVideo && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Audio-only: avatar */}
      {!isVideo && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative mb-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="absolute rounded-full border border-emerald-500/20 call-ring"
                style={{
                  width: `${100 + i * 50}px`, height: `${100 + i * 50}px`,
                  top: `${-(i * 25)}px`, left: `${-(i * 25)}px`,
                  animationDelay: `${i * 0.7}s`,
                }}
              />
            ))}
            <div className="relative w-24 h-24 rounded-full bg-emerald-600/20 border-2 border-emerald-500/30 flex items-center justify-center">
              <span className="text-4xl font-bold text-emerald-400">
                {session.remoteUser?.nickname?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">{session.remoteUser?.nickname}</h2>
          <p className="text-emerald-400/70 text-sm mt-2">
            {!isConnected ? (session.isInitiator ? 'Calling...' : 'Connecting...') : formatDuration(callDuration)}
          </p>
        </div>
      )}

      {/* Video: overlay info */}
      {isVideo && (
        <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold">{session.remoteUser?.nickname}</h3>
              <p className="text-white/60 text-sm">
                {!isConnected ? 'Connecting...' : formatDuration(callDuration)}
              </p>
            </div>
            <button
              onClick={() => setMinimized(true)}
              className="p-2 rounded-full bg-white/10 text-white"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Local video (PiP) */}
      {isVideo && (
        <div className="absolute top-20 right-4 w-28 h-40 rounded-2xl overflow-hidden border border-white/20 shadow-glass">
          <video ref={localVideoRef} autoPlay muted playsInline
            className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : ''}`}
          />
          {isCameraOff && (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-gray-500" />
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 pb-10 pt-6 px-8 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={handleToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isMuted ? 'bg-red-500/80 text-white' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* End call */}
          <button
            onClick={handleEndCall}
            className="w-18 h-18 w-20 h-20 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-lg transition-colors"
          >
            <PhoneOff className="w-8 h-8 text-white" />
          </button>

          {isVideo ? (
            <button
              onClick={handleToggleCamera}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isCameraOff ? 'bg-red-500/80 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>
          ) : (
            <div className="w-14 h-14" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

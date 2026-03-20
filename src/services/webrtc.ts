import socketService from './socket';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callId: string = '';
  private remoteUserId: string = '';

  public onRemoteStream?: (stream: MediaStream) => void;
  public onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  public onTrackEnded?: () => void;

  // ─── Setup ────────────────────────────────────────────────────────────
  private createPeerConnection() {
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 10 });

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socketService.sendIceCandidate(this.remoteUserId, candidate.toJSON(), this.callId);
      }
    };

    this.pc.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.onRemoteStream?.(event.streams[0]);
    };

    this.pc.onconnectionstatechange = () => {
      this.onConnectionStateChange?.(this.pc!.connectionState);
      if (this.pc?.connectionState === 'failed') this.restartIce();
    };

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc?.iceConnectionState === 'failed') this.restartIce();
    };
  }

  private restartIce() {
    if (this.pc) {
      this.pc.restartIce();
    }
  }

  // ─── Start Call (Initiator) ───────────────────────────────────────────
  async startCall(targetUserId: string, callId: string, callType: 'audio' | 'video'): Promise<MediaStream> {
    this.callId = callId;
    this.remoteUserId = targetUserId;

    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video' ? { width: 1280, height: 720, facingMode: 'user' } : false,
    });

    this.createPeerConnection();
    this.localStream.getTracks().forEach((track) => this.pc!.addTrack(track, this.localStream!));

    const offer = await this.pc!.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: callType === 'video' });
    await this.pc!.setLocalDescription(offer);
    socketService.sendOffer(targetUserId, offer, callId);

    return this.localStream;
  }

  // ─── Accept Call (Receiver) ───────────────────────────────────────────
  async acceptCall(callerId: string, callId: string, offer: RTCSessionDescriptionInit, callType: 'audio' | 'video'): Promise<MediaStream> {
    this.callId = callId;
    this.remoteUserId = callerId;

    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video' ? { width: 1280, height: 720, facingMode: 'user' } : false,
    });

    this.createPeerConnection();
    this.localStream.getTracks().forEach((track) => this.pc!.addTrack(track, this.localStream!));

    await this.pc!.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);
    socketService.sendAnswer(callerId, answer, callId);

    return this.localStream;
  }

  // ─── Handle Answer ────────────────────────────────────────────────────
  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.pc) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  // ─── Handle ICE Candidate ─────────────────────────────────────────────
  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc) return;
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('Failed to add ICE candidate:', e);
    }
  }

  // ─── Controls ─────────────────────────────────────────────────────────
  toggleMute(): boolean {
    const track = this.localStream?.getAudioTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    return !track.enabled; // returns isMuted
  }

  toggleCamera(): boolean {
    const track = this.localStream?.getVideoTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    return !track.enabled; // returns isCameraOff
  }

  async switchCamera() {
    const videoTrack = this.localStream?.getVideoTracks()[0];
    if (!videoTrack) return;
    const constraints = videoTrack.getConstraints();
    const newFacing = constraints.facingMode === 'user' ? 'environment' : 'user';
    await videoTrack.applyConstraints({ facingMode: newFacing });
  }

  isMuted(): boolean {
    return !(this.localStream?.getAudioTracks()[0]?.enabled ?? true);
  }

  isCameraOff(): boolean {
    return !(this.localStream?.getVideoTracks()[0]?.enabled ?? true);
  }

  getLocalStream(): MediaStream | null { return this.localStream; }
  getRemoteStream(): MediaStream | null { return this.remoteStream; }

  // ─── End Call ─────────────────────────────────────────────────────────
  endCall() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.remoteStream?.getTracks().forEach((t) => t.stop());
    this.pc?.close();
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
    this.callId = '';
    this.remoteUserId = '';
  }
}

export const webrtcService = new WebRTCService();
export default webrtcService;

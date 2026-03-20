import { motion } from "framer-motion";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useCallStore } from "@/store/callStore";
import socketService from "@/services/socket";
import webrtcService from "@/services/webrtc";
import toast from "react-hot-toast";

export default function IncomingCallModal() {
	const {
		incomingCall,
		setIncomingCall,
		setSession,
		setLocalStream,
		setRemoteStream,
		resetCall,
	} = useCallStore();

	if (!incomingCall) return null;

	const handleAccept = async () => {
		const call = incomingCall;
		setIncomingCall(null);

		try {
			// Wait for the offer to come through socket (set up listener)
			socketService.once("call:offer", async ({ offer, callId }) => {
				const stream = await webrtcService.acceptCall(
					call.callerId,
					callId,
					offer,
					call.callType,
				);
				setLocalStream(stream);
				webrtcService.onRemoteStream = (s) => setRemoteStream(s);
				setSession({
					callId: call.callId,
					callType: call.callType,
					state: "connected",
					remoteUser: {
						id: call.callerId,
						nickname: call.callerName,
						avatarUrl: call.callerAvatar,
					} as any,
					isInitiator: false,
				});
				useCallStore.getState().startDurationTimer();
			});

			socketService.acceptCall(call.callId, call.callerId);
		} catch (err: any) {
			toast.error(`Failed to accept call: ${err.message}`);
			resetCall();
		}
	};

	const handleReject = () => {
		socketService.rejectCall(incomingCall.callId, incomingCall.callerId);
		setIncomingCall(null);
	};

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md"
		>
			<motion.div
				initial={{ scale: 0.85, y: 40 }}
				animate={{ scale: 1, y: 0 }}
				exit={{ scale: 0.85, y: 40 }}
				transition={{ type: "spring", damping: 20, stiffness: 300 }}
				className="relative w-80 rounded-3xl overflow-hidden"
				style={{
					background: "linear-gradient(160deg, #0d1f15 0%, #0a1628 100%)",
					border: "1px solid rgba(16,185,129,0.2)",
					boxShadow:
						"0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(16,185,129,0.1)",
				}}
			>
				{/* Pulse rings */}
				<div className="absolute top-12 left-1/2 -translate-x-1/2">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="absolute rounded-full border border-emerald-500/20 call-ring"
							style={{
								width: `${80 + i * 40}px`,
								height: `${80 + i * 40}px`,
								top: `${-(i * 20)}px`,
								left: `${-(i * 20)}px`,
								animationDelay: `${i * 0.5}s`,
							}}
						/>
					))}
				</div>

				<div className="relative p-8 text-center">
					{/* Avatar */}
					<div className="relative mx-auto mb-6 w-20 h-20">
						{incomingCall.callerAvatar ? (
							<img
								src={incomingCall.callerAvatar}
								alt={incomingCall.callerName}
								className="w-full h-full rounded-full object-cover border-2 border-emerald-500/30"
							/>
						) : (
							<div className="w-full h-full rounded-full bg-emerald-600/20 border-2 border-emerald-500/30 flex items-center justify-center">
								<span className="text-3xl font-bold text-emerald-400">
									{incomingCall.callerName[0].toUpperCase()}
								</span>
							</div>
						)}
					</div>

					<p className="text-sm text-emerald-400/80 mb-1 uppercase tracking-wider font-medium">
						Incoming {incomingCall.callType} call
					</p>
					<h2 className="text-2xl font-bold text-white mb-1">
						{incomingCall.callerName}
					</h2>
					<p className="text-gray-400 text-sm mb-8">is calling you...</p>

					{/* Action buttons */}
					<div className="flex items-center justify-center gap-8">
						{/* Reject */}
						<div className="flex flex-col items-center gap-2">
							<motion.button
								whileTap={{ scale: 0.9 }}
								onClick={handleReject}
								className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-lg transition-colors"
							>
								<PhoneOff className="w-7 h-7 text-white" />
							</motion.button>
							<span className="text-xs text-gray-400">Decline</span>
						</div>

						{/* Accept */}
						<div className="flex flex-col items-center gap-2">
							<motion.button
								whileTap={{ scale: 0.9 }}
								onClick={handleAccept}
								className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-lg transition-colors animate-pulse-emerald"
							>
								{incomingCall.callType === "video" ? (
									<Video className="w-7 h-7 text-white" />
								) : (
									<Phone className="w-7 h-7 text-white" />
								)}
							</motion.button>
							<span className="text-xs text-gray-400">Accept</span>
						</div>
					</div>
				</div>
			</motion.div>
		</motion.div>
	);
}

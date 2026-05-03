import { useRef, useState, useEffect, useCallback } from "react";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

export interface RtcSignal {
  type: "rtc_join" | "rtc_offer" | "rtc_answer" | "rtc_ice" | "rtc_leave";
  from: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface UseHuddleRtcOptions {
  isInHuddle: boolean;
  myDbUserId: string | null;
  sendMessage: (msg: object) => void;
  registerSignalHandler: (fn: (msg: RtcSignal) => void) => void;
}

interface UseHuddleRtcResult {
  muted: boolean;
  toggleMute: () => void;
  audioError: string | null;
  hasAudio: boolean;
  speaking: Record<string, boolean>;
}

export function useHuddleRtc({
  isInHuddle,
  myDbUserId,
  sendMessage,
  registerSignalHandler,
}: UseHuddleRtcOptions): UseHuddleRtcResult {
  const [muted, setMuted] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [hasAudio, setHasAudio] = useState(false);
  const [speaking, setSpeaking] = useState<Record<string, boolean>>({});

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceCandidateQueueRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const speakingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const localAnalyserRef = useRef<{ ctx: AudioContext; interval: ReturnType<typeof setInterval> } | null>(null);

  // Stable refs to avoid stale closures
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;
  const myDbUserIdRef = useRef(myDbUserId);
  myDbUserIdRef.current = myDbUserId;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  /** Create or update the speaking flag for a peer, auto-clearing after silence */
  const markSpeaking = useCallback((userId: string, active: boolean) => {
    if (active) {
      setSpeaking((prev) => (prev[userId] ? prev : { ...prev, [userId]: true }));
      const existing = speakingTimersRef.current.get(userId);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        setSpeaking((prev) => {
          if (!prev[userId]) return prev;
          const next = { ...prev };
          delete next[userId];
          return next;
        });
        speakingTimersRef.current.delete(userId);
      }, 800);
      speakingTimersRef.current.set(userId, t);
    }
  }, []);

  /** Attach Web Audio speaking detection to a MediaStream */
  function startSpeakingDetection(stream: MediaStream, userId: string): () => void {
    let ctx: AudioContext | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    try {
      ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      interval = setInterval(() => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        if (avg > 12) markSpeaking(userId, true);
      }, 100);
    } catch {}
    return () => {
      if (interval) clearInterval(interval);
      ctx?.close().catch(() => {});
    };
  }

  /** Build an RTCPeerConnection to a target peer */
  function createPeer(targetUserId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks
    const localStream = localStreamRef.current;
    if (localStream) {
      for (const track of localStream.getTracks()) {
        pc.addTrack(track, localStream);
      }
    }

    // Relay ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendMessageRef.current({
          type: "rtc_ice",
          to: targetUserId,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    // Attach incoming remote stream to an audio element
    let stopDetection: (() => void) | null = null;
    pc.ontrack = (e) => {
      const stream = e.streams[0];
      if (!stream) return;

      let audio = remoteAudioRefs.current.get(targetUserId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        remoteAudioRefs.current.set(targetUserId, audio);
      }
      audio.srcObject = stream;
      audio.play().catch(() => {});

      // Speaking detection for remote peer
      if (stopDetection) stopDetection();
      stopDetection = startSpeakingDetection(stream, targetUserId);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        if (stopDetection) { stopDetection(); stopDetection = null; }
        peersRef.current.delete(targetUserId);
        const audio = remoteAudioRefs.current.get(targetUserId);
        if (audio) { audio.pause(); audio.srcObject = null; remoteAudioRefs.current.delete(targetUserId); }
      }
    };

    peersRef.current.set(targetUserId, pc);
    return pc;
  }

  /** Drain any queued ICE candidates for a peer once remoteDescription is set */
  async function drainCandidateQueue(pc: RTCPeerConnection, fromUserId: string) {
    const queue = iceCandidateQueueRef.current.get(fromUserId) ?? [];
    for (const c of queue) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    iceCandidateQueueRef.current.delete(fromUserId);
  }

  /** Handle an incoming RTC signaling message */
  const handleSignal = useCallback(
    async (msg: RtcSignal) => {
      const { type, from } = msg;
      if (!from || from === myDbUserIdRef.current) return;

      switch (type) {
        case "rtc_join": {
          // An existing participant creates the offer to the newcomer
          if (!localStreamRef.current) return;
          const pc = createPeer(from);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendMessageRef.current({ type: "rtc_offer", to: from, sdp: offer });
          } catch {}
          break;
        }

        case "rtc_offer": {
          if (!localStreamRef.current || !msg.sdp) return;
          let pc = peersRef.current.get(from);
          if (!pc) pc = createPeer(from);
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            await drainCandidateQueue(pc, from);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendMessageRef.current({ type: "rtc_answer", to: from, sdp: answer });
          } catch {}
          break;
        }

        case "rtc_answer": {
          const pc = peersRef.current.get(from);
          if (!pc || !msg.sdp) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            await drainCandidateQueue(pc, from);
          } catch {}
          break;
        }

        case "rtc_ice": {
          if (!msg.candidate) return;
          const pc = peersRef.current.get(from);
          if (pc?.remoteDescription) {
            try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
          } else {
            const q = iceCandidateQueueRef.current.get(from) ?? [];
            q.push(msg.candidate);
            iceCandidateQueueRef.current.set(from, q);
          }
          break;
        }

        case "rtc_leave": {
          const pc = peersRef.current.get(from);
          if (pc) { pc.close(); peersRef.current.delete(from); }
          const audio = remoteAudioRefs.current.get(from);
          if (audio) { audio.pause(); audio.srcObject = null; remoteAudioRefs.current.delete(from); }
          setSpeaking((prev) => { const n = { ...prev }; delete n[from]; return n; });
          break;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Register signal handler once
  useEffect(() => {
    registerSignalHandler(handleSignal);
  }, [registerSignalHandler, handleSignal]);

  // Start/stop audio when huddle membership changes
  useEffect(() => {
    if (!isInHuddle || !myDbUserId) return;

    let active = true;
    let stopLocalDetection: (() => void) | null = null;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        localStreamRef.current = stream;
        setHasAudio(true);
        setAudioError(null);

        // Start local speaking detection
        stopLocalDetection = startSpeakingDetection(stream, myDbUserId);

        // Tell peers we've joined and are ready for offers
        sendMessageRef.current({ type: "rtc_join" });
      } catch {
        if (!active) return;
        setAudioError("Microphone access denied. Check your browser permissions.");
      }
    })();

    return () => {
      active = false;
      // Signal departure before cleaning up
      sendMessageRef.current({ type: "rtc_leave" });

      // Close all peer connections
      for (const pc of peersRef.current.values()) pc.close();
      peersRef.current.clear();
      iceCandidateQueueRef.current.clear();

      // Stop remote audio
      for (const audio of remoteAudioRefs.current.values()) {
        audio.pause();
        audio.srcObject = null;
      }
      remoteAudioRefs.current.clear();

      // Stop local audio
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setHasAudio(false);
      setMuted(false);

      // Stop local speaking detection
      if (stopLocalDetection) stopLocalDetection();
      if (localAnalyserRef.current) {
        clearInterval(localAnalyserRef.current.interval);
        localAnalyserRef.current.ctx.close().catch(() => {});
        localAnalyserRef.current = null;
      }

      // Clear speaking timers
      for (const t of speakingTimersRef.current.values()) clearTimeout(t);
      speakingTimersRef.current.clear();
      setSpeaking({});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInHuddle, myDbUserId]);

  // Apply mute state to local tracks whenever it changes
  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    for (const track of stream.getAudioTracks()) {
      track.enabled = !muted;
    }
  }, [muted]);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  return { muted, toggleMute, audioError, hasAudio, speaking };
}

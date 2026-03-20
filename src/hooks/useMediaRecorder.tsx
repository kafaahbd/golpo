import { useRef, useState, useCallback } from 'react';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

interface UseMediaRecorderOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  onDataAvailable?: (blob: Blob) => void;
}

export function useMediaRecorder(options: UseMediaRecorderOptions = {}) {
  const {
    mimeType = 'audio/webm;codecs=opus',
    audioBitsPerSecond = 128000,
    onDataAvailable,
  } = options;

  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const getSupportedMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  const start = useCallback(async (): Promise<void> => {
    if (state !== 'idle') return;
    setError(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1,
        },
      });

      streamRef.current = stream;
      const type = getSupportedMimeType();

      const mr = new MediaRecorder(stream, {
        mimeType: type || undefined,
        audioBitsPerSecond,
      });

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onerror = (e: any) => {
        setError(e.error?.message || 'Recording error');
        stop();
      };

      mr.start(100); // collect data every 100ms
      mediaRecorderRef.current = mr;
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      setState('recording');
    } catch (err: any) {
      const msg =
        err.name === 'NotAllowedError'
          ? 'Microphone access denied'
          : err.name === 'NotFoundError'
          ? 'No microphone found'
          : 'Failed to start recording';
      setError(msg);
      throw new Error(msg);
    }
  }, [state, audioBitsPerSecond]);

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === 'inactive') {
        resolve(null);
        return;
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || 'audio/webm',
        });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        onDataAvailable?.(blob);
        setState('idle');
        setDuration(0);
        resolve(blob);
      };

      mr.stop();
      setState('stopped');
    });
  }, [onDataAvailable]);

  const cancel = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setState('idle');
    setDuration(0);
    setError(null);
  }, []);

  const isRecording = state === 'recording';
  const formattedDuration = `${Math.floor(duration / 60).toString().padStart(2, '0')}:${(duration % 60).toString().padStart(2, '0')}`;

  return { start, stop, cancel, state, duration, formattedDuration, isRecording, error };
}

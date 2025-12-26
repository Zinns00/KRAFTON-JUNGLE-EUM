"use client";

import { useState, useCallback } from "react";
import { useMicVAD } from "@ricky0123/vad-react";
import { VAD_DEFAULT_OPTIONS, SPEECH_LOG_MAX_ENTRIES } from "@/app/constants";
import { audioPlayer } from "@/app/services";
import type { SpeechLogEntry } from "@/app/types";

interface UseVoiceActivityOptions {
  autoPlayback?: boolean;
}

export function useVoiceActivity(options: UseVoiceActivityOptions = {}) {
  const { autoPlayback = true } = options;

  const [speechLog, setSpeechLog] = useState<SpeechLogEntry[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);

  const addLogEntry = useCallback(
    (type: SpeechLogEntry["type"], message: string) => {
      const entry: SpeechLogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString(),
        type,
        message,
      };
      setSpeechLog((prev) =>
        [...prev, entry].slice(-SPEECH_LOG_MAX_ENTRIES)
      );
    },
    []
  );

  const vad = useMicVAD({
    ...VAD_DEFAULT_OPTIONS,
    onSpeechStart: () => {
      addLogEntry("start", "음성 감지 시작");
    },
    onSpeechEnd: (audio) => {
      addLogEntry("end", "음성 재생 중...");
      if (autoPlayback) {
        audioPlayer.play(audio);
      }
    },
    onFrameProcessed: (probs) => {
      setAudioLevel(probs.isSpeech);
    },
  });

  const clearLog = useCallback(() => {
    setSpeechLog([]);
  }, []);

  return {
    ...vad,
    audioLevel,
    speechLog,
    clearLog,
  };
}

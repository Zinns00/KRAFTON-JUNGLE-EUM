"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParticipants, useLocalParticipant } from "@livekit/components-react";
import { Track, RemoteParticipant } from "livekit-client";
import { TranscriptData, TargetLanguage } from "./useAudioWebSocket";
import { useAudioPlayback } from "./useAudioPlayback";
import { useAudioDucking } from "./useAudioDucking";

const WS_BASE_URL = process.env.NEXT_PUBLIC_VOICE_WS_URL || 'ws://localhost:8080/ws/audio';
const SAMPLE_RATE = Number(process.env.NEXT_PUBLIC_AUDIO_SAMPLE_RATE) || 16000;
const CHUNK_INTERVAL_MS = 1500;

export interface RemoteTranscriptData extends TranscriptData {
    participantId: string;
    participantName?: string;
}

interface UseRemoteParticipantTranslationOptions {
    enabled: boolean;
    targetLanguage?: TargetLanguage;
    autoPlayTTS?: boolean;
    chunkIntervalMs?: number;
    onTranscript?: (data: RemoteTranscriptData) => void;
    onError?: (error: Error) => void;
}

interface ParticipantStream {
    participantId: string;
    ws: WebSocket;
    audioContext: AudioContext;
    sourceNode: MediaStreamAudioSourceNode | null;
    workletNode: AudioWorkletNode | null;
    audioBuffer: Float32Array[];
    chunkInterval: NodeJS.Timeout | null;
    isHandshakeComplete: boolean;
}

interface UseRemoteParticipantTranslationReturn {
    isActive: boolean;
    activeParticipantCount: number;
    transcripts: Map<string, RemoteTranscriptData>;
    error: Error | null;
}

// 12 byte metadata header (Little Endian)
function createMetadataHeader(sampleRate: number, channels: number, bitsPerSample: number): ArrayBuffer {
    const buffer = new ArrayBuffer(12);
    const view = new DataView(buffer);
    view.setUint32(0, sampleRate, true);
    view.setUint16(4, channels, true);
    view.setUint16(6, bitsPerSample, true);
    view.setUint32(8, 0, true);
    return buffer;
}

// Float32 -> Int16 PCM
function float32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
}

// Linear interpolation resampling
function resample(inputBuffer: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array {
    if (inputSampleRate === outputSampleRate) {
        return inputBuffer;
    }

    const ratio = inputSampleRate / outputSampleRate;
    const outputLength = Math.floor(inputBuffer.length / ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
        const srcIndex = i * ratio;
        const srcIndexFloor = Math.floor(srcIndex);
        const srcIndexCeil = Math.min(srcIndexFloor + 1, inputBuffer.length - 1);
        const fraction = srcIndex - srcIndexFloor;
        output[i] = inputBuffer[srcIndexFloor] * (1 - fraction) + inputBuffer[srcIndexCeil] * fraction;
    }

    return output;
}

export function useRemoteParticipantTranslation({
    enabled,
    targetLanguage = 'en',
    autoPlayTTS = true,
    chunkIntervalMs = CHUNK_INTERVAL_MS,
    onTranscript,
    onError,
}: UseRemoteParticipantTranslationOptions): UseRemoteParticipantTranslationReturn {
    const [isActive, setIsActive] = useState(false);
    const [activeParticipantCount, setActiveParticipantCount] = useState(0);
    const [transcripts, setTranscripts] = useState<Map<string, RemoteTranscriptData>>(new Map());
    const [error, setError] = useState<Error | null>(null);

    const participants = useParticipants();
    const { localParticipant } = useLocalParticipant();

    const streamsRef = useRef<Map<string, ParticipantStream>>(new Map());
    const enabledRef = useRef(enabled);
    const targetLanguageRef = useRef(targetLanguage);
    const onTranscriptRef = useRef(onTranscript);
    const onErrorRef = useRef(onError);

    // Audio ducking
    const { duckParticipant, unduckParticipant, unduckAll } = useAudioDucking();

    // TTS playback with ducking callbacks
    const { queueAudio, stopAudio } = useAudioPlayback({
        onPlayStart: (participantId) => {
            if (participantId) {
                console.log(`[RemoteTranslation] TTS started for ${participantId}, ducking...`);
                duckParticipant(participantId);
            }
        },
        onPlayEnd: (participantId) => {
            if (participantId) {
                console.log(`[RemoteTranslation] TTS ended for ${participantId}, unducking...`);
                unduckParticipant(participantId);
            }
        },
        onError: (err) => {
            console.error("[RemoteTranslation] Playback error:", err);
        },
    });

    // Keep refs updated
    useEffect(() => {
        enabledRef.current = enabled;
        targetLanguageRef.current = targetLanguage;
        onTranscriptRef.current = onTranscript;
        onErrorRef.current = onError;
    }, [enabled, targetLanguage, onTranscript, onError]);

    // Get remote participants (excluding local)
    const remoteParticipants = participants.filter(
        p => !p.isLocal && p.identity !== localParticipant?.identity
    ) as RemoteParticipant[];

    // Create stream for a participant
    const createParticipantStream = useCallback(async (participant: RemoteParticipant) => {
        const participantId = participant.identity;

        // Check if already exists
        if (streamsRef.current.has(participantId)) {
            console.log(`[RemoteTranslation] Stream already exists for ${participantId}`);
            return;
        }

        // Get microphone track
        const micPub = participant.getTrackPublication(Track.Source.Microphone);
        if (!micPub?.track?.mediaStreamTrack) {
            console.log(`[RemoteTranslation] ${participantId}: No microphone track available`);
            return;
        }

        try {
            console.log(`[RemoteTranslation] Creating stream for ${participantId}`);

            // Create WebSocket with participantId
            const wsUrl = `${WS_BASE_URL}?lang=${targetLanguageRef.current}&participantId=${encodeURIComponent(participantId)}`;
            const ws = new WebSocket(wsUrl);
            ws.binaryType = 'arraybuffer';

            // Create AudioContext
            const audioContext = new AudioContext();
            const mediaStream = new MediaStream([micPub.track.mediaStreamTrack]);

            const stream: ParticipantStream = {
                participantId,
                ws,
                audioContext,
                sourceNode: null,
                workletNode: null,
                audioBuffer: [],
                chunkInterval: null,
                isHandshakeComplete: false,
            };

            streamsRef.current.set(participantId, stream);

            // WebSocket handlers
            ws.onopen = async () => {
                console.log(`[RemoteTranslation] ${participantId}: WebSocket opened, sending handshake`);

                // Send metadata header
                const metadata = createMetadataHeader(SAMPLE_RATE, 1, 16);
                ws.send(metadata);
            };

            ws.onmessage = (event) => {
                const currentStream = streamsRef.current.get(participantId);
                if (!currentStream) return;

                // Handshake response
                if (!currentStream.isHandshakeComplete && typeof event.data === 'string') {
                    try {
                        const response = JSON.parse(event.data);
                        if (response.status === 'ready') {
                            console.log(`[RemoteTranslation] ${participantId}: Handshake complete`);
                            currentStream.isHandshakeComplete = true;

                            // Start audio capture after handshake
                            startAudioCapture(participantId, mediaStream);
                        }
                    } catch (e) {
                        console.error(`[RemoteTranslation] ${participantId}: Failed to parse handshake:`, e);
                    }
                    return;
                }

                // Transcript message
                if (typeof event.data === 'string') {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'transcript') {
                            const transcriptData: RemoteTranscriptData = {
                                participantId: data.participantId || participantId,
                                participantName: participant.name || participantId,
                                original: data.original || data.text,
                                translated: data.translated || data.text,
                                isFinal: data.isFinal,
                            };

                            console.log(`[RemoteTranslation] ${participantId}: Transcript received:`, transcriptData);

                            setTranscripts(prev => {
                                const newMap = new Map(prev);
                                newMap.set(participantId, transcriptData);
                                return newMap;
                            });

                            onTranscriptRef.current?.(transcriptData);
                        }
                    } catch (e) {
                        console.error(`[RemoteTranslation] ${participantId}: Failed to parse message:`, e);
                    }
                } else if (event.data instanceof ArrayBuffer) {
                    // TTS audio
                    console.log(`[RemoteTranslation] ${participantId}: Received TTS audio:`, event.data.byteLength, "bytes");
                    if (autoPlayTTS) {
                        queueAudio(event.data, 24000, participantId);
                    }
                }
            };

            ws.onerror = (event) => {
                console.error(`[RemoteTranslation] ${participantId}: WebSocket error:`, event);
                const err = new Error(`WebSocket error for ${participantId}`);
                setError(err);
                onErrorRef.current?.(err);
            };

            ws.onclose = () => {
                console.log(`[RemoteTranslation] ${participantId}: WebSocket closed`);
                cleanupParticipantStream(participantId);
            };

        } catch (err) {
            console.error(`[RemoteTranslation] ${participantId}: Failed to create stream:`, err);
            const error = err instanceof Error ? err : new Error(`Failed to create stream for ${participantId}`);
            setError(error);
            onErrorRef.current?.(error);
        }
    }, [autoPlayTTS, queueAudio]);

    // Start audio capture for a participant
    const startAudioCapture = useCallback(async (participantId: string, mediaStream: MediaStream) => {
        const stream = streamsRef.current.get(participantId);
        if (!stream || !stream.audioContext) return;

        try {
            // Load AudioWorklet
            await stream.audioContext.audioWorklet.addModule('/audio-processor.js');

            // Create source node
            const sourceNode = stream.audioContext.createMediaStreamSource(mediaStream);
            stream.sourceNode = sourceNode;

            // Create worklet node
            const workletNode = new AudioWorkletNode(stream.audioContext, 'audio-processor');
            stream.workletNode = workletNode;

            // Handle audio data
            workletNode.port.onmessage = (event) => {
                const { audioData } = event.data;
                if (audioData) {
                    stream.audioBuffer.push(new Float32Array(audioData));
                }
            };

            // Connect (NOT to destination)
            sourceNode.connect(workletNode);

            // Start chunk interval
            stream.chunkInterval = setInterval(() => {
                if (stream.audioBuffer.length === 0) return;
                if (!stream.ws || stream.ws.readyState !== WebSocket.OPEN) return;
                if (!stream.isHandshakeComplete) return;

                const totalLength = stream.audioBuffer.reduce((sum, arr) => sum + arr.length, 0);
                if (totalLength === 0) return;

                const combined = new Float32Array(totalLength);
                let offset = 0;
                for (const chunk of stream.audioBuffer) {
                    combined.set(chunk, offset);
                    offset += chunk.length;
                }
                stream.audioBuffer = [];

                // Resample to 16kHz
                const resampled = resample(combined, stream.audioContext.sampleRate, SAMPLE_RATE);
                const int16Data = float32ToInt16(resampled);

                stream.ws.send(int16Data.buffer);
                console.log(`[RemoteTranslation] ${participantId}: Sent ${int16Data.length} samples`);
            }, chunkIntervalMs);

            console.log(`[RemoteTranslation] ${participantId}: Audio capture started`);

        } catch (err) {
            console.error(`[RemoteTranslation] ${participantId}: Failed to start audio capture:`, err);
        }
    }, [chunkIntervalMs]);

    // Cleanup a participant stream
    const cleanupParticipantStream = useCallback((participantId: string) => {
        const stream = streamsRef.current.get(participantId);
        if (!stream) return;

        console.log(`[RemoteTranslation] Cleaning up stream for ${participantId}`);

        if (stream.chunkInterval) {
            clearInterval(stream.chunkInterval);
        }

        if (stream.workletNode) {
            stream.workletNode.disconnect();
        }

        if (stream.sourceNode) {
            stream.sourceNode.disconnect();
        }

        if (stream.audioContext && stream.audioContext.state !== 'closed') {
            stream.audioContext.close();
        }

        if (stream.ws && stream.ws.readyState === WebSocket.OPEN) {
            stream.ws.close();
        }

        streamsRef.current.delete(participantId);
    }, []);

    // Cleanup all streams
    const cleanupAllStreams = useCallback(() => {
        console.log(`[RemoteTranslation] Cleaning up all streams`);

        streamsRef.current.forEach((_, participantId) => {
            cleanupParticipantStream(participantId);
        });

        unduckAll();
        stopAudio();
        setTranscripts(new Map());
    }, [cleanupParticipantStream, unduckAll, stopAudio]);

    // Effect: Start/stop based on enabled
    useEffect(() => {
        if (enabled) {
            console.log(`[RemoteTranslation] Starting translation for ${remoteParticipants.length} remote participants`);
            setIsActive(true);

            remoteParticipants.forEach(participant => {
                createParticipantStream(participant);
            });
        } else {
            console.log(`[RemoteTranslation] Stopping translation`);
            cleanupAllStreams();
            setIsActive(false);
        }
    }, [enabled]);

    // Effect: Handle participant changes while active
    useEffect(() => {
        if (!enabled) return;

        const currentParticipantIds = new Set(remoteParticipants.map(p => p.identity));
        const existingStreamIds = new Set(streamsRef.current.keys());

        // Add new participants
        remoteParticipants.forEach(participant => {
            if (!existingStreamIds.has(participant.identity)) {
                console.log(`[RemoteTranslation] New participant joined: ${participant.identity}`);
                createParticipantStream(participant);
            }
        });

        // Remove departed participants
        existingStreamIds.forEach(participantId => {
            if (!currentParticipantIds.has(participantId)) {
                console.log(`[RemoteTranslation] Participant left: ${participantId}`);
                cleanupParticipantStream(participantId);
            }
        });

        setActiveParticipantCount(streamsRef.current.size);
    }, [enabled, remoteParticipants, createParticipantStream, cleanupParticipantStream]);

    // Effect: Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanupAllStreams();
        };
    }, [cleanupAllStreams]);

    return {
        isActive,
        activeParticipantCount,
        transcripts,
        error,
    };
}

import type { VADOptions } from "@/app/types";

export const VAD_CDN_CONFIG = {
  baseAssetPath: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/",
  onnxWASMBasePath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/",
} as const;

export const VAD_DEFAULT_OPTIONS: VADOptions = {
  startOnLoad: false,
  positiveSpeechThreshold: 0.8,
  negativeSpeechThreshold: 0.35,
  ...VAD_CDN_CONFIG,
};

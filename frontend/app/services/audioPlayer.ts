import { AUDIO_SAMPLE_RATE } from "@/app/constants";
import { audioProcessor } from "./audioProcessor";
import { noiseSuppress } from "./noiseSuppress";

export interface AudioProcessingOptions {
  noiseSuppressionEnabled: boolean;
  dspEnabled: boolean;
}

class AudioPlayerService {
  private audioContext: AudioContext | null = null;
  private options: AudioProcessingOptions = {
    noiseSuppressionEnabled: true,
    dspEnabled: true,
  };

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
    }
    return this.audioContext;
  }

  setOptions(options: Partial<AudioProcessingOptions>): void {
    this.options = { ...this.options, ...options };
  }

  getOptions(): AudioProcessingOptions {
    return { ...this.options };
  }

  /**
   * 오디오 재생 파이프라인:
   * 1. RNNoise (노이즈 제거)
   * 2. DSP (하이패스 필터 + 컴프레서 + 게인)
   * 3. 재생
   */
  async play(audioData: Float32Array): Promise<void> {
    const audioContext = this.getAudioContext();

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    let processedData = audioData;

    // 1. RNNoise 노이즈 제거
    if (this.options.noiseSuppressionEnabled) {
      try {
        processedData = await noiseSuppress.process(processedData);
      } catch (error) {
        console.warn("RNNoise processing failed, using original audio:", error);
      }
    }

    // 2. DSP 처리 (하이패스 필터 + 컴프레서 + 게인)
    if (this.options.dspEnabled) {
      try {
        processedData = await audioProcessor.processAudio(processedData);
      } catch (error) {
        console.warn("DSP processing failed:", error);
      }
    }

    // 3. 재생
    const audioBuffer = audioContext.createBuffer(
      1,
      processedData.length,
      AUDIO_SAMPLE_RATE
    );
    const channelData = audioBuffer.getChannelData(0);
    channelData.set(processedData);

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
  }

  async close(): Promise<void> {
    noiseSuppress.destroy();
    await audioProcessor.close();
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const audioPlayer = new AudioPlayerService();

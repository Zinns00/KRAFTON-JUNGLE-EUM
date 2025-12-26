import { AUDIO_PROCESSING_CONFIG, AUDIO_SAMPLE_RATE } from "@/app/constants";

/**
 * Web Audio API를 사용한 오디오 처리 파이프라인
 *
 * 처리 순서:
 * 1. High-pass filter (저주파 노이즈 제거)
 * 2. Compressor (다이나믹 레인지 압축)
 * 3. Gain (볼륨 조절)
 */
export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private highPassFilter: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private gainNode: GainNode | null = null;

  async initialize(): Promise<AudioContext> {
    if (this.audioContext) {
      return this.audioContext;
    }

    this.audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });

    // 하이패스 필터 (80Hz 이하 제거 - 저주파 험, 바람 소리 등)
    this.highPassFilter = this.audioContext.createBiquadFilter();
    this.highPassFilter.type = "highpass";
    this.highPassFilter.frequency.value = AUDIO_PROCESSING_CONFIG.highPassFrequency;
    this.highPassFilter.Q.value = 0.7;

    // 다이나믹 컴프레서 (음량 균일화)
    this.compressor = this.audioContext.createDynamicsCompressor();
    const { threshold, knee, ratio, attack, release } = AUDIO_PROCESSING_CONFIG.compressor;
    this.compressor.threshold.value = threshold;
    this.compressor.knee.value = knee;
    this.compressor.ratio.value = ratio;
    this.compressor.attack.value = attack;
    this.compressor.release.value = release;

    // 게인 노드 (볼륨 부스트)
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = AUDIO_PROCESSING_CONFIG.gainValue;

    // 노드 연결: input -> highpass -> compressor -> gain -> output
    this.highPassFilter.connect(this.compressor);
    this.compressor.connect(this.gainNode);

    return this.audioContext;
  }

  /**
   * Float32Array 오디오 데이터에 처리 적용
   */
  async processAudio(audioData: Float32Array): Promise<Float32Array> {
    const ctx = await this.initialize();

    // 오프라인 컨텍스트로 처리
    const offlineCtx = new OfflineAudioContext(
      1,
      audioData.length,
      AUDIO_SAMPLE_RATE
    );

    // 버퍼 생성
    const buffer = offlineCtx.createBuffer(1, audioData.length, AUDIO_SAMPLE_RATE);
    buffer.getChannelData(0).set(audioData);

    // 소스 생성
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;

    // 필터 체인 생성
    const highPass = offlineCtx.createBiquadFilter();
    highPass.type = "highpass";
    highPass.frequency.value = AUDIO_PROCESSING_CONFIG.highPassFrequency;

    const compressor = offlineCtx.createDynamicsCompressor();
    const { threshold, knee, ratio, attack, release } = AUDIO_PROCESSING_CONFIG.compressor;
    compressor.threshold.value = threshold;
    compressor.knee.value = knee;
    compressor.ratio.value = ratio;
    compressor.attack.value = attack;
    compressor.release.value = release;

    const gain = offlineCtx.createGain();
    gain.gain.value = AUDIO_PROCESSING_CONFIG.gainValue;

    // 연결
    source.connect(highPass);
    highPass.connect(compressor);
    compressor.connect(gain);
    gain.connect(offlineCtx.destination);

    // 렌더링
    source.start();
    const renderedBuffer = await offlineCtx.startRendering();

    return renderedBuffer.getChannelData(0);
  }

  /**
   * 실시간 스트림 처리용 노드 체인 반환
   */
  getProcessingChain(): {
    input: BiquadFilterNode;
    output: GainNode;
  } | null {
    if (!this.highPassFilter || !this.gainNode) {
      return null;
    }
    return {
      input: this.highPassFilter,
      output: this.gainNode,
    };
  }

  async close(): Promise<void> {
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
      this.highPassFilter = null;
      this.compressor = null;
      this.gainNode = null;
    }
  }
}

export const audioProcessor = new AudioProcessor();

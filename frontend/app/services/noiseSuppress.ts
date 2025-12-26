/**
 * RNNoise 기반 노이즈 제거 서비스
 *
 * RNNoise는 Mozilla에서 개발한 딥러닝 기반 실시간 노이즈 제거 라이브러리입니다.
 * 48kHz 샘플레이트, 480 샘플(10ms) 프레임 단위로 처리합니다.
 */

// RNNoise 상수
const RNNOISE_SAMPLE_RATE = 48000;
const RNNOISE_FRAME_SIZE = 480; // 10ms at 48kHz

interface RNNoiseModule {
  _rnnoise_create: () => number;
  _rnnoise_destroy: (state: number) => void;
  _rnnoise_process_frame: (state: number, output: number, input: number) => number;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  HEAPF32: Float32Array;
}

class NoiseSuppressService {
  private module: RNNoiseModule | null = null;
  private state: number = 0;
  private inputPtr: number = 0;
  private outputPtr: number = 0;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      // 동적 import로 RNNoise 모듈 로드
      const { createRNNWasmModule } = await import("@jitsi/rnnoise-wasm");

      this.module = await createRNNWasmModule({
        locateFile: (path: string) => {
          if (path.endsWith(".wasm")) {
            return "/rnnoise.wasm";
          }
          return path;
        },
      });

      if (!this.module) {
        throw new Error("Failed to load RNNoise module");
      }

      // RNNoise 상태 생성
      this.state = this.module._rnnoise_create();

      // 메모리 할당 (480 samples * 4 bytes per float)
      this.inputPtr = this.module._malloc(RNNOISE_FRAME_SIZE * 4);
      this.outputPtr = this.module._malloc(RNNOISE_FRAME_SIZE * 4);

      this.isInitialized = true;
      console.log("RNNoise initialized successfully");
    } catch (error) {
      console.error("Failed to initialize RNNoise:", error);
      throw error;
    }
  }

  /**
   * 오디오 데이터에서 노이즈 제거
   * @param audioData 입력 오디오 (16kHz Float32Array)
   * @returns 노이즈 제거된 오디오 (16kHz Float32Array)
   */
  async process(audioData: Float32Array): Promise<Float32Array> {
    await this.initialize();

    if (!this.module || !this.isInitialized) {
      console.warn("RNNoise not initialized, returning original audio");
      return audioData;
    }

    // 16kHz -> 48kHz 업샘플링
    const upsampled = this.upsample(audioData, 16000, RNNOISE_SAMPLE_RATE);

    // 프레임 단위로 처리
    const processedUpsampled = this.processFrames(upsampled);

    // 48kHz -> 16kHz 다운샘플링
    const downsampled = this.downsample(processedUpsampled, RNNOISE_SAMPLE_RATE, 16000);

    return downsampled;
  }

  private processFrames(audioData: Float32Array): Float32Array {
    if (!this.module) return audioData;

    const output = new Float32Array(audioData.length);
    const numFrames = Math.floor(audioData.length / RNNOISE_FRAME_SIZE);

    for (let i = 0; i < numFrames; i++) {
      const offset = i * RNNOISE_FRAME_SIZE;

      // 입력 데이터를 WASM 메모리로 복사 (스케일 조정: -1~1 -> -32768~32767)
      for (let j = 0; j < RNNOISE_FRAME_SIZE; j++) {
        this.module.HEAPF32[(this.inputPtr >> 2) + j] = audioData[offset + j] * 32768;
      }

      // RNNoise 처리
      this.module._rnnoise_process_frame(this.state, this.outputPtr, this.inputPtr);

      // 출력 데이터 복사 (스케일 복원: -32768~32767 -> -1~1)
      for (let j = 0; j < RNNOISE_FRAME_SIZE; j++) {
        output[offset + j] = this.module.HEAPF32[(this.outputPtr >> 2) + j] / 32768;
      }
    }

    // 남은 샘플 복사 (처리 안 된 부분)
    const remainingStart = numFrames * RNNOISE_FRAME_SIZE;
    for (let i = remainingStart; i < audioData.length; i++) {
      output[i] = audioData[i];
    }

    return output;
  }

  /**
   * 선형 보간을 사용한 업샘플링
   */
  private upsample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
    const ratio = toRate / fromRate;
    const outputLength = Math.floor(input.length * ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i / ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, input.length - 1);
      const t = srcIndex - srcIndexFloor;

      output[i] = input[srcIndexFloor] * (1 - t) + input[srcIndexCeil] * t;
    }

    return output;
  }

  /**
   * 선형 보간을 사용한 다운샘플링
   */
  private downsample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
    const ratio = fromRate / toRate;
    const outputLength = Math.floor(input.length / ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, input.length - 1);
      const t = srcIndex - srcIndexFloor;

      output[i] = input[srcIndexFloor] * (1 - t) + input[srcIndexCeil] * t;
    }

    return output;
  }

  destroy(): void {
    if (this.module && this.isInitialized) {
      if (this.state) {
        this.module._rnnoise_destroy(this.state);
      }
      if (this.inputPtr) {
        this.module._free(this.inputPtr);
      }
      if (this.outputPtr) {
        this.module._free(this.outputPtr);
      }
    }
    this.state = 0;
    this.inputPtr = 0;
    this.outputPtr = 0;
    this.isInitialized = false;
    this.initPromise = null;
    this.module = null;
  }
}

export const noiseSuppress = new NoiseSuppressService();

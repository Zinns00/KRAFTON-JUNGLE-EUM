declare module "@jitsi/rnnoise-wasm" {
  interface RNNoiseModule {
    _rnnoise_create: () => number;
    _rnnoise_destroy: (state: number) => void;
    _rnnoise_process_frame: (
      state: number,
      output: number,
      input: number
    ) => number;
    _malloc: (size: number) => number;
    _free: (ptr: number) => void;
    HEAPF32: Float32Array;
  }

  interface RNNoiseModuleOptions {
    locateFile?: (path: string) => string;
  }

  export function createRNNWasmModule(
    options?: RNNoiseModuleOptions
  ): Promise<RNNoiseModule>;

  export function createRNNWasmModuleSync(
    options?: RNNoiseModuleOptions
  ): RNNoiseModule;
}

declare var AudioWorkletProcessor: {
  prototype: AudioWorkletProcessor;
  new (): AudioWorkletProcessor;
};

declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor
): void;

interface AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

class PitchProcessor extends AudioWorkletProcessor {
  bufferSize = 4096;
  audioBuffer: Float32Array = new Float32Array(0);

  process(inputs: Float32Array[][]) {
    const input = inputs[0];

    if (input.length > 0 && input[0].length > 0) {
      const channelData: Float32Array = input[0];

      if (channelData) {
        const newBuffer = new Float32Array(this.audioBuffer.length + channelData.length);
        newBuffer.set(this.audioBuffer);
        newBuffer.set(channelData, this.audioBuffer.length);
        this.audioBuffer = newBuffer;

        if (this.audioBuffer.length >= this.bufferSize) {
          this.port.postMessage(this.audioBuffer.slice(0, this.bufferSize));
          this.audioBuffer = this.audioBuffer.slice(this.bufferSize);
        }
      } else {
        console.warn('No valid audio data received in PitchProcessor.');
      }
    } else {
      console.warn('No valid input received in PitchProcessor.');
    }

    return true;
  }
}

registerProcessor('pitch-processor', PitchProcessor);

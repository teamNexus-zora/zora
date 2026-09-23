import { pipeline, env, Tensor } from '@xenova/transformers';

// Skip local model check since we are running entirely in the browser
env.allowLocalModels = false;

class TTSPipeline {
  static instance: any = null;

  static async getInstance(progress_callback: Function) {
    if (this.instance === null) {
      this.instance = pipeline('text-to-speech', 'Xenova/speecht5_tts', {
        quantized: true,
        progress_callback,
      });
    }
    return this.instance;
  }
}

// Keep speaker embedding cached
let speaker_embeddings: any = null;

self.addEventListener('message', async (event) => {
  const { text } = event.data;
  if (!text) return;

  try {
    const synthesizer = await TTSPipeline.getInstance((progress: any) => {
      self.postMessage({ status: 'progress', progress });
    });

    if (!speaker_embeddings) {
      self.postMessage({ status: 'info', message: 'Downloading speaker profile...' });
      const speaker_embedding_url = 'https://huggingface.co/datasets/Xenova/cmu-arctic-xvectors-extracted/resolve/main/cmu_us_slt_arctic-wav-arctic_a0001.bin';
      const speaker_embedding_response = await fetch(speaker_embedding_url);
      const speaker_embedding_buffer = await speaker_embedding_response.arrayBuffer();
      
      // Convert to Float32Array
      const speaker_embedding_data = new Float32Array(speaker_embedding_buffer);
      
      // Load Tensor
      speaker_embeddings = new Tensor('float32', speaker_embedding_data, [1, 512]);
    }

    self.postMessage({ status: 'info', message: 'Generating audio...' });

    const out = await synthesizer(text, {
      speaker_embeddings,
    });

    self.postMessage({
      status: 'complete',
      audio: out.audio,
      sampling_rate: out.sampling_rate,
    });

  } catch (err) {
    console.error('TTS Worker Error:', err);
    self.postMessage({ status: 'error', error: String(err) });
  }
});

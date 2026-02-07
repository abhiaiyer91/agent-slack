/**
 * Voice provider configuration for Jarvis.
 *
 * Mastra 1.x voice uses CompositeVoice with { input, output, realtime }.
 * - input  = listening / STT provider
 * - output = speaking / TTS provider
 * - realtime = bidirectional real-time voice
 */

export function describeVoiceCapabilities(): {
  hasSpeech: boolean;
  hasListening: boolean;
  providers: string[];
} {
  const providers: string[] = [];
  let hasSpeech = false;
  let hasListening = false;

  if (process.env.ELEVENLABS_API_KEY) {
    providers.push("elevenlabs");
    hasSpeech = true;
  }
  if (process.env.OPENAI_API_KEY) {
    providers.push("openai");
    hasSpeech = true;
    hasListening = true;
  }
  if (process.env.DEEPGRAM_API_KEY) {
    providers.push("deepgram");
    hasListening = true;
  }

  return { hasSpeech, hasListening, providers };
}

/**
 * Create a CompositeVoice instance for Jarvis (Mastra 1.x API).
 */
export async function createVoice() {
  const caps = describeVoiceCapabilities();

  if (!caps.hasSpeech && !caps.hasListening) {
    console.log("[Jarvis] No voice API keys configured — voice disabled");
    return undefined;
  }

  console.log(`[Jarvis] Voice providers available: ${caps.providers.join(", ")}`);

  // Best combo: ElevenLabs (output/TTS) + Deepgram (input/STT)
  if (process.env.ELEVENLABS_API_KEY && process.env.DEEPGRAM_API_KEY) {
    try {
      const { CompositeVoice } = await import("@mastra/core/voice");
      const { ElevenLabsVoice } = await import("@mastra/voice-elevenlabs");
      const { DeepgramVoice } = await import("@mastra/voice-deepgram");

      return new CompositeVoice({
        output: new ElevenLabsVoice({
          speechModel: {
            name: "eleven_multilingual_v2",
            apiKey: process.env.ELEVENLABS_API_KEY,
          },
          speaker: "JBFqnCBsd6RMkjVDRZzb",
        }),
        input: new DeepgramVoice({
          listeningModel: {
            name: "nova-3",
            apiKey: process.env.DEEPGRAM_API_KEY,
          },
        }),
      });
    } catch (err) {
      console.warn("[Jarvis] Composite voice setup failed:", err);
    }
  }

  // Fallback: OpenAI for both
  if (process.env.OPENAI_API_KEY) {
    try {
      const { OpenAIVoice } = await import("@mastra/voice-openai");
      return new OpenAIVoice({
        speechModel: {
          name: "tts-1",
          apiKey: process.env.OPENAI_API_KEY,
        },
        listeningModel: {
          name: "whisper-1",
          apiKey: process.env.OPENAI_API_KEY,
        },
        speaker: "onyx",
      });
    } catch (err) {
      console.warn("[Jarvis] OpenAI voice setup failed:", err);
    }
  }

  return undefined;
}

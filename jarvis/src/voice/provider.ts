/**
 * Voice provider configuration for Jarvis.
 *
 * Mastra has first-class voice support with 13 providers. We use a tiered
 * approach:
 *
 *   1. ElevenLabs — highest quality, most natural voice (paid)
 *   2. OpenAI TTS — good quality, fast (paid, uses existing API key)
 *   3. Deepgram — excellent for STT / transcription (paid)
 *
 * The voice provider is attached directly to the Jarvis agent via Mastra's
 * Agent.voice property, enabling speak() and listen() methods.
 *
 * OpenClaw's weakness: they duct-taped TTS on as an afterthought with manual
 * provider failover chains. Mastra gives us a clean abstraction with
 * CompositeVoice for mixing speech/listening providers.
 */

/**
 * Lazily initialize voice providers.
 *
 * Voice setup requires dynamic imports of optional packages. This factory
 * is called at startup and returns an object describing how to create the
 * voice provider. The actual CompositeVoice is created when first needed.
 *
 * Returns a description of the available configuration so the agent module
 * can decide whether to wire voice in.
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
 * Create a CompositeVoice instance for Jarvis.
 *
 * Uses dynamic imports so the voice packages are only loaded when actually
 * used. Call this from an async context and pass the result to the agent.
 *
 * Usage:
 *   const voice = await createVoice();
 *   if (voice) { agent.voice = voice; }
 */
export async function createVoice() {
  const caps = describeVoiceCapabilities();

  if (!caps.hasSpeech && !caps.hasListening) {
    console.log("[Jarvis] No voice API keys configured — voice disabled");
    return undefined;
  }

  console.log(`[Jarvis] Voice providers available: ${caps.providers.join(", ")}`);

  // Best combo: ElevenLabs for speech + Deepgram for listening
  if (process.env.ELEVENLABS_API_KEY && process.env.DEEPGRAM_API_KEY) {
    try {
      const { CompositeVoice } = await import("@mastra/core/voice");
      const { ElevenLabsVoice } = await import("@mastra/voice-elevenlabs");
      const { DeepgramVoice } = await import("@mastra/voice-deepgram");

      return new CompositeVoice({
        speakProvider: new ElevenLabsVoice({
          speechModel: {
            name: "eleven_multilingual_v2",
            apiKey: process.env.ELEVENLABS_API_KEY,
          },
          speaker: "JBFqnCBsd6RMkjVDRZzb", // Authoritative British voice
        }),
        listenProvider: new DeepgramVoice({
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
        speaker: "onyx", // Deep, authoritative voice for Jarvis
      });
    } catch (err) {
      console.warn("[Jarvis] OpenAI voice setup failed:", err);
    }
  }

  return undefined;
}

import Foundation
import AVFoundation

/// Service for text-to-speech pronunciation
class SpeechService: NSObject, ObservableObject {
    
    // MARK: - Singleton
    static let shared = SpeechService()
    
    // MARK: - Properties
    private let synthesizer = AVSpeechSynthesizer()
    @Published var isSpeaking = false
    @Published var availableVoices: [AVSpeechSynthesisVoice] = []
    
    // Preferred voices for each language (natural sounding)
    private var preferredVoices: [String: AVSpeechSynthesisVoice] = [:]
    
    // MARK: - Initialization
    private override init() {
        super.init()
        synthesizer.delegate = self
        loadAvailableVoices()
    }
    
    // MARK: - Voice Loading
    private func loadAvailableVoices() {
        availableVoices = AVSpeechSynthesisVoice.speechVoices()
        
        // Find the best voice for each language (prefer enhanced/premium voices)
        for voice in availableVoices {
            let langCode = String(voice.language.prefix(2))
            
            // Prefer enhanced or premium quality voices
            if preferredVoices[langCode] == nil || 
               voice.quality == .enhanced ||
               voice.quality == .premium {
                preferredVoices[langCode] = voice
            }
        }
    }
    
    // MARK: - Speech
    
    /// Speak text in the specified language
    func speak(text: String, language: Language, rate: Float = 0.45) {
        // Stop any current speech
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }
        
        let utterance = AVSpeechUtterance(string: text)
        
        // Set voice for language
        if let voice = preferredVoices[language.code] ?? 
                       AVSpeechSynthesisVoice(language: language.code) {
            utterance.voice = voice
        }
        
        // Configure speech parameters
        utterance.rate = rate  // 0.0 (slowest) to 1.0 (fastest), 0.5 is default
        utterance.pitchMultiplier = 1.0
        utterance.volume = 1.0
        
        // Add slight pauses for better comprehension when learning
        utterance.preUtteranceDelay = 0.1
        utterance.postUtteranceDelay = 0.2
        
        isSpeaking = true
        synthesizer.speak(utterance)
    }
    
    /// Speak slowly for learning
    func speakSlowly(text: String, language: Language) {
        speak(text: text, language: language, rate: 0.35)
    }
    
    /// Speak at normal conversational speed
    func speakNormal(text: String, language: Language) {
        speak(text: text, language: language, rate: 0.5)
    }
    
    /// Stop speaking
    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
        isSpeaking = false
    }
    
    /// Speak word by word with pauses
    func speakWordByWord(words: [String], language: Language, completion: @escaping () -> Void) {
        guard !words.isEmpty else {
            completion()
            return
        }
        
        var index = 0
        
        func speakNext() {
            guard index < words.count else {
                completion()
                return
            }
            
            let word = words[index]
            index += 1
            
            let utterance = AVSpeechUtterance(string: word)
            utterance.voice = preferredVoices[language.code] ?? AVSpeechSynthesisVoice(language: language.code)
            utterance.rate = 0.4
            utterance.postUtteranceDelay = 0.5  // Pause between words
            
            synthesizer.speak(utterance)
        }
        
        speakNext()
    }
    
    // MARK: - Voice Info
    
    /// Get available voices for a language
    func voices(for language: Language) -> [AVSpeechSynthesisVoice] {
        availableVoices.filter { $0.language.hasPrefix(language.code) }
    }
    
    /// Check if speech is available for a language
    func isSpeechAvailable(for language: Language) -> Bool {
        !voices(for: language).isEmpty
    }
}

// MARK: - AVSpeechSynthesizerDelegate
extension SpeechService: AVSpeechSynthesizerDelegate {
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        DispatchQueue.main.async {
            self.isSpeaking = false
        }
    }
    
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        DispatchQueue.main.async {
            self.isSpeaking = false
        }
    }
}

// MARK: - Language Extension
extension Language {
    /// Get the BCP 47 language tag for speech
    var speechLanguageCode: String {
        switch code {
        case "zh": return "zh-CN"
        case "pt": return "pt-BR"
        case "en": return "en-US"
        default: return code
        }
    }
}

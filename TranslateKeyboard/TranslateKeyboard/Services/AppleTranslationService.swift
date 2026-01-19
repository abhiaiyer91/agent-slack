import Foundation
import Translation

/// Apple's on-device Translation framework (iOS 17.4+)
/// This provides free, private, offline-capable translation
@available(iOS 17.4, *)
class AppleTranslationService: ObservableObject {
    
    // MARK: - Singleton
    static let shared = AppleTranslationService()
    
    // MARK: - Properties
    @Published var isTranslating = false
    @Published var availableLanguages: [Locale.Language] = []
    @Published var downloadedLanguages: Set<Locale.Language> = []
    
    private var translationSession: TranslationSession?
    
    // MARK: - Initialization
    private init() {
        Task {
            await loadAvailableLanguages()
        }
    }
    
    // MARK: - Available Languages
    
    /// Load languages supported by Apple Translation
    func loadAvailableLanguages() async {
        do {
            let languages = try await LanguageAvailability().supportedLanguages
            await MainActor.run {
                self.availableLanguages = languages
            }
        } catch {
            print("Failed to load available languages: \(error)")
        }
    }
    
    /// Check if a language pair is supported
    func isLanguagePairSupported(from source: Language, to target: Language) async -> Bool {
        let sourceLocale = Locale.Language(identifier: source.code)
        let targetLocale = Locale.Language(identifier: target.code)
        
        do {
            let availability = LanguageAvailability()
            let status = try await availability.status(from: sourceLocale, to: targetLocale)
            return status != .unsupported
        } catch {
            return false
        }
    }
    
    /// Check if languages need to be downloaded
    func languageDownloadStatus(from source: Language, to target: Language) async -> LanguageAvailability.Status {
        let sourceLocale = Locale.Language(identifier: source.code)
        let targetLocale = Locale.Language(identifier: target.code)
        
        do {
            let availability = LanguageAvailability()
            return try await availability.status(from: sourceLocale, to: targetLocale)
        } catch {
            return .unsupported
        }
    }
    
    // MARK: - Translation
    
    /// Translate text using Apple's Translation framework
    func translate(
        text: String,
        from source: Language,
        to target: Language
    ) async throws -> TranslationResult {
        guard !text.isEmpty else {
            throw TranslationError.emptyText
        }
        
        await MainActor.run {
            isTranslating = true
        }
        
        defer {
            Task { @MainActor in
                isTranslating = false
            }
        }
        
        let sourceLocale = Locale.Language(identifier: source.code)
        let targetLocale = Locale.Language(identifier: target.code)
        
        // Check availability
        let availability = LanguageAvailability()
        let status = try await availability.status(from: sourceLocale, to: targetLocale)
        
        switch status {
        case .unsupported:
            throw TranslationError.languageNotSupported
        case .supportedAndDownloaded:
            // Ready to translate
            break
        case .installed:
            // Ready to translate (already on device)
            break
        @unknown default:
            break
        }
        
        // Create translation configuration
        let configuration = TranslationSession.Configuration(
            source: sourceLocale,
            target: targetLocale
        )
        
        // Perform translation using a session
        let session = try await TranslationSession(configuration: configuration)
        let response = try await session.translate(text)
        
        return TranslationResult(
            originalText: text,
            translatedText: response.targetText,
            sourceLanguage: source,
            targetLanguage: target,
            confidence: 1.0,  // Apple doesn't provide confidence scores
            detectedLanguage: nil
        )
    }
    
    /// Translate multiple texts in batch
    func translateBatch(
        texts: [String],
        from source: Language,
        to target: Language
    ) async throws -> [TranslationResult] {
        let sourceLocale = Locale.Language(identifier: source.code)
        let targetLocale = Locale.Language(identifier: target.code)
        
        let configuration = TranslationSession.Configuration(
            source: sourceLocale,
            target: targetLocale
        )
        
        let session = try await TranslationSession(configuration: configuration)
        
        var results: [TranslationResult] = []
        
        for text in texts {
            let response = try await session.translate(text)
            results.append(TranslationResult(
                originalText: text,
                translatedText: response.targetText,
                sourceLanguage: source,
                targetLanguage: target,
                confidence: 1.0,
                detectedLanguage: nil
            ))
        }
        
        return results
    }
}

// MARK: - Language Availability Extension
@available(iOS 17.4, *)
extension LanguageAvailability.Status {
    var displayName: String {
        switch self {
        case .installed:
            return "Ready"
        case .supportedAndDownloaded:
            return "Downloaded"
        case .supported:
            return "Needs Download"
        case .unsupported:
            return "Not Supported"
        @unknown default:
            return "Unknown"
        }
    }
    
    var isReady: Bool {
        switch self {
        case .installed, .supportedAndDownloaded:
            return true
        default:
            return false
        }
    }
}

// MARK: - Language Extension for Apple Translation
extension Language {
    /// Convert to Apple's Locale.Language
    @available(iOS 17.4, *)
    var localeLanguage: Locale.Language {
        Locale.Language(identifier: code)
    }
    
    /// Languages supported by Apple Translation (as of iOS 17.4)
    /// This list may expand with iOS updates
    static let appleTranslationSupported: [String] = [
        "ar", // Arabic
        "zh-Hans", // Chinese (Simplified)
        "zh-Hant", // Chinese (Traditional)
        "nl", // Dutch
        "en", // English
        "fr", // French
        "de", // German
        "hi", // Hindi  
        "id", // Indonesian
        "it", // Italian
        "ja", // Japanese
        "ko", // Korean
        "pl", // Polish
        "pt", // Portuguese
        "ru", // Russian
        "es", // Spanish
        "th", // Thai
        "tr", // Turkish
        "uk", // Ukrainian
        "vi", // Vietnamese
    ]
    
    var isAppleTranslationSupported: Bool {
        Self.appleTranslationSupported.contains { $0.hasPrefix(code) || code.hasPrefix($0) }
    }
}

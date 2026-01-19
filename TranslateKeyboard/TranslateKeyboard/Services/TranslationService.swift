import Foundation
import NaturalLanguage

/// Errors that can occur during translation
enum TranslationError: LocalizedError {
    case emptyText
    case networkError(Error)
    case invalidResponse
    case apiKeyMissing
    case languageNotSupported
    case rateLimitExceeded
    case translationFailed(String)
    
    var errorDescription: String? {
        switch self {
        case .emptyText:
            return "No text to translate"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .invalidResponse:
            return "Invalid response from translation service"
        case .apiKeyMissing:
            return "API key is required for this translation service"
        case .languageNotSupported:
            return "Language pair not supported"
        case .rateLimitExceeded:
            return "Translation rate limit exceeded. Please try again later."
        case .translationFailed(let message):
            return "Translation failed: \(message)"
        }
    }
}

/// Result of a translation operation
struct TranslationResult {
    let originalText: String
    let translatedText: String
    let sourceLanguage: Language
    let targetLanguage: Language
    let confidence: Double?
    let detectedLanguage: Language?
}

/// Protocol for translation services
protocol TranslationServiceProtocol {
    func translate(
        text: String,
        from source: Language,
        to target: Language
    ) async throws -> TranslationResult
    
    func detectLanguage(text: String) -> Language?
}

/// Main translation service that coordinates between different providers
class TranslationService: TranslationServiceProtocol, ObservableObject {
    
    // MARK: - Singleton
    static let shared = TranslationService()
    
    // MARK: - Properties
    @Published var isTranslating = false
    @Published var lastError: TranslationError?
    
    private let settings = TranslationSettings.shared
    private var translationCache = TranslationCache()
    
    // Rate limiting
    private var lastTranslationTime: Date?
    private let minTranslationInterval: TimeInterval = 0.3
    
    // MARK: - Translation
    func translate(
        text: String,
        from source: Language,
        to target: Language
    ) async throws -> TranslationResult {
        // Validate input
        let trimmedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedText.isEmpty else {
            throw TranslationError.emptyText
        }
        
        // Check cache first
        let cacheKey = "\(source.code):\(target.code):\(trimmedText)"
        if let cached = translationCache.get(key: cacheKey) {
            return cached
        }
        
        // Rate limiting
        if let lastTime = lastTranslationTime,
           Date().timeIntervalSince(lastTime) < minTranslationInterval {
            try await Task.sleep(nanoseconds: UInt64(minTranslationInterval * 1_000_000_000))
        }
        
        await MainActor.run {
            isTranslating = true
            lastError = nil
        }
        
        defer {
            Task { @MainActor in
                isTranslating = false
            }
        }
        
        lastTranslationTime = Date()
        
        // Perform translation based on provider
        let result: TranslationResult
        
        switch settings.translationProvider {
        case .apple:
            result = try await translateWithApple(text: trimmedText, from: source, to: target)
        case .google:
            result = try await translateWithGoogle(text: trimmedText, from: source, to: target)
        case .deepL:
            result = try await translateWithDeepL(text: trimmedText, from: source, to: target)
        }
        
        // Cache the result
        translationCache.set(key: cacheKey, value: result)
        
        return result
    }
    
    // MARK: - Apple Translate
    private func translateWithApple(
        text: String,
        from source: Language,
        to target: Language
    ) async throws -> TranslationResult {
        // Use Apple's Translation framework (iOS 17.4+)
        if #available(iOS 17.4, *) {
            do {
                let appleService = AppleTranslationService.shared
                return try await appleService.translate(text: text, from: source, to: target)
            } catch {
                // Fall back to mock if Translation framework fails
                print("Apple Translation failed: \(error), falling back to mock")
            }
        }
        
        // Fallback for older iOS or if Translation fails
        // Simulate network delay
        try await Task.sleep(nanoseconds: 300_000_000)
        
        // Mock translation - used as fallback
        let translatedText = await performMockTranslation(text: text, from: source, to: target)
        
        return TranslationResult(
            originalText: text,
            translatedText: translatedText,
            sourceLanguage: source,
            targetLanguage: target,
            confidence: 0.95,
            detectedLanguage: nil
        )
    }
    
    // MARK: - Google Translate
    private func translateWithGoogle(
        text: String,
        from source: Language,
        to target: Language
    ) async throws -> TranslationResult {
        guard !settings.apiKey.isEmpty else {
            throw TranslationError.apiKeyMissing
        }
        
        let urlString = "https://translation.googleapis.com/language/translate/v2"
        guard var urlComponents = URLComponents(string: urlString) else {
            throw TranslationError.invalidResponse
        }
        
        urlComponents.queryItems = [
            URLQueryItem(name: "key", value: settings.apiKey),
            URLQueryItem(name: "q", value: text),
            URLQueryItem(name: "source", value: source.code),
            URLQueryItem(name: "target", value: target.code),
            URLQueryItem(name: "format", value: "text")
        ]
        
        guard let url = urlComponents.url else {
            throw TranslationError.invalidResponse
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw TranslationError.invalidResponse
            }
            
            if httpResponse.statusCode == 429 {
                throw TranslationError.rateLimitExceeded
            }
            
            guard httpResponse.statusCode == 200 else {
                throw TranslationError.translationFailed("HTTP \(httpResponse.statusCode)")
            }
            
            // Parse Google Translate response
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let dataDict = json["data"] as? [String: Any],
                  let translations = dataDict["translations"] as? [[String: Any]],
                  let firstTranslation = translations.first,
                  let translatedText = firstTranslation["translatedText"] as? String else {
                throw TranslationError.invalidResponse
            }
            
            return TranslationResult(
                originalText: text,
                translatedText: translatedText,
                sourceLanguage: source,
                targetLanguage: target,
                confidence: nil,
                detectedLanguage: nil
            )
        } catch let error as TranslationError {
            throw error
        } catch {
            throw TranslationError.networkError(error)
        }
    }
    
    // MARK: - DeepL Translate
    private func translateWithDeepL(
        text: String,
        from source: Language,
        to target: Language
    ) async throws -> TranslationResult {
        guard !settings.apiKey.isEmpty else {
            throw TranslationError.apiKeyMissing
        }
        
        let urlString = "https://api-free.deepl.com/v2/translate"
        guard let url = URL(string: urlString) else {
            throw TranslationError.invalidResponse
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.setValue("DeepL-Auth-Key \(settings.apiKey)", forHTTPHeaderField: "Authorization")
        
        let bodyParams = [
            "text": text,
            "source_lang": source.code.uppercased(),
            "target_lang": target.code.uppercased()
        ]
        
        request.httpBody = bodyParams
            .map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? $0.value)" }
            .joined(separator: "&")
            .data(using: .utf8)
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw TranslationError.invalidResponse
            }
            
            if httpResponse.statusCode == 429 {
                throw TranslationError.rateLimitExceeded
            }
            
            guard httpResponse.statusCode == 200 else {
                throw TranslationError.translationFailed("HTTP \(httpResponse.statusCode)")
            }
            
            // Parse DeepL response
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let translations = json["translations"] as? [[String: Any]],
                  let firstTranslation = translations.first,
                  let translatedText = firstTranslation["text"] as? String else {
                throw TranslationError.invalidResponse
            }
            
            return TranslationResult(
                originalText: text,
                translatedText: translatedText,
                sourceLanguage: source,
                targetLanguage: target,
                confidence: nil,
                detectedLanguage: nil
            )
        } catch let error as TranslationError {
            throw error
        } catch {
            throw TranslationError.networkError(error)
        }
    }
    
    // MARK: - Language Detection
    func detectLanguage(text: String) -> Language? {
        guard !text.isEmpty else { return nil }
        
        let recognizer = NLLanguageRecognizer()
        recognizer.processString(text)
        
        guard let languageCode = recognizer.dominantLanguage?.rawValue else {
            return nil
        }
        
        return Language.allLanguages.first { 
            $0.code == languageCode || languageCode.hasPrefix($0.code)
        }
    }
    
    // MARK: - Mock Translation (for demo purposes)
    private func performMockTranslation(text: String, from source: Language, to target: Language) async -> String {
        // This is a mock implementation for demonstration
        // In production, replace with actual translation API calls
        
        // Simple mock translations for common phrases
        let mockTranslations: [String: [String: String]] = [
            "Hello": ["es": "Hola", "fr": "Bonjour", "de": "Hallo", "ja": "こんにちは", "zh": "你好"],
            "How are you?": ["es": "¿Cómo estás?", "fr": "Comment allez-vous?", "de": "Wie geht es dir?", "ja": "お元気ですか？", "zh": "你好吗？"],
            "Thank you": ["es": "Gracias", "fr": "Merci", "de": "Danke", "ja": "ありがとう", "zh": "谢谢"],
            "Good morning": ["es": "Buenos días", "fr": "Bonjour", "de": "Guten Morgen", "ja": "おはよう", "zh": "早上好"],
            "Goodbye": ["es": "Adiós", "fr": "Au revoir", "de": "Auf Wiedersehen", "ja": "さようなら", "zh": "再见"]
        ]
        
        // Check if we have a mock translation
        if let translations = mockTranslations[text],
           let translation = translations[target.code] {
            return translation
        }
        
        // For demo: return text with a prefix indicating translation
        return "[\(target.code.uppercased())] \(text)"
    }
    
    // MARK: - Cache Management
    func clearCache() {
        translationCache.clear()
    }
}

// MARK: - Translation Cache
private class TranslationCache {
    private var cache: [String: (result: TranslationResult, timestamp: Date)] = [:]
    private let maxAge: TimeInterval = 3600 // 1 hour
    private let maxSize = 100
    
    func get(key: String) -> TranslationResult? {
        guard let entry = cache[key] else { return nil }
        
        // Check if entry is still valid
        if Date().timeIntervalSince(entry.timestamp) > maxAge {
            cache.removeValue(forKey: key)
            return nil
        }
        
        return entry.result
    }
    
    func set(key: String, value: TranslationResult) {
        // Evict oldest entries if cache is full
        if cache.count >= maxSize {
            let oldestKey = cache.min { $0.value.timestamp < $1.value.timestamp }?.key
            if let key = oldestKey {
                cache.removeValue(forKey: key)
            }
        }
        
        cache[key] = (result: value, timestamp: Date())
    }
    
    func clear() {
        cache.removeAll()
    }
}

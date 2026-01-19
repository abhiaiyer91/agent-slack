import Foundation

/// Service for learning-related features
class LearningService: ObservableObject {
    
    // MARK: - Singleton
    static let shared = LearningService()
    
    // MARK: - Properties
    private let settings = TranslationSettings.shared
    
    // Common French pronunciation patterns for English speakers
    private let frenchPronunciationRules: [(pattern: String, pronunciation: String, explanation: String)] = [
        ("bonjour", "bohn-ZHOOR", "The 'j' sounds like 'zh'"),
        ("merci", "mehr-SEE", "The 'c' before 'i' sounds like 's'"),
        ("oui", "WEE", "The 'ou' makes a 'w' sound"),
        ("je", "zhuh", "The 'j' is soft, like 'zh'"),
        ("vous", "VOO", "The 's' is silent at the end"),
        ("comment", "koh-MAHN", "The 'en' makes a nasal 'ahn' sound"),
        ("ça va", "sah VAH", "The 'ç' sounds like 's'"),
        ("s'il vous plaît", "seel voo PLEH", "The 'aît' sounds like 'eh'"),
        ("au revoir", "oh ruh-VWAHR", "The 'oi' sounds like 'wah'"),
        ("bonsoir", "bohn-SWAHR", "Evening greeting"),
        ("enchanté", "ahn-shahn-TAY", "The 'é' sounds like 'ay'"),
        ("pardon", "pahr-DOHN", "The 'on' is a nasal sound"),
        ("excusez-moi", "ex-koo-zay-MWAH", "'Moi' sounds like 'mwah'"),
    ]
    
    // MARK: - Word Breakdown
    
    /// Creates a word-by-word breakdown for learning
    func createWordBreakdown(
        original: String,
        translated: String,
        sourceLanguage: Language,
        targetLanguage: Language
    ) -> [WordPair] {
        let originalWords = original.components(separatedBy: .whitespaces).filter { !$0.isEmpty }
        let translatedWords = translated.components(separatedBy: .whitespaces).filter { !$0.isEmpty }
        
        var pairs: [WordPair] = []
        
        // Simple word-by-word pairing (in production, use NLP for better alignment)
        let maxCount = max(originalWords.count, translatedWords.count)
        
        for i in 0..<maxCount {
            let origWord = i < originalWords.count ? originalWords[i] : ""
            let transWord = i < translatedWords.count ? translatedWords[i] : ""
            
            let pronunciation = getPronunciation(for: transWord.lowercased(), language: targetLanguage)
            let partOfSpeech = guessPartOfSpeech(word: transWord, language: targetLanguage)
            
            pairs.append(WordPair(
                original: origWord,
                translated: transWord,
                partOfSpeech: partOfSpeech,
                pronunciation: pronunciation
            ))
        }
        
        return pairs
    }
    
    /// Get pronunciation hint for a word
    func getPronunciation(for word: String, language: Language) -> String? {
        let cleanWord = word.lowercased().trimmingCharacters(in: .punctuationCharacters)
        
        // Check known pronunciations for French
        if language.code == "fr" {
            if let rule = frenchPronunciationRules.first(where: { 
                cleanWord.contains($0.pattern) || $0.pattern.contains(cleanWord)
            }) {
                return rule.pronunciation
            }
            
            // Generate approximate pronunciation for unknown French words
            return approximateFrenchPronunciation(word: cleanWord)
        }
        
        // Add more languages as needed
        return nil
    }
    
    /// Approximate French pronunciation for English speakers
    private func approximateFrenchPronunciation(word: String) -> String {
        var result = word
        
        // Common French sound patterns
        let patterns: [(from: String, to: String)] = [
            ("eau", "OH"),
            ("aux", "OH"),
            ("ou", "OO"),
            ("oi", "WAH"),
            ("ai", "EH"),
            ("ei", "EH"),
            ("eu", "UH"),
            ("eur", "UR"),
            ("tion", "SYOHN"),
            ("ch", "SH"),
            ("gn", "NY"),
            ("qu", "K"),
            ("ç", "S"),
            ("é", "AY"),
            ("è", "EH"),
            ("ê", "EH"),
            ("î", "EE"),
            ("ô", "OH"),
            ("û", "OO"),
            ("an", "AHN"),
            ("en", "AHN"),
            ("in", "AN"),
            ("on", "OHN"),
            ("un", "UHN"),
        ]
        
        for pattern in patterns {
            result = result.replacingOccurrences(of: pattern.from, with: pattern.to)
        }
        
        // Silent letters at end
        if result.hasSuffix("s") || result.hasSuffix("t") || result.hasSuffix("d") || result.hasSuffix("x") {
            result = String(result.dropLast())
        }
        
        return result.uppercased()
    }
    
    /// Guess part of speech (simplified)
    private func guessPartOfSpeech(word: String, language: Language) -> PartOfSpeech? {
        let cleanWord = word.lowercased()
        
        if language.code == "fr" {
            // French articles
            if ["le", "la", "les", "un", "une", "des", "l'"].contains(cleanWord) {
                return .article
            }
            // French pronouns
            if ["je", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles", "me", "te", "se"].contains(cleanWord) {
                return .pronoun
            }
            // French prepositions
            if ["à", "de", "en", "dans", "sur", "sous", "avec", "pour", "par", "chez"].contains(cleanWord) {
                return .preposition
            }
            // Common verbs
            if ["suis", "es", "est", "sommes", "êtes", "sont", "ai", "as", "a", "avons", "avez", "ont", "vais", "vas", "va", "allons", "allez", "vont"].contains(cleanWord) {
                return .verb
            }
        }
        
        return nil
    }
    
    // MARK: - Learning Card Creation
    
    /// Create a learning card from a translation
    func createLearningCard(
        from original: String,
        translated: String,
        sourceLanguage: Language,
        targetLanguage: Language
    ) -> LearningCard {
        let wordBreakdown = createWordBreakdown(
            original: original,
            translated: translated,
            sourceLanguage: sourceLanguage,
            targetLanguage: targetLanguage
        )
        
        let pronunciation = getPronunciation(for: translated, language: targetLanguage)
        
        return LearningCard(
            originalText: original,
            translatedText: translated,
            sourceLanguage: sourceLanguage,
            targetLanguage: targetLanguage,
            wordBreakdown: wordBreakdown,
            pronunciation: pronunciation
        )
    }
    
    // MARK: - Review Logic
    
    /// Get cards due for review
    func getCardsForReview(limit: Int = 10) -> [LearningCard] {
        let now = Date()
        
        return settings.learningHistory
            .filter { card in
                // New cards or cards due for review
                guard let lastReview = card.lastReviewedAt else { return true }
                
                // Spaced repetition intervals based on confidence
                let interval: TimeInterval
                switch card.confidence {
                case .new: interval = 60 * 5 // 5 minutes
                case .learning: interval = 60 * 60 // 1 hour
                case .familiar: interval = 60 * 60 * 24 // 1 day
                case .mastered: interval = 60 * 60 * 24 * 7 // 1 week
                }
                
                return now.timeIntervalSince(lastReview) >= interval
            }
            .prefix(limit)
            .map { $0 }
    }
    
    /// Update card after review
    func markCardReviewed(_ card: LearningCard, remembered: Bool) {
        var updatedCard = card
        updatedCard.reviewCount += 1
        updatedCard.lastReviewedAt = Date()
        
        if remembered {
            // Move up confidence level
            switch card.confidence {
            case .new: updatedCard.confidence = .learning
            case .learning: updatedCard.confidence = .familiar
            case .familiar: updatedCard.confidence = .mastered
            case .mastered: break
            }
        } else {
            // Move down confidence level
            switch card.confidence {
            case .mastered: updatedCard.confidence = .familiar
            case .familiar: updatedCard.confidence = .learning
            case .learning: updatedCard.confidence = .new
            case .new: break
            }
        }
        
        settings.updateLearningCard(updatedCard)
    }
    
    // MARK: - Statistics
    
    /// Get learning statistics
    func getStatistics() -> LearningStatistics {
        let cards = settings.learningHistory
        
        return LearningStatistics(
            totalCards: cards.count,
            newCards: cards.filter { $0.confidence == .new }.count,
            learningCards: cards.filter { $0.confidence == .learning }.count,
            familiarCards: cards.filter { $0.confidence == .familiar }.count,
            masteredCards: cards.filter { $0.confidence == .mastered }.count,
            totalReviews: cards.reduce(0) { $0 + $1.reviewCount },
            conversationCount: settings.conversationHistory.count
        )
    }
}

/// Learning statistics
struct LearningStatistics {
    let totalCards: Int
    let newCards: Int
    let learningCards: Int
    let familiarCards: Int
    let masteredCards: Int
    let totalReviews: Int
    let conversationCount: Int
    
    var masteryPercentage: Double {
        guard totalCards > 0 else { return 0 }
        return Double(masteredCards + familiarCards) / Double(totalCards) * 100
    }
}

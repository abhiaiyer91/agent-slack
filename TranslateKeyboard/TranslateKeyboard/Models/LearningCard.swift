import Foundation

/// Represents a word or phrase being learned
struct LearningCard: Identifiable, Codable, Equatable {
    let id: UUID
    let originalText: String
    let translatedText: String
    let sourceLanguage: Language
    let targetLanguage: Language
    let wordBreakdown: [WordPair]
    let pronunciation: String?
    let createdAt: Date
    var reviewCount: Int
    var lastReviewedAt: Date?
    var confidence: LearningConfidence
    
    init(
        originalText: String,
        translatedText: String,
        sourceLanguage: Language,
        targetLanguage: Language,
        wordBreakdown: [WordPair] = [],
        pronunciation: String? = nil
    ) {
        self.id = UUID()
        self.originalText = originalText
        self.translatedText = translatedText
        self.sourceLanguage = sourceLanguage
        self.targetLanguage = targetLanguage
        self.wordBreakdown = wordBreakdown
        self.pronunciation = pronunciation
        self.createdAt = Date()
        self.reviewCount = 0
        self.lastReviewedAt = nil
        self.confidence = .learning
    }
}

/// A pair of words showing original and translation
struct WordPair: Identifiable, Codable, Equatable {
    let id: UUID
    let original: String
    let translated: String
    let partOfSpeech: PartOfSpeech?
    let pronunciation: String?
    
    init(original: String, translated: String, partOfSpeech: PartOfSpeech? = nil, pronunciation: String? = nil) {
        self.id = UUID()
        self.original = original
        self.translated = translated
        self.partOfSpeech = partOfSpeech
        self.pronunciation = pronunciation
    }
}

/// Part of speech for educational context
enum PartOfSpeech: String, Codable, CaseIterable {
    case noun
    case verb
    case adjective
    case adverb
    case pronoun
    case preposition
    case conjunction
    case article
    case other
    
    var emoji: String {
        switch self {
        case .noun: return "📦"
        case .verb: return "🏃"
        case .adjective: return "🎨"
        case .adverb: return "⚡"
        case .pronoun: return "👤"
        case .preposition: return "📍"
        case .conjunction: return "🔗"
        case .article: return "📝"
        case .other: return "💬"
        }
    }
    
    var displayName: String {
        rawValue.capitalized
    }
}

/// Learning confidence level
enum LearningConfidence: String, Codable, CaseIterable {
    case new
    case learning
    case familiar
    case mastered
    
    var color: String {
        switch self {
        case .new: return "red"
        case .learning: return "orange"
        case .familiar: return "yellow"
        case .mastered: return "green"
        }
    }
    
    var emoji: String {
        switch self {
        case .new: return "🆕"
        case .learning: return "📚"
        case .familiar: return "👍"
        case .mastered: return "⭐"
        }
    }
}

/// Direction of translation for learning context
enum TranslationDirection: String, Codable {
    case outgoing  // You're typing to send (English → French)
    case incoming  // You received and want to understand (French → English)
    
    var description: String {
        switch self {
        case .outgoing: return "You said"
        case .incoming: return "They said"
        }
    }
}

/// A conversation exchange for learning context
struct ConversationExchange: Identifiable, Codable {
    let id: UUID
    let direction: TranslationDirection
    let originalText: String
    let translatedText: String
    let learningCard: LearningCard?
    let timestamp: Date
    
    init(
        direction: TranslationDirection,
        originalText: String,
        translatedText: String,
        learningCard: LearningCard? = nil
    ) {
        self.id = UUID()
        self.direction = direction
        self.originalText = originalText
        self.translatedText = translatedText
        self.learningCard = learningCard
        self.timestamp = Date()
    }
}

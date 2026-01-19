import Foundation
import SwiftUI

/// Keyboard appearance style
enum KeyboardStyle: String, Codable, CaseIterable {
    case light
    case dark
    case system
}

/// Translation service provider
enum TranslationProvider: String, Codable, CaseIterable {
    case apple
    case google
    case deepL
    
    var displayName: String {
        switch self {
        case .apple: return "Apple Translate"
        case .google: return "Google Translate"
        case .deepL: return "DeepL"
        }
    }
}

/// Learning mode options
enum LearningMode: String, Codable, CaseIterable {
    case off
    case subtle      // Just show translation
    case learning    // Show word breakdown + pronunciation
    case immersive   // Full learning with flashcard prompts
    
    var displayName: String {
        switch self {
        case .off: return "Off"
        case .subtle: return "Subtle"
        case .learning: return "Learning"
        case .immersive: return "Immersive"
        }
    }
    
    var description: String {
        switch self {
        case .off: return "Just translate, no learning features"
        case .subtle: return "Show translations with minimal interruption"
        case .learning: return "Word breakdown and pronunciation hints"
        case .immersive: return "Full learning mode with review prompts"
        }
    }
}

/// Manages all translation and keyboard settings
/// Uses UserDefaults with App Group for sharing between app and keyboard extension
class TranslationSettings: ObservableObject {
    
    // MARK: - Singleton
    static let shared = TranslationSettings()
    
    // MARK: - App Group
    private static let appGroupIdentifier = "group.com.translatekeyboard.app"
    private let defaults: UserDefaults
    
    // MARK: - Keys
    private enum Keys {
        static let sourceLanguage = "sourceLanguage"
        static let targetLanguage = "targetLanguage"
        static let autoTranslateEnabled = "autoTranslateEnabled"
        static let showOriginalText = "showOriginalText"
        static let hapticFeedbackEnabled = "hapticFeedbackEnabled"
        static let keyboardStyle = "keyboardStyle"
        static let showTranslationPreview = "showTranslationPreview"
        static let translationProvider = "translationProvider"
        static let apiKey = "apiKey"
        static let recentLanguages = "recentLanguages"
        static let learningMode = "learningMode"
        static let learningHistory = "learningHistory"
        static let showPronunciation = "showPronunciation"
        static let showWordBreakdown = "showWordBreakdown"
        static let conversationHistory = "conversationHistory"
    }
    
    // MARK: - Published Properties
    @Published var sourceLanguage: Language {
        didSet { saveLanguage(sourceLanguage, forKey: Keys.sourceLanguage) }
    }
    
    @Published var targetLanguage: Language {
        didSet { saveLanguage(targetLanguage, forKey: Keys.targetLanguage) }
    }
    
    @Published var autoTranslateEnabled: Bool {
        didSet { defaults.set(autoTranslateEnabled, forKey: Keys.autoTranslateEnabled) }
    }
    
    @Published var showOriginalText: Bool {
        didSet { defaults.set(showOriginalText, forKey: Keys.showOriginalText) }
    }
    
    @Published var hapticFeedbackEnabled: Bool {
        didSet { defaults.set(hapticFeedbackEnabled, forKey: Keys.hapticFeedbackEnabled) }
    }
    
    @Published var keyboardStyle: KeyboardStyle {
        didSet { defaults.set(keyboardStyle.rawValue, forKey: Keys.keyboardStyle) }
    }
    
    @Published var showTranslationPreview: Bool {
        didSet { defaults.set(showTranslationPreview, forKey: Keys.showTranslationPreview) }
    }
    
    @Published var translationProvider: TranslationProvider {
        didSet { defaults.set(translationProvider.rawValue, forKey: Keys.translationProvider) }
    }
    
    @Published var apiKey: String {
        didSet { defaults.set(apiKey, forKey: Keys.apiKey) }
    }
    
    @Published var recentLanguages: [Language] {
        didSet { saveRecentLanguages() }
    }
    
    // MARK: - Learning Properties
    @Published var learningMode: LearningMode {
        didSet { defaults.set(learningMode.rawValue, forKey: Keys.learningMode) }
    }
    
    @Published var showPronunciation: Bool {
        didSet { defaults.set(showPronunciation, forKey: Keys.showPronunciation) }
    }
    
    @Published var showWordBreakdown: Bool {
        didSet { defaults.set(showWordBreakdown, forKey: Keys.showWordBreakdown) }
    }
    
    @Published var learningHistory: [LearningCard] {
        didSet { saveLearningHistory() }
    }
    
    @Published var conversationHistory: [ConversationExchange] {
        didSet { saveConversationHistory() }
    }
    
    // MARK: - Initialization
    private init() {
        // Try to use App Group UserDefaults, fall back to standard
        if let groupDefaults = UserDefaults(suiteName: Self.appGroupIdentifier) {
            self.defaults = groupDefaults
        } else {
            self.defaults = .standard
        }
        
        // Load saved values with defaults
        self.sourceLanguage = Self.loadLanguage(from: defaults, key: Keys.sourceLanguage) ?? .english
        self.targetLanguage = Self.loadLanguage(from: defaults, key: Keys.targetLanguage) ?? .spanish
        self.autoTranslateEnabled = defaults.object(forKey: Keys.autoTranslateEnabled) as? Bool ?? true
        self.showOriginalText = defaults.object(forKey: Keys.showOriginalText) as? Bool ?? true
        self.hapticFeedbackEnabled = defaults.object(forKey: Keys.hapticFeedbackEnabled) as? Bool ?? true
        self.showTranslationPreview = defaults.object(forKey: Keys.showTranslationPreview) as? Bool ?? true
        
        if let styleRaw = defaults.string(forKey: Keys.keyboardStyle),
           let style = KeyboardStyle(rawValue: styleRaw) {
            self.keyboardStyle = style
        } else {
            self.keyboardStyle = .system
        }
        
        if let providerRaw = defaults.string(forKey: Keys.translationProvider),
           let provider = TranslationProvider(rawValue: providerRaw) {
            self.translationProvider = provider
        } else {
            self.translationProvider = .apple
        }
        
        self.apiKey = defaults.string(forKey: Keys.apiKey) ?? ""
        self.recentLanguages = Self.loadRecentLanguages(from: defaults)
        
        // Learning settings
        if let modeRaw = defaults.string(forKey: Keys.learningMode),
           let mode = LearningMode(rawValue: modeRaw) {
            self.learningMode = mode
        } else {
            self.learningMode = .learning
        }
        
        self.showPronunciation = defaults.object(forKey: Keys.showPronunciation) as? Bool ?? true
        self.showWordBreakdown = defaults.object(forKey: Keys.showWordBreakdown) as? Bool ?? true
        self.learningHistory = Self.loadLearningHistory(from: defaults)
        self.conversationHistory = Self.loadConversationHistory(from: defaults)
    }
    
    // MARK: - Language Persistence
    private static func loadLanguage(from defaults: UserDefaults, key: String) -> Language? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(Language.self, from: data)
    }
    
    private func saveLanguage(_ language: Language, forKey key: String) {
        if let data = try? JSONEncoder().encode(language) {
            defaults.set(data, forKey: key)
        }
    }
    
    // MARK: - Recent Languages
    private static func loadRecentLanguages(from defaults: UserDefaults) -> [Language] {
        guard let data = defaults.data(forKey: Keys.recentLanguages) else { return [] }
        return (try? JSONDecoder().decode([Language].self, from: data)) ?? []
    }
    
    private func saveRecentLanguages() {
        if let data = try? JSONEncoder().encode(recentLanguages) {
            defaults.set(data, forKey: Keys.recentLanguages)
        }
    }
    
    func addRecentLanguage(_ language: Language) {
        var recent = recentLanguages.filter { $0.id != language.id }
        recent.insert(language, at: 0)
        recentLanguages = Array(recent.prefix(5))
    }
    
    // MARK: - Learning History
    private static func loadLearningHistory(from defaults: UserDefaults) -> [LearningCard] {
        guard let data = defaults.data(forKey: Keys.learningHistory) else { return [] }
        return (try? JSONDecoder().decode([LearningCard].self, from: data)) ?? []
    }
    
    private func saveLearningHistory() {
        if let data = try? JSONEncoder().encode(learningHistory) {
            defaults.set(data, forKey: Keys.learningHistory)
        }
    }
    
    func addToLearningHistory(_ card: LearningCard) {
        // Don't add duplicates
        if !learningHistory.contains(where: { 
            $0.originalText.lowercased() == card.originalText.lowercased() &&
            $0.targetLanguage == card.targetLanguage
        }) {
            learningHistory.insert(card, at: 0)
            // Keep last 100 cards
            if learningHistory.count > 100 {
                learningHistory = Array(learningHistory.prefix(100))
            }
        }
    }
    
    func updateLearningCard(_ card: LearningCard) {
        if let index = learningHistory.firstIndex(where: { $0.id == card.id }) {
            learningHistory[index] = card
        }
    }
    
    // MARK: - Conversation History
    private static func loadConversationHistory(from defaults: UserDefaults) -> [ConversationExchange] {
        guard let data = defaults.data(forKey: Keys.conversationHistory) else { return [] }
        return (try? JSONDecoder().decode([ConversationExchange].self, from: data)) ?? []
    }
    
    private func saveConversationHistory() {
        if let data = try? JSONEncoder().encode(conversationHistory) {
            defaults.set(data, forKey: Keys.conversationHistory)
        }
    }
    
    func addConversationExchange(_ exchange: ConversationExchange) {
        conversationHistory.insert(exchange, at: 0)
        // Keep last 50 exchanges
        if conversationHistory.count > 50 {
            conversationHistory = Array(conversationHistory.prefix(50))
        }
    }
    
    // MARK: - Reset
    func resetToDefaults() {
        sourceLanguage = .english
        targetLanguage = .spanish
        autoTranslateEnabled = true
        showOriginalText = true
        hapticFeedbackEnabled = true
        keyboardStyle = .system
        showTranslationPreview = true
        translationProvider = .apple
        apiKey = ""
        recentLanguages = []
        learningMode = .learning
        showPronunciation = true
        showWordBreakdown = true
    }
    
    func clearLearningHistory() {
        learningHistory = []
        conversationHistory = []
    }
    
    // MARK: - Convenience
    var languagePair: String {
        "\(sourceLanguage.code)-\(targetLanguage.code)"
    }
}

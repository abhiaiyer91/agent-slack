import Foundation

/// Service for importing and analyzing conversations
class ConversationImportService: ObservableObject {
    
    static let shared = ConversationImportService()
    
    // MARK: - Properties
    @Published var isAnalyzing = false
    @Published var lastAnalysis: ConversationAnalysis?
    
    private let translationService = TranslationService.shared
    private let grammarService = GrammarService.shared
    private let learningService = LearningService.shared
    private let settings = TranslationSettings.shared
    
    // MARK: - Import & Analyze
    
    /// Import and analyze a pasted conversation
    func analyzeConversation(_ text: String) async -> ConversationAnalysis {
        await MainActor.run {
            isAnalyzing = true
        }
        
        defer {
            Task { @MainActor in
                isAnalyzing = false
            }
        }
        
        // Parse conversation into messages
        let messages = parseMessages(text)
        
        // Analyze each message
        var analyzedMessages: [AnalyzedMessage] = []
        var allWords: [String: WordFrequency] = [:]
        var grammarTips: [GrammarTip] = []
        
        for message in messages {
            let analyzed = await analyzeMessage(message)
            analyzedMessages.append(analyzed)
            
            // Collect word frequencies
            for word in analyzed.words {
                let key = word.lowercased()
                if var existing = allWords[key] {
                    existing.count += 1
                    allWords[key] = existing
                } else {
                    allWords[key] = WordFrequency(word: word, count: 1, translation: analyzed.translation)
                }
            }
            
            // Collect grammar tips
            grammarTips.append(contentsOf: analyzed.grammarTips)
        }
        
        // Find most common words
        let commonWords = allWords.values
            .sorted { $0.count > $1.count }
            .prefix(20)
            .map { $0 }
        
        // Deduplicate grammar tips
        let uniqueGrammarTips = Array(Set(grammarTips.map { $0.title }))
            .compactMap { title in grammarTips.first { $0.title == title } }
        
        let analysis = ConversationAnalysis(
            originalText: text,
            messages: analyzedMessages,
            totalMessages: messages.count,
            theirMessages: analyzedMessages.filter { $0.isFromThem }.count,
            yourMessages: analyzedMessages.filter { !$0.isFromThem }.count,
            commonWords: Array(commonWords),
            grammarTips: uniqueGrammarTips,
            vocabularyToLearn: extractVocabulary(from: analyzedMessages)
        )
        
        await MainActor.run {
            lastAnalysis = analysis
        }
        
        return analysis
    }
    
    // MARK: - Message Parsing
    private func parseMessages(_ text: String) -> [ParsedMessage] {
        var messages: [ParsedMessage] = []
        
        // Split by common message patterns
        let lines = text.components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
        
        for line in lines {
            // Try to detect if it's from them (French) or you (English)
            let isFrench = detectIfFrench(line)
            
            messages.append(ParsedMessage(
                text: line,
                isFromThem: isFrench
            ))
        }
        
        return messages
    }
    
    private func detectIfFrench(_ text: String) -> Bool {
        let frenchIndicators = [
            "bonjour", "salut", "merci", "oui", "non", "je", "tu", "nous", "vous",
            "c'est", "qu'est", "comment", "pourquoi", "quand", "où", "ça va",
            "bisou", "bonsoir", "d'accord", "peut-être", "à bientôt", "à plus"
        ]
        
        let lowercased = text.lowercased()
        let matchCount = frenchIndicators.filter { lowercased.contains($0) }.count
        
        // Also check for French characters
        let frenchChars = ["é", "è", "ê", "ë", "à", "â", "ù", "û", "ô", "î", "ï", "ç", "œ"]
        let hasfrenchChars = frenchChars.contains { lowercased.contains($0) }
        
        return matchCount >= 2 || hasfrenchChars
    }
    
    // MARK: - Message Analysis
    private func analyzeMessage(_ message: ParsedMessage) async -> AnalyzedMessage {
        var translation = ""
        var grammarTips: [GrammarTip] = []
        
        // Translate if it's French (from them)
        if message.isFromThem {
            do {
                let result = try await translationService.translate(
                    text: message.text,
                    from: settings.targetLanguage,
                    to: settings.sourceLanguage
                )
                translation = result.translatedText
                
                // Get grammar tips for the French text
                grammarTips = grammarService.generateGrammarTips(
                    original: message.text,
                    translated: translation,
                    sourceLanguage: settings.targetLanguage,
                    targetLanguage: settings.sourceLanguage
                )
            } catch {
                translation = "[Translation failed]"
            }
        } else {
            // It's your message (English) - translate to French for learning
            do {
                let result = try await translationService.translate(
                    text: message.text,
                    from: settings.sourceLanguage,
                    to: settings.targetLanguage
                )
                translation = result.translatedText
            } catch {
                translation = message.text
            }
        }
        
        // Extract words
        let words = message.text
            .components(separatedBy: .whitespaces)
            .map { $0.trimmingCharacters(in: .punctuationCharacters) }
            .filter { !$0.isEmpty && $0.count > 2 }
        
        return AnalyzedMessage(
            originalText: message.text,
            translation: translation,
            isFromThem: message.isFromThem,
            words: words,
            grammarTips: grammarTips
        )
    }
    
    // MARK: - Vocabulary Extraction
    private func extractVocabulary(from messages: [AnalyzedMessage]) -> [VocabularyItem] {
        var vocabulary: [VocabularyItem] = []
        
        for message in messages where message.isFromThem {
            // Create vocabulary items from French messages
            let words = message.originalText
                .components(separatedBy: .whitespaces)
                .map { $0.trimmingCharacters(in: .punctuationCharacters).lowercased() }
                .filter { !$0.isEmpty && $0.count > 2 }
            
            for word in words {
                // Skip common words
                let commonWords = ["le", "la", "les", "un", "une", "des", "et", "ou", "de", "du", "je", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles"]
                if commonWords.contains(word) { continue }
                
                // Skip if already added
                if vocabulary.contains(where: { $0.french.lowercased() == word }) { continue }
                
                vocabulary.append(VocabularyItem(
                    french: word,
                    english: nil, // Would need individual word translation
                    context: message.originalText
                ))
            }
        }
        
        return Array(vocabulary.prefix(30))
    }
    
    // MARK: - Save to Learning
    func saveAnalysisToLearning(_ analysis: ConversationAnalysis) {
        for message in analysis.messages where message.isFromThem {
            let card = learningService.createLearningCard(
                from: message.translation,
                translated: message.originalText,
                sourceLanguage: settings.sourceLanguage,
                targetLanguage: settings.targetLanguage
            )
            settings.addToLearningHistory(card)
            
            // Also add to conversation history
            let exchange = ConversationExchange(
                direction: .incoming,
                originalText: message.originalText,
                translatedText: message.translation,
                learningCard: card
            )
            settings.addConversationExchange(exchange)
        }
    }
}

// MARK: - Models
struct ParsedMessage {
    let text: String
    let isFromThem: Bool
}

struct AnalyzedMessage: Identifiable {
    let id = UUID()
    let originalText: String
    let translation: String
    let isFromThem: Bool
    let words: [String]
    let grammarTips: [GrammarTip]
}

struct ConversationAnalysis: Identifiable {
    let id = UUID()
    let originalText: String
    let messages: [AnalyzedMessage]
    let totalMessages: Int
    let theirMessages: Int
    let yourMessages: Int
    let commonWords: [WordFrequency]
    let grammarTips: [GrammarTip]
    let vocabularyToLearn: [VocabularyItem]
    
    var analyzedAt: Date = Date()
}

struct WordFrequency: Identifiable {
    let id = UUID()
    let word: String
    var count: Int
    let translation: String
}

struct VocabularyItem: Identifiable {
    let id = UUID()
    let french: String
    let english: String?
    let context: String
}

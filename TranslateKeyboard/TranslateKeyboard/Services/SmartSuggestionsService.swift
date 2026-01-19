import Foundation

/// Service that provides context-aware response suggestions
class SmartSuggestionsService: ObservableObject {
    
    static let shared = SmartSuggestionsService()
    
    // MARK: - Properties
    @Published var currentSuggestions: [SmartSuggestion] = []
    
    private let settings = TranslationSettings.shared
    
    // MARK: - Suggestion Generation
    
    /// Generate suggestions based on received message
    func generateSuggestions(for incomingMessage: String, translatedMessage: String) -> [SmartSuggestion] {
        var suggestions: [SmartSuggestion] = []
        
        let lowercased = incomingMessage.lowercased()
        let translatedLower = translatedMessage.lowercased()
        
        // Detect message type and generate appropriate responses
        suggestions.append(contentsOf: detectGreetingResponses(lowercased))
        suggestions.append(contentsOf: detectQuestionResponses(lowercased, translated: translatedLower))
        suggestions.append(contentsOf: detectEmotionalResponses(lowercased, translated: translatedLower))
        suggestions.append(contentsOf: detectCasualResponses(lowercased))
        suggestions.append(contentsOf: detectRomanticResponses(lowercased, translated: translatedLower))
        suggestions.append(contentsOf: detectTimeResponses(lowercased))
        
        // Remove duplicates and limit
        let unique = Array(Set(suggestions)).prefix(6)
        
        currentSuggestions = Array(unique)
        return Array(unique)
    }
    
    // MARK: - Greeting Responses
    private func detectGreetingResponses(_ message: String) -> [SmartSuggestion] {
        var suggestions: [SmartSuggestion] = []
        
        if message.contains("salut") || message.contains("bonjour") || message.contains("coucou") {
            suggestions.append(SmartSuggestion(
                french: "Salut! Ça va?",
                english: "Hi! How are you?",
                category: .greeting
            ))
            suggestions.append(SmartSuggestion(
                french: "Coucou! 😊",
                english: "Hey! 😊",
                category: .greeting
            ))
        }
        
        if message.contains("bonsoir") {
            suggestions.append(SmartSuggestion(
                french: "Bonsoir! Tu as passé une bonne journée?",
                english: "Good evening! Did you have a good day?",
                category: .greeting
            ))
        }
        
        if message.contains("ça va") || message.contains("ca va") || message.contains("comment vas") {
            suggestions.append(SmartSuggestion(
                french: "Ça va bien, et toi?",
                english: "I'm good, and you?",
                category: .greeting
            ))
            suggestions.append(SmartSuggestion(
                french: "Super bien! 😄",
                english: "Really good! 😄",
                category: .greeting
            ))
            suggestions.append(SmartSuggestion(
                french: "Un peu fatigué(e), mais ça va",
                english: "A bit tired, but I'm okay",
                category: .greeting
            ))
        }
        
        if message.contains("bonne nuit") {
            suggestions.append(SmartSuggestion(
                french: "Bonne nuit! Fais de beaux rêves 💫",
                english: "Good night! Sweet dreams 💫",
                category: .romantic
            ))
            suggestions.append(SmartSuggestion(
                french: "Dors bien! À demain 😘",
                english: "Sleep well! See you tomorrow 😘",
                category: .romantic
            ))
        }
        
        return suggestions
    }
    
    // MARK: - Question Responses
    private func detectQuestionResponses(_ message: String, translated: String) -> [SmartSuggestion] {
        var suggestions: [SmartSuggestion] = []
        
        // What are you doing?
        if message.contains("tu fais quoi") || message.contains("qu'est-ce que tu fais") {
            suggestions.append(SmartSuggestion(
                french: "Pas grand-chose, et toi?",
                english: "Not much, and you?",
                category: .casual
            ))
            suggestions.append(SmartSuggestion(
                french: "Je travaille un peu",
                english: "I'm working a bit",
                category: .casual
            ))
            suggestions.append(SmartSuggestion(
                french: "Je pense à toi 😊",
                english: "I'm thinking about you 😊",
                category: .romantic
            ))
        }
        
        // Where are you?
        if message.contains("t'es où") || message.contains("tu es où") || message.contains("où es-tu") {
            suggestions.append(SmartSuggestion(
                french: "Je suis à la maison",
                english: "I'm at home",
                category: .casual
            ))
            suggestions.append(SmartSuggestion(
                french: "Au travail, pourquoi?",
                english: "At work, why?",
                category: .casual
            ))
            suggestions.append(SmartSuggestion(
                french: "J'arrive bientôt!",
                english: "I'm almost there!",
                category: .casual
            ))
        }
        
        // Are you free?
        if message.contains("tu es libre") || message.contains("t'es libre") || translated.contains("are you free") {
            suggestions.append(SmartSuggestion(
                french: "Oui, je suis libre!",
                english: "Yes, I'm free!",
                category: .casual
            ))
            suggestions.append(SmartSuggestion(
                french: "Ça dépend, pourquoi? 😏",
                english: "Depends, why? 😏",
                category: .casual
            ))
        }
        
        // Want to...?
        if message.contains("tu veux") || message.contains("on se voit") || translated.contains("want to") {
            suggestions.append(SmartSuggestion(
                french: "Oui, avec plaisir!",
                english: "Yes, I'd love to!",
                category: .casual
            ))
            suggestions.append(SmartSuggestion(
                french: "Bonne idée!",
                english: "Good idea!",
                category: .casual
            ))
            suggestions.append(SmartSuggestion(
                french: "Quand?",
                english: "When?",
                category: .question
            ))
        }
        
        return suggestions
    }
    
    // MARK: - Emotional Responses
    private func detectEmotionalResponses(_ message: String, translated: String) -> [SmartSuggestion] {
        var suggestions: [SmartSuggestion] = []
        
        // Happy/Excited
        if message.contains("super") || message.contains("génial") || message.contains("trop bien") ||
           translated.contains("happy") || translated.contains("excited") {
            suggestions.append(SmartSuggestion(
                french: "C'est génial! 🎉",
                english: "That's awesome! 🎉",
                category: .emotion
            ))
            suggestions.append(SmartSuggestion(
                french: "Je suis content(e) pour toi!",
                english: "I'm happy for you!",
                category: .emotion
            ))
        }
        
        // Sad/Bad news
        if message.contains("triste") || message.contains("dommage") || message.contains("désolé") ||
           translated.contains("sad") || translated.contains("sorry") {
            suggestions.append(SmartSuggestion(
                french: "Oh non, qu'est-ce qui s'est passé?",
                english: "Oh no, what happened?",
                category: .emotion
            ))
            suggestions.append(SmartSuggestion(
                french: "Je suis là pour toi ❤️",
                english: "I'm here for you ❤️",
                category: .emotion
            ))
            suggestions.append(SmartSuggestion(
                french: "Ça va aller",
                english: "It'll be okay",
                category: .emotion
            ))
        }
        
        // Funny
        if message.contains("mdr") || message.contains("lol") || message.contains("haha") || message.contains("😂") {
            suggestions.append(SmartSuggestion(
                french: "😂😂😂",
                english: "😂😂😂",
                category: .emotion
            ))
            suggestions.append(SmartSuggestion(
                french: "Trop drôle!",
                english: "So funny!",
                category: .emotion
            ))
        }
        
        return suggestions
    }
    
    // MARK: - Casual Responses
    private func detectCasualResponses(_ message: String) -> [SmartSuggestion] {
        var suggestions: [SmartSuggestion] = []
        
        if message.contains("d'accord") || message.contains("ok") || message.contains("okay") {
            suggestions.append(SmartSuggestion(
                french: "Parfait!",
                english: "Perfect!",
                category: .casual
            ))
        }
        
        if message.contains("merci") {
            suggestions.append(SmartSuggestion(
                french: "De rien! 😊",
                english: "You're welcome! 😊",
                category: .casual
            ))
            suggestions.append(SmartSuggestion(
                french: "Avec plaisir!",
                english: "My pleasure!",
                category: .casual
            ))
        }
        
        if message.contains("pardon") || message.contains("désolé") {
            suggestions.append(SmartSuggestion(
                french: "Pas de souci!",
                english: "No worries!",
                category: .casual
            ))
            suggestions.append(SmartSuggestion(
                french: "T'inquiète pas",
                english: "Don't worry about it",
                category: .casual
            ))
        }
        
        return suggestions
    }
    
    // MARK: - Romantic Responses
    private func detectRomanticResponses(_ message: String, translated: String) -> [SmartSuggestion] {
        var suggestions: [SmartSuggestion] = []
        
        if message.contains("tu me manques") || translated.contains("miss you") {
            suggestions.append(SmartSuggestion(
                french: "Tu me manques aussi! ❤️",
                english: "I miss you too! ❤️",
                category: .romantic
            ))
            suggestions.append(SmartSuggestion(
                french: "J'ai hâte de te voir",
                english: "I can't wait to see you",
                category: .romantic
            ))
        }
        
        if message.contains("bisou") || message.contains("😘") || message.contains("❤️") {
            suggestions.append(SmartSuggestion(
                french: "Gros bisous! 😘",
                english: "Big kisses! 😘",
                category: .romantic
            ))
            suggestions.append(SmartSuggestion(
                french: "❤️❤️❤️",
                english: "❤️❤️❤️",
                category: .romantic
            ))
        }
        
        if message.contains("je t'aime") || translated.contains("love you") {
            suggestions.append(SmartSuggestion(
                french: "Je t'aime aussi! ❤️",
                english: "I love you too! ❤️",
                category: .romantic
            ))
            suggestions.append(SmartSuggestion(
                french: "Tu me rends tellement heureux/heureuse",
                english: "You make me so happy",
                category: .romantic
            ))
        }
        
        return suggestions
    }
    
    // MARK: - Time Responses
    private func detectTimeResponses(_ message: String) -> [SmartSuggestion] {
        var suggestions: [SmartSuggestion] = []
        
        if message.contains("quand") || message.contains("quelle heure") {
            suggestions.append(SmartSuggestion(
                french: "Maintenant?",
                english: "Now?",
                category: .time
            ))
            suggestions.append(SmartSuggestion(
                french: "Ce soir?",
                english: "Tonight?",
                category: .time
            ))
            suggestions.append(SmartSuggestion(
                french: "Demain",
                english: "Tomorrow",
                category: .time
            ))
        }
        
        if message.contains("demain") || message.contains("ce soir") || message.contains("week-end") {
            suggestions.append(SmartSuggestion(
                french: "Oui, ça marche!",
                english: "Yes, that works!",
                category: .casual
            ))
            suggestions.append(SmartSuggestion(
                french: "J'ai hâte!",
                english: "I can't wait!",
                category: .emotion
            ))
        }
        
        return suggestions
    }
}

// MARK: - Smart Suggestion Model
struct SmartSuggestion: Identifiable, Hashable {
    let id = UUID()
    let french: String
    let english: String
    let category: SuggestionCategory
    
    func hash(into hasher: inout Hasher) {
        hasher.combine(french)
    }
    
    static func == (lhs: SmartSuggestion, rhs: SmartSuggestion) -> Bool {
        lhs.french == rhs.french
    }
}

enum SuggestionCategory: String, CaseIterable {
    case greeting
    case casual
    case question
    case emotion
    case romantic
    case time
    
    var color: String {
        switch self {
        case .greeting: return "blue"
        case .casual: return "gray"
        case .question: return "orange"
        case .emotion: return "yellow"
        case .romantic: return "pink"
        case .time: return "purple"
        }
    }
}

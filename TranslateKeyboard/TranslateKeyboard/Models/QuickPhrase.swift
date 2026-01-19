import Foundation

/// A pre-built phrase for quick access
struct QuickPhrase: Identifiable, Codable, Equatable {
    let id: UUID
    let category: PhraseCategory
    let originalText: String
    let translatedText: String
    let pronunciation: String?
    let context: String?  // When to use this phrase
    var isFavorite: Bool
    var useCount: Int
    
    init(
        category: PhraseCategory,
        originalText: String,
        translatedText: String,
        pronunciation: String? = nil,
        context: String? = nil
    ) {
        self.id = UUID()
        self.category = category
        self.originalText = originalText
        self.translatedText = translatedText
        self.pronunciation = pronunciation
        self.context = context
        self.isFavorite = false
        self.useCount = 0
    }
}

/// Categories for organizing phrases
enum PhraseCategory: String, Codable, CaseIterable {
    case greetings
    case romantic
    case casual
    case questions
    case responses
    case emotions
    case time
    case food
    case travel
    case emergency
    
    var displayName: String {
        switch self {
        case .greetings: return "Greetings"
        case .romantic: return "Romantic"
        case .casual: return "Casual"
        case .questions: return "Questions"
        case .responses: return "Responses"
        case .emotions: return "Emotions"
        case .time: return "Time"
        case .food: return "Food & Drinks"
        case .travel: return "Travel"
        case .emergency: return "Emergency"
        }
    }
    
    var emoji: String {
        switch self {
        case .greetings: return "👋"
        case .romantic: return "💕"
        case .casual: return "😊"
        case .questions: return "❓"
        case .responses: return "💬"
        case .emotions: return "🎭"
        case .time: return "⏰"
        case .food: return "🍽️"
        case .travel: return "✈️"
        case .emergency: return "🆘"
        }
    }
}

/// Library of pre-built phrases
class PhraseLibrary: ObservableObject {
    
    static let shared = PhraseLibrary()
    
    @Published var phrases: [QuickPhrase] = []
    @Published var customPhrases: [QuickPhrase] = []
    
    private init() {
        loadFrenchPhrases()
    }
    
    /// Load French phrases for English speakers
    private func loadFrenchPhrases() {
        phrases = [
            // MARK: - Greetings
            QuickPhrase(category: .greetings, originalText: "Hello", translatedText: "Salut", pronunciation: "sah-LOO", context: "Casual hello"),
            QuickPhrase(category: .greetings, originalText: "Good morning", translatedText: "Bonjour", pronunciation: "bohn-ZHOOR", context: "Morning/Formal"),
            QuickPhrase(category: .greetings, originalText: "Good evening", translatedText: "Bonsoir", pronunciation: "bohn-SWAHR", context: "After 6pm"),
            QuickPhrase(category: .greetings, originalText: "Good night", translatedText: "Bonne nuit", pronunciation: "bun NWEE", context: "Before sleep"),
            QuickPhrase(category: .greetings, originalText: "How are you?", translatedText: "Comment ça va?", pronunciation: "koh-MAHN sah VAH", context: "Casual check-in"),
            QuickPhrase(category: .greetings, originalText: "See you later", translatedText: "À plus tard", pronunciation: "ah ploo TAHR", context: "Casual goodbye"),
            QuickPhrase(category: .greetings, originalText: "See you soon", translatedText: "À bientôt", pronunciation: "ah byehn-TOH", context: "Friendly goodbye"),
            QuickPhrase(category: .greetings, originalText: "Goodbye", translatedText: "Au revoir", pronunciation: "oh ruh-VWAHR", context: "Formal goodbye"),
            
            // MARK: - Romantic
            QuickPhrase(category: .romantic, originalText: "I miss you", translatedText: "Tu me manques", pronunciation: "too muh MAHNK", context: "Expressing longing"),
            QuickPhrase(category: .romantic, originalText: "I'm thinking about you", translatedText: "Je pense à toi", pronunciation: "zhuh PAHNS ah TWAH", context: "Sweet message"),
            QuickPhrase(category: .romantic, originalText: "You're beautiful", translatedText: "Tu es belle", pronunciation: "too eh BEL", context: "Compliment (to woman)"),
            QuickPhrase(category: .romantic, originalText: "I like you a lot", translatedText: "Je t'aime beaucoup", pronunciation: "zhuh TEM boh-KOO", context: "Strong affection"),
            QuickPhrase(category: .romantic, originalText: "Sweet dreams", translatedText: "Fais de beaux rêves", pronunciation: "feh duh boh REV", context: "Goodnight text"),
            QuickPhrase(category: .romantic, originalText: "I can't wait to see you", translatedText: "J'ai hâte de te voir", pronunciation: "zhay AHT duh tuh VWAHR", context: "Excitement"),
            QuickPhrase(category: .romantic, originalText: "You make me happy", translatedText: "Tu me rends heureux", pronunciation: "too muh RAHN uh-RUH", context: "Expressing joy"),
            QuickPhrase(category: .romantic, originalText: "I'm lucky to have you", translatedText: "J'ai de la chance de t'avoir", pronunciation: "zhay duh lah SHAHNS duh tah-VWAHR", context: "Appreciation"),
            QuickPhrase(category: .romantic, originalText: "Kiss", translatedText: "Bisou", pronunciation: "bee-ZOO", context: "Affectionate"),
            QuickPhrase(category: .romantic, originalText: "Hugs and kisses", translatedText: "Gros bisous", pronunciation: "groh bee-ZOO", context: "Signing off"),
            
            // MARK: - Casual
            QuickPhrase(category: .casual, originalText: "What's up?", translatedText: "Quoi de neuf?", pronunciation: "kwah duh NUF", context: "Very casual"),
            QuickPhrase(category: .casual, originalText: "Where are you?", translatedText: "T'es où?", pronunciation: "teh OO", context: "Checking location"),
            QuickPhrase(category: .casual, originalText: "What are you doing?", translatedText: "Tu fais quoi?", pronunciation: "too feh KWAH", context: "Casual check-in"),
            QuickPhrase(category: .casual, originalText: "I'm on my way", translatedText: "J'arrive", pronunciation: "zhah-REEV", context: "Coming soon"),
            QuickPhrase(category: .casual, originalText: "I'm tired", translatedText: "Je suis fatigué(e)", pronunciation: "zhuh swee fah-tee-GAY", context: "Expressing tiredness"),
            QuickPhrase(category: .casual, originalText: "That's funny", translatedText: "C'est marrant", pronunciation: "seh mah-RAHN", context: "Reacting to humor"),
            QuickPhrase(category: .casual, originalText: "No worries", translatedText: "T'inquiète pas", pronunciation: "tahn-KYET pah", context: "Reassurance"),
            QuickPhrase(category: .casual, originalText: "I'm bored", translatedText: "Je m'ennuie", pronunciation: "zhuh mahn-NWEE", context: "Expressing boredom"),
            
            // MARK: - Questions
            QuickPhrase(category: .questions, originalText: "What do you mean?", translatedText: "Qu'est-ce que tu veux dire?", pronunciation: "kes-kuh too vuh DEER", context: "Clarification"),
            QuickPhrase(category: .questions, originalText: "Do you understand?", translatedText: "Tu comprends?", pronunciation: "too kohm-PRAHN", context: "Checking understanding"),
            QuickPhrase(category: .questions, originalText: "Can you repeat?", translatedText: "Tu peux répéter?", pronunciation: "too puh ray-pay-TAY", context: "Didn't understand"),
            QuickPhrase(category: .questions, originalText: "What time is it?", translatedText: "Il est quelle heure?", pronunciation: "eel eh kel UR", context: "Asking time"),
            QuickPhrase(category: .questions, originalText: "Why?", translatedText: "Pourquoi?", pronunciation: "poor-KWAH", context: "Asking reason"),
            QuickPhrase(category: .questions, originalText: "When?", translatedText: "Quand?", pronunciation: "KAHN", context: "Asking time"),
            QuickPhrase(category: .questions, originalText: "Are you free?", translatedText: "Tu es libre?", pronunciation: "too eh LEEBR", context: "Making plans"),
            
            // MARK: - Responses
            QuickPhrase(category: .responses, originalText: "I'm good", translatedText: "Ça va bien", pronunciation: "sah vah BYEHN", context: "Positive response"),
            QuickPhrase(category: .responses, originalText: "Yes", translatedText: "Oui", pronunciation: "WEE", context: "Affirmative"),
            QuickPhrase(category: .responses, originalText: "No", translatedText: "Non", pronunciation: "NOHN", context: "Negative"),
            QuickPhrase(category: .responses, originalText: "Maybe", translatedText: "Peut-être", pronunciation: "puh-TETR", context: "Uncertain"),
            QuickPhrase(category: .responses, originalText: "Of course", translatedText: "Bien sûr", pronunciation: "byehn SOOR", context: "Emphatic yes"),
            QuickPhrase(category: .responses, originalText: "I don't know", translatedText: "Je ne sais pas", pronunciation: "zhuh nuh SEH pah", context: "Uncertainty"),
            QuickPhrase(category: .responses, originalText: "I understand", translatedText: "Je comprends", pronunciation: "zhuh kohm-PRAHN", context: "Confirmation"),
            QuickPhrase(category: .responses, originalText: "I don't understand", translatedText: "Je ne comprends pas", pronunciation: "zhuh nuh kohm-PRAHN pah", context: "Confusion"),
            QuickPhrase(category: .responses, originalText: "Thank you", translatedText: "Merci", pronunciation: "mehr-SEE", context: "Gratitude"),
            QuickPhrase(category: .responses, originalText: "You're welcome", translatedText: "De rien", pronunciation: "duh RYEHN", context: "Response to thanks"),
            QuickPhrase(category: .responses, originalText: "Sorry", translatedText: "Désolé(e)", pronunciation: "day-zoh-LAY", context: "Apology"),
            QuickPhrase(category: .responses, originalText: "No problem", translatedText: "Pas de problème", pronunciation: "pah duh proh-BLEM", context: "Reassurance"),
            
            // MARK: - Emotions
            QuickPhrase(category: .emotions, originalText: "I'm happy", translatedText: "Je suis content(e)", pronunciation: "zhuh swee kohn-TAHN", context: "Expressing joy"),
            QuickPhrase(category: .emotions, originalText: "I'm sad", translatedText: "Je suis triste", pronunciation: "zhuh swee TREEST", context: "Expressing sadness"),
            QuickPhrase(category: .emotions, originalText: "I'm excited", translatedText: "Je suis excité(e)", pronunciation: "zhuh swee ex-see-TAY", context: "Expressing excitement"),
            QuickPhrase(category: .emotions, originalText: "I'm worried", translatedText: "Je suis inquiet/inquiète", pronunciation: "zhuh swee ahn-KYEH", context: "Expressing worry"),
            QuickPhrase(category: .emotions, originalText: "LOL", translatedText: "MDR", pronunciation: "ehm day EHR", context: "French LOL (mort de rire)"),
            QuickPhrase(category: .emotions, originalText: "That's great!", translatedText: "C'est génial!", pronunciation: "seh zhay-NYAL", context: "Enthusiasm"),
            QuickPhrase(category: .emotions, originalText: "That's too bad", translatedText: "C'est dommage", pronunciation: "seh doh-MAHZH", context: "Sympathy"),
            
            // MARK: - Time
            QuickPhrase(category: .time, originalText: "Today", translatedText: "Aujourd'hui", pronunciation: "oh-zhoor-DWEE", context: "Current day"),
            QuickPhrase(category: .time, originalText: "Tomorrow", translatedText: "Demain", pronunciation: "duh-MEHN", context: "Next day"),
            QuickPhrase(category: .time, originalText: "Yesterday", translatedText: "Hier", pronunciation: "YEHR", context: "Previous day"),
            QuickPhrase(category: .time, originalText: "This weekend", translatedText: "Ce week-end", pronunciation: "suh weekend", context: "Coming weekend"),
            QuickPhrase(category: .time, originalText: "Later", translatedText: "Plus tard", pronunciation: "ploo TAHR", context: "Unspecified future"),
            QuickPhrase(category: .time, originalText: "Right now", translatedText: "Maintenant", pronunciation: "mehn-tuh-NAHN", context: "Immediate"),
            QuickPhrase(category: .time, originalText: "In a bit", translatedText: "Dans un moment", pronunciation: "dahn zuhn moh-MAHN", context: "Soon"),
            
            // MARK: - Food
            QuickPhrase(category: .food, originalText: "I'm hungry", translatedText: "J'ai faim", pronunciation: "zhay FEHM", context: "Expressing hunger"),
            QuickPhrase(category: .food, originalText: "Let's eat", translatedText: "On mange?", pronunciation: "ohn MAHNZH", context: "Suggesting food"),
            QuickPhrase(category: .food, originalText: "Cheers!", translatedText: "Santé!", pronunciation: "sahn-TAY", context: "Toasting"),
            QuickPhrase(category: .food, originalText: "It's delicious", translatedText: "C'est délicieux", pronunciation: "seh day-lee-SYUH", context: "Complimenting food"),
            QuickPhrase(category: .food, originalText: "I'm full", translatedText: "Je n'ai plus faim", pronunciation: "zhuh nay ploo FEHM", context: "Had enough"),
            
            // MARK: - Emergency/Important
            QuickPhrase(category: .emergency, originalText: "Help!", translatedText: "Au secours!", pronunciation: "oh skoor", context: "Emergency"),
            QuickPhrase(category: .emergency, originalText: "I need help", translatedText: "J'ai besoin d'aide", pronunciation: "zhay buh-ZWAHN DEHD", context: "Requesting help"),
            QuickPhrase(category: .emergency, originalText: "Call me", translatedText: "Appelle-moi", pronunciation: "ah-PEL mwah", context: "Request callback"),
            QuickPhrase(category: .emergency, originalText: "It's urgent", translatedText: "C'est urgent", pronunciation: "seh oor-ZHAHN", context: "Urgency"),
            QuickPhrase(category: .emergency, originalText: "Are you okay?", translatedText: "Ça va?", pronunciation: "sah VAH", context: "Checking on someone"),
        ]
    }
    
    /// Get phrases by category
    func phrases(for category: PhraseCategory) -> [QuickPhrase] {
        phrases.filter { $0.category == category }
    }
    
    /// Get most used phrases
    func mostUsedPhrases(limit: Int = 10) -> [QuickPhrase] {
        phrases.sorted { $0.useCount > $1.useCount }.prefix(limit).map { $0 }
    }
    
    /// Get favorite phrases
    var favoritePhrases: [QuickPhrase] {
        phrases.filter { $0.isFavorite }
    }
    
    /// Search phrases
    func search(query: String) -> [QuickPhrase] {
        guard !query.isEmpty else { return phrases }
        let lowercased = query.lowercased()
        return phrases.filter {
            $0.originalText.lowercased().contains(lowercased) ||
            $0.translatedText.lowercased().contains(lowercased)
        }
    }
    
    /// Mark phrase as used
    func markAsUsed(_ phrase: QuickPhrase) {
        if let index = phrases.firstIndex(where: { $0.id == phrase.id }) {
            phrases[index].useCount += 1
        }
    }
    
    /// Toggle favorite
    func toggleFavorite(_ phrase: QuickPhrase) {
        if let index = phrases.firstIndex(where: { $0.id == phrase.id }) {
            phrases[index].isFavorite.toggle()
        }
    }
}

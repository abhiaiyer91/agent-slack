import Foundation

/// Service that provides grammar explanations for translations
class GrammarService: ObservableObject {
    
    static let shared = GrammarService()
    
    // MARK: - Grammar Tip Generation
    
    /// Generate grammar tips for a translation
    func generateGrammarTips(
        original: String,
        translated: String,
        sourceLanguage: Language,
        targetLanguage: Language
    ) -> [GrammarTip] {
        guard targetLanguage.code == "fr" else { return [] }
        
        var tips: [GrammarTip] = []
        
        let words = translated.lowercased().components(separatedBy: .whitespaces)
        
        // Check for various grammar patterns
        tips.append(contentsOf: detectArticleTips(words: words, original: original))
        tips.append(contentsOf: detectPronounTips(words: words))
        tips.append(contentsOf: detectVerbTips(words: words, original: original))
        tips.append(contentsOf: detectNegationTips(words: words))
        tips.append(contentsOf: detectContractionTips(translated: translated))
        tips.append(contentsOf: detectGenderTips(words: words))
        tips.append(contentsOf: detectPluralTips(words: words, original: original))
        
        return tips
    }
    
    // MARK: - Article Detection
    private func detectArticleTips(words: [String], original: String) -> [GrammarTip] {
        var tips: [GrammarTip] = []
        
        // Definite articles
        if words.contains("le") {
            tips.append(GrammarTip(
                title: "Masculine 'the'",
                explanation: "'Le' is used for masculine singular nouns",
                example: "le garçon (the boy), le livre (the book)",
                category: .articles,
                frenchConcept: "le",
                englishEquivalent: "the (masculine)"
            ))
        }
        
        if words.contains("la") {
            tips.append(GrammarTip(
                title: "Feminine 'the'",
                explanation: "'La' is used for feminine singular nouns",
                example: "la fille (the girl), la maison (the house)",
                category: .articles,
                frenchConcept: "la",
                englishEquivalent: "the (feminine)"
            ))
        }
        
        if words.contains("les") {
            tips.append(GrammarTip(
                title: "Plural 'the'",
                explanation: "'Les' is used for ALL plural nouns (both masculine and feminine)",
                example: "les enfants (the children), les maisons (the houses)",
                category: .articles,
                frenchConcept: "les",
                englishEquivalent: "the (plural)"
            ))
        }
        
        // Indefinite articles
        if words.contains("un") {
            tips.append(GrammarTip(
                title: "Masculine 'a/an'",
                explanation: "'Un' is used for masculine singular nouns",
                example: "un homme (a man), un chat (a cat)",
                category: .articles,
                frenchConcept: "un",
                englishEquivalent: "a/an (masculine)"
            ))
        }
        
        if words.contains("une") {
            tips.append(GrammarTip(
                title: "Feminine 'a/an'",
                explanation: "'Une' is used for feminine singular nouns",
                example: "une femme (a woman), une table (a table)",
                category: .articles,
                frenchConcept: "une",
                englishEquivalent: "a/an (feminine)"
            ))
        }
        
        if words.contains("des") {
            tips.append(GrammarTip(
                title: "Plural 'some'",
                explanation: "'Des' is the plural indefinite article. French requires an article where English might use nothing!",
                example: "J'ai des amis = I have friends (not 'I have some friends')",
                category: .articles,
                frenchConcept: "des",
                englishEquivalent: "some / (no article)"
            ))
        }
        
        return tips
    }
    
    // MARK: - Pronoun Detection
    private func detectPronounTips(words: [String]) -> [GrammarTip] {
        var tips: [GrammarTip] = []
        
        if words.contains("je") {
            tips.append(GrammarTip(
                title: "Subject Pronoun 'I'",
                explanation: "'Je' (I) becomes 'j'' before a vowel sound",
                example: "Je suis → J'ai, J'aime, J'habite",
                category: .pronouns,
                frenchConcept: "je / j'",
                englishEquivalent: "I"
            ))
        }
        
        if words.contains("tu") {
            tips.append(GrammarTip(
                title: "Informal 'you'",
                explanation: "'Tu' is informal/familiar 'you' - use with friends, family, people your age",
                example: "Tu es belle (You're beautiful - to someone close)",
                category: .pronouns,
                frenchConcept: "tu",
                englishEquivalent: "you (informal)"
            ))
        }
        
        if words.contains("vous") {
            tips.append(GrammarTip(
                title: "Formal 'you' / Plural",
                explanation: "'Vous' is formal 'you' OR plural 'you all'. Use for strangers, elders, or groups",
                example: "Vous êtes gentil (You are kind - formal)",
                category: .pronouns,
                frenchConcept: "vous",
                englishEquivalent: "you (formal/plural)"
            ))
        }
        
        if words.contains("on") {
            tips.append(GrammarTip(
                title: "Informal 'we'",
                explanation: "'On' literally means 'one' but is commonly used as informal 'we' in conversation",
                example: "On y va? = Shall we go? (instead of 'Nous y allons?')",
                category: .pronouns,
                frenchConcept: "on",
                englishEquivalent: "we (informal) / one"
            ))
        }
        
        // Object pronouns
        if words.contains("me") || words.contains("m'") {
            tips.append(GrammarTip(
                title: "Object Pronoun 'me'",
                explanation: "In French, object pronouns come BEFORE the verb (opposite of English!)",
                example: "Tu me manques = You (to) me are missing = I miss you",
                category: .pronouns,
                frenchConcept: "me / m'",
                englishEquivalent: "me / to me"
            ))
        }
        
        if words.contains("te") || words.contains("t'") {
            tips.append(GrammarTip(
                title: "Object Pronoun 'you'",
                explanation: "'Te' (informal you as object) comes before the verb",
                example: "Je t'aime = I you love = I love you",
                category: .pronouns,
                frenchConcept: "te / t'",
                englishEquivalent: "you (object)"
            ))
        }
        
        return tips
    }
    
    // MARK: - Verb Tips
    private func detectVerbTips(words: [String], original: String) -> [GrammarTip] {
        var tips: [GrammarTip] = []
        
        // Être (to be)
        let etreConjugations = ["suis", "es", "est", "sommes", "êtes", "sont"]
        if words.contains(where: { etreConjugations.contains($0) }) {
            tips.append(GrammarTip(
                title: "Verb: Être (to be)",
                explanation: "One of the most important irregular verbs",
                example: "je suis, tu es, il/elle est, nous sommes, vous êtes, ils/elles sont",
                category: .verbs,
                frenchConcept: "être",
                englishEquivalent: "to be"
            ))
        }
        
        // Avoir (to have)
        let avoirConjugations = ["ai", "as", "avons", "avez", "ont"]
        if words.contains(where: { avoirConjugations.contains($0) }) {
            tips.append(GrammarTip(
                title: "Verb: Avoir (to have)",
                explanation: "Used for possession AND in many expressions where English uses 'to be'",
                example: "J'ai faim = I have hunger = I'm hungry",
                category: .verbs,
                frenchConcept: "avoir",
                englishEquivalent: "to have"
            ))
        }
        
        // Aller (to go)
        let allerConjugations = ["vais", "vas", "va", "allons", "allez", "vont"]
        if words.contains(where: { allerConjugations.contains($0) }) {
            tips.append(GrammarTip(
                title: "Verb: Aller (to go)",
                explanation: "Also used to form the near future tense (going to...)",
                example: "Je vais manger = I'm going to eat",
                category: .verbs,
                frenchConcept: "aller",
                englishEquivalent: "to go"
            ))
        }
        
        // Faire (to do/make)
        let faireConjugations = ["fais", "fait", "faisons", "faites", "font"]
        if words.contains(where: { faireConjugations.contains($0) }) {
            tips.append(GrammarTip(
                title: "Verb: Faire (to do/make)",
                explanation: "Used in many weather and activity expressions",
                example: "Il fait beau = It makes beautiful = It's nice weather",
                category: .verbs,
                frenchConcept: "faire",
                englishEquivalent: "to do / to make"
            ))
        }
        
        return tips
    }
    
    // MARK: - Negation Tips
    private func detectNegationTips(words: [String]) -> [GrammarTip] {
        var tips: [GrammarTip] = []
        
        if words.contains("ne") || words.contains("n'") {
            if words.contains("pas") {
                tips.append(GrammarTip(
                    title: "Negation: ne...pas",
                    explanation: "French negation wraps around the verb: ne + verb + pas",
                    example: "Je ne sais pas = I (ne) know (pas) = I don't know",
                    category: .negation,
                    frenchConcept: "ne...pas",
                    englishEquivalent: "not / don't"
                ))
            }
            
            if words.contains("jamais") {
                tips.append(GrammarTip(
                    title: "Negation: ne...jamais",
                    explanation: "Means 'never' - replaces 'pas' in the negation",
                    example: "Je ne mange jamais de viande = I never eat meat",
                    category: .negation,
                    frenchConcept: "ne...jamais",
                    englishEquivalent: "never"
                ))
            }
            
            if words.contains("plus") {
                tips.append(GrammarTip(
                    title: "Negation: ne...plus",
                    explanation: "Means 'no longer' or 'not anymore'",
                    example: "Je n'ai plus faim = I'm not hungry anymore",
                    category: .negation,
                    frenchConcept: "ne...plus",
                    englishEquivalent: "no longer / not anymore"
                ))
            }
        }
        
        return tips
    }
    
    // MARK: - Contraction Tips
    private func detectContractionTips(translated: String) -> [GrammarTip] {
        var tips: [GrammarTip] = []
        
        if translated.contains("c'est") {
            tips.append(GrammarTip(
                title: "Contraction: C'est",
                explanation: "'Ce' + 'est' contracts to 'c'est' (it is / this is)",
                example: "C'est bon! = It's good!",
                category: .contractions,
                frenchConcept: "c'est",
                englishEquivalent: "it is / this is"
            ))
        }
        
        if translated.contains("j'") {
            tips.append(GrammarTip(
                title: "Contraction: J'",
                explanation: "'Je' contracts to 'j'' before vowels and silent 'h'",
                example: "J'aime (not 'Je aime'), J'habite (not 'Je habite')",
                category: .contractions,
                frenchConcept: "j'",
                englishEquivalent: "I (before vowel)"
            ))
        }
        
        if translated.contains("qu'") {
            tips.append(GrammarTip(
                title: "Contraction: Qu'",
                explanation: "'Que' contracts to 'qu'' before vowels",
                example: "Qu'est-ce que c'est? = What is it?",
                category: .contractions,
                frenchConcept: "qu'",
                englishEquivalent: "that/what (before vowel)"
            ))
        }
        
        return tips
    }
    
    // MARK: - Gender Tips
    private func detectGenderTips(words: [String]) -> [GrammarTip] {
        var tips: [GrammarTip] = []
        
        // Common feminine endings
        let feminineEndings = ["tion", "sion", "té", "ée", "ie", "ure", "ence", "ance"]
        for word in words {
            if feminineEndings.contains(where: { word.hasSuffix($0) }) && word.count > 4 {
                tips.append(GrammarTip(
                    title: "Feminine Noun Pattern",
                    explanation: "Words ending in -tion, -sion, -té, -ie, -ure are usually feminine",
                    example: "la nation, la liberté, la vie, la culture",
                    category: .gender,
                    frenchConcept: "Feminine endings",
                    englishEquivalent: "Gender patterns"
                ))
                break
            }
        }
        
        // Common masculine endings
        let masculineEndings = ["age", "ment", "isme", "eau"]
        for word in words {
            if masculineEndings.contains(where: { word.hasSuffix($0) }) && word.count > 4 {
                tips.append(GrammarTip(
                    title: "Masculine Noun Pattern",
                    explanation: "Words ending in -age, -ment, -isme, -eau are usually masculine",
                    example: "le voyage, le moment, le capitalisme, le bateau",
                    category: .gender,
                    frenchConcept: "Masculine endings",
                    englishEquivalent: "Gender patterns"
                ))
                break
            }
        }
        
        return tips
    }
    
    // MARK: - Plural Tips
    private func detectPluralTips(words: [String], original: String) -> [GrammarTip] {
        var tips: [GrammarTip] = []
        
        // Check for plural markers
        if words.contains("les") || words.contains("des") {
            tips.append(GrammarTip(
                title: "Plural Formation",
                explanation: "Most French plurals add -s (like English), but it's usually silent!",
                example: "chat → chats (pronounced the same)",
                category: .plurals,
                frenchConcept: "Plural -s",
                englishEquivalent: "Plural nouns"
            ))
        }
        
        // Special plurals
        for word in words {
            if word.hasSuffix("aux") {
                tips.append(GrammarTip(
                    title: "Special Plural: -aux",
                    explanation: "Words ending in -al change to -aux in plural",
                    example: "animal → animaux, journal → journaux",
                    category: .plurals,
                    frenchConcept: "-al → -aux",
                    englishEquivalent: "Irregular plural"
                ))
                break
            }
        }
        
        return tips
    }
}

// MARK: - Grammar Tip Model
struct GrammarTip: Identifiable {
    let id = UUID()
    let title: String
    let explanation: String
    let example: String
    let category: GrammarCategory
    let frenchConcept: String
    let englishEquivalent: String
}

enum GrammarCategory: String, CaseIterable {
    case articles = "Articles"
    case pronouns = "Pronouns"
    case verbs = "Verbs"
    case negation = "Negation"
    case contractions = "Contractions"
    case gender = "Gender"
    case plurals = "Plurals"
    case tenses = "Tenses"
    case prepositions = "Prepositions"
    
    var emoji: String {
        switch self {
        case .articles: return "📝"
        case .pronouns: return "👤"
        case .verbs: return "🏃"
        case .negation: return "🚫"
        case .contractions: return "🔗"
        case .gender: return "⚤"
        case .plurals: return "👥"
        case .tenses: return "⏰"
        case .prepositions: return "📍"
        }
    }
}

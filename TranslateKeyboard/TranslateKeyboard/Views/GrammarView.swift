import SwiftUI

struct GrammarView: View {
    @StateObject private var grammarService = GrammarService.shared
    @State private var selectedCategory: GrammarCategory = .articles
    @State private var searchText = ""
    
    // All grammar tips organized by category
    private var allTips: [GrammarCategory: [GrammarTip]] {
        var tips: [GrammarCategory: [GrammarTip]] = [:]
        
        for category in GrammarCategory.allCases {
            tips[category] = sampleTips(for: category)
        }
        
        return tips
    }
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Category picker
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(GrammarCategory.allCases, id: \.self) { category in
                            GrammarCategoryChip(
                                category: category,
                                isSelected: selectedCategory == category
                            ) {
                                withAnimation(.spring(response: 0.3)) {
                                    selectedCategory = category
                                }
                            }
                        }
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 12)
                }
                .background(Color(.systemBackground))
                
                // Tips list
                List {
                    ForEach(allTips[selectedCategory] ?? []) { tip in
                        GrammarTipCard(tip: tip)
                    }
                }
                .listStyle(.insetGrouped)
            }
            .navigationTitle("French Grammar")
            .searchable(text: $searchText, prompt: "Search grammar topics...")
        }
    }
    
    // Sample tips for each category
    private func sampleTips(for category: GrammarCategory) -> [GrammarTip] {
        switch category {
        case .articles:
            return [
                GrammarTip(title: "Definite Articles (The)", explanation: "French has three definite articles: le (masculine), la (feminine), les (plural). Unlike English, French nouns ALWAYS need an article.", example: "le garçon, la fille, les enfants", category: .articles, frenchConcept: "le, la, les", englishEquivalent: "the"),
                GrammarTip(title: "Indefinite Articles (A/An)", explanation: "Use 'un' for masculine, 'une' for feminine. For plural, use 'des' (some).", example: "un livre (a book), une pomme (an apple), des livres (some books)", category: .articles, frenchConcept: "un, une, des", englishEquivalent: "a, an, some"),
                GrammarTip(title: "Partitive Articles", explanation: "Use 'du', 'de la', 'des' when talking about an unspecified quantity of something.", example: "Je veux du pain (I want some bread)", category: .articles, frenchConcept: "du, de la, des", englishEquivalent: "some (uncountable)"),
            ]
        case .pronouns:
            return [
                GrammarTip(title: "Subject Pronouns", explanation: "je (I), tu (you informal), il/elle/on (he/she/one), nous (we), vous (you formal/plural), ils/elles (they)", example: "Je suis, tu es, il est, nous sommes, vous êtes, ils sont", category: .pronouns, frenchConcept: "je, tu, il, elle, on, nous, vous, ils, elles", englishEquivalent: "I, you, he, she, we, you, they"),
                GrammarTip(title: "Tu vs Vous", explanation: "'Tu' is informal - use with friends, family, children, peers. 'Vous' is formal - use with strangers, elders, in professional settings. 'Vous' is also used for plural 'you'.", example: "Tu es belle (to girlfriend) vs Vous êtes belle (formal)", category: .pronouns, frenchConcept: "tu vs vous", englishEquivalent: "informal vs formal you"),
                GrammarTip(title: "Object Pronouns", explanation: "In French, object pronouns come BEFORE the verb: me, te, le/la, nous, vous, les", example: "Je t'aime = I you love = I love you", category: .pronouns, frenchConcept: "me, te, le, la, nous, vous, les", englishEquivalent: "me, you, him/her, us, you, them"),
            ]
        case .verbs:
            return [
                GrammarTip(title: "Être (To Be)", explanation: "One of the most important verbs. Irregular conjugation: je suis, tu es, il/elle est, nous sommes, vous êtes, ils/elles sont", example: "Je suis content = I am happy", category: .verbs, frenchConcept: "être", englishEquivalent: "to be"),
                GrammarTip(title: "Avoir (To Have)", explanation: "Used for possession AND in expressions where English uses 'to be': avoir faim (to be hungry), avoir peur (to be afraid)", example: "J'ai faim = I have hunger = I'm hungry", category: .verbs, frenchConcept: "avoir", englishEquivalent: "to have"),
                GrammarTip(title: "Near Future (Going To)", explanation: "Use aller + infinitive to express near future, just like 'going to' in English", example: "Je vais manger = I'm going to eat", category: .verbs, frenchConcept: "aller + infinitif", englishEquivalent: "going to + verb"),
            ]
        case .negation:
            return [
                GrammarTip(title: "Basic Negation (ne...pas)", explanation: "Negation wraps around the verb: ne + verb + pas. In casual speech, 'ne' is often dropped.", example: "Je ne sais pas → Je sais pas (casual)", category: .negation, frenchConcept: "ne...pas", englishEquivalent: "not / don't"),
                GrammarTip(title: "Never (ne...jamais)", explanation: "Replace 'pas' with 'jamais' to say 'never'", example: "Je ne mange jamais de viande = I never eat meat", category: .negation, frenchConcept: "ne...jamais", englishEquivalent: "never"),
                GrammarTip(title: "No More (ne...plus)", explanation: "Replace 'pas' with 'plus' to say 'no longer' or 'not anymore'", example: "Je n'ai plus faim = I'm not hungry anymore", category: .negation, frenchConcept: "ne...plus", englishEquivalent: "no longer"),
            ]
        case .contractions:
            return [
                GrammarTip(title: "Contractions Before Vowels", explanation: "Je→J', Me→M', Te→T', Le/La→L', De→D', Ne→N', Que→Qu' before vowels or silent h", example: "J'aime (not Je aime), L'amour (not Le amour)", category: .contractions, frenchConcept: "j', m', t', l', d', n', qu'", englishEquivalent: "(contractions before vowels)"),
                GrammarTip(title: "À + le = Au", explanation: "'À' (to/at) contracts with 'le' to become 'au'. À + les = aux", example: "Je vais au cinéma (not à le cinéma)", category: .contractions, frenchConcept: "au, aux", englishEquivalent: "to the"),
                GrammarTip(title: "De + le = Du", explanation: "'De' (of/from) contracts with 'le' to become 'du'. De + les = des", example: "Je viens du travail (not de le travail)", category: .contractions, frenchConcept: "du, des", englishEquivalent: "of the / from the"),
            ]
        case .gender:
            return [
                GrammarTip(title: "Every Noun Has a Gender", explanation: "ALL French nouns are either masculine or feminine. There's no neutral. You must memorize the gender with each noun.", example: "le soleil (sun-masculine), la lune (moon-feminine)", category: .gender, frenchConcept: "masculin / féminin", englishEquivalent: "masculine / feminine"),
                GrammarTip(title: "Feminine Endings", explanation: "Words ending in -tion, -sion, -té, -ie, -ure, -ence, -ance are usually feminine", example: "la nation, la liberté, la vie, la nature", category: .gender, frenchConcept: "Terminaisons féminines", englishEquivalent: "Feminine patterns"),
                GrammarTip(title: "Masculine Endings", explanation: "Words ending in -age, -ment, -isme, -eau are usually masculine", example: "le voyage, le moment, le capitalisme, le bateau", category: .gender, frenchConcept: "Terminaisons masculines", englishEquivalent: "Masculine patterns"),
            ]
        case .plurals:
            return [
                GrammarTip(title: "Basic Plural (-s)", explanation: "Most plurals add -s, just like English. But the -s is SILENT in French!", example: "chat → chats (both pronounced 'sha')", category: .plurals, frenchConcept: "pluriel en -s", englishEquivalent: "plural -s (silent)"),
                GrammarTip(title: "Special Plural (-aux)", explanation: "Words ending in -al change to -aux in plural", example: "animal → animaux, journal → journaux", category: .plurals, frenchConcept: "-al → -aux", englishEquivalent: "special plural"),
                GrammarTip(title: "Invariable Plurals", explanation: "Words ending in -s, -x, -z don't change in plural", example: "un repas → des repas, une voix → des voix", category: .plurals, frenchConcept: "pluriels invariables", englishEquivalent: "no change in plural"),
            ]
        case .tenses:
            return [
                GrammarTip(title: "Present Tense", explanation: "Used for current actions AND habits (like English)", example: "Je mange = I eat / I am eating", category: .tenses, frenchConcept: "présent", englishEquivalent: "present tense"),
                GrammarTip(title: "Passé Composé", explanation: "The most common past tense. Use avoir/être + past participle", example: "J'ai mangé = I ate / I have eaten", category: .tenses, frenchConcept: "passé composé", englishEquivalent: "past tense"),
                GrammarTip(title: "Imparfait", explanation: "For past habits, descriptions, and ongoing past actions", example: "Quand j'étais petit... = When I was young...", category: .tenses, frenchConcept: "imparfait", englishEquivalent: "was doing / used to"),
            ]
        case .prepositions:
            return [
                GrammarTip(title: "À (To/At)", explanation: "Use 'à' for location at a place, direction to, and time", example: "Je suis à Paris, Je vais à l'école, à 8 heures", category: .prepositions, frenchConcept: "à", englishEquivalent: "to / at"),
                GrammarTip(title: "De (Of/From)", explanation: "Use 'de' for origin, possession, and with certain verbs", example: "Je viens de France, le livre de Marie", category: .prepositions, frenchConcept: "de", englishEquivalent: "of / from"),
                GrammarTip(title: "Chez (At Someone's Place)", explanation: "Special preposition meaning 'at the home/place of'", example: "Je suis chez moi = I'm at my place", category: .prepositions, frenchConcept: "chez", englishEquivalent: "at (someone's) place"),
            ]
        }
    }
}

// MARK: - Category Chip
struct GrammarCategoryChip: View {
    let category: GrammarCategory
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(category.emoji)
                    .font(.subheadline)
                Text(category.rawValue)
                    .font(.subheadline)
                    .fontWeight(isSelected ? .semibold : .regular)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? Color.purple : Color(.systemGray5))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(16)
        }
    }
}

// MARK: - Grammar Tip Card
struct GrammarTipCard: View {
    let tip: GrammarTip
    @State private var isExpanded = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text(tip.category.emoji)
                    .font(.title2)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(tip.title)
                        .font(.headline)
                    
                    Text(tip.frenchConcept)
                        .font(.caption)
                        .foregroundColor(.blue)
                }
                
                Spacer()
                
                Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                    .foregroundColor(.secondary)
            }
            .contentShape(Rectangle())
            .onTapGesture {
                withAnimation(.spring(response: 0.3)) {
                    isExpanded.toggle()
                }
            }
            
            if isExpanded {
                Divider()
                
                // Explanation
                Text(tip.explanation)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                // Example
                VStack(alignment: .leading, spacing: 4) {
                    Text("Example")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.secondary)
                    
                    Text(tip.example)
                        .font(.body)
                        .italic()
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.purple.opacity(0.1))
                        .cornerRadius(8)
                }
                
                // English equivalent
                HStack {
                    Text("English:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(tip.englishEquivalent)
                        .font(.caption)
                        .fontWeight(.medium)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    GrammarView()
}

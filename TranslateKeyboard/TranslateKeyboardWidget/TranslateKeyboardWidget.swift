import WidgetKit
import SwiftUI

// MARK: - Widget Entry
struct DailyWordEntry: TimelineEntry {
    let date: Date
    let word: WidgetWord
    let stats: WidgetStats
}

struct WidgetWord: Codable {
    let french: String
    let english: String
    let pronunciation: String
    let category: String
    let example: String
}

struct WidgetStats: Codable {
    let wordsLearned: Int
    let streak: Int
    let masteryPercentage: Int
}

// MARK: - Timeline Provider
struct DailyWordProvider: TimelineProvider {
    
    // Daily French words for the widget
    static let dailyWords: [WidgetWord] = [
        WidgetWord(french: "Bonjour", english: "Hello/Good day", pronunciation: "bohn-ZHOOR", category: "Greeting", example: "Bonjour, comment ça va?"),
        WidgetWord(french: "Merci", english: "Thank you", pronunciation: "mehr-SEE", category: "Essential", example: "Merci beaucoup!"),
        WidgetWord(french: "S'il vous plaît", english: "Please", pronunciation: "seel voo PLEH", category: "Essential", example: "Un café, s'il vous plaît"),
        WidgetWord(french: "Amour", english: "Love", pronunciation: "ah-MOOR", category: "Romantic", example: "Je t'aime, mon amour"),
        WidgetWord(french: "Bisou", english: "Kiss", pronunciation: "bee-ZOO", category: "Romantic", example: "Gros bisous!"),
        WidgetWord(french: "Magnifique", english: "Magnificent", pronunciation: "mah-nyee-FEEK", category: "Adjective", example: "C'est magnifique!"),
        WidgetWord(french: "Aujourd'hui", english: "Today", pronunciation: "oh-zhoor-DWEE", category: "Time", example: "Qu'est-ce que tu fais aujourd'hui?"),
        WidgetWord(french: "Bientôt", english: "Soon", pronunciation: "byehn-TOH", category: "Time", example: "À bientôt!"),
        WidgetWord(french: "Ensemble", english: "Together", pronunciation: "ahn-SAHM-bluh", category: "Romantic", example: "On est bien ensemble"),
        WidgetWord(french: "Toujours", english: "Always", pronunciation: "too-ZHOOR", category: "Adverb", example: "Je pense toujours à toi"),
        WidgetWord(french: "Jamais", english: "Never", pronunciation: "zhah-MEH", category: "Adverb", example: "Je ne t'oublierai jamais"),
        WidgetWord(french: "Peut-être", english: "Maybe", pronunciation: "puh-TETR", category: "Essential", example: "Peut-être demain?"),
        WidgetWord(french: "D'accord", english: "Okay/Agreed", pronunciation: "dah-KOR", category: "Essential", example: "D'accord, on fait ça!"),
        WidgetWord(french: "Génial", english: "Great/Awesome", pronunciation: "zhay-NYAL", category: "Emotion", example: "C'est génial!"),
        WidgetWord(french: "Incroyable", english: "Incredible", pronunciation: "an-kwah-YAH-bluh", category: "Adjective", example: "Tu es incroyable"),
        WidgetWord(french: "Heureux", english: "Happy", pronunciation: "uh-RUH", category: "Emotion", example: "Je suis heureux"),
        WidgetWord(french: "Triste", english: "Sad", pronunciation: "TREEST", category: "Emotion", example: "Pourquoi tu es triste?"),
        WidgetWord(french: "Fatigué", english: "Tired", pronunciation: "fah-tee-GAY", category: "Feeling", example: "Je suis fatigué"),
        WidgetWord(french: "Manger", english: "To eat", pronunciation: "mahn-ZHAY", category: "Verb", example: "On va manger?"),
        WidgetWord(french: "Dormir", english: "To sleep", pronunciation: "dor-MEER", category: "Verb", example: "Je vais dormir"),
        WidgetWord(french: "Parler", english: "To speak", pronunciation: "par-LAY", category: "Verb", example: "Tu parles français?"),
        WidgetWord(french: "Comprendre", english: "To understand", pronunciation: "kohm-PRAHNDR", category: "Verb", example: "Je comprends!"),
        WidgetWord(french: "Écouter", english: "To listen", pronunciation: "ay-koo-TAY", category: "Verb", example: "Écoute-moi"),
        WidgetWord(french: "Regarder", english: "To watch/look", pronunciation: "ruh-gar-DAY", category: "Verb", example: "Regarde ça!"),
        WidgetWord(french: "Penser", english: "To think", pronunciation: "pahn-SAY", category: "Verb", example: "Je pense à toi"),
        WidgetWord(french: "Rêver", english: "To dream", pronunciation: "reh-VAY", category: "Verb", example: "Je rêve de toi"),
        WidgetWord(french: "Sourire", english: "To smile", pronunciation: "soo-REER", category: "Verb", example: "Tu me fais sourire"),
        WidgetWord(french: "Cœur", english: "Heart", pronunciation: "KUR", category: "Romantic", example: "Mon cœur"),
        WidgetWord(french: "Étoile", english: "Star", pronunciation: "ay-TWAHL", category: "Romantic", example: "Tu es mon étoile"),
        WidgetWord(french: "Soleil", english: "Sun", pronunciation: "soh-LAY", category: "Nature", example: "Il fait soleil"),
    ]
    
    func placeholder(in context: Context) -> DailyWordEntry {
        DailyWordEntry(
            date: Date(),
            word: Self.dailyWords[0],
            stats: WidgetStats(wordsLearned: 42, streak: 7, masteryPercentage: 65)
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (DailyWordEntry) -> Void) {
        let entry = DailyWordEntry(
            date: Date(),
            word: getTodaysWord(),
            stats: loadStats()
        )
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<DailyWordEntry>) -> Void) {
        let currentDate = Date()
        let entry = DailyWordEntry(
            date: currentDate,
            word: getTodaysWord(),
            stats: loadStats()
        )
        
        // Update at midnight
        let calendar = Calendar.current
        let tomorrow = calendar.startOfDay(for: calendar.date(byAdding: .day, value: 1, to: currentDate)!)
        
        let timeline = Timeline(entries: [entry], policy: .after(tomorrow))
        completion(timeline)
    }
    
    private func getTodaysWord() -> WidgetWord {
        let calendar = Calendar.current
        let dayOfYear = calendar.ordinality(of: .day, in: .year, for: Date()) ?? 1
        let index = dayOfYear % Self.dailyWords.count
        return Self.dailyWords[index]
    }
    
    private func loadStats() -> WidgetStats {
        // Load from App Group UserDefaults
        let defaults = UserDefaults(suiteName: "group.com.translatekeyboard.app")
        let wordsLearned = defaults?.integer(forKey: "widgetWordsLearned") ?? 0
        let streak = defaults?.integer(forKey: "widgetStreak") ?? 0
        let mastery = defaults?.integer(forKey: "widgetMastery") ?? 0
        
        return WidgetStats(wordsLearned: wordsLearned, streak: streak, masteryPercentage: mastery)
    }
}

// MARK: - Widget Views

struct DailyWordWidgetEntryView: View {
    var entry: DailyWordProvider.Entry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        case .systemLarge:
            LargeWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

// MARK: - Small Widget
struct SmallWidgetView: View {
    let entry: DailyWordEntry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Text("🇫🇷")
                    .font(.title2)
                Text("Daily Word")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // French word
            Text(entry.word.french)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.primary)
            
            // English meaning
            Text(entry.word.english)
                .font(.caption)
                .foregroundColor(.secondary)
            
            // Pronunciation
            Text(entry.word.pronunciation)
                .font(.caption2)
                .foregroundColor(.blue)
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Medium Widget
struct MediumWidgetView: View {
    let entry: DailyWordEntry
    
    var body: some View {
        HStack(spacing: 16) {
            // Left side - Word
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("🇫🇷")
                        .font(.title2)
                    Text("Daily French")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Text(entry.word.french)
                    .font(.title)
                    .fontWeight(.bold)
                
                Text(entry.word.english)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Text(entry.word.pronunciation)
                    .font(.caption)
                    .foregroundColor(.blue)
            }
            
            Divider()
            
            // Right side - Example & Stats
            VStack(alignment: .leading, spacing: 8) {
                Text("Example")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(entry.word.example)
                    .font(.subheadline)
                    .italic()
                
                Spacer()
                
                HStack(spacing: 16) {
                    StatPill(value: "\(entry.stats.wordsLearned)", label: "words")
                    StatPill(value: "\(entry.stats.streak)", label: "streak")
                }
            }
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Large Widget
struct LargeWidgetView: View {
    let entry: DailyWordEntry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                Text("🇫🇷")
                    .font(.largeTitle)
                VStack(alignment: .leading) {
                    Text("Word of the Day")
                        .font(.headline)
                    Text(formattedDate)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                
                // Category badge
                Text(entry.word.category)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.blue.opacity(0.2))
                    .cornerRadius(8)
            }
            
            Divider()
            
            // Main word
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.word.french)
                    .font(.system(size: 36, weight: .bold))
                
                Text(entry.word.pronunciation)
                    .font(.title3)
                    .foregroundColor(.blue)
                
                Text(entry.word.english)
                    .font(.title3)
                    .foregroundColor(.secondary)
            }
            
            // Example
            VStack(alignment: .leading, spacing: 4) {
                Text("Example")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(""\(entry.word.example)"")
                    .font(.body)
                    .italic()
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
            
            Spacer()
            
            // Stats bar
            HStack(spacing: 24) {
                StatBlock(value: "\(entry.stats.wordsLearned)", label: "Words Learned", icon: "book.fill")
                StatBlock(value: "\(entry.stats.streak)🔥", label: "Day Streak", icon: "flame.fill")
                StatBlock(value: "\(entry.stats.masteryPercentage)%", label: "Mastery", icon: "star.fill")
            }
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
    
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMM d"
        return formatter.string(from: entry.date)
    }
}

// MARK: - Helper Views
struct StatPill: View {
    let value: String
    let label: String
    
    var body: some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.caption)
                .fontWeight(.bold)
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.blue.opacity(0.1))
        .cornerRadius(8)
    }
}

struct StatBlock: View {
    let value: String
    let label: String
    let icon: String
    
    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title3)
                .fontWeight(.bold)
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Widget Configuration
@main
struct TranslateKeyboardWidget: Widget {
    let kind: String = "DailyWordWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DailyWordProvider()) { entry in
            DailyWordWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Daily French Word")
        .description("Learn a new French word every day")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Preview
#Preview(as: .systemSmall) {
    TranslateKeyboardWidget()
} timeline: {
    DailyWordEntry(
        date: Date(),
        word: WidgetWord(
            french: "Bonjour",
            english: "Hello",
            pronunciation: "bohn-ZHOOR",
            category: "Greeting",
            example: "Bonjour, ça va?"
        ),
        stats: WidgetStats(wordsLearned: 42, streak: 7, masteryPercentage: 65)
    )
}

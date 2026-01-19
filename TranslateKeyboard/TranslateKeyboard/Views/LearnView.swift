import SwiftUI

struct LearnView: View {
    @StateObject private var settings = TranslationSettings.shared
    @StateObject private var learningService = LearningService.shared
    @State private var selectedTab = 0
    @State private var showingReviewCard: LearningCard?
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Stats header
                statsHeader
                
                // Tab picker
                Picker("View", selection: $selectedTab) {
                    Text("Conversation").tag(0)
                    Text("Vocabulary").tag(1)
                    Text("Review").tag(2)
                }
                .pickerStyle(.segmented)
                .padding()
                
                // Content
                TabView(selection: $selectedTab) {
                    conversationHistoryView.tag(0)
                    vocabularyListView.tag(1)
                    reviewView.tag(2)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .navigationTitle("Learn \(settings.targetLanguage.flag)")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button(role: .destructive) {
                            settings.clearLearningHistory()
                        } label: {
                            Label("Clear History", systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
    }
    
    // MARK: - Stats Header
    private var statsHeader: some View {
        let stats = learningService.getStatistics()
        
        return HStack(spacing: 20) {
            StatBadge(
                value: "\(stats.totalCards)",
                label: "Words",
                color: .blue
            )
            
            StatBadge(
                value: "\(stats.masteredCards)",
                label: "Mastered",
                color: .green
            )
            
            StatBadge(
                value: "\(Int(stats.masteryPercentage))%",
                label: "Progress",
                color: .purple
            )
            
            StatBadge(
                value: "\(stats.conversationCount)",
                label: "Exchanges",
                color: .orange
            )
        }
        .padding()
        .background(Color(.systemBackground))
    }
    
    // MARK: - Conversation History
    private var conversationHistoryView: some View {
        Group {
            if settings.conversationHistory.isEmpty {
                emptyStateView(
                    icon: "bubble.left.and.bubble.right",
                    title: "No Conversations Yet",
                    message: "Start chatting with the keyboard to see your conversation history here"
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(settings.conversationHistory) { exchange in
                            ConversationBubble(exchange: exchange)
                        }
                    }
                    .padding()
                }
            }
        }
    }
    
    // MARK: - Vocabulary List
    private var vocabularyListView: some View {
        Group {
            if settings.learningHistory.isEmpty {
                emptyStateView(
                    icon: "text.book.closed",
                    title: "No Words Saved",
                    message: "Words you translate will appear here for review"
                )
            } else {
                List {
                    ForEach(LearningConfidence.allCases, id: \.self) { confidence in
                        let cards = settings.learningHistory.filter { $0.confidence == confidence }
                        if !cards.isEmpty {
                            Section {
                                ForEach(cards) { card in
                                    VocabularyRow(card: card)
                                        .onTapGesture {
                                            showingReviewCard = card
                                        }
                                }
                            } header: {
                                HStack {
                                    Text(confidence.emoji)
                                    Text(confidence.rawValue.capitalized)
                                    Spacer()
                                    Text("\(cards.count)")
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
        .sheet(item: $showingReviewCard) { card in
            FlashcardView(card: card)
        }
    }
    
    // MARK: - Review View
    private var reviewView: some View {
        let cardsToReview = learningService.getCardsForReview()
        
        return Group {
            if cardsToReview.isEmpty {
                emptyStateView(
                    icon: "checkmark.circle",
                    title: "All Caught Up!",
                    message: "No cards due for review right now"
                )
            } else {
                VStack(spacing: 20) {
                    Text("\(cardsToReview.count) cards to review")
                        .font(.headline)
                        .foregroundColor(.secondary)
                    
                    if let firstCard = cardsToReview.first {
                        FlashcardView(card: firstCard, isReviewMode: true)
                    }
                }
                .padding()
            }
        }
    }
    
    // MARK: - Empty State
    private func emptyStateView(icon: String, title: String, message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 60))
                .foregroundColor(.secondary)
            
            Text(title)
                .font(.headline)
            
            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Supporting Views

struct StatBadge: View {
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct ConversationBubble: View {
    let exchange: ConversationExchange
    
    var body: some View {
        VStack(alignment: exchange.direction == .outgoing ? .trailing : .leading, spacing: 4) {
            // Direction label
            HStack(spacing: 4) {
                if exchange.direction == .incoming {
                    Image(systemName: "arrow.down.left")
                        .font(.caption2)
                    Text("They said")
                        .font(.caption2)
                } else {
                    Text("You said")
                        .font(.caption2)
                    Image(systemName: "arrow.up.right")
                        .font(.caption2)
                }
            }
            .foregroundColor(.secondary)
            
            // Original text
            Text(exchange.originalText)
                .font(.subheadline)
                .padding(12)
                .background(exchange.direction == .outgoing ? Color.blue : Color(.systemGray5))
                .foregroundColor(exchange.direction == .outgoing ? .white : .primary)
                .cornerRadius(16)
            
            // Translation
            Text(exchange.translatedText)
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.horizontal, 8)
            
            // Timestamp
            Text(exchange.timestamp, style: .relative)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: exchange.direction == .outgoing ? .trailing : .leading)
    }
}

struct VocabularyRow: View {
    let card: LearningCard
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(card.translatedText)
                    .font(.body)
                    .fontWeight(.medium)
                
                Text(card.originalText)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                if let pronunciation = card.pronunciation {
                    Text(pronunciation)
                        .font(.caption2)
                        .foregroundColor(.blue)
                }
            }
            
            Spacer()
            
            Text(card.confidence.emoji)
                .font(.title2)
        }
        .padding(.vertical, 4)
    }
}

struct FlashcardView: View {
    let card: LearningCard
    var isReviewMode: Bool = false
    
    @State private var isFlipped = false
    @StateObject private var learningService = LearningService.shared
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        VStack(spacing: 24) {
            // Card
            ZStack {
                // Front - Target language
                cardFace(
                    text: card.translatedText,
                    subtitle: card.pronunciation,
                    language: card.targetLanguage,
                    isVisible: !isFlipped
                )
                
                // Back - Source language
                cardFace(
                    text: card.originalText,
                    subtitle: "(\(card.targetLanguage.name))",
                    language: card.sourceLanguage,
                    isVisible: isFlipped
                )
                .rotation3DEffect(.degrees(180), axis: (x: 0, y: 1, z: 0))
            }
            .frame(height: 200)
            .rotation3DEffect(.degrees(isFlipped ? 180 : 0), axis: (x: 0, y: 1, z: 0))
            .animation(.spring(response: 0.5, dampingFraction: 0.8), value: isFlipped)
            .onTapGesture {
                isFlipped.toggle()
            }
            
            // Word breakdown
            if !card.wordBreakdown.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Word by Word")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(card.wordBreakdown) { pair in
                                VStack(spacing: 4) {
                                    Text(pair.translated)
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                    
                                    if let pos = pair.partOfSpeech {
                                        Text(pos.emoji)
                                            .font(.caption2)
                                    }
                                    
                                    Text(pair.original)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    
                                    if let pron = pair.pronunciation {
                                        Text(pron)
                                            .font(.caption2)
                                            .foregroundColor(.blue)
                                    }
                                }
                                .padding(8)
                                .background(Color(.systemGray6))
                                .cornerRadius(8)
                            }
                        }
                    }
                }
                .padding()
                .background(Color(.systemBackground))
                .cornerRadius(12)
            }
            
            // Review buttons
            if isReviewMode {
                HStack(spacing: 20) {
                    Button {
                        learningService.markCardReviewed(card, remembered: false)
                        dismiss()
                    } label: {
                        Label("Forgot", systemImage: "xmark.circle.fill")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.red.opacity(0.1))
                            .foregroundColor(.red)
                            .cornerRadius(12)
                    }
                    
                    Button {
                        learningService.markCardReviewed(card, remembered: true)
                        dismiss()
                    } label: {
                        Label("Got it!", systemImage: "checkmark.circle.fill")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.green.opacity(0.1))
                            .foregroundColor(.green)
                            .cornerRadius(12)
                    }
                }
            }
            
            Text("Tap card to flip")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
    }
    
    private func cardFace(text: String, subtitle: String?, language: Language, isVisible: Bool) -> some View {
        VStack(spacing: 12) {
            Text(language.flag)
                .font(.largeTitle)
            
            Text(text)
                .font(.title2)
                .fontWeight(.bold)
                .multilineTextAlignment(.center)
            
            if let subtitle = subtitle {
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 5)
        )
        .opacity(isVisible ? 1 : 0)
    }
}

#Preview {
    LearnView()
}

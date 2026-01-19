import SwiftUI

struct PhrasesView: View {
    @StateObject private var library = PhraseLibrary.shared
    @StateObject private var speechService = SpeechService.shared
    @StateObject private var settings = TranslationSettings.shared
    
    @State private var selectedCategory: PhraseCategory = .greetings
    @State private var searchText = ""
    @State private var copiedPhraseId: UUID?
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Category picker
                categoryPicker
                
                // Phrases list
                phrasesList
            }
            .navigationTitle("Quick Phrases 🇫🇷")
            .searchable(text: $searchText, prompt: "Search phrases...")
        }
    }
    
    // MARK: - Category Picker
    private var categoryPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(PhraseCategory.allCases, id: \.self) { category in
                    CategoryChip(
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
    }
    
    // MARK: - Phrases List
    private var phrasesList: some View {
        let filteredPhrases = searchText.isEmpty 
            ? library.phrases(for: selectedCategory)
            : library.search(query: searchText)
        
        return List {
            if !library.favoritePhrases.isEmpty && searchText.isEmpty {
                Section("Favorites") {
                    ForEach(library.favoritePhrases) { phrase in
                        PhraseRow(
                            phrase: phrase,
                            isCopied: copiedPhraseId == phrase.id,
                            onSpeak: { speakPhrase(phrase) },
                            onCopy: { copyPhrase(phrase) },
                            onFavorite: { library.toggleFavorite(phrase) }
                        )
                    }
                }
            }
            
            Section(searchText.isEmpty ? selectedCategory.displayName : "Results") {
                ForEach(filteredPhrases) { phrase in
                    PhraseRow(
                        phrase: phrase,
                        isCopied: copiedPhraseId == phrase.id,
                        onSpeak: { speakPhrase(phrase) },
                        onCopy: { copyPhrase(phrase) },
                        onFavorite: { library.toggleFavorite(phrase) }
                    )
                }
            }
        }
        .listStyle(.insetGrouped)
    }
    
    // MARK: - Actions
    private func speakPhrase(_ phrase: QuickPhrase) {
        speechService.speak(
            text: phrase.translatedText,
            language: settings.targetLanguage
        )
    }
    
    private func copyPhrase(_ phrase: QuickPhrase) {
        UIPasteboard.general.string = phrase.translatedText
        library.markAsUsed(phrase)
        
        withAnimation {
            copiedPhraseId = phrase.id
        }
        
        // Reset after 2 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            if copiedPhraseId == phrase.id {
                withAnimation {
                    copiedPhraseId = nil
                }
            }
        }
        
        // Haptic feedback
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
    }
}

// MARK: - Category Chip
struct CategoryChip: View {
    let category: PhraseCategory
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(category.emoji)
                    .font(.subheadline)
                Text(category.displayName)
                    .font(.subheadline)
                    .fontWeight(isSelected ? .semibold : .regular)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(isSelected ? Color.blue : Color(.systemGray5))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(20)
        }
    }
}

// MARK: - Phrase Row
struct PhraseRow: View {
    let phrase: QuickPhrase
    let isCopied: Bool
    let onSpeak: () -> Void
    let onCopy: () -> Void
    let onFavorite: () -> Void
    
    @StateObject private var speechService = SpeechService.shared
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // French text (what you'll send)
            HStack {
                Text(phrase.translatedText)
                    .font(.body)
                    .fontWeight(.medium)
                
                Spacer()
                
                // Speak button
                Button(action: onSpeak) {
                    Image(systemName: speechService.isSpeaking ? "speaker.wave.3.fill" : "speaker.wave.2")
                        .foregroundColor(.blue)
                        .font(.title3)
                }
                .buttonStyle(.plain)
            }
            
            // Pronunciation
            if let pronunciation = phrase.pronunciation {
                Text(pronunciation)
                    .font(.caption)
                    .foregroundColor(.blue)
                    .italic()
            }
            
            // English meaning
            Text(phrase.originalText)
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            // Context hint
            if let context = phrase.context {
                Text("💡 \(context)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .padding(.top, 2)
            }
            
            // Action buttons
            HStack(spacing: 16) {
                // Copy button
                Button(action: onCopy) {
                    HStack(spacing: 4) {
                        Image(systemName: isCopied ? "checkmark" : "doc.on.doc")
                        Text(isCopied ? "Copied!" : "Copy")
                    }
                    .font(.caption)
                    .foregroundColor(isCopied ? .green : .blue)
                }
                .buttonStyle(.plain)
                
                // Favorite button
                Button(action: onFavorite) {
                    HStack(spacing: 4) {
                        Image(systemName: phrase.isFavorite ? "heart.fill" : "heart")
                        Text(phrase.isFavorite ? "Saved" : "Save")
                    }
                    .font(.caption)
                    .foregroundColor(phrase.isFavorite ? .red : .secondary)
                }
                .buttonStyle(.plain)
                
                Spacer()
                
                // Use count
                if phrase.useCount > 0 {
                    Text("Used \(phrase.useCount)x")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.top, 4)
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    PhrasesView()
}

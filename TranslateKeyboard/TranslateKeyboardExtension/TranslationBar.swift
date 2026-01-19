import SwiftUI

/// Translation suggestion bar that appears above the keyboard
struct TranslationBar: View {
    let originalText: String
    let translatedText: String
    let sourceLanguage: Language
    let targetLanguage: Language
    let onInsert: () -> Void
    let onCopy: () -> Void
    
    @State private var showOriginal = false
    
    var body: some View {
        HStack(spacing: 12) {
            // Language pair indicator
            languagePairBadge
            
            // Translation content
            VStack(alignment: .leading, spacing: 2) {
                if showOriginal && !originalText.isEmpty {
                    Text(originalText)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
                
                if !translatedText.isEmpty {
                    Text(translatedText)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(2)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .onTapGesture {
                showOriginal.toggle()
            }
            
            // Action buttons
            if !translatedText.isEmpty {
                actionButtons
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color(.secondarySystemBackground))
    }
    
    // MARK: - Language Pair Badge
    private var languagePairBadge: some View {
        HStack(spacing: 4) {
            Text(sourceLanguage.flag)
                .font(.system(size: 16))
            
            Image(systemName: "arrow.right")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.secondary)
            
            Text(targetLanguage.flag)
                .font(.system(size: 16))
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color(.tertiarySystemBackground))
        .cornerRadius(8)
    }
    
    // MARK: - Action Buttons
    private var actionButtons: some View {
        HStack(spacing: 8) {
            // Copy button
            Button(action: onCopy) {
                Image(systemName: "doc.on.doc")
                    .font(.system(size: 16))
                    .foregroundColor(.secondary)
            }
            
            // Insert button
            Button(action: onInsert) {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 24))
                    .foregroundColor(.blue)
            }
        }
    }
}

/// Compact translation suggestion for inline display
struct TranslationSuggestion: View {
    let text: String
    let language: Language
    let onSelect: () -> Void
    
    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 6) {
                Text(language.flag)
                    .font(.caption)
                
                Text(text)
                    .font(.subheadline)
                    .foregroundColor(.primary)
                    .lineLimit(1)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Color(.tertiarySystemBackground))
            .cornerRadius(16)
        }
    }
}

/// Multiple translation suggestions row
struct TranslationSuggestionsRow: View {
    let suggestions: [(text: String, language: Language)]
    let onSelect: (String) -> Void
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(suggestions.indices, id: \.self) { index in
                    TranslationSuggestion(
                        text: suggestions[index].text,
                        language: suggestions[index].language
                    ) {
                        onSelect(suggestions[index].text)
                    }
                }
            }
            .padding(.horizontal, 8)
        }
        .frame(height: 36)
    }
}

// MARK: - Preview
struct TranslationBar_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 20) {
            TranslationBar(
                originalText: "Hello, how are you?",
                translatedText: "Hola, ¿cómo estás?",
                sourceLanguage: .english,
                targetLanguage: .spanish,
                onInsert: {},
                onCopy: {}
            )
            
            TranslationSuggestionsRow(
                suggestions: [
                    ("Hola", .spanish),
                    ("Bonjour", .french),
                    ("Hallo", .german)
                ],
                onSelect: { _ in }
            )
        }
        .background(Color(.systemBackground))
    }
}

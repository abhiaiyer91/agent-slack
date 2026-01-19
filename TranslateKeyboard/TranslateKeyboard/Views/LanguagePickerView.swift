import SwiftUI

struct LanguagePickerView: View {
    @Binding var selectedLanguage: Language
    let title: String
    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""
    
    private var filteredLanguages: [Language] {
        if searchText.isEmpty {
            return Language.allLanguages
        }
        return Language.allLanguages.filter { language in
            language.name.localizedCaseInsensitiveContains(searchText) ||
            language.code.localizedCaseInsensitiveContains(searchText) ||
            language.nativeName.localizedCaseInsensitiveContains(searchText)
        }
    }
    
    private var recentLanguages: [Language] {
        TranslationSettings.shared.recentLanguages
    }
    
    var body: some View {
        NavigationStack {
            List {
                // Recent Languages
                if searchText.isEmpty && !recentLanguages.isEmpty {
                    Section("Recent") {
                        ForEach(recentLanguages) { language in
                            languageRow(language)
                        }
                    }
                }
                
                // All Languages
                Section(searchText.isEmpty ? "All Languages" : "Results") {
                    ForEach(filteredLanguages) { language in
                        languageRow(language)
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search languages")
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private func languageRow(_ language: Language) -> some View {
        Button {
            selectedLanguage = language
            TranslationSettings.shared.addRecentLanguage(language)
            dismiss()
        } label: {
            HStack(spacing: 12) {
                Text(language.flag)
                    .font(.title2)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(language.name)
                        .font(.body)
                        .foregroundColor(.primary)
                    
                    if language.nativeName != language.name {
                        Text(language.nativeName)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                if selectedLanguage == language {
                    Image(systemName: "checkmark")
                        .foregroundColor(.blue)
                        .fontWeight(.semibold)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    LanguagePickerView(
        selectedLanguage: .constant(.english),
        title: "Select Language"
    )
}

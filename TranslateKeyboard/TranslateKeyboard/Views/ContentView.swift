import SwiftUI

struct ContentView: View {
    @StateObject private var settings = TranslationSettings.shared
    @State private var showingLanguagePicker = false
    @State private var isSelectingSource = true
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    headerSection
                    
                    // Setup Instructions
                    setupInstructionsCard
                    
                    // Language Settings
                    languageSettingsCard
                    
                    // Translation Mode
                    translationModeCard
                    
                    // Quick Test
                    quickTestSection
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("TranslateKeyboard")
            .sheet(isPresented: $showingLanguagePicker) {
                LanguagePickerView(
                    selectedLanguage: isSelectingSource ? $settings.sourceLanguage : $settings.targetLanguage,
                    title: isSelectingSource ? "Source Language" : "Target Language"
                )
            }
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: 12) {
            Image(systemName: "keyboard.fill")
                .font(.system(size: 60))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.blue, .purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            
            Text("Auto-Translate Keyboard")
                .font(.title2)
                .fontWeight(.bold)
            
            Text("Type in one language, send in another")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(.vertical)
    }
    
    // MARK: - Setup Instructions
    private var setupInstructionsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("Setup Instructions", systemImage: "gearshape.2.fill")
                .font(.headline)
                .foregroundColor(.primary)
            
            VStack(alignment: .leading, spacing: 12) {
                SetupStepView(number: 1, text: "Open Settings app")
                SetupStepView(number: 2, text: "Go to General → Keyboard → Keyboards")
                SetupStepView(number: 3, text: "Tap 'Add New Keyboard...'")
                SetupStepView(number: 4, text: "Select 'TranslateKeyboard'")
                SetupStepView(number: 5, text: "Enable 'Allow Full Access' for translation")
            }
            
            Button(action: openSettings) {
                HStack {
                    Image(systemName: "arrow.up.forward.app.fill")
                    Text("Open Settings")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 5)
    }
    
    // MARK: - Language Settings
    private var languageSettingsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("Language Settings", systemImage: "globe")
                .font(.headline)
                .foregroundColor(.primary)
            
            HStack(spacing: 12) {
                // Source Language
                LanguageButton(
                    title: "From",
                    language: settings.sourceLanguage,
                    color: .blue
                ) {
                    isSelectingSource = true
                    showingLanguagePicker = true
                }
                
                // Swap Button
                Button(action: swapLanguages) {
                    Image(systemName: "arrow.left.arrow.right")
                        .font(.title2)
                        .foregroundColor(.blue)
                        .padding(12)
                        .background(Color.blue.opacity(0.1))
                        .clipShape(Circle())
                }
                
                // Target Language
                LanguageButton(
                    title: "To",
                    language: settings.targetLanguage,
                    color: .purple
                ) {
                    isSelectingSource = false
                    showingLanguagePicker = true
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 5)
    }
    
    // MARK: - Translation Mode
    private var translationModeCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("Translation Mode", systemImage: "wand.and.stars")
                .font(.headline)
                .foregroundColor(.primary)
            
            Toggle(isOn: $settings.autoTranslateEnabled) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Auto-Translate")
                        .font(.body)
                    Text("Automatically translate as you type")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .tint(.blue)
            
            Toggle(isOn: $settings.showOriginalText) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Show Original")
                        .font(.body)
                    Text("Display original text above translation")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .tint(.blue)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 5)
    }
    
    // MARK: - Quick Test
    private var quickTestSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("Quick Test", systemImage: "text.bubble.fill")
                .font(.headline)
                .foregroundColor(.primary)
            
            Text("Try typing something below to test the keyboard:")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            TextField("Type here to test...", text: .constant(""))
                .textFieldStyle(.roundedBorder)
                .padding(.vertical, 8)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 5)
    }
    
    // MARK: - Actions
    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
    
    private func swapLanguages() {
        let temp = settings.sourceLanguage
        settings.sourceLanguage = settings.targetLanguage
        settings.targetLanguage = temp
    }
}

// MARK: - Supporting Views
struct SetupStepView: View {
    let number: Int
    let text: String
    
    var body: some View {
        HStack(spacing: 12) {
            Text("\(number)")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .frame(width: 24, height: 24)
                .background(Color.blue)
                .clipShape(Circle())
            
            Text(text)
                .font(.subheadline)
                .foregroundColor(.primary)
        }
    }
}

struct LanguageButton: View {
    let title: String
    let language: Language
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(language.flag)
                    .font(.largeTitle)
                
                Text(language.name)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(color.opacity(0.1))
            .cornerRadius(12)
        }
    }
}

#Preview {
    ContentView()
}

import SwiftUI

struct SettingsView: View {
    @StateObject private var settings = TranslationSettings.shared
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            List {
                // Translation Settings Section
                Section {
                    Toggle("Auto-Translate", isOn: $settings.autoTranslateEnabled)
                    Toggle("Show Original Text", isOn: $settings.showOriginalText)
                    Toggle("Haptic Feedback", isOn: $settings.hapticFeedbackEnabled)
                } header: {
                    Text("Translation")
                } footer: {
                    Text("Auto-translate will translate your text as you type. Enable 'Show Original' to see both versions.")
                }
                
                // Appearance Section
                Section("Appearance") {
                    Picker("Keyboard Style", selection: $settings.keyboardStyle) {
                        Text("Light").tag(KeyboardStyle.light)
                        Text("Dark").tag(KeyboardStyle.dark)
                        Text("System").tag(KeyboardStyle.system)
                    }
                    
                    Toggle("Show Translation Preview", isOn: $settings.showTranslationPreview)
                }
                
                // API Settings Section
                Section {
                    Picker("Translation Provider", selection: $settings.translationProvider) {
                        Text("Apple Translate").tag(TranslationProvider.apple)
                        Text("Google Translate").tag(TranslationProvider.google)
                        Text("DeepL").tag(TranslationProvider.deepL)
                    }
                    
                    if settings.translationProvider != .apple {
                        SecureField("API Key", text: $settings.apiKey)
                    }
                } header: {
                    Text("Translation Provider")
                } footer: {
                    if settings.translationProvider == .apple {
                        Text("Apple Translate uses on-device translation when available.")
                    } else {
                        Text("Enter your API key to use this translation service.")
                    }
                }
                
                // About Section
                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }
                    
                    Link(destination: URL(string: "https://github.com")!) {
                        HStack {
                            Text("Source Code")
                            Spacer()
                            Image(systemName: "arrow.up.right.square")
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Link(destination: URL(string: "https://github.com")!) {
                        HStack {
                            Text("Privacy Policy")
                            Spacer()
                            Image(systemName: "arrow.up.right.square")
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                // Reset Section
                Section {
                    Button("Reset to Defaults", role: .destructive) {
                        settings.resetToDefaults()
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    SettingsView()
}

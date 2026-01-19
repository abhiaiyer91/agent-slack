import SwiftUI

struct ContentView: View {
    @StateObject private var settings = TranslationSettings.shared
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "keyboard")
                }
                .tag(0)
            
            PhrasesView()
                .tabItem {
                    Label("Phrases", systemImage: "text.bubble.fill")
                }
                .tag(1)
            
            LearnView()
                .tabItem {
                    Label("Learn", systemImage: "book.fill")
                }
                .tag(2)
            
            ToolsView()
                .tabItem {
                    Label("Tools", systemImage: "wrench.and.screwdriver.fill")
                }
                .tag(3)
            
            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag(4)
        }
    }
}

// MARK: - Tools View (Grammar, Import, Accent Practice)
struct ToolsView: View {
    var body: some View {
        NavigationStack {
            List {
                // Grammar Section
                Section {
                    NavigationLink {
                        GrammarView()
                    } label: {
                        ToolRow(
                            icon: "book.fill",
                            iconColor: .purple,
                            title: "Grammar Guide",
                            subtitle: "Learn French grammar rules"
                        )
                    }
                } header: {
                    Text("Learn")
                }
                
                // Practice Section
                Section {
                    NavigationLink {
                        AccentPracticeView()
                    } label: {
                        ToolRow(
                            icon: "waveform.circle.fill",
                            iconColor: .orange,
                            title: "Accent Practice",
                            subtitle: "Record and compare your pronunciation"
                        )
                    }
                } header: {
                    Text("Practice")
                }
                
                // Import Section
                Section {
                    NavigationLink {
                        ConversationImportView()
                    } label: {
                        ToolRow(
                            icon: "doc.text.magnifyingglass",
                            iconColor: .blue,
                            title: "Import Conversation",
                            subtitle: "Analyze pasted chat messages"
                        )
                    }
                } header: {
                    Text("Import")
                }
                
                // Sync Section
                Section {
                    NavigationLink {
                        CloudSyncView()
                    } label: {
                        ToolRow(
                            icon: "icloud.fill",
                            iconColor: .cyan,
                            title: "iCloud Sync",
                            subtitle: "Sync learning across devices"
                        )
                    }
                } header: {
                    Text("Sync")
                }
            }
            .navigationTitle("Tools")
        }
    }
}

// MARK: - Tool Row
struct ToolRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    let subtitle: String
    
    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.white)
                .frame(width: 44, height: 44)
                .background(iconColor)
                .cornerRadius(10)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.body)
                    .fontWeight(.medium)
                
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Cloud Sync View
struct CloudSyncView: View {
    @StateObject private var syncService = CloudSyncService.shared
    
    var body: some View {
        List {
            // Status Section
            Section {
                HStack {
                    Image(systemName: syncService.syncStatus.icon)
                        .font(.title2)
                        .foregroundColor(statusColor)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("iCloud Status")
                            .font(.body)
                        Text(syncService.syncStatus.rawValue)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    if syncService.isSyncing {
                        ProgressView()
                    }
                }
                
                if let lastSync = syncService.lastSyncDate {
                    HStack {
                        Text("Last Synced")
                        Spacer()
                        Text(lastSync, style: .relative)
                            .foregroundColor(.secondary)
                    }
                }
                
                if let error = syncService.syncError {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.orange)
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            } header: {
                Text("Status")
            }
            
            // Actions Section
            Section {
                Button {
                    Task {
                        await syncService.performFullSync()
                    }
                } label: {
                    HStack {
                        Image(systemName: "arrow.triangle.2.circlepath")
                        Text("Sync Now")
                    }
                }
                .disabled(syncService.syncStatus != .available || syncService.isSyncing)
            } header: {
                Text("Actions")
            }
            
            // Info Section
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("What Gets Synced")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    ForEach(["Learning cards & progress", "Conversation history", "Favorite phrases", "Settings"], id: \.self) { item in
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                                .font(.caption)
                            Text(item)
                                .font(.caption)
                        }
                    }
                }
                .padding(.vertical, 4)
            } header: {
                Text("Information")
            }
        }
        .navigationTitle("iCloud Sync")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private var statusColor: Color {
        switch syncService.syncStatus {
        case .available: return .green
        case .noAccount, .restricted: return .red
        case .temporarilyUnavailable: return .orange
        case .unknown: return .gray
        }
    }
}

// MARK: - Home View (Setup & Languages)
struct HomeView: View {
    @StateObject private var settings = TranslationSettings.shared
    @State private var showingLanguagePicker = false
    @State private var isSelectingSource = true
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    headerSection
                    
                    // Learning Mode Quick Toggle
                    learningModeCard
                    
                    // Setup Instructions
                    setupInstructionsCard
                    
                    // Language Settings
                    languageSettingsCard
                    
                    // How It Works for Your Use Case
                    useCaseExplanationCard
                    
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
            HStack(spacing: 8) {
                Text(settings.sourceLanguage.flag)
                    .font(.system(size: 40))
                
                Image(systemName: "arrow.left.arrow.right")
                    .font(.title2)
                    .foregroundColor(.blue)
                
                Text(settings.targetLanguage.flag)
                    .font(.system(size: 40))
            }
            
            Text("Learn \(settings.targetLanguage.name) While Chatting")
                .font(.title2)
                .fontWeight(.bold)
            
            Text("Type, translate, and learn simultaneously")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(.vertical)
    }
    
    // MARK: - Learning Mode Card
    private var learningModeCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("Learning Mode", systemImage: "graduationcap.fill")
                .font(.headline)
                .foregroundColor(.primary)
            
            Picker("Mode", selection: $settings.learningMode) {
                ForEach(LearningMode.allCases, id: \.self) { mode in
                    Text(mode.displayName).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            
            Text(settings.learningMode.description)
                .font(.caption)
                .foregroundColor(.secondary)
            
            if settings.learningMode != .off {
                Toggle("Show Pronunciation", isOn: $settings.showPronunciation)
                    .font(.subheadline)
                
                Toggle("Show Word Breakdown", isOn: $settings.showWordBreakdown)
                    .font(.subheadline)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 5)
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
            HStack {
                Label("Language Settings", systemImage: "globe")
                    .font(.headline)
                    .foregroundColor(.primary)
                
                Spacer()
                
                // Apple Translation status badge
                if #available(iOS 17.4, *) {
                    TranslationStatusBadge(
                        sourceLanguage: settings.sourceLanguage,
                        targetLanguage: settings.targetLanguage
                    )
                }
            }
            
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
            
            // Language download view (iOS 17.4+)
            if #available(iOS 17.4, *) {
                LanguageDownloadView()
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 5)
    }
    
    // MARK: - Use Case Explanation
    private var useCaseExplanationCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("How to Use", systemImage: "lightbulb.fill")
                .font(.headline)
                .foregroundColor(.orange)
            
            VStack(alignment: .leading, spacing: 12) {
                UseCaseRow(
                    emoji: "✍️",
                    title: "When You're Typing",
                    description: "Type in \(settings.sourceLanguage.name), see the \(settings.targetLanguage.name) translation above the keyboard. Tap the blue arrow to send the translation."
                )
                
                UseCaseRow(
                    emoji: "📖",
                    title: "Learn While Typing",
                    description: "See word-by-word breakdown with pronunciation hints. Each word you type helps you learn!"
                )
                
                UseCaseRow(
                    emoji: "📋",
                    title: "When They Reply",
                    description: "Copy their \(settings.targetLanguage.name) message, tap the language toggle in the keyboard, then paste to see the \(settings.sourceLanguage.name) translation."
                )
                
                UseCaseRow(
                    emoji: "📚",
                    title: "Review Later",
                    description: "All your translations are saved. Review them in the Learn tab to reinforce what you've learned!"
                )
            }
        }
        .padding()
        .background(Color.orange.opacity(0.1))
        .cornerRadius(16)
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
    
    // MARK: - Use Case Row
    struct UseCaseRow: View {
        let emoji: String
        let title: String
        let description: String
        
        var body: some View {
            HStack(alignment: .top, spacing: 12) {
                Text(emoji)
                    .font(.title2)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
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

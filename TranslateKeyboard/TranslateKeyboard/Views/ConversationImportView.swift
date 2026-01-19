import SwiftUI

struct ConversationImportView: View {
    @StateObject private var importService = ConversationImportService.shared
    @StateObject private var settings = TranslationSettings.shared
    
    @State private var inputText = ""
    @State private var showingAnalysis = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Instructions
                    instructionsCard
                    
                    // Input area
                    inputCard
                    
                    // Analyze button
                    if !inputText.isEmpty {
                        analyzeButton
                    }
                    
                    // Quick paste
                    pasteButton
                }
                .padding()
            }
            .navigationTitle("Import Conversation")
            .sheet(isPresented: $showingAnalysis) {
                if let analysis = importService.lastAnalysis {
                    ConversationAnalysisView(analysis: analysis)
                }
            }
        }
    }
    
    // MARK: - Instructions
    private var instructionsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("How It Works", systemImage: "lightbulb.fill")
                .font(.headline)
                .foregroundColor(.orange)
            
            VStack(alignment: .leading, spacing: 8) {
                InstructionRow(number: 1, text: "Copy your conversation from Messages, WhatsApp, etc.")
                InstructionRow(number: 2, text: "Paste it below (French messages will be detected)")
                InstructionRow(number: 3, text: "We'll analyze vocabulary, grammar, and translate everything")
                InstructionRow(number: 4, text: "Save words to your learning deck")
            }
        }
        .padding()
        .background(Color.orange.opacity(0.1))
        .cornerRadius(16)
    }
    
    // MARK: - Input Card
    private var inputCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Paste Conversation", systemImage: "doc.on.clipboard")
                .font(.headline)
            
            TextEditor(text: $inputText)
                .frame(minHeight: 200)
                .padding(8)
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .overlay(
                    Group {
                        if inputText.isEmpty {
                            Text("Paste your conversation here...\n\nExample:\nSalut! Ça va?\nHey! I'm good, you?\nOui ça va bien, merci!")
                                .foregroundColor(.secondary)
                                .padding(12)
                        }
                    },
                    alignment: .topLeading
                )
            
            // Character count
            Text("\(inputText.count) characters")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10)
    }
    
    // MARK: - Analyze Button
    private var analyzeButton: some View {
        Button {
            Task {
                _ = await importService.analyzeConversation(inputText)
                showingAnalysis = true
            }
        } label: {
            HStack {
                if importService.isAnalyzing {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Image(systemName: "wand.and.stars")
                }
                Text(importService.isAnalyzing ? "Analyzing..." : "Analyze Conversation")
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.purple)
            .foregroundColor(.white)
            .cornerRadius(12)
        }
        .disabled(importService.isAnalyzing)
    }
    
    // MARK: - Paste Button
    private var pasteButton: some View {
        Button {
            if let clipboard = UIPasteboard.general.string {
                inputText = clipboard
            }
        } label: {
            HStack {
                Image(systemName: "doc.on.clipboard")
                Text("Paste from Clipboard")
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color(.systemGray5))
            .foregroundColor(.primary)
            .cornerRadius(12)
        }
    }
}

// MARK: - Instruction Row
struct InstructionRow: View {
    let number: Int
    let text: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number)")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .frame(width: 20, height: 20)
                .background(Color.orange)
                .clipShape(Circle())
            
            Text(text)
                .font(.subheadline)
        }
    }
}

// MARK: - Analysis View
struct ConversationAnalysisView: View {
    let analysis: ConversationAnalysis
    @StateObject private var importService = ConversationImportService.shared
    @Environment(\.dismiss) private var dismiss
    
    @State private var selectedTab = 0
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Stats header
                statsHeader
                
                // Tab picker
                Picker("View", selection: $selectedTab) {
                    Text("Messages").tag(0)
                    Text("Vocabulary").tag(1)
                    Text("Grammar").tag(2)
                }
                .pickerStyle(.segmented)
                .padding()
                
                // Content
                TabView(selection: $selectedTab) {
                    messagesView.tag(0)
                    vocabularyView.tag(1)
                    grammarTipsView.tag(2)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .navigationTitle("Analysis")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") { dismiss() }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save All") {
                        importService.saveAnalysisToLearning(analysis)
                        dismiss()
                    }
                }
            }
        }
    }
    
    // MARK: - Stats Header
    private var statsHeader: some View {
        HStack(spacing: 20) {
            AnalysisStatBadge(value: "\(analysis.totalMessages)", label: "Messages", color: .blue)
            AnalysisStatBadge(value: "\(analysis.theirMessages)", label: "Theirs 🇫🇷", color: .purple)
            AnalysisStatBadge(value: "\(analysis.vocabularyToLearn.count)", label: "New Words", color: .green)
            AnalysisStatBadge(value: "\(analysis.grammarTips.count)", label: "Grammar", color: .orange)
        }
        .padding()
        .background(Color(.systemBackground))
    }
    
    // MARK: - Messages View
    private var messagesView: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(analysis.messages) { message in
                    AnalyzedMessageBubble(message: message)
                }
            }
            .padding()
        }
    }
    
    // MARK: - Vocabulary View
    private var vocabularyView: some View {
        Group {
            if analysis.vocabularyToLearn.isEmpty {
                emptyStateView(
                    icon: "text.book.closed",
                    title: "No New Vocabulary",
                    message: "No new words found in this conversation"
                )
            } else {
                List {
                    Section("Common Words") {
                        ForEach(analysis.commonWords.prefix(10)) { word in
                            HStack {
                                Text(word.word)
                                    .font(.body)
                                    .fontWeight(.medium)
                                
                                Spacer()
                                
                                Text("×\(word.count)")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color(.systemGray5))
                                    .cornerRadius(8)
                            }
                        }
                    }
                    
                    Section("Words to Learn") {
                        ForEach(analysis.vocabularyToLearn) { item in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(item.french)
                                    .font(.body)
                                    .fontWeight(.medium)
                                
                                Text(""\(item.context)"")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                    .lineLimit(1)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
    }
    
    // MARK: - Grammar Tips View
    private var grammarTipsView: some View {
        Group {
            if analysis.grammarTips.isEmpty {
                emptyStateView(
                    icon: "book",
                    title: "No Grammar Tips",
                    message: "No notable grammar patterns found"
                )
            } else {
                List {
                    ForEach(analysis.grammarTips) { tip in
                        GrammarTipCard(tip: tip)
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
    }
    
    // MARK: - Empty State
    private func emptyStateView(icon: String, title: String, message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 50))
                .foregroundColor(.secondary)
            
            Text(title)
                .font(.headline)
            
            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Analysis Stat Badge
struct AnalysisStatBadge: View {
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

// MARK: - Analyzed Message Bubble
struct AnalyzedMessageBubble: View {
    let message: AnalyzedMessage
    
    var body: some View {
        VStack(alignment: message.isFromThem ? .leading : .trailing, spacing: 8) {
            // Direction label
            HStack(spacing: 4) {
                if message.isFromThem {
                    Text("🇫🇷")
                    Text("They said")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                } else {
                    Text("You said")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text("🇺🇸")
                }
            }
            
            // Original text
            Text(message.originalText)
                .font(.body)
                .padding(12)
                .background(message.isFromThem ? Color(.systemGray5) : Color.blue)
                .foregroundColor(message.isFromThem ? .primary : .white)
                .cornerRadius(16)
            
            // Translation
            Text(message.translation)
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.horizontal, 8)
        }
        .frame(maxWidth: .infinity, alignment: message.isFromThem ? .leading : .trailing)
    }
}

#Preview {
    ConversationImportView()
}

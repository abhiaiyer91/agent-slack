import SwiftUI

struct AccentPracticeView: View {
    @StateObject private var practiceService = AccentPracticeService.shared
    @StateObject private var phraseLibrary = PhraseLibrary.shared
    
    @State private var selectedPhrase: QuickPhrase?
    @State private var customText = ""
    @State private var showingPermissionAlert = false
    @State private var hasRequestedPermissions = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    headerCard
                    
                    // Phrase selector or custom input
                    phraseInputCard
                    
                    // Practice area
                    if let phrase = selectedPhrase {
                        practiceCard(for: phrase.translatedText)
                    } else if !customText.isEmpty {
                        practiceCard(for: customText)
                    }
                    
                    // Results
                    if let score = practiceService.pronunciationScore {
                        resultsCard(score: score)
                    }
                }
                .padding()
            }
            .navigationTitle("Accent Practice")
            .onAppear {
                if !hasRequestedPermissions {
                    requestPermissions()
                }
            }
            .alert("Permissions Required", isPresented: $showingPermissionAlert) {
                Button("Open Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Microphone and Speech Recognition access are required for accent practice. Please enable them in Settings.")
            }
        }
    }
    
    // MARK: - Header Card
    private var headerCard: some View {
        VStack(spacing: 12) {
            Image(systemName: "waveform.circle.fill")
                .font(.system(size: 50))
                .foregroundColor(.purple)
            
            Text("Practice Your French Accent")
                .font(.title2)
                .fontWeight(.bold)
            
            Text("Listen to native pronunciation, record yourself, and get instant feedback")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
    
    // MARK: - Phrase Input Card
    private var phraseInputCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("Choose What to Practice", systemImage: "text.bubble")
                .font(.headline)
            
            // Quick phrase buttons
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(phraseLibrary.phrases.prefix(8)) { phrase in
                        PracticePhrasePill(
                            phrase: phrase,
                            isSelected: selectedPhrase?.id == phrase.id
                        ) {
                            selectedPhrase = phrase
                            customText = ""
                            practiceService.deleteRecording()
                        }
                    }
                }
            }
            
            // Or custom input
            VStack(alignment: .leading, spacing: 8) {
                Text("Or type custom French text:")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                TextField("Type French text to practice...", text: $customText)
                    .textFieldStyle(.roundedBorder)
                    .onChange(of: customText) { _, newValue in
                        if !newValue.isEmpty {
                            selectedPhrase = nil
                            practiceService.deleteRecording()
                        }
                    }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10)
    }
    
    // MARK: - Practice Card
    private func practiceCard(for text: String) -> some View {
        VStack(spacing: 20) {
            // Text to practice
            VStack(spacing: 8) {
                Text("Practice saying:")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(text)
                    .font(.title2)
                    .fontWeight(.medium)
                    .multilineTextAlignment(.center)
                
                if let phrase = selectedPhrase, let pronunciation = phrase.pronunciation {
                    Text(pronunciation)
                        .font(.subheadline)
                        .foregroundColor(.blue)
                        .italic()
                }
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(Color(.systemGray6))
            .cornerRadius(12)
            
            // Control buttons
            HStack(spacing: 24) {
                // Listen to native
                VStack {
                    Button {
                        practiceService.playNativePronunciation(text: text)
                    } label: {
                        Image(systemName: "speaker.wave.3.fill")
                            .font(.title)
                            .foregroundColor(.white)
                            .frame(width: 60, height: 60)
                            .background(Color.blue)
                            .clipShape(Circle())
                    }
                    Text("Listen")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                // Record
                VStack {
                    Button {
                        if practiceService.isRecording {
                            practiceService.stopRecording()
                        } else {
                            try? practiceService.startRecording()
                        }
                    } label: {
                        Image(systemName: practiceService.isRecording ? "stop.fill" : "mic.fill")
                            .font(.title)
                            .foregroundColor(.white)
                            .frame(width: 80, height: 80)
                            .background(practiceService.isRecording ? Color.red : Color.purple)
                            .clipShape(Circle())
                            .scaleEffect(practiceService.isRecording ? 1.1 : 1.0)
                            .animation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true), value: practiceService.isRecording)
                    }
                    Text(practiceService.isRecording ? "Stop" : "Record")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                // Playback
                VStack {
                    Button {
                        if practiceService.isPlaying {
                            practiceService.stopPlayback()
                        } else {
                            try? practiceService.playRecording()
                        }
                    } label: {
                        Image(systemName: practiceService.isPlaying ? "stop.fill" : "play.fill")
                            .font(.title)
                            .foregroundColor(.white)
                            .frame(width: 60, height: 60)
                            .background(practiceService.lastRecordingURL != nil ? Color.green : Color.gray)
                            .clipShape(Circle())
                    }
                    .disabled(practiceService.lastRecordingURL == nil)
                    Text("Play")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Analyze button
            if practiceService.lastRecordingURL != nil {
                Button {
                    Task {
                        _ = try? await practiceService.analyzeRecording(expectedText: text)
                    }
                } label: {
                    HStack {
                        if practiceService.isAnalyzing {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Image(systemName: "waveform.badge.magnifyingglass")
                        }
                        Text(practiceService.isAnalyzing ? "Analyzing..." : "Analyze My Pronunciation")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.orange)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .disabled(practiceService.isAnalyzing)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10)
    }
    
    // MARK: - Results Card
    private func resultsCard(score: PronunciationScore) -> some View {
        VStack(spacing: 16) {
            // Rating
            HStack {
                Text(score.rating.emoji)
                    .font(.largeTitle)
                
                VStack(alignment: .leading) {
                    Text(score.rating.rawValue)
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text("\(Int(score.accuracyPercentage))% accuracy")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Score circle
                ZStack {
                    Circle()
                        .stroke(Color(.systemGray4), lineWidth: 8)
                    
                    Circle()
                        .trim(from: 0, to: score.accuracyPercentage / 100)
                        .stroke(scoreColor(for: score.accuracyPercentage), lineWidth: 8)
                        .rotationEffect(.degrees(-90))
                    
                    Text("\(Int(score.accuracyPercentage))%")
                        .font(.headline)
                        .fontWeight(.bold)
                }
                .frame(width: 60, height: 60)
            }
            
            Divider()
            
            // Word-by-word feedback
            VStack(alignment: .leading, spacing: 8) {
                Text("Word by Word")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                FlowLayout(spacing: 8) {
                    ForEach(score.wordFeedback) { feedback in
                        HStack(spacing: 4) {
                            Image(systemName: feedback.status.icon)
                                .font(.caption)
                            Text(feedback.word)
                                .font(.subheadline)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(colorForStatus(feedback.status).opacity(0.2))
                        .foregroundColor(colorForStatus(feedback.status))
                        .cornerRadius(12)
                    }
                }
            }
            
            // What we heard
            VStack(alignment: .leading, spacing: 4) {
                Text("We heard:")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(score.recognizedText.isEmpty ? "(Nothing detected)" : score.recognizedText)
                    .font(.body)
                    .italic()
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
            }
            
            // Tips
            if !score.tips.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Tips to Improve")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    ForEach(score.tips, id: \.self) { tip in
                        HStack(spacing: 8) {
                            Image(systemName: "lightbulb.fill")
                                .foregroundColor(.yellow)
                            Text(tip)
                                .font(.subheadline)
                        }
                    }
                }
            }
            
            // Try again button
            Button {
                practiceService.deleteRecording()
            } label: {
                HStack {
                    Image(systemName: "arrow.counterclockwise")
                    Text("Try Again")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.purple.opacity(0.1))
                .foregroundColor(.purple)
                .cornerRadius(12)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 10)
    }
    
    // MARK: - Helpers
    private func requestPermissions() {
        hasRequestedPermissions = true
        Task {
            let granted = await practiceService.requestPermissions()
            if !granted {
                await MainActor.run {
                    showingPermissionAlert = true
                }
            }
        }
    }
    
    private func scoreColor(for percentage: Double) -> Color {
        if percentage >= 80 { return .green }
        if percentage >= 60 { return .orange }
        return .red
    }
    
    private func colorForStatus(_ status: WordStatus) -> Color {
        switch status {
        case .correct: return .green
        case .partial: return .orange
        case .incorrect: return .red
        }
    }
}

// MARK: - Practice Phrase Pill
struct PracticePhrasePill: View {
    let phrase: QuickPhrase
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(phrase.translatedText)
                .font(.subheadline)
                .lineLimit(1)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(isSelected ? Color.purple : Color(.systemGray5))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(16)
        }
    }
}

// MARK: - Flow Layout
struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(in: proposal.width ?? 0, subviews: subviews, spacing: spacing)
        return result.size
    }
    
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(in: bounds.width, subviews: subviews, spacing: spacing)
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x,
                                      y: bounds.minY + result.positions[index].y),
                         proposal: .unspecified)
        }
    }
    
    struct FlowResult {
        var size: CGSize = .zero
        var positions: [CGPoint] = []
        
        init(in width: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var lineHeight: CGFloat = 0
            
            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)
                
                if x + size.width > width, x > 0 {
                    x = 0
                    y += lineHeight + spacing
                    lineHeight = 0
                }
                
                positions.append(CGPoint(x: x, y: y))
                lineHeight = max(lineHeight, size.height)
                x += size.width + spacing
            }
            
            self.size = CGSize(width: width, height: y + lineHeight)
        }
    }
}

#Preview {
    AccentPracticeView()
}

import SwiftUI
import Translation

/// View to show language download status and trigger downloads
@available(iOS 17.4, *)
struct LanguageDownloadView: View {
    @StateObject private var settings = TranslationSettings.shared
    @State private var downloadStatus: LanguageAvailability.Status = .unsupported
    @State private var isCheckingStatus = true
    @State private var showDownloadPrompt = false
    @State private var translationConfig: TranslationSession.Configuration?
    
    var body: some View {
        VStack(spacing: 16) {
            // Status indicator
            statusCard
            
            // Language pair info
            languagePairInfo
            
            // Download button if needed
            if case .supported = downloadStatus {
                downloadButton
            }
        }
        .task {
            await checkStatus()
        }
        .onChange(of: settings.sourceLanguage) { _, _ in
            Task { await checkStatus() }
        }
        .onChange(of: settings.targetLanguage) { _, _ in
            Task { await checkStatus() }
        }
        .translationTask(translationConfig) { session in
            // This triggers the system download UI
        }
    }
    
    // MARK: - Status Card
    private var statusCard: some View {
        HStack(spacing: 12) {
            // Status icon
            Group {
                if isCheckingStatus {
                    ProgressView()
                        .scaleEffect(0.8)
                } else {
                    statusIcon
                }
            }
            .frame(width: 40, height: 40)
            .background(statusColor.opacity(0.1))
            .clipShape(Circle())
            
            // Status text
            VStack(alignment: .leading, spacing: 2) {
                Text("Apple Translation")
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text(statusText)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // Checkmark or action
            if downloadStatus.isReady {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
                    .font(.title2)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
    
    private var statusIcon: some View {
        Image(systemName: statusIconName)
            .font(.title3)
            .foregroundColor(statusColor)
    }
    
    private var statusIconName: String {
        switch downloadStatus {
        case .installed, .supportedAndDownloaded:
            return "checkmark.icloud.fill"
        case .supported:
            return "icloud.and.arrow.down"
        case .unsupported:
            return "xmark.icloud"
        @unknown default:
            return "questionmark.circle"
        }
    }
    
    private var statusColor: Color {
        switch downloadStatus {
        case .installed, .supportedAndDownloaded:
            return .green
        case .supported:
            return .blue
        case .unsupported:
            return .red
        @unknown default:
            return .gray
        }
    }
    
    private var statusText: String {
        switch downloadStatus {
        case .installed:
            return "Ready - Built into iOS"
        case .supportedAndDownloaded:
            return "Ready - Downloaded for offline use"
        case .supported:
            return "Available - Tap to download for offline use"
        case .unsupported:
            return "Not supported for this language pair"
        @unknown default:
            return "Unknown status"
        }
    }
    
    // MARK: - Language Pair Info
    private var languagePairInfo: some View {
        HStack {
            VStack(spacing: 4) {
                Text(settings.sourceLanguage.flag)
                    .font(.largeTitle)
                Text(settings.sourceLanguage.name)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity)
            
            Image(systemName: "arrow.right")
                .font(.title2)
                .foregroundColor(.blue)
            
            VStack(spacing: 4) {
                Text(settings.targetLanguage.flag)
                    .font(.largeTitle)
                Text(settings.targetLanguage.name)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
    
    // MARK: - Download Button
    private var downloadButton: some View {
        Button {
            triggerDownload()
        } label: {
            HStack {
                Image(systemName: "icloud.and.arrow.down")
                Text("Download for Offline Use")
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(12)
        }
    }
    
    // MARK: - Actions
    private func checkStatus() async {
        isCheckingStatus = true
        
        let sourceLocale = Locale.Language(identifier: settings.sourceLanguage.code)
        let targetLocale = Locale.Language(identifier: settings.targetLanguage.code)
        
        do {
            let availability = LanguageAvailability()
            let status = try await availability.status(from: sourceLocale, to: targetLocale)
            
            await MainActor.run {
                downloadStatus = status
                isCheckingStatus = false
            }
        } catch {
            await MainActor.run {
                downloadStatus = .unsupported
                isCheckingStatus = false
            }
        }
    }
    
    private func triggerDownload() {
        // Create a configuration to trigger the system download UI
        let sourceLocale = Locale.Language(identifier: settings.sourceLanguage.code)
        let targetLocale = Locale.Language(identifier: settings.targetLanguage.code)
        
        translationConfig = TranslationSession.Configuration(
            source: sourceLocale,
            target: targetLocale
        )
    }
}

// MARK: - Compact Status Badge for other views
@available(iOS 17.4, *)
struct TranslationStatusBadge: View {
    let sourceLanguage: Language
    let targetLanguage: Language
    
    @State private var status: LanguageAvailability.Status = .unsupported
    @State private var isLoading = true
    
    var body: some View {
        HStack(spacing: 6) {
            if isLoading {
                ProgressView()
                    .scaleEffect(0.6)
            } else {
                Image(systemName: iconName)
                    .font(.caption)
                    .foregroundColor(iconColor)
            }
            
            Text(statusLabel)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(iconColor.opacity(0.1))
        .cornerRadius(8)
        .task {
            await checkStatus()
        }
    }
    
    private var iconName: String {
        switch status {
        case .installed, .supportedAndDownloaded:
            return "checkmark.circle.fill"
        case .supported:
            return "arrow.down.circle"
        case .unsupported:
            return "xmark.circle"
        @unknown default:
            return "questionmark.circle"
        }
    }
    
    private var iconColor: Color {
        switch status {
        case .installed, .supportedAndDownloaded:
            return .green
        case .supported:
            return .blue
        case .unsupported:
            return .red
        @unknown default:
            return .gray
        }
    }
    
    private var statusLabel: String {
        switch status {
        case .installed, .supportedAndDownloaded:
            return "Ready"
        case .supported:
            return "Download"
        case .unsupported:
            return "Not Available"
        @unknown default:
            return "Unknown"
        }
    }
    
    private func checkStatus() async {
        let sourceLocale = Locale.Language(identifier: sourceLanguage.code)
        let targetLocale = Locale.Language(identifier: targetLanguage.code)
        
        do {
            let availability = LanguageAvailability()
            let newStatus = try await availability.status(from: sourceLocale, to: targetLocale)
            
            await MainActor.run {
                status = newStatus
                isLoading = false
            }
        } catch {
            await MainActor.run {
                status = .unsupported
                isLoading = false
            }
        }
    }
}

// MARK: - Preview
@available(iOS 17.4, *)
#Preview {
    LanguageDownloadView()
        .padding()
}

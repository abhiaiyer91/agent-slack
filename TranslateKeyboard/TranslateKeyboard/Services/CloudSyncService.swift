import Foundation
import CloudKit

/// Service for syncing learning data across devices via iCloud
class CloudSyncService: ObservableObject {
    
    static let shared = CloudSyncService()
    
    // MARK: - Properties
    @Published var isSyncing = false
    @Published var lastSyncDate: Date?
    @Published var syncStatus: SyncStatus = .unknown
    @Published var syncError: String?
    
    private let container: CKContainer
    private let database: CKDatabase
    private let settings = TranslationSettings.shared
    
    // Record types
    private let learningCardRecordType = "LearningCard"
    private let settingsRecordType = "UserSettings"
    private let conversationRecordType = "Conversation"
    
    // MARK: - Initialization
    private init() {
        container = CKContainer(identifier: "iCloud.com.translatekeyboard.app")
        database = container.privateCloudDatabase
        
        checkiCloudStatus()
    }
    
    // MARK: - iCloud Status
    func checkiCloudStatus() {
        container.accountStatus { [weak self] status, error in
            DispatchQueue.main.async {
                switch status {
                case .available:
                    self?.syncStatus = .available
                case .noAccount:
                    self?.syncStatus = .noAccount
                case .restricted:
                    self?.syncStatus = .restricted
                case .couldNotDetermine:
                    self?.syncStatus = .unknown
                case .temporarilyUnavailable:
                    self?.syncStatus = .temporarilyUnavailable
                @unknown default:
                    self?.syncStatus = .unknown
                }
                
                if let error = error {
                    self?.syncError = error.localizedDescription
                }
            }
        }
    }
    
    // MARK: - Sync Learning Cards
    func syncLearningCards() async throws {
        guard syncStatus == .available else {
            throw SyncError.iCloudNotAvailable
        }
        
        await MainActor.run {
            isSyncing = true
            syncError = nil
        }
        
        defer {
            Task { @MainActor in
                isSyncing = false
                lastSyncDate = Date()
            }
        }
        
        // Upload local cards
        try await uploadLearningCards()
        
        // Download remote cards
        try await downloadLearningCards()
    }
    
    private func uploadLearningCards() async throws {
        let cards = settings.learningHistory
        
        for card in cards {
            let record = CKRecord(recordType: learningCardRecordType)
            record["id"] = card.id.uuidString
            record["originalText"] = card.originalText
            record["translatedText"] = card.translatedText
            record["sourceLanguage"] = card.sourceLanguage.code
            record["targetLanguage"] = card.targetLanguage.code
            record["confidence"] = card.confidence.rawValue
            record["reviewCount"] = card.reviewCount
            record["createdAt"] = card.createdAt
            record["lastReviewedAt"] = card.lastReviewedAt
            
            // Encode word breakdown as JSON
            if let breakdownData = try? JSONEncoder().encode(card.wordBreakdown) {
                record["wordBreakdown"] = String(data: breakdownData, encoding: .utf8)
            }
            
            do {
                _ = try await database.save(record)
            } catch let error as CKError where error.code == .serverRecordChanged {
                // Handle conflict - remote version is newer
                continue
            }
        }
    }
    
    private func downloadLearningCards() async throws {
        let query = CKQuery(recordType: learningCardRecordType, predicate: NSPredicate(value: true))
        query.sortDescriptors = [NSSortDescriptor(key: "createdAt", ascending: false)]
        
        let results = try await database.records(matching: query)
        
        for (_, result) in results.matchResults {
            guard let record = try? result.get() else { continue }
            
            // Convert record to LearningCard
            guard let idString = record["id"] as? String,
                  let id = UUID(uuidString: idString),
                  let originalText = record["originalText"] as? String,
                  let translatedText = record["translatedText"] as? String,
                  let sourceCode = record["sourceLanguage"] as? String,
                  let targetCode = record["targetLanguage"] as? String,
                  let confidenceRaw = record["confidence"] as? String,
                  let confidence = LearningConfidence(rawValue: confidenceRaw) else {
                continue
            }
            
            let sourceLanguage = Language.allLanguages.first { $0.code == sourceCode } ?? .english
            let targetLanguage = Language.allLanguages.first { $0.code == targetCode } ?? .french
            
            // Check if we already have this card
            if settings.learningHistory.contains(where: { $0.id == id }) {
                continue
            }
            
            // Decode word breakdown
            var wordBreakdown: [WordPair] = []
            if let breakdownString = record["wordBreakdown"] as? String,
               let breakdownData = breakdownString.data(using: .utf8) {
                wordBreakdown = (try? JSONDecoder().decode([WordPair].self, from: breakdownData)) ?? []
            }
            
            var card = LearningCard(
                originalText: originalText,
                translatedText: translatedText,
                sourceLanguage: sourceLanguage,
                targetLanguage: targetLanguage,
                wordBreakdown: wordBreakdown
            )
            card.confidence = confidence
            card.reviewCount = record["reviewCount"] as? Int ?? 0
            card.lastReviewedAt = record["lastReviewedAt"] as? Date
            
            await MainActor.run {
                settings.addToLearningHistory(card)
            }
        }
    }
    
    // MARK: - Sync Conversations
    func syncConversations() async throws {
        guard syncStatus == .available else {
            throw SyncError.iCloudNotAvailable
        }
        
        // Upload local conversations
        for exchange in settings.conversationHistory {
            let record = CKRecord(recordType: conversationRecordType)
            record["id"] = exchange.id.uuidString
            record["direction"] = exchange.direction.rawValue
            record["originalText"] = exchange.originalText
            record["translatedText"] = exchange.translatedText
            record["timestamp"] = exchange.timestamp
            
            do {
                _ = try await database.save(record)
            } catch {
                // Ignore conflicts
            }
        }
    }
    
    // MARK: - Full Sync
    func performFullSync() async {
        do {
            try await syncLearningCards()
            try await syncConversations()
            
            await MainActor.run {
                syncError = nil
                UserDefaults.standard.set(Date(), forKey: "lastCloudSync")
            }
        } catch {
            await MainActor.run {
                syncError = error.localizedDescription
            }
        }
    }
    
    // MARK: - Delete All Cloud Data
    func deleteAllCloudData() async throws {
        let query = CKQuery(recordType: learningCardRecordType, predicate: NSPredicate(value: true))
        let results = try await database.records(matching: query)
        
        for (recordID, _) in results.matchResults {
            try await database.deleteRecord(withID: recordID)
        }
    }
}

// MARK: - Sync Status
enum SyncStatus: String {
    case available = "Available"
    case noAccount = "No iCloud Account"
    case restricted = "Restricted"
    case temporarilyUnavailable = "Temporarily Unavailable"
    case unknown = "Unknown"
    
    var icon: String {
        switch self {
        case .available: return "checkmark.icloud.fill"
        case .noAccount: return "person.crop.circle.badge.xmark"
        case .restricted: return "lock.icloud"
        case .temporarilyUnavailable: return "exclamationmark.icloud"
        case .unknown: return "questionmark.circle"
        }
    }
    
    var color: String {
        switch self {
        case .available: return "green"
        case .noAccount, .restricted: return "red"
        case .temporarilyUnavailable: return "orange"
        case .unknown: return "gray"
        }
    }
}

// MARK: - Sync Errors
enum SyncError: LocalizedError {
    case iCloudNotAvailable
    case syncFailed(String)
    
    var errorDescription: String? {
        switch self {
        case .iCloudNotAvailable:
            return "iCloud is not available. Please sign in to iCloud in Settings."
        case .syncFailed(let message):
            return "Sync failed: \(message)"
        }
    }
}

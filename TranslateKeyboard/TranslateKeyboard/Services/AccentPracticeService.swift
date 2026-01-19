import Foundation
import AVFoundation
import Speech

/// Service for recording and comparing pronunciation
class AccentPracticeService: NSObject, ObservableObject {
    
    static let shared = AccentPracticeService()
    
    // MARK: - Properties
    @Published var isRecording = false
    @Published var isPlaying = false
    @Published var isAnalyzing = false
    @Published var recordingPermissionGranted = false
    @Published var speechRecognitionPermissionGranted = false
    @Published var lastRecordingURL: URL?
    @Published var recognizedText: String = ""
    @Published var pronunciationScore: PronunciationScore?
    @Published var errorMessage: String?
    
    private var audioRecorder: AVAudioRecorder?
    private var audioPlayer: AVAudioPlayer?
    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechURLRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    
    private let synthesizer = AVSpeechSynthesizer()
    private let settings = TranslationSettings.shared
    
    // MARK: - Initialization
    private override init() {
        super.init()
        setupSpeechRecognizer()
    }
    
    private func setupSpeechRecognizer() {
        // Use French speech recognizer
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "fr-FR"))
    }
    
    // MARK: - Permissions
    func requestPermissions() async -> Bool {
        // Request microphone permission
        let microphoneGranted = await withCheckedContinuation { continuation in
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                continuation.resume(returning: granted)
            }
        }
        
        // Request speech recognition permission
        let speechGranted = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status == .authorized)
            }
        }
        
        await MainActor.run {
            recordingPermissionGranted = microphoneGranted
            speechRecognitionPermissionGranted = speechGranted
        }
        
        return microphoneGranted && speechGranted
    }
    
    // MARK: - Recording
    func startRecording() throws {
        guard recordingPermissionGranted else {
            throw AccentError.microphonePermissionDenied
        }
        
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
        try session.setActive(true)
        
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let filename = "pronunciation_\(Date().timeIntervalSince1970).m4a"
        let recordingURL = documentsPath.appendingPathComponent(filename)
        
        let recordingSettings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
        ]
        
        audioRecorder = try AVAudioRecorder(url: recordingURL, settings: recordingSettings)
        audioRecorder?.delegate = self
        audioRecorder?.record()
        
        lastRecordingURL = recordingURL
        isRecording = true
        recognizedText = ""
        pronunciationScore = nil
    }
    
    func stopRecording() {
        audioRecorder?.stop()
        isRecording = false
    }
    
    // MARK: - Playback
    func playRecording() throws {
        guard let url = lastRecordingURL else {
            throw AccentError.noRecording
        }
        
        audioPlayer = try AVAudioPlayer(contentsOf: url)
        audioPlayer?.delegate = self
        audioPlayer?.play()
        isPlaying = true
    }
    
    func stopPlayback() {
        audioPlayer?.stop()
        isPlaying = false
    }
    
    // MARK: - Native Pronunciation
    func playNativePronunciation(text: String) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: settings.targetLanguage.code)
        utterance.rate = 0.4 // Slower for learning
        synthesizer.speak(utterance)
    }
    
    // MARK: - Speech Recognition & Scoring
    func analyzeRecording(expectedText: String) async throws -> PronunciationScore {
        guard let url = lastRecordingURL else {
            throw AccentError.noRecording
        }
        
        guard speechRecognitionPermissionGranted else {
            throw AccentError.speechRecognitionDenied
        }
        
        guard let recognizer = speechRecognizer, recognizer.isAvailable else {
            throw AccentError.speechRecognizerUnavailable
        }
        
        await MainActor.run {
            isAnalyzing = true
        }
        
        defer {
            Task { @MainActor in
                isAnalyzing = false
            }
        }
        
        // Recognize speech from recording
        let recognizedText = try await recognizeSpeech(from: url)
        
        await MainActor.run {
            self.recognizedText = recognizedText
        }
        
        // Calculate score
        let score = calculateScore(expected: expectedText, recognized: recognizedText)
        
        await MainActor.run {
            self.pronunciationScore = score
        }
        
        return score
    }
    
    private func recognizeSpeech(from url: URL) async throws -> String {
        return try await withCheckedThrowingContinuation { continuation in
            let request = SFSpeechURLRecognitionRequest(url: url)
            request.shouldReportPartialResults = false
            
            recognitionTask = speechRecognizer?.recognitionTask(with: request) { result, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                if let result = result, result.isFinal {
                    continuation.resume(returning: result.bestTranscription.formattedString)
                }
            }
        }
    }
    
    // MARK: - Scoring Algorithm
    private func calculateScore(expected: String, recognized: String) -> PronunciationScore {
        let expectedWords = expected.lowercased().components(separatedBy: .whitespaces)
        let recognizedWords = recognized.lowercased().components(separatedBy: .whitespaces)
        
        // Calculate word match percentage
        var matchedWords = 0
        var partialMatches = 0
        var wordFeedback: [WordFeedback] = []
        
        for expectedWord in expectedWords {
            let cleanExpected = expectedWord.trimmingCharacters(in: .punctuationCharacters)
            
            if recognizedWords.contains(where: { $0.trimmingCharacters(in: .punctuationCharacters) == cleanExpected }) {
                matchedWords += 1
                wordFeedback.append(WordFeedback(word: cleanExpected, status: .correct))
            } else if recognizedWords.contains(where: { 
                levenshteinDistance($0.trimmingCharacters(in: .punctuationCharacters), cleanExpected) <= 2 
            }) {
                partialMatches += 1
                wordFeedback.append(WordFeedback(word: cleanExpected, status: .partial))
            } else {
                wordFeedback.append(WordFeedback(word: cleanExpected, status: .incorrect))
            }
        }
        
        let totalWords = expectedWords.count
        let accuracy = totalWords > 0 ? Double(matchedWords) / Double(totalWords) * 100 : 0
        let partialAccuracy = totalWords > 0 ? Double(matchedWords + partialMatches) / Double(totalWords) * 100 : 0
        
        // Determine overall rating
        let rating: PronunciationRating
        if accuracy >= 90 {
            rating = .excellent
        } else if accuracy >= 70 {
            rating = .good
        } else if partialAccuracy >= 50 {
            rating = .needsWork
        } else {
            rating = .tryAgain
        }
        
        // Generate tips
        var tips: [String] = []
        if accuracy < 100 {
            tips.append("Try speaking more slowly")
            tips.append("Listen to the native pronunciation again")
            
            let missedWords = wordFeedback.filter { $0.status != .correct }.map { $0.word }
            if !missedWords.isEmpty {
                tips.append("Focus on: \(missedWords.prefix(3).joined(separator: ", "))")
            }
        }
        
        return PronunciationScore(
            expectedText: expected,
            recognizedText: recognized,
            accuracyPercentage: accuracy,
            rating: rating,
            wordFeedback: wordFeedback,
            tips: tips
        )
    }
    
    // Levenshtein distance for fuzzy matching
    private func levenshteinDistance(_ s1: String, _ s2: String) -> Int {
        let s1Array = Array(s1)
        let s2Array = Array(s2)
        var dist = [[Int]](repeating: [Int](repeating: 0, count: s2.count + 1), count: s1.count + 1)
        
        for i in 0...s1.count {
            dist[i][0] = i
        }
        for j in 0...s2.count {
            dist[0][j] = j
        }
        
        for i in 1...s1.count {
            for j in 1...s2.count {
                if s1Array[i-1] == s2Array[j-1] {
                    dist[i][j] = dist[i-1][j-1]
                } else {
                    dist[i][j] = min(dist[i-1][j] + 1, dist[i][j-1] + 1, dist[i-1][j-1] + 1)
                }
            }
        }
        
        return dist[s1.count][s2.count]
    }
    
    // MARK: - Cleanup
    func deleteRecording() {
        if let url = lastRecordingURL {
            try? FileManager.default.removeItem(at: url)
            lastRecordingURL = nil
        }
        recognizedText = ""
        pronunciationScore = nil
    }
}

// MARK: - AVAudioRecorderDelegate
extension AccentPracticeService: AVAudioRecorderDelegate {
    func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        DispatchQueue.main.async {
            self.isRecording = false
        }
    }
}

// MARK: - AVAudioPlayerDelegate
extension AccentPracticeService: AVAudioPlayerDelegate {
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        DispatchQueue.main.async {
            self.isPlaying = false
        }
    }
}

// MARK: - Models
struct PronunciationScore {
    let expectedText: String
    let recognizedText: String
    let accuracyPercentage: Double
    let rating: PronunciationRating
    let wordFeedback: [WordFeedback]
    let tips: [String]
}

struct WordFeedback: Identifiable {
    let id = UUID()
    let word: String
    let status: WordStatus
}

enum WordStatus {
    case correct
    case partial
    case incorrect
    
    var color: String {
        switch self {
        case .correct: return "green"
        case .partial: return "orange"
        case .incorrect: return "red"
        }
    }
    
    var icon: String {
        switch self {
        case .correct: return "checkmark.circle.fill"
        case .partial: return "exclamationmark.circle.fill"
        case .incorrect: return "xmark.circle.fill"
        }
    }
}

enum PronunciationRating: String {
    case excellent = "Excellent!"
    case good = "Good job!"
    case needsWork = "Keep practicing"
    case tryAgain = "Try again"
    
    var emoji: String {
        switch self {
        case .excellent: return "🌟"
        case .good: return "👍"
        case .needsWork: return "💪"
        case .tryAgain: return "🔄"
        }
    }
    
    var color: String {
        switch self {
        case .excellent: return "green"
        case .good: return "blue"
        case .needsWork: return "orange"
        case .tryAgain: return "red"
        }
    }
}

// MARK: - Errors
enum AccentError: LocalizedError {
    case microphonePermissionDenied
    case speechRecognitionDenied
    case speechRecognizerUnavailable
    case noRecording
    case recordingFailed
    
    var errorDescription: String? {
        switch self {
        case .microphonePermissionDenied:
            return "Microphone access is required. Please enable it in Settings."
        case .speechRecognitionDenied:
            return "Speech recognition access is required. Please enable it in Settings."
        case .speechRecognizerUnavailable:
            return "Speech recognition is not available for French."
        case .noRecording:
            return "No recording available. Please record first."
        case .recordingFailed:
            return "Recording failed. Please try again."
        }
    }
}

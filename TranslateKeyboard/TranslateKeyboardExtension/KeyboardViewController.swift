import UIKit
import SwiftUI

class KeyboardViewController: UIInputViewController {
    
    // MARK: - Properties
    private var hostingController: UIHostingController<KeyboardView>?
    private let settings = TranslationSettings.shared
    private let translationService = TranslationService.shared
    
    // Text buffer for translation
    private var textBuffer = ""
    private var translationTask: Task<Void, Never>?
    private var lastTranslatedText = ""
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupKeyboardView()
    }
    
    override func viewWillLayoutSubviews() {
        super.viewWillLayoutSubviews()
        updateKeyboardHeight()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        updateKeyboardHeight()
    }
    
    // MARK: - Setup
    private func setupKeyboardView() {
        let keyboardView = KeyboardView(
            onKeyPress: { [weak self] key in
                self?.handleKeyPress(key)
            },
            onTranslate: { [weak self] in
                self?.translateAndInsert()
            },
            onDelete: { [weak self] in
                self?.handleDelete()
            },
            onSpace: { [weak self] in
                self?.handleSpace()
            },
            onReturn: { [weak self] in
                self?.handleReturn()
            },
            onNextKeyboard: { [weak self] in
                self?.advanceToNextInputMode()
            },
            hasFullAccess: hasFullAccess,
            currentText: $textBuffer
        )
        
        let hostingController = UIHostingController(rootView: keyboardView)
        hostingController.view.translatesAutoresizingMaskIntoConstraints = false
        hostingController.view.backgroundColor = .clear
        
        addChild(hostingController)
        view.addSubview(hostingController.view)
        hostingController.didMove(toParent: self)
        
        NSLayoutConstraint.activate([
            hostingController.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hostingController.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hostingController.view.topAnchor.constraint(equalTo: view.topAnchor),
            hostingController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        
        self.hostingController = hostingController
    }
    
    private func updateKeyboardHeight() {
        let height: CGFloat = settings.showTranslationPreview ? 300 : 260
        
        let heightConstraint = view.constraints.first { $0.firstAttribute == .height }
        heightConstraint?.constant = height
        
        if heightConstraint == nil {
            view.heightAnchor.constraint(equalToConstant: height).isActive = true
        }
    }
    
    // MARK: - Key Handling
    private func handleKeyPress(_ key: String) {
        textDocumentProxy.insertText(key)
        textBuffer += key
        
        if settings.hapticFeedbackEnabled {
            provideHapticFeedback()
        }
        
        // Trigger auto-translation if enabled
        if settings.autoTranslateEnabled {
            scheduleTranslation()
        }
    }
    
    private func handleDelete() {
        textDocumentProxy.deleteBackward()
        
        if !textBuffer.isEmpty {
            textBuffer.removeLast()
        }
        
        if settings.hapticFeedbackEnabled {
            provideHapticFeedback()
        }
    }
    
    private func handleSpace() {
        textDocumentProxy.insertText(" ")
        textBuffer += " "
        
        if settings.hapticFeedbackEnabled {
            provideHapticFeedback()
        }
        
        // Translate after word completion
        if settings.autoTranslateEnabled {
            scheduleTranslation()
        }
    }
    
    private func handleReturn() {
        textDocumentProxy.insertText("\n")
        textBuffer = ""
        
        if settings.hapticFeedbackEnabled {
            provideHapticFeedback()
        }
    }
    
    // MARK: - Translation
    private func scheduleTranslation() {
        translationTask?.cancel()
        
        translationTask = Task { [weak self] in
            // Debounce: wait a bit before translating
            try? await Task.sleep(nanoseconds: 500_000_000)
            
            guard !Task.isCancelled else { return }
            await self?.performTranslation()
        }
    }
    
    private func performTranslation() async {
        guard hasFullAccess else { return }
        
        let textToTranslate = textBuffer.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !textToTranslate.isEmpty, textToTranslate != lastTranslatedText else { return }
        
        do {
            let result = try await translationService.translate(
                text: textToTranslate,
                from: settings.sourceLanguage,
                to: settings.targetLanguage
            )
            
            lastTranslatedText = textToTranslate
            
            // Update the translation preview
            await MainActor.run {
                updateTranslationPreview(result.translatedText)
            }
        } catch {
            print("Translation error: \(error)")
        }
    }
    
    private func translateAndInsert() {
        Task { [weak self] in
            guard let self = self else { return }
            
            let textToTranslate = self.textBuffer.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !textToTranslate.isEmpty else { return }
            
            do {
                let result = try await self.translationService.translate(
                    text: textToTranslate,
                    from: self.settings.sourceLanguage,
                    to: self.settings.targetLanguage
                )
                
                await MainActor.run {
                    // Delete the original text
                    for _ in 0..<self.textBuffer.count {
                        self.textDocumentProxy.deleteBackward()
                    }
                    
                    // Insert translated text
                    self.textDocumentProxy.insertText(result.translatedText)
                    self.textBuffer = result.translatedText
                    self.lastTranslatedText = ""
                }
            } catch {
                print("Translation error: \(error)")
            }
        }
    }
    
    private func updateTranslationPreview(_ translation: String) {
        // This would update the preview bar in the keyboard
        // For now, we store it for the SwiftUI view to display
        NotificationCenter.default.post(
            name: .translationUpdated,
            object: nil,
            userInfo: ["translation": translation]
        )
    }
    
    // MARK: - Haptic Feedback
    private func provideHapticFeedback() {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
    }
    
    // MARK: - Text Input
    override func textWillChange(_ textInput: UITextInput?) {
        super.textWillChange(textInput)
    }
    
    override func textDidChange(_ textInput: UITextInput?) {
        super.textDidChange(textInput)
    }
}

// MARK: - Notification Names
extension Notification.Name {
    static let translationUpdated = Notification.Name("translationUpdated")
}

import SwiftUI

struct KeyboardView: View {
    // MARK: - Callbacks
    let onKeyPress: (String) -> Void
    let onTranslate: () -> Void
    let onDelete: () -> Void
    let onSpace: () -> Void
    let onReturn: () -> Void
    let onNextKeyboard: () -> Void
    let hasFullAccess: Bool
    
    @Binding var currentText: String
    
    // MARK: - State
    @State private var isShiftEnabled = false
    @State private var isCapsLock = false
    @State private var showNumbers = false
    @State private var showSymbols = false
    @State private var translatedText = ""
    
    @StateObject private var settings = TranslationSettings.shared
    
    // MARK: - Keyboard Layout
    private let letterRows: [[String]] = [
        ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
        ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
        ["z", "x", "c", "v", "b", "n", "m"]
    ]
    
    private let numberRows: [[String]] = [
        ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
        ["-", "/", ":", ";", "(", ")", "$", "&", "@", "\""],
        [".", ",", "?", "!", "'"]
    ]
    
    private let symbolRows: [[String]] = [
        ["[", "]", "{", "}", "#", "%", "^", "*", "+", "="],
        ["_", "\\", "|", "~", "<", ">", "€", "£", "¥", "•"],
        [".", ",", "?", "!", "'"]
    ]
    
    // MARK: - Body
    var body: some View {
        VStack(spacing: 0) {
            // Translation Preview Bar
            if settings.showTranslationPreview && hasFullAccess {
                translationPreviewBar
            }
            
            // Keyboard
            VStack(spacing: 8) {
                if showNumbers || showSymbols {
                    numbersAndSymbolsKeyboard
                } else {
                    letterKeyboard
                }
                
                // Bottom Row
                bottomRow
            }
            .padding(.horizontal, 3)
            .padding(.vertical, 8)
        }
        .background(keyboardBackground)
        .onReceive(NotificationCenter.default.publisher(for: .translationUpdated)) { notification in
            if let translation = notification.userInfo?["translation"] as? String {
                translatedText = translation
            }
        }
    }
    
    // MARK: - Translation Preview Bar
    private var translationPreviewBar: some View {
        HStack(spacing: 12) {
            // Language indicators
            HStack(spacing: 4) {
                Text(settings.sourceLanguage.flag)
                    .font(.caption)
                Image(systemName: "arrow.right")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                Text(settings.targetLanguage.flag)
                    .font(.caption)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color(.systemGray5))
            .cornerRadius(8)
            
            // Translation preview
            if !translatedText.isEmpty {
                Text(translatedText)
                    .font(.subheadline)
                    .foregroundColor(.primary)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity, alignment: .leading)
                
                // Insert translation button
                Button(action: onTranslate) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title2)
                        .foregroundColor(.blue)
                }
            } else {
                Text("Translation will appear here...")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(Color(.systemBackground).opacity(0.95))
    }
    
    // MARK: - Letter Keyboard
    private var letterKeyboard: some View {
        VStack(spacing: 10) {
            ForEach(letterRows.indices, id: \.self) { rowIndex in
                HStack(spacing: 6) {
                    // Add shift key on last row
                    if rowIndex == 2 {
                        shiftKey
                    }
                    
                    ForEach(letterRows[rowIndex], id: \.self) { letter in
                        let displayLetter = (isShiftEnabled || isCapsLock) ? letter.uppercased() : letter
                        KeyButton(
                            title: displayLetter,
                            style: .letter
                        ) {
                            onKeyPress(displayLetter)
                            if isShiftEnabled && !isCapsLock {
                                isShiftEnabled = false
                            }
                        }
                    }
                    
                    // Add delete key on last row
                    if rowIndex == 2 {
                        deleteKey
                    }
                }
            }
        }
    }
    
    // MARK: - Numbers and Symbols Keyboard
    private var numbersAndSymbolsKeyboard: some View {
        let rows = showSymbols ? symbolRows : numberRows
        
        return VStack(spacing: 10) {
            ForEach(rows.indices, id: \.self) { rowIndex in
                HStack(spacing: 6) {
                    // Add symbol toggle on last row
                    if rowIndex == 2 {
                        symbolToggleKey
                    }
                    
                    ForEach(rows[rowIndex], id: \.self) { char in
                        KeyButton(
                            title: char,
                            style: .letter
                        ) {
                            onKeyPress(char)
                        }
                    }
                    
                    // Add delete key on last row
                    if rowIndex == 2 {
                        deleteKey
                    }
                }
            }
        }
    }
    
    // MARK: - Bottom Row
    private var bottomRow: some View {
        HStack(spacing: 6) {
            // Numbers/ABC toggle
            KeyButton(
                title: showNumbers || showSymbols ? "ABC" : "123",
                style: .function,
                width: 50
            ) {
                showNumbers.toggle()
                showSymbols = false
            }
            
            // Next keyboard
            KeyButton(
                icon: "globe",
                style: .function,
                width: 44
            ) {
                onNextKeyboard()
            }
            
            // Translate button
            if hasFullAccess {
                KeyButton(
                    icon: "globe",
                    title: "Translate",
                    style: .translate,
                    width: 80
                ) {
                    onTranslate()
                }
            }
            
            // Space bar
            KeyButton(
                title: "space",
                style: .space
            ) {
                onSpace()
            }
            
            // Return key
            KeyButton(
                title: "return",
                style: .function,
                width: 80
            ) {
                onReturn()
            }
        }
    }
    
    // MARK: - Special Keys
    private var shiftKey: some View {
        KeyButton(
            icon: isCapsLock ? "capslock.fill" : (isShiftEnabled ? "shift.fill" : "shift"),
            style: isShiftEnabled || isCapsLock ? .functionActive : .function,
            width: 44
        ) {
            if isShiftEnabled {
                // Double tap for caps lock
                isCapsLock = true
            } else if isCapsLock {
                isCapsLock = false
                isShiftEnabled = false
            } else {
                isShiftEnabled = true
            }
        }
    }
    
    private var deleteKey: some View {
        KeyButton(
            icon: "delete.left",
            style: .function,
            width: 44
        ) {
            onDelete()
        }
        .simultaneousGesture(
            LongPressGesture(minimumDuration: 0.5)
                .onEnded { _ in
                    // Delete multiple characters on long press
                    for _ in 0..<5 {
                        onDelete()
                    }
                }
        )
    }
    
    private var symbolToggleKey: some View {
        KeyButton(
            title: showSymbols ? "123" : "#+=",
            style: .function,
            width: 44
        ) {
            showSymbols.toggle()
        }
    }
    
    // MARK: - Background
    private var keyboardBackground: some View {
        Group {
            switch settings.keyboardStyle {
            case .light:
                Color(.systemGray6)
            case .dark:
                Color(.systemGray5).opacity(0.3)
            case .system:
                Color(.systemGray6)
            }
        }
    }
}

// MARK: - Preview
struct KeyboardView_Previews: PreviewProvider {
    static var previews: some View {
        KeyboardView(
            onKeyPress: { _ in },
            onTranslate: {},
            onDelete: {},
            onSpace: {},
            onReturn: {},
            onNextKeyboard: {},
            hasFullAccess: true,
            currentText: .constant("")
        )
        .frame(height: 300)
    }
}

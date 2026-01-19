import SwiftUI

/// Style variants for keyboard buttons
enum KeyButtonStyle {
    case letter
    case function
    case functionActive
    case space
    case translate
    
    var backgroundColor: Color {
        switch self {
        case .letter:
            return Color(.systemBackground)
        case .function:
            return Color(.systemGray4)
        case .functionActive:
            return Color(.systemGray3)
        case .space:
            return Color(.systemBackground)
        case .translate:
            return Color.blue
        }
    }
    
    var foregroundColor: Color {
        switch self {
        case .letter, .function, .functionActive, .space:
            return Color(.label)
        case .translate:
            return .white
        }
    }
    
    var font: Font {
        switch self {
        case .letter:
            return .system(size: 22, weight: .regular)
        case .function, .functionActive:
            return .system(size: 15, weight: .medium)
        case .space:
            return .system(size: 16, weight: .regular)
        case .translate:
            return .system(size: 14, weight: .semibold)
        }
    }
    
    var cornerRadius: CGFloat {
        return 5
    }
    
    var shadowRadius: CGFloat {
        switch self {
        case .letter, .space:
            return 1
        default:
            return 0
        }
    }
}

/// A single keyboard button
struct KeyButton: View {
    let title: String?
    let icon: String?
    let style: KeyButtonStyle
    let width: CGFloat?
    let action: () -> Void
    
    @State private var isPressed = false
    
    init(
        title: String? = nil,
        icon: String? = nil,
        style: KeyButtonStyle = .letter,
        width: CGFloat? = nil,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.style = style
        self.width = width
        self.action = action
    }
    
    var body: some View {
        Button(action: {
            action()
        }) {
            content
                .frame(maxWidth: width ?? (style == .space ? .infinity : 32), maxHeight: 42)
                .background(isPressed ? style.backgroundColor.opacity(0.7) : style.backgroundColor)
                .cornerRadius(style.cornerRadius)
                .shadow(color: .black.opacity(0.15), radius: style.shadowRadius, x: 0, y: 1)
        }
        .buttonStyle(KeyButtonPressStyle(isPressed: $isPressed))
    }
    
    @ViewBuilder
    private var content: some View {
        if let icon = icon, let title = title {
            // Icon + Title
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 14))
                Text(title)
                    .font(style.font)
            }
            .foregroundColor(style.foregroundColor)
        } else if let icon = icon {
            // Icon only
            Image(systemName: icon)
                .font(.system(size: 20, weight: .regular))
                .foregroundColor(style.foregroundColor)
        } else if let title = title {
            // Title only
            Text(title)
                .font(style.font)
                .foregroundColor(style.foregroundColor)
        }
    }
}

/// Custom button style for key press animation
struct KeyButtonPressStyle: ButtonStyle {
    @Binding var isPressed: Bool
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 1.1 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, newValue in
                isPressed = newValue
            }
    }
}

// MARK: - Preview
struct KeyButton_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 20) {
            HStack {
                KeyButton(title: "A", style: .letter) {}
                KeyButton(title: "B", style: .letter) {}
                KeyButton(title: "C", style: .letter) {}
            }
            
            HStack {
                KeyButton(icon: "shift", style: .function, width: 44) {}
                KeyButton(icon: "delete.left", style: .function, width: 44) {}
            }
            
            KeyButton(title: "space", style: .space) {}
            
            KeyButton(icon: "globe", title: "Translate", style: .translate, width: 100) {}
        }
        .padding()
        .background(Color(.systemGray6))
    }
}

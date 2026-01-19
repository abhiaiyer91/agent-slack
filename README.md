# TranslateKeyboard

An iOS keyboard extension that automatically translates your text as you type. Type in one language, send in another!

## Features

- **Auto-Translation**: Automatically translates text as you type
- **40+ Languages**: Support for over 40 languages including English, Spanish, French, German, Chinese, Japanese, Korean, and more
- **Translation Preview**: See translations in real-time above the keyboard
- **Multiple Translation Providers**: Choose between Apple Translate, Google Translate, or DeepL
- **Beautiful UI**: Modern, native iOS keyboard design with smooth animations
- **Customizable**: Configure source/target languages, keyboard appearance, and more
- **Privacy-Focused**: Uses on-device translation when available (Apple Translate)

## Screenshots

*Coming soon*

## Requirements

- iOS 17.0+
- Xcode 15.0+
- Swift 5.9+

## Installation

### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/TranslateKeyboard.git
   ```

2. Open the project in Xcode:
   ```bash
   cd TranslateKeyboard
   open TranslateKeyboard/TranslateKeyboard.xcodeproj
   ```

3. Select your development team in the project settings

4. Build and run on your device or simulator

### Enable the Keyboard

After installing the app:

1. Open **Settings** on your iOS device
2. Go to **General** → **Keyboard** → **Keyboards**
3. Tap **Add New Keyboard...**
4. Select **TranslateKeyboard**
5. Tap on **TranslateKeyboard** again and enable **Allow Full Access** (required for translation features)

## Project Structure

```
TranslateKeyboard/
├── TranslateKeyboard/                 # Main iOS App
│   ├── TranslateKeyboardApp.swift     # App entry point
│   ├── Views/
│   │   ├── ContentView.swift          # Main app view
│   │   ├── SettingsView.swift         # Settings configuration
│   │   └── LanguagePickerView.swift   # Language selection
│   ├── Models/
│   │   ├── Language.swift             # Language model (40+ languages)
│   │   └── TranslationSettings.swift  # App settings with App Group sync
│   ├── Services/
│   │   └── TranslationService.swift   # Translation API integration
│   └── Resources/
│       └── Assets.xcassets            # App icons and colors
│
├── TranslateKeyboardExtension/        # Keyboard Extension
│   ├── KeyboardViewController.swift   # Main keyboard controller
│   ├── KeyboardView.swift             # SwiftUI keyboard layout
│   ├── KeyButton.swift                # Individual key component
│   ├── TranslationBar.swift           # Translation preview bar
│   └── Info.plist                     # Extension configuration
│
└── TranslateKeyboard.xcodeproj        # Xcode project
```

## Configuration

### App Group Setup (Required for Extension Communication)

1. In Xcode, select the project in the navigator
2. Select the **TranslateKeyboard** target
3. Go to **Signing & Capabilities**
4. Add **App Groups** capability
5. Create a new group: `group.com.translatekeyboard.app`
6. Repeat for the **TranslateKeyboardExtension** target

### Translation Providers

The app supports multiple translation providers:

#### Apple Translate (Default)
- Uses on-device translation when available
- No API key required
- Works offline for downloaded languages

#### Google Translate
- Requires a Google Cloud Translation API key
- Set the API key in the app settings

#### DeepL
- Requires a DeepL API key (free tier available)
- Set the API key in the app settings

## Usage

### Basic Translation

1. Switch to the TranslateKeyboard using the globe icon
2. Type your text in your source language
3. The translation appears in the preview bar above the keyboard
4. Tap the blue arrow button to replace your text with the translation

### Changing Languages

1. Open the TranslateKeyboard app
2. Tap on the source or target language flags
3. Select your desired language from the list
4. Changes sync automatically to the keyboard

### Keyboard Features

- **Shift**: Single tap for one capital letter, double tap for caps lock
- **Delete**: Tap to delete one character, hold to delete multiple
- **123**: Switch to numbers and symbols
- **Globe**: Switch to next keyboard
- **Translate**: Replace typed text with translation

## Supported Languages

| Language | Code | Language | Code |
|----------|------|----------|------|
| Arabic | ar | Korean | ko |
| Bengali | bn | Malay | ms |
| Chinese | zh | Malayalam | ml |
| Czech | cs | Marathi | mr |
| Danish | da | Norwegian | no |
| Dutch | nl | Persian | fa |
| English | en | Polish | pl |
| Finnish | fi | Portuguese | pt |
| French | fr | Punjabi | pa |
| German | de | Romanian | ro |
| Greek | el | Russian | ru |
| Gujarati | gu | Spanish | es |
| Hebrew | he | Swahili | sw |
| Hindi | hi | Swedish | sv |
| Hungarian | hu | Tamil | ta |
| Indonesian | id | Telugu | te |
| Italian | it | Thai | th |
| Japanese | ja | Turkish | tr |
| Kannada | kn | Ukrainian | uk |
| ... | ... | Vietnamese | vi |

## Architecture

### Key Components

- **TranslationService**: Handles all translation logic with caching and rate limiting
- **TranslationSettings**: Manages settings with App Group for extension sync
- **KeyboardViewController**: UIInputViewController for the keyboard extension
- **KeyboardView**: SwiftUI-based keyboard UI

### Data Flow

1. User types on keyboard → `KeyboardViewController` captures input
2. Text is buffered and sent to `TranslationService`
3. Translation result is displayed in `TranslationBar`
4. User taps insert → original text replaced with translation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Privacy

TranslateKeyboard respects your privacy:

- **Full Access**: Required only for translation features (network access)
- **On-Device Translation**: Apple Translate uses on-device processing when available
- **No Data Storage**: We don't store or transmit your typed text beyond translation
- **Transparent**: All source code is available for review

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Apple's Translation framework for on-device translation
- The Swift and SwiftUI communities for inspiration
- All contributors who help improve this project

## Roadmap

- [ ] Voice input support
- [ ] Swipe typing
- [ ] Custom keyboard themes
- [ ] Translation history
- [ ] Favorite phrases
- [ ] Widget for quick translations
- [ ] macOS Catalyst support

---

Made with ❤️ for the polyglot community

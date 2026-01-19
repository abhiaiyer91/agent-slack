import Foundation

/// Represents a language for translation
struct Language: Identifiable, Codable, Equatable, Hashable {
    let id: String
    let code: String
    let name: String
    let nativeName: String
    let flag: String
    
    init(code: String, name: String, nativeName: String, flag: String) {
        self.id = code
        self.code = code
        self.name = name
        self.nativeName = nativeName
        self.flag = flag
    }
    
    // MARK: - Common Languages
    static let english = Language(code: "en", name: "English", nativeName: "English", flag: "🇺🇸")
    static let spanish = Language(code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸")
    static let french = Language(code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷")
    static let german = Language(code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪")
    static let italian = Language(code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹")
    static let portuguese = Language(code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹")
    static let russian = Language(code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺")
    static let chinese = Language(code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳")
    static let japanese = Language(code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵")
    static let korean = Language(code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷")
    static let arabic = Language(code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦")
    static let hindi = Language(code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳")
    static let dutch = Language(code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱")
    static let polish = Language(code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱")
    static let turkish = Language(code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷")
    static let swedish = Language(code: "sv", name: "Swedish", nativeName: "Svenska", flag: "🇸🇪")
    static let norwegian = Language(code: "no", name: "Norwegian", nativeName: "Norsk", flag: "🇳🇴")
    static let danish = Language(code: "da", name: "Danish", nativeName: "Dansk", flag: "🇩🇰")
    static let finnish = Language(code: "fi", name: "Finnish", nativeName: "Suomi", flag: "🇫🇮")
    static let greek = Language(code: "el", name: "Greek", nativeName: "Ελληνικά", flag: "🇬🇷")
    static let czech = Language(code: "cs", name: "Czech", nativeName: "Čeština", flag: "🇨🇿")
    static let romanian = Language(code: "ro", name: "Romanian", nativeName: "Română", flag: "🇷🇴")
    static let hungarian = Language(code: "hu", name: "Hungarian", nativeName: "Magyar", flag: "🇭🇺")
    static let thai = Language(code: "th", name: "Thai", nativeName: "ไทย", flag: "🇹🇭")
    static let vietnamese = Language(code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳")
    static let indonesian = Language(code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩")
    static let malay = Language(code: "ms", name: "Malay", nativeName: "Bahasa Melayu", flag: "🇲🇾")
    static let hebrew = Language(code: "he", name: "Hebrew", nativeName: "עברית", flag: "🇮🇱")
    static let ukrainian = Language(code: "uk", name: "Ukrainian", nativeName: "Українська", flag: "🇺🇦")
    static let bengali = Language(code: "bn", name: "Bengali", nativeName: "বাংলা", flag: "🇧🇩")
    static let tamil = Language(code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳")
    static let telugu = Language(code: "te", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳")
    static let marathi = Language(code: "mr", name: "Marathi", nativeName: "मराठी", flag: "🇮🇳")
    static let gujarati = Language(code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", flag: "🇮🇳")
    static let kannada = Language(code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🇮🇳")
    static let malayalam = Language(code: "ml", name: "Malayalam", nativeName: "മലയാളം", flag: "🇮🇳")
    static let punjabi = Language(code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", flag: "🇮🇳")
    static let urdu = Language(code: "ur", name: "Urdu", nativeName: "اردو", flag: "🇵🇰")
    static let persian = Language(code: "fa", name: "Persian", nativeName: "فارسی", flag: "🇮🇷")
    static let swahili = Language(code: "sw", name: "Swahili", nativeName: "Kiswahili", flag: "🇰🇪")
    
    // MARK: - All Languages
    static let allLanguages: [Language] = [
        .english, .spanish, .french, .german, .italian, .portuguese,
        .russian, .chinese, .japanese, .korean, .arabic, .hindi,
        .dutch, .polish, .turkish, .swedish, .norwegian, .danish,
        .finnish, .greek, .czech, .romanian, .hungarian, .thai,
        .vietnamese, .indonesian, .malay, .hebrew, .ukrainian,
        .bengali, .tamil, .telugu, .marathi, .gujarati, .kannada,
        .malayalam, .punjabi, .urdu, .persian, .swahili
    ].sorted { $0.name < $1.name }
    
    // MARK: - Popular Languages
    static let popularLanguages: [Language] = [
        .english, .spanish, .french, .german, .chinese,
        .japanese, .korean, .portuguese, .italian, .russian
    ]
}

// MARK: - Language Detection
extension Language {
    /// Attempts to detect the language of the given text
    static func detect(text: String) -> Language? {
        guard !text.isEmpty else { return nil }
        
        // Use NSLinguisticTagger for language detection
        let tagger = NSLinguisticTagger(tagSchemes: [.language], options: 0)
        tagger.string = text
        
        guard let languageCode = tagger.tag(at: 0, scheme: .language, tokenRange: nil, sentenceRange: nil)?.rawValue else {
            return nil
        }
        
        // Find matching language
        return allLanguages.first { $0.code == languageCode || languageCode.hasPrefix($0.code) }
    }
}

export interface LanguageInfo {
  code: string;
  name: string;
  bcp47: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', bcp47: 'en-US', nativeName: 'English' },
  { code: 'ta', name: 'Tamil', bcp47: 'ta-IN', nativeName: 'தமிழ்' },
  { code: 'ta-Latn', name: 'Tanglish', bcp47: 'ta-IN', nativeName: 'Tamil (English Script)' },
  { code: 'hi', name: 'Hindi', bcp47: 'hi-IN', nativeName: 'हिन्दी' },
  { code: 'hi-Latn', name: 'Hinglish', bcp47: 'hi-IN', nativeName: 'Hindi (English Script)' },
  { code: 'te', name: 'Telugu', bcp47: 'te-IN', nativeName: 'తెలుగు' },
  { code: 'ml', name: 'Malayalam', bcp47: 'ml-IN', nativeName: 'മലയാളം' },
  { code: 'kn', name: 'Kannada', bcp47: 'kn-IN', nativeName: 'ಕನ್ನಡ' },
  { code: 'ar', name: 'Arabic', bcp47: 'ar-SA', nativeName: 'العربية' },
  { code: 'fr', name: 'French', bcp47: 'fr-FR', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', bcp47: 'es-ES', nativeName: 'Español' },
  { code: 'de', name: 'German', bcp47: 'de-DE', nativeName: 'Deutsch' },
  { code: 'zh', name: 'Chinese', bcp47: 'zh-CN', nativeName: '中文' },
];

export class LanguageService {
  private static instance: LanguageService;

  private constructor() {}

  public static getInstance(): LanguageService {
    if (!LanguageService.instance) {
      LanguageService.instance = new LanguageService();
    }
    return LanguageService.instance;
  }

  /**
   * Lightweight on-device language detection based on Unicode script analysis and vocabulary patterns.
   */
  public detectLanguage(input: string): LanguageInfo {
    const text = input.trim();
    if (!text) return SUPPORTED_LANGUAGES[0];

    // Unicode Script Ranges
    const tamilRegex = /[\u0B80-\u0BFF]/;
    const hindiRegex = /[\u0900-\u097F]/;
    const teluguRegex = /[\u0C00-\u0C7F]/;
    const malayalamRegex = /[\u0D00-\u0D7F]/;
    const kannadaRegex = /[\u0C80-\u0CFF]/;
    const arabicRegex = /[\u0600-\u06FF]/;
    const chineseRegex = /[\u4E00-\u9FFF]/;

    if (tamilRegex.test(text)) return SUPPORTED_LANGUAGES[1]; // Tamil
    if (hindiRegex.test(text)) return SUPPORTED_LANGUAGES[3]; // Hindi
    if (teluguRegex.test(text)) return SUPPORTED_LANGUAGES[5]; // Telugu
    if (malayalamRegex.test(text)) return SUPPORTED_LANGUAGES[6]; // Malayalam
    if (kannadaRegex.test(text)) return SUPPORTED_LANGUAGES[7]; // Kannada
    if (arabicRegex.test(text)) return SUPPORTED_LANGUAGES[8]; // Arabic
    if (chineseRegex.test(text)) return SUPPORTED_LANGUAGES[12]; // Chinese

    const lower = text.toLowerCase();

    // Tanglish heuristics (Latin script with Tamil vocabulary)
    const tanglishWords = [
      'sollu', 'solli', 'solreenga', 'pannu', 'panu', 'pannunga', 'kodu', 'kodunga',
      'podu', 'rendu', 'moonu', 'naalu', 'anju', 'romba', 'enakku', 'unakku',
      'enna', 'epdi', 'eppadi', 'irukku', 'irukken', 'vanakkam', 'nandri', 'pathi',
      'theriyum', 'poda', 'vaanga', 'amma', 'appa', 'illa', 'illai', 'aama',
      'seri', 'konjam', 'thani', 'saapadu', 'thambi', 'kaasu', 'evvalavu', 'oru'
    ];
    let tanglishMatches = 0;
    for (const w of tanglishWords) {
      if (new RegExp(`\\b${w}\\b`, 'i').test(lower)) {
        tanglishMatches++;
      }
    }
    if (tanglishMatches >= 1) {
      return SUPPORTED_LANGUAGES[2]; // Tanglish
    }

    // Hinglish heuristics (Latin script with Hindi vocabulary)
    const hinglishWords = [
      'kya', 'hai', 'hain', 'kaise', 'batao', 'bataiye', 'karo', 'karna',
      'namaste', 'dhanyavad', 'shukriya', 'mujhe', 'aapko', 'tumhe', 'accha',
      'theek', 'kahan', 'kyun', 'kab', 'kaun', 'chahiye', 'bolo', 'sunao'
    ];
    let hinglishMatches = 0;
    for (const w of hinglishWords) {
      if (new RegExp(`\\b${w}\\b`, 'i').test(lower)) {
        hinglishMatches++;
      }
    }
    if (hinglishMatches >= 1) {
      return SUPPORTED_LANGUAGES[4]; // Hinglish
    }

    // French heuristics
    if (/\b(bonjour|merci|comment|pourquoi|oui|s'il vous plaît|salut)\b/i.test(lower)) {
      return SUPPORTED_LANGUAGES[9];
    }

    // Spanish heuristics
    if (/\b(hola|gracias|buenos|por favor|amigo|como|adios)\b/i.test(lower)) {
      return SUPPORTED_LANGUAGES[10];
    }

    // German heuristics
    if (/\b(guten|tag|danke|bitte|hallo|wie|tschuss)\b/i.test(lower)) {
      return SUPPORTED_LANGUAGES[11];
    }

    // Default English
    return SUPPORTED_LANGUAGES[0];
  }

  /**
   * Sanitizes AI response text for text-to-speech reading:
   * Removes markdown syntax, code snippets, system tags, and URLs.
   */
  public cleanTextForTTS(input: string): string {
    return input
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove URLs
      .replace(/https?:\/\/\S+/g, '')
      // Remove brackets and system notices like [Security Notice: ...]
      .replace(/\[.*?\]/g, '')
      // Remove markdown headings, bold, bullet points
      .replace(/^[#*>\-\d.]+\s+/gm, '')
      .replace(/[*_~#]/g, '')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }
}

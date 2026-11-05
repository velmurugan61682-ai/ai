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
   * Checks if input contains both Tamil Unicode script and Latin English script.
   */
  public isMixedScript(input: string): boolean {
    const text = input || '';
    const hasTamil = /[\u0B80-\u0BFF]/.test(text);
    const hasLatin = /[a-zA-Z]/.test(text);
    return hasTamil && hasLatin;
  }

  /**
   * On-device language detection based on Unicode script analysis, mixed-script detection,
   * and an expanded Tanglish vocabulary for colloquial Tamil.
   */
  public detectLanguage(input: string): LanguageInfo {
    const text = (input || '').trim();
    if (!text) return SUPPORTED_LANGUAGES[0];

    // 1. Mixed Script (Tamil + Latin) -> Categorized as Tanglish/Tamil colloquial
    if (this.isMixedScript(text)) {
      return SUPPORTED_LANGUAGES[2]; // Tanglish
    }

    // 2. Pure Unicode Script Ranges
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

    // 3. Rich Tanglish vocabulary analysis across conversational and shop/billing operations
    const tanglishVocabulary = [
      // Actions & Verbs
      'sollu', 'solli', 'solren', 'solreenga', 'pannu', 'panu', 'pannunga', 'kodu', 'kodunga', 'kudunga',
      'podu', 'podunga', 'eduthudu', 'edunga', 'vaanga', 'ponga', 'kelambu', 'kudichiya', 'kudicha', 'paathu',
      'paathukaren', 'pathukaren',
      // Quantities & Numerals
      'oru', 'onnu', 'rendu', 'erandu', 'moonu', 'moondru', 'naalu', 'anju', 'aaru', 'ezhu', 'ettu', 'ombodhu', 'pathu',
      'innum', 'konjam', 'romba', 'kammi', 'neraya', 'kooda',
      // Questions & Conjunctions
      'enna', 'epdi', 'eppadi', 'edhu', 'edhukku', 'enga', 'engirukku', 'evlo', 'evvalavu', 'aachu', 'aagudhu', 'yaaru',
      'innaiku', 'naalaikku', 'ippo', 'appo',
      // Shop & Daily colloquial
      'venum', 'vendaam', 'vendam', 'kaasu', 'panam', 'selavu', 'kadai', 'theva', 'seri', 'aama', 'illa', 'illai',
      'thambi', 'anna', 'akka', 'nalla', 'onnum', 'unakku', 'ungalukku', 'enakku', 'engalukku', 'vanakkam', 'nandri'
    ];

    let tanglishMatches = 0;
    for (const w of tanglishVocabulary) {
      if (new RegExp(`(^|\\s)${w}(\\s|$)`, 'i').test(lower)) {
        tanglishMatches++;
      }
    }

    if (tanglishMatches >= 1) {
      return SUPPORTED_LANGUAGES[2]; // Tanglish
    }

    // 4. Hinglish heuristics
    const hinglishWords = [
      'kya', 'hai', 'hain', 'kaise', 'batao', 'bataiye', 'karo', 'karna',
      'namaste', 'dhanyavad', 'shukriya', 'mujhe', 'aapko', 'tumhe', 'accha',
      'theek', 'kahan', 'kyun', 'kab', 'kaun', 'chahiye', 'bolo', 'sunao'
    ];
    let hinglishMatches = 0;
    for (const w of hinglishWords) {
      if (new RegExp(`(^|\\s)${w}(\\s|$)`, 'i').test(lower)) {
        hinglishMatches++;
      }
    }
    if (hinglishMatches >= 1) {
      return SUPPORTED_LANGUAGES[4]; // Hinglish
    }

    // 5. European Language heuristics
    if (/\b(bonjour|merci|comment|pourquoi|oui|s'il vous plaît|salut)\b/i.test(lower)) {
      return SUPPORTED_LANGUAGES[9];
    }
    if (/\b(hola|gracias|buenos|por favor|amigo|como|adios)\b/i.test(lower)) {
      return SUPPORTED_LANGUAGES[10];
    }
    if (/\b(guten|tag|danke|bitte|hallo|wie|tschuss)\b/i.test(lower)) {
      return SUPPORTED_LANGUAGES[11];
    }

    // Default English
    return SUPPORTED_LANGUAGES[0];
  }

  /**
   * Sanitizes AI response text for text-to-speech reading.
   */
  public cleanTextForTTS(input: string): string {
    return (input || '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/\[.*?\]/g, '')
      .replace(/^[#*>\-\d.]+\s+/gm, '')
      .replace(/[*_~#]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

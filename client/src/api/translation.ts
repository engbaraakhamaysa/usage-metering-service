export interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface TranslationResult {
  text: string;
  simulated: boolean;
}

/** Replace with a real provider later; pages depend only on this interface. */
export interface Translator {
  translate(req: TranslationRequest): Promise<TranslationResult>;
}

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
] as const;

export const simulatedTranslator = (opts: { fail: () => boolean }): Translator => ({
  async translate({ text, sourceLanguage, targetLanguage }) {
    await new Promise((r) => setTimeout(r, 400));
    if (opts.fail()) throw new Error("Simulated translation failure");
    return { text: `[SIMULATED ${sourceLanguage}→${targetLanguage}] ${text}`, simulated: true };
  },
});

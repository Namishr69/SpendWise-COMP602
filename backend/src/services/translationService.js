const GOOGLE_TRANSLATE_URL =
    'https://translation.googleapis.com/language/translate/v2';

const SUPPORTED_LANGUAGES = [
    'en',
    'fil',
    'mi',
    'es',
    'fr',
];

const translationCache = new Map();

function getCacheKey(text, targetLanguage) {
    return `${targetLanguage}:${text}`;
}

const translationService = {
    async translateText(text, targetLanguage) {
        const translations = await this.translateTexts(
            [text],
            targetLanguage
        );

        return translations[0];
    },

    async translateTexts(texts, targetLanguage) {
        if (!Array.isArray(texts) || texts.length === 0) {
            throw new Error('Texts are required');
        }

        if (!targetLanguage) {
            throw new Error('Target language is required');
        }

        if (!SUPPORTED_LANGUAGES.includes(targetLanguage)) {
            throw new Error('Unsupported language');
        }

        if (texts.some((text) => typeof text !== 'string')) {
            throw new Error('All texts must be strings');
        }

        // English is the original SpendWise UI language.
        if (targetLanguage === 'en') {
            return texts;
        }

        const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

        if (!apiKey) {
            throw new Error(
                'Google Translate API key is not configured'
            );
        }

        const results = new Array(texts.length);
        const missingTexts = [];
        const missingIndexes = [];

        texts.forEach((text, index) => {
            const cacheKey = getCacheKey(
                text,
                targetLanguage
            );

            if (translationCache.has(cacheKey)) {
                results[index] = translationCache.get(cacheKey);
            } else {
                missingTexts.push(text);
                missingIndexes.push(index);
            }
        });

        if (missingTexts.length > 0) {
            const response = await fetch(
                `${GOOGLE_TRANSLATE_URL}?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        q: missingTexts,
                        source: 'en',
                        target: targetLanguage,
                        format: 'text',
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                console.error(
                    'Google Translation API error:',
                    data.error
                );

                throw new Error('Failed to translate text');
            }

            const translations =
                data.data?.translations || [];

            if (
                translations.length !==
                missingTexts.length
            ) {
                throw new Error(
                    'Unexpected translation response'
                );
            }

            translations.forEach(
                (translation, translationIndex) => {
                    const originalText =
                        missingTexts[translationIndex];

                    const resultIndex =
                        missingIndexes[translationIndex];

                    const translatedText =
                        translation.translatedText;

                    translationCache.set(
                        getCacheKey(
                            originalText,
                            targetLanguage
                        ),
                        translatedText
                    );

                    results[resultIndex] = translatedText;
                }
            );
        }

        return results;
    },
};

export default translationService;
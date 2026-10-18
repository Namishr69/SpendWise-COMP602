const GOOGLE_TRANSLATE_URL =
    'https://translation.googleapis.com/language/translate/v2';

const SUPPORTED_LANGUAGES = [
    'en',
    'fil',
    'mi',
    'es',
    'fr',
];

// Google Translate v2 accepts a batch in `q`, but not an unbounded one. The
// UI translates whole pages, so a long page is split into a few requests.
const MAX_SEGMENTS_PER_REQUEST = 100;
const MAX_CHARS_PER_REQUEST = 20_000;

const translationCache = new Map();

function getCacheKey(text, targetLanguage) {
    return `${targetLanguage}:${text}`;
}

/**
 * Google returns translated text with HTML entities escaped (it treats the
 * input as HTML-flavoured text even with format=text). Decode the handful that
 * show up in this UI so "Don't" is not rendered as "Don&#39;t".
 *
 * `&amp;` is decoded last, otherwise "&amp;#39;" would turn into an apostrophe.
 */
function decodeEntities(text) {
    return text
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/gi, "'")
        .replace(/&quot;/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

/**
 * Splits the segments into request-sized batches, keeping the original order.
 * Each batch is an array of { text, index } so a translation can be written
 * back to the position it came from.
 */
function batchTexts(texts) {
    const batches = [];
    let current = [];
    let currentChars = 0;

    texts.forEach((text, index) => {
        const wouldOverflow =
            current.length >= MAX_SEGMENTS_PER_REQUEST ||
            currentChars + text.length > MAX_CHARS_PER_REQUEST;

        if (current.length > 0 && wouldOverflow) {
            batches.push(current);
            current = [];
            currentChars = 0;
        }

        current.push({ text, index });
        currentChars += text.length;
    });

    if (current.length > 0) {
        batches.push(current);
    }

    return batches;
}

/** One HTTP call to Google Translate. Returns the translations, in order. */
async function translateBatch(batch, targetLanguage, apiKey) {
    const response = await fetch(
        `${GOOGLE_TRANSLATE_URL}?key=${encodeURIComponent(apiKey)}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: batch.map((item) => item.text),
                source: 'en',
                target: targetLanguage,
                format: 'text',
            }),
        }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const detail = data.error?.message || `HTTP ${response.status}`;
        console.error('Google Translation API error:', detail);

        const error = new Error(`Failed to translate text: ${detail}`);
        // A rejected API key is a server misconfiguration, not a bad request.
        error.status =
            response.status === 403 || response.status === 401
                ? 503
                : 400;

        throw error;
    }

    const translations = data.data?.translations || [];

    if (translations.length !== batch.length) {
        throw new Error('Unexpected translation response');
    }

    return translations.map((translation) =>
        decodeEntities(translation.translatedText || '')
    );
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

        const apiKey = (process.env.GOOGLE_TRANSLATE_API_KEY || '').trim();

        if (!apiKey) {
            const error = new Error(
                'Google Translate API key is not configured'
            );
            error.status = 503;
            throw error;
        }

        const results = new Array(texts.length);
        const missing = [];

        texts.forEach((text, index) => {
            const cacheKey = getCacheKey(text, targetLanguage);

            if (translationCache.has(cacheKey)) {
                results[index] = translationCache.get(cacheKey);
            } else {
                missing.push({ text, index });
            }
        });

        for (const batch of batchTexts(missing.map((item) => item.text))) {
            const translated = await translateBatch(
                batch,
                targetLanguage,
                apiKey
            );

            translated.forEach((translatedText, position) => {
                const { text, index } = missing[batch[position].index];

                translationCache.set(
                    getCacheKey(text, targetLanguage),
                    translatedText
                );

                results[index] = translatedText;
            });
        }

        return results;
    },
};

export default translationService;
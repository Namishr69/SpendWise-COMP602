import translationService from '../services/translationService.js';

const translationController = {
    async translate(req, res) {
        try {
            const {
                text,
                texts,
                targetLanguage,
            } = req.body;

            // Batch translation
            if (Array.isArray(texts)) {
                const translatedTexts =
                    await translationService.translateTexts(
                        texts,
                        targetLanguage
                    );

                return res.json({
                    translatedTexts,
                });
            }

            // Single-text translation
            const translatedText =
                await translationService.translateText(
                    text,
                    targetLanguage
                );

            return res.json({
                translatedText,
            });
        } catch (error) {
            return res.status(400).json({
                error: error.message,
            });
        }
    },
};

export default translationController;
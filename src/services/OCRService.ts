// JEE Connect - On-Device OCR Service
// Sprint 3: Image-to-text pipeline with formula recognition
// Uses Google ML Kit interface (stub for Expo managed workflow)

import { knowledgeRepository } from '../repositories/KnowledgeRepository';

export interface OCRResult {
    rawText: string;
    detectedFormulas: string[];
    confidence: number; // 0-1
    language: string;
}

export interface FormulaMatch {
    formula: string;
    chapter: string;
    resourceTitle: string;
    matchScore: number;
}

class OCRServiceClass {
    // Process an image and extract text (ML Kit stub)
    // In a real implementation, this would call Google ML Kit's on-device text recognizer
    async processImage(imageUri: string): Promise<OCRResult> {
        // Stub: In production, this would use:
        // - @react-native-ml-kit/text-recognition for text
        // - Custom formula detection model
        console.log('[OCR] Processing image:', imageUri);

        // Simulate OCR processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Return a stub result indicating OCR is ready but needs native module
        return {
            rawText: '[OCR Module Ready — Connect ML Kit for live text extraction]',
            detectedFormulas: [],
            confidence: 0,
            language: 'en',
        };
    }

    // Search the local Knowledge Base for matching formulas
    async searchKnowledgeBase(queryText: string): Promise<FormulaMatch[]> {
        const matches: FormulaMatch[] = [];

        try {
            // Search resources for matching content
            const resources = await knowledgeRepository.searchResources(queryText);

            for (const res of resources.slice(0, 5)) {
                matches.push({
                    formula: queryText,
                    chapter: res.chapter_id,
                    resourceTitle: res.title,
                    matchScore: 0.8,
                });
            }

            // If no direct match, try keyword fragments
            if (matches.length === 0) {
                const keywords = queryText.split(/\s+/).filter(w => w.length > 3);
                for (const keyword of keywords.slice(0, 3)) {
                    const keyResults = await knowledgeRepository.searchResources(keyword);
                    for (const res of keyResults.slice(0, 2)) {
                        matches.push({
                            formula: keyword,
                            chapter: res.chapter_id,
                            resourceTitle: res.title,
                            matchScore: 0.5,
                        });
                    }
                }
            }
        } catch (e) {
            console.log('[OCR] Knowledge search error:', e);
        }

        return matches;
    }

    // Detect the language of input text (simple heuristic)
    detectLanguage(text: string): string {
        const hindiChars = /[\u0900-\u097F]/;
        const teluguChars = /[\u0C00-\u0C7F]/;
        const marathiChars = /[\u0900-\u097F]/; // Shares Devanagari with Hindi

        if (hindiChars.test(text)) return 'hi';
        if (teluguChars.test(text)) return 'te';
        return 'en';
    }

    // Format OCR result for chat display
    formatForChat(result: OCRResult, matches: FormulaMatch[]): string {
        if (result.confidence === 0) {
            return "📷 OCR module is ready! In the full version, I can read problems from photos using Google ML Kit.\n\n" +
                "For now, you can type your question and I'll help solve it! 💪\n\n" +
                "📌 Tip: Go to Subjects → pick a chapter → find formulas & PYQs directly!";
        }

        let response = `📷 **Detected Text:**\n${result.rawText}\n\n`;

        if (result.detectedFormulas.length > 0) {
            response += `📐 **Formulas Found:**\n${result.detectedFormulas.map(f => `• ${f}`).join('\n')}\n\n`;
        }

        if (matches.length > 0) {
            response += `📚 **Related Resources:**\n`;
            matches.forEach(m => {
                response += `• ${m.resourceTitle} (${Math.round(m.matchScore * 100)}% match)\n`;
            });
        }

        return response;
    }
}

export const ocrService = new OCRServiceClass();

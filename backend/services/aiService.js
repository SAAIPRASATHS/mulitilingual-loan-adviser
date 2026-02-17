const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const path = require('path');
const Groq = require('groq-sdk');
let groq;
if (process.env.GROQ_API_KEY) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
} else {
    console.error('CRITICAL: GROQ_API_KEY is not defined in environment variables.');
}

const Loan = require('../models/Loan');

i18next
    .use(Backend)
    .init({
        fallbackLng: 'en',
        lng: 'en',
        preload: ['en', 'hi', 'ta'],
        backend: {
            loadPath: path.join(__dirname, '../locales/{{lng}}.json')
        }
    });

/**
 * AI Service for handling multilingual conversations using Groq AI.
 */
class AIService {
    /**
     * Process user input and return a response
     * @param {string} text - User's input text
     * @param {string} lang - Language code (en, hi, ta)
     * @param {Object} context - Conversation context
     * @returns {Promise<Object>} - Assistant response and updated context
     */
    async processMessage(text, lang, history = [], context = {}) {
        const input = text.toLowerCase();
        let response = "";
        let nextIntent = context.currentIntent;

        // Detect script
        const detectedLang = this.detectScript(text);
        const activeLang = detectedLang !== 'en' ? detectedLang : lang;

        // Change language if requested or detected
        if (i18next.language !== activeLang) {
            await i18next.changeLanguage(activeLang);
        }

        try {
            const groqResponse = await this.getGroqResponse(text, activeLang, history, context);
            return groqResponse;
        } catch (error) {
            console.error("Groq Error:", error.message);

            // Fallback to rules if Groq service is unavailable
            const mappings = {
                greeting: {
                    keywords: ['hello', 'hi', 'namaste', 'vanakkam', 'hey', 'नमस्ते', 'வணக்கம்'],
                    response: i18next.t('welcome') + " " + i18next.t('how_can_i_help')
                },
                loan_info: {
                    keywords: ['loan', 'credit', 'borrow', 'money', 'ऋण', 'कर्ज', 'கடன்', 'பணம்'],
                    response: i18next.t('loan_eligibility') + " " + i18next.t('loan_types')
                }
            };

            for (const [intent, data] of Object.entries(mappings)) {
                if (data.keywords.some(k => input.includes(k))) {
                    response = data.response;
                    nextIntent = intent;
                    return {
                        content: response,
                        role: 'assistant',
                        context: { ...context, currentIntent: nextIntent }
                    };
                }
            }

            return {
                content: "I'm having trouble connecting to my AI brain at the moment. Please try again in a minute.",
                role: 'assistant',
                context
            };
        }
    }

    async getGroqResponse(text, lang, history, context) {
        const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
        const availableLoans = await Loan.find({ isActive: true });
        const loanContext = availableLoans.map(l => {
            const crit = l.eligibilityCriteria;
            return `
            - Name: ${l.name.en}
            - ID: ${l._id}
            - Type: ${l.loanType}
            - Description: ${l.description.en}
            - Amount: ₹${l.loanAmount.min} - ₹${l.loanAmount.max}
            - Interest: ${l.interestRate.min}% - ${l.interestRate.max}%
            - Eligibility: Min Age ${crit.minAge}, Max Age ${crit.maxAge}, Min Income ₹${crit.minIncome}, Min Credit Score ${crit.minCreditScore}.
            - Documents Required: ${l.requiredDocuments.map(d => d.en).join(', ')}
            `;
        }).join('\n');

        const systemPrompt = `You are a helpful and professional Loan Advisor for "LoanAdvisor".
        Interface Language: ${lang}.

        CRITICAL SCRIPT RULE:
        - If the user writes in Tamil script (e.g., வணக்கம்), YOU MUST RESPOND IN TAMIL SCRIPT.
        - If the user writes in Hindi script (e.g., नमस्ते), YOU MUST RESPOND IN HINDI SCRIPT.
        - If the user writes in English, respond in English.

        DYNAMIC LANGUAGE ADAPTATION:
        1. "Tamil Script": Use natural Tamil script. You can mix common English loan terms in English script if they are better understood, but keep the core message in Tamil script.
        2. "Hindi Script": Use natural Hindi script. You can mix common English loan terms in English script if they are better understood, but keep the core message in Hindi script.
        3. "Tunglish" (Input in English but intent is Tamil): Use Natural Tamil mixed with English loan terms (e.g., "Interest rate evvalavu?").
        4. "Hinglish" (Input in English but intent is Hindi): Use Natural Hindi mixed with English loan terms (e.g., "Aapka income kitna hai?").

        GENERAL RULES:
        1. ALWAYS use English for technical terms: Loan IDs, Statuses, Document names (Identity Proof, Address Proof), and specific loan names (Personal Loan, Vehicle Loan).
        2. Match the user's tone and complexity.
        3. Respond in the language/script used by the user in their most recent message.
        
        GOAL: Collect details concisely and check eligibility.
        
        FLOW:
        1. If user hasn't picked a loan: Ask them to pick one from the list (Personal, Home, Education, Business, Vehicle, etc.).
        2. Once picked: Ask for (Age, Monthly Income, CIBIL Score) in ONE message.
        3. Once provided: Calculate eligibility and output verdict.
        
        RULES:
        - KEEP CONVERSATIONS SHORT. Max 2-3 exchanges to reach a verdict.
        - DO NOT give long financial advice unless asked.
        
        CRITICAL TAGS (MUST INCLUDE):
        - If ELIGIBLE: [[ELIGIBILITY_RESULT:eligible:LOAN_ID]]
          (Replace LOAN_ID with the actual MongoDB _ID from the database below)
        - If NOT ELIGIBLE: [[ELIGIBILITY_RESULT:ineligible:REASON]]

        Available Loan Products:
        ${loanContext}

        Current Context Status: ${context.currentIntent || 'greeting_stage'}`;

        const messages = [
            { role: "system", content: systemPrompt },
            ...(history || []).map(msg => ({ role: (msg.role === 'assistant' ? 'assistant' : 'user'), content: msg.content })),
            { role: "user", content: text }
        ];

        if (!groq) {
            throw new Error('AI Service is not configured (missing GROQ_API_KEY)');
        }

        const chatCompletion = await groq.chat.completions.create({
            messages: messages,
            model: model,
            temperature: 0.5,
            max_tokens: 1024,
            top_p: 1,
            stream: false
        });

        return {
            content: chatCompletion.choices[0].message.content,
            role: 'assistant',
            context: {
                ...context,
                currentIntent: "ai_handled"
            }
        };
    }

    async translateText(text, targetLang) {
        const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
        const systemPrompt = `Translate the following text into ${targetLang}. 
        Return ONLY the translated text without any explanations, quotes, or additional notes.
        If targetLang is 'ta', use Tamil script.
        If targetLang is 'hi', use Hindi script.`;

        if (!groq) {
            throw new Error('AI Service is not configured (missing GROQ_API_KEY)');
        }

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text }
            ],
            model: model,
            temperature: 0.3,
            max_tokens: 1024
        });

        return chatCompletion.choices[0].message.content.trim();
    }

    detectScript(text) {
        const tamilRegex = /[\u0B80-\u0BFF]/;
        const hindiRegex = /[\u0900-\u097F]/;

        if (tamilRegex.test(text)) return 'ta';
        if (hindiRegex.test(text)) return 'hi';
        return 'en';
    }
}

module.exports = new AIService();

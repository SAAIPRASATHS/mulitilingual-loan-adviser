const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const aiService = require('../services/aiService');
const { protect } = require('../middleware/auth');

// @desc    Send a message to the AI advisor
// @route   POST /api/chat
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { text, language, isVoice } = req.body;

        // Find or create active conversation
        let conversation = await Conversation.findOne({
            user: req.user._id,
            isActive: true
        });

        if (!conversation) {
            conversation = await Conversation.create({
                user: req.user._id,
                language: language || req.user.languagePreference || 'en',
                messages: []
            });
        }

        // Add user message
        conversation.messages.push({
            role: 'user',
            content: text,
            isVoice: isVoice || false
        });

        // Get AI response
        const aiResponse = await aiService.processMessage(
            text,
            language || conversation.language,
            conversation.messages,
            conversation.context
        );

        // Add assistant message
        conversation.messages.push({
            role: aiResponse.role,
            content: aiResponse.content
        });

        // Update context
        conversation.context = aiResponse.context;

        await conversation.save();

        res.json({
            message: aiResponse.content,
            conversationId: conversation._id,
            context: conversation.context
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @desc    Translate a message
 * @route   POST /api/chat/translate
 * @access  Private
 */
router.post('/translate', protect, async (req, res) => {
    try {
        const { text, targetLang } = req.body;
        if (!text || !targetLang) {
            return res.status(400).json({ message: 'Text and targetLang are required' });
        }

        const translatedText = await aiService.translateText(text, targetLang);
        res.json({ translatedText });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// @desc    Get chat history
// @route   GET /api/chat/history
// @access  Private
router.get('/history', protect, async (req, res) => {
    try {
        const conversation = await Conversation.findOne({
            user: req.user._id,
            isActive: true
        });

        if (conversation) {
            res.json(conversation.messages);
        } else {
            res.json([]);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Clear chat history
// @route   DELETE /api/chat/history
// @access  Private
router.delete('/history', protect, async (req, res) => {
    try {
        await Conversation.findOneAndUpdate(
            { user: req.user._id, isActive: true },
            { isActive: false }
        );

        res.json({ message: 'Chat history cleared' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

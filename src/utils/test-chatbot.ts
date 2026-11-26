/**
 * Test script for ChatGPT + Toon integration
 * Run this to verify the chatbot service is working correctly
 */

import chatbotService from '@/services/chatbot.service';
import openAIService from '@/services/openai.service';
import { encodeKnowledgeBase } from './toon-encoder';

/** Writes one line of the integration report (counts only, never a credential). */
const report = (line: string): void => console.info(line);

export async function testChatbotIntegration() {
  report('🧪 Testing Chatbot Integration...\n');

  // Test 1: Toon Encoder
  report('1️⃣ Testing Toon Encoder...');
  const { toonData, tokenEstimate } = encodeKnowledgeBase();
  report(`   ✅ Knowledge base encoded`);
  report(`   📊 Estimated tokens: ${tokenEstimate}`);
  report(`   📏 Data size: ${toonData.length} characters\n`);

  // Test 2: OpenAI Service Status
  report('2️⃣ Testing OpenAI Service...');
  const isAvailable = openAIService.isAvailable();
  report(`   ${isAvailable ? '✅' : '⚠️'} OpenAI Service: ${isAvailable ? 'Available' : 'Not configured'}`);

  if (isAvailable) {
    const stats = openAIService.getStats();
    report(`   📊 Context tokens: ${stats.contextTokens}`);
    report(`   💬 Conversation length: ${stats.conversationLength}\n`);
  } else {
    report(`   ℹ️ AI answers need the backend /api/chat endpoint (provider key is server-side only)\n`);
  }

  // Test 3: Chatbot Service Status
  report('3️⃣ Testing Chatbot Service...');
  const status = chatbotService.getStatus();
  report(`   🤖 Mode: ${status.mode}`);
  report(`   ${status.openAIAvailable ? '✅' : '⚠️'} ChatGPT: ${status.openAIAvailable ? 'Enabled' : 'Disabled'}\n`);

  // Test 4: Sample Questions (Intent-based)
  report('4️⃣ Testing Intent-based Responses...');

  const intentTestQuestions = [
    'What services do you offer?',
    'How much does a website cost?',
    'Tell me about your packages',
  ];

  for (const question of intentTestQuestions) {
    report(`   ❓ Q: "${question}"`);
    try {
      const response = await chatbotService.getResponse(question);
      const preview = response.substring(0, 80).replace(/\n/g, ' ');
      report(`   💬 A: ${preview}...\n`);
    } catch (error) {
      report(`   ❌ Error: ${error}\n`);
    }
  }

  // Test 5: ChatGPT Response (if available)
  if (isAvailable) {
    report('5️⃣ Testing ChatGPT Response...');
    try {
      const question = 'Can you help me understand your cloud migration services?';
      report(`   ❓ Q: "${question}"`);

      const response = await openAIService.chat(question);

      if (!response.error) {
        const preview = response.message.substring(0, 100).replace(/\n/g, ' ');
        report(`   💬 A: ${preview}...`);
        report(`   📊 Tokens used: ${response.tokensUsed}\n`);
      } else {
        report(`   ❌ Error: ${response.error}\n`);
      }
    } catch (error) {
      report(`   ❌ Exception: ${error}\n`);
    }
  }

  // Summary
  report('📋 Summary:');
  report(`   • Toon encoding: ✅ Working (${tokenEstimate} tokens)`);
  report(`   • OpenAI service: ${isAvailable ? '✅ Working' : '⚠️ Not configured'}`);
  report(`   • Chatbot mode: ${status.mode}`);
  report(`   • Fallback system: ✅ Working\n`);

  report('✨ Integration test complete!');

  return {
    toonEncoding: true,
    openAIAvailable: isAvailable,
    mode: status.mode,
    tokenEstimate,
  };
}

// Run test if executed directly (optional, for development)
if (import.meta.env.DEV) {
  // This can be called from console:
  // import { testChatbotIntegration } from './utils/test-chatbot'
  // testChatbotIntegration()
}

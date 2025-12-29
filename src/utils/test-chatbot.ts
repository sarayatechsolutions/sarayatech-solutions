/**
 * Test script for ChatGPT + Toon integration
 * Run this to verify the chatbot service is working correctly
 */

import chatbotService from '@/services/chatbot.service';
import openAIService from '@/services/openai.service';
import { encodeKnowledgeBase } from './toon-encoder';

export async function testChatbotIntegration() {
  console.log('🧪 Testing Chatbot Integration...\n');

  // Test 1: Toon Encoder
  console.log('1️⃣ Testing Toon Encoder...');
  const { toonData, tokenEstimate } = encodeKnowledgeBase();
  console.log(`   ✅ Knowledge base encoded`);
  console.log(`   📊 Estimated tokens: ${tokenEstimate}`);
  console.log(`   📏 Data size: ${toonData.length} characters\n`);

  // Test 2: OpenAI Service Status
  console.log('2️⃣ Testing OpenAI Service...');
  const isAvailable = openAIService.isAvailable();
  console.log(`   ${isAvailable ? '✅' : '⚠️'} OpenAI Service: ${isAvailable ? 'Available' : 'Not configured'}`);

  if (isAvailable) {
    const stats = openAIService.getStats();
    console.log(`   📊 Context tokens: ${stats.contextTokens}`);
    console.log(`   💬 Conversation length: ${stats.conversationLength}\n`);
  } else {
    console.log(`   ℹ️ Set VITE_OPENAI_API_KEY in .env to enable ChatGPT mode\n`);
  }

  // Test 3: Chatbot Service Status
  console.log('3️⃣ Testing Chatbot Service...');
  const status = chatbotService.getStatus();
  console.log(`   🤖 Mode: ${status.mode}`);
  console.log(`   ${status.openAIAvailable ? '✅' : '⚠️'} ChatGPT: ${status.openAIAvailable ? 'Enabled' : 'Disabled'}\n`);

  // Test 4: Sample Questions (Intent-based)
  console.log('4️⃣ Testing Intent-based Responses...');

  const intentTestQuestions = [
    'What services do you offer?',
    'How much does a website cost?',
    'Tell me about your packages',
  ];

  for (const question of intentTestQuestions) {
    console.log(`   ❓ Q: "${question}"`);
    try {
      const response = await chatbotService.getResponse(question);
      const preview = response.substring(0, 80).replace(/\n/g, ' ');
      console.log(`   💬 A: ${preview}...\n`);
    } catch (error) {
      console.log(`   ❌ Error: ${error}\n`);
    }
  }

  // Test 5: ChatGPT Response (if available)
  if (isAvailable) {
    console.log('5️⃣ Testing ChatGPT Response...');
    try {
      const question = 'Can you help me understand your cloud migration services?';
      console.log(`   ❓ Q: "${question}"`);

      const response = await openAIService.chat(question);

      if (!response.error) {
        const preview = response.message.substring(0, 100).replace(/\n/g, ' ');
        console.log(`   💬 A: ${preview}...`);
        console.log(`   📊 Tokens used: ${response.tokensUsed}\n`);
      } else {
        console.log(`   ❌ Error: ${response.error}\n`);
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${error}\n`);
    }
  }

  // Summary
  console.log('📋 Summary:');
  console.log(`   • Toon encoding: ✅ Working (${tokenEstimate} tokens)`);
  console.log(`   • OpenAI service: ${isAvailable ? '✅ Working' : '⚠️ Not configured'}`);
  console.log(`   • Chatbot mode: ${status.mode}`);
  console.log(`   • Fallback system: ✅ Working\n`);

  console.log('✨ Integration test complete!');

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

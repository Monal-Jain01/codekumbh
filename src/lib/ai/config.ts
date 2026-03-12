import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export const aiModels = {
	primary: google('gemini-2.5-flash'),
};

export const systemPrompts = {
	general: "You are a highly capable AI assistant. Be concise and helpful.",
	jsonAgent: "You are a highly capable AI agent. Always respond in strictly VALID JSON format.",
};

export async function runBackgroundAgent(prompt: string, systemPrompt?: string) {
	try {
		const { text } = await generateText({
			model: aiModels.primary,
			system: systemPrompt ?? systemPrompts.general,
			prompt: prompt,
		});
		return text;
	} catch (error) {
		console.error("AI Generation Failed:", error);
		throw new Error("AI generation failed.");
	}
}
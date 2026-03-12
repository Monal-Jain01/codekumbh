import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export const aiModels = {
	primary: google('gemini-2.5-flash'),
};

export const systemPrompts = {
	jsonAgent: "You are a higly capable AI-agent.Always respond in strictly VALID JSON format.",
};

export async function runBackgroundAgent(prompt: string) {
	try {
		const { text } = await generateText({
			model: aiModels.primary,
			system: systemPrompts.jsonAgent,
			prompt: prompt,
		});
		return text;
	} catch (error) {
		console.error("AI Generation Failed:", error);
		throw new Error("AI request fail ho gayi!");
		}
}
import { google } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { generateText, type ToolSet, stepCountIs } from 'ai';

// Groq provider — uses GROQ_API_KEY env var
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY ?? '' });

export const aiModels = {
	/** Gemini — used for background tasks (valuation, context, insights) */
	primary: google('gemini-2.5-flash'),
	/** Groq — used for interactive chat agents (fast, generous free tier) */
	chat: groq('openai/gpt-oss-120b'),
};

export const systemPrompts = {
	general: "You are a highly capable AI assistant. Be concise and helpful.",
	jsonAgent: "You are a highly capable AI agent. Always respond in strictly VALID JSON format.",
};

/**
 * Simple text generation — no tool calling.
 * Tries Gemini first; if it fails, automatically retries with Groq.
 */
export async function runBackgroundAgent(prompt: string, systemPrompt?: string) {
	try {
		const { text } = await generateText({
			model: aiModels.primary,
			system: systemPrompt ?? systemPrompts.general,
			prompt: prompt,
		});
		return text;
	} catch (geminiError) {
		console.warn("[AI] Gemini failed, retrying with Groq:", geminiError);
		try {
			const { text } = await generateText({
				model: aiModels.chat,
				system: systemPrompt ?? systemPrompts.general,
				prompt: prompt,
			});
			console.log("[AI] Groq fallback succeeded for runBackgroundAgent");
			return text;
		} catch (groqError) {
			console.error("[AI] Both Gemini and Groq failed:", groqError);
			throw new Error("AI generation failed on both Gemini and Groq.");
		}
	}
}

/**
 * Advanced generation with tool-calling (MCP-style).
 * The AI can invoke tools (search DB, calculate metrics, etc.)
 * and the SDK automatically handles the tool call → result → continue loop.
 * stopWhen: stepCountIs(n) controls how many tool→response roundtrips are allowed.
 */
export async function runAgentWithTools(
	prompt: string,
	systemPrompt: string,
	tools: ToolSet,
	options?: { maxSteps?: number }
) {
	const maxSteps = options?.maxSteps ?? 5;

	try {
		const result = await generateText({
			model: aiModels.primary,
			system: systemPrompt,
			prompt,
			tools,
			stopWhen: stepCountIs(maxSteps),
		});
		return {
			text: result.text,
			toolCalls: result.steps.flatMap((s) => s.toolCalls ?? []),
			toolResults: result.steps.flatMap((s) => s.toolResults ?? []),
			steps: result.steps.length,
			provider: "google" as const,
		};
	} catch (geminiError) {
		console.warn("[AI] Gemini failed in runAgentWithTools, retrying with Groq:", geminiError);
		try {
			const result = await generateText({
				model: aiModels.chat,
				system: systemPrompt,
				prompt,
				tools,
				stopWhen: stepCountIs(maxSteps),
			});
			console.log("[AI] Groq fallback succeeded for runAgentWithTools");
			return {
				text: result.text,
				toolCalls: result.steps.flatMap((s) => s.toolCalls ?? []),
				toolResults: result.steps.flatMap((s) => s.toolResults ?? []),
				steps: result.steps.length,
				provider: "groq" as const,
			};
		} catch (groqError) {
			console.error("[AI] Both Gemini and Groq failed in runAgentWithTools:", groqError);
			throw new Error("AI agent failed on both Gemini and Groq.");
		}
	}
}

/**
 * Chat agent generation using Groq (Llama 3.3 70B) — fast, generous free tier.
 * Supports tool-calling just like Gemini but much faster for interactive chat.
 * Falls back to Gemini if GROQ_API_KEY is not set.
 */
export async function runChatAgentWithTools(
	prompt: string,
	systemPrompt: string,
	tools: ToolSet,
	options?: { maxSteps?: number }
) {
	const useGroq = !!process.env.GROQ_API_KEY;
	const model = useGroq ? aiModels.chat : aiModels.primary;

	try {
		const result = await generateText({
			model,
			system: systemPrompt,
			prompt,
			tools,
			stopWhen: stepCountIs(options?.maxSteps ?? 5),
		});
		return {
			text: result.text,
			toolCalls: result.steps.flatMap((s) => s.toolCalls ?? []),
			toolResults: result.steps.flatMap((s) => s.toolResults ?? []),
			steps: result.steps.length,
			provider: useGroq ? "groq" : "google",
			modelName: useGroq ? "llama-3.3-70b-versatile" : "gemini-2.5-flash",
		};
	} catch (error) {
		console.error("Chat Agent Failed:", error);
		throw new Error("Chat agent generation failed.");
	}
}
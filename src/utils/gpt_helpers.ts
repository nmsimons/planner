import { InsertableTypedNode } from "fluid-framework";
import { createAzureOpenAILanguageModel, createJsonTranslator } from "typechat";
import { getZodSchemaAsTypeScript } from "typechat/zod";
import { ZodType } from "zod";
import { getZodSchema } from "@fluidframework/tree/internal";

import { Session, Sessions } from "../schema/app_schema.js";

const sessionsZodSchema = getZodSchema(Sessions) as ZodType<InsertableTypedNode<typeof Sessions>>;

// Note: until tree schema supports literal unions, we need to explain what "sessionType" is.
const sessionSystemPrompt = `You are a service named Copilot that takes a user prompt and generates session topics for a "speaking event" scheduling application.
The "sessionType" is a string that indicates the type of the session. It can be one of 'session', 'keynote', 'panel', or 'workshop'.
`;

export function createSessionPrompter(): (prompt: string) => Promise<Iterable<Session>> {
	const endpoint =
		process.env.AZURE_OPENAI_ENDPOINT ?? localStorage.getItem("AZURE_OPENAI_ENDPOINT");

	if (endpoint === undefined || endpoint === null) {
		throw Error(
			"Expected AZURE_OPENAI_ENDPOINT to be set in environment variables or local storage",
		);
	}
	const apiKey = process.env.AZURE_OPENAI_API_KEY ?? localStorage.getItem("AZURE_OPENAI_API_KEY");

	if (apiKey === undefined || apiKey === null) {
		throw Error(
			"Expected AZURE_OPENAI_API_KEY to be set in environment variables or local storage",
		);
	}

	const model = createAzureOpenAILanguageModel(apiKey, endpoint);

	const sessionsTypeScript = getZodSchemaAsTypeScript({
		[Sessions.identifier]: sessionsZodSchema,
	});
	console.log("Generated schema:\n", sessionsTypeScript);

	const translator = createJsonTranslator<Sessions>(model, {
		getTypeName: () => Sessions.identifier,
		getSchemaText: () => JSON.stringify(sessionsTypeScript),
		validate(response: Record<string, unknown>) {
			const sessionsJsonObject = response[Sessions.identifier];
			console.log("Response: ", sessionsJsonObject);
			try {
				const typed = sessionsZodSchema.parse(sessionsJsonObject);
				console.log("Response passed validation!");
				return {
					success: true,
					data: new Sessions(typed as Iterable<InsertableTypedNode<typeof Session>>),
				};
			} catch (error: any) {
				console.error("Response was malformed.");
				console.error(error.message);
				return {
					success: false,
					message: "Malformed generated Sessions",
				};
			}
		},
	});

	return async (prompt): Promise<Iterable<Session>> => {
		const result = await translator.translate(prompt, sessionSystemPrompt);
		if (!result.success) {
			throw new Error(`AI did not return a valid response. Error: "${result.message}".`);
		}
		// TODO: separate schema for core "Session" info and annotation info like timestamps.
		// We don't need the LLM to generate the other information.
		// `id` is another interesting case. We don't really need an LLM to generate it, but we do want it to be
		// a part of the "core" schema.
		// Maybe whether or not "identifiers" are part of derived schemas is a supported policy option?
		const sessions: Session[] = result.data.map((l) => {
			const currentTime = new Date().getTime();
			return new Session({
				title: l.title,
				abstract: l.abstract,
				created: currentTime,
				sessionType: l.sessionType,
				lastChanged: currentTime,
			});
		});
		return sessions;
	};
}

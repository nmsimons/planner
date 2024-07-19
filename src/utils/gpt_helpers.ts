import { v4 as uuid } from "uuid";
import { createAzureOpenAILanguageModel, createJsonTranslator } from "typechat";
import { getJsonSchema } from "@fluidframework/tree/internal";
import { Session, Sessions } from "../schema/app_schema.js";
import Ajv from "ajv";
import { InsertableTypedNode } from "fluid-framework";

const sessionsJsonSchema = getJsonSchema(Sessions);
const jsonValidator = new Ajv.default({ strict: false });
const sessionsValidator = jsonValidator.compile(sessionsJsonSchema);

const sessionSystemPrompt = `You are a service named Copilot that takes a user prompt and generates session topics for a "speaking event" scheduling application.
The "sessionType" is a string that indicates the type of the session. It can be one of 'session', 'keynote', 'panel', or 'workshop'.
`;

export function createSessionPrompter(): (
	prompt: string,
) => Promise<Iterable<Session> | undefined> {
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
	const translator = createJsonTranslator<Sessions>(model, {
		getTypeName: () => Sessions.identifier,
		getSchemaText: () => JSON.stringify(sessionsJsonSchema),
		validate(jsonObject: Record<string, unknown>) {
			const sessionsJsonObject = jsonObject[Sessions.identifier];
			if (sessionsValidator(sessionsJsonObject)) {
				console.log("Response passed validation!");
				return {
					success: true,
					data: new Sessions(
						sessionsJsonObject as Iterable<InsertableTypedNode<typeof Session>>,
					),
				};
			}

			console.error(
				"Response was malformed.",
				sessionsValidator.errors?.map((e) => JSON.stringify(e)),
			);
			return {
				success: false,
				message: "Malformed generated Sessions",
			};
		},
	});

	return async (prompt) => {
		try {
			const result = await translator.translate(prompt, sessionSystemPrompt);
			if (!result.success) {
				throw new Error("AI did not return result");
			}
			const sessions: Session[] = result.data.map((l) => {
				const currentTime = new Date().getTime();
				return new Session({
					title: l.title,
					abstract: l.abstract,
					created: currentTime,
					sessionType: l.sessionType,
					lastChanged: currentTime,
					id: uuid(),
				});
			});
			return sessions;
		} catch (e) {
			return undefined;
		}
	};
}

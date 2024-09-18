import { v4 as uuid } from "uuid";
import { Session } from "../schema/app_schema.js";
import { AzureOpenAI } from "openai";
import axios from "axios";
import {
	ChatCompletionCreateParamsNonStreaming,
	ResponseFormatJSONSchema,
} from "openai/resources/index.mjs";
import { AccountInfo } from "@azure/msal-browser";

import { getJsonSchema } from "fluid-framework/alpha";

import Ajv from "ajv";

const sessionSystemPrompt = `You are a service named Copilot that takes a user prompt and generates session topics for a "speaking event" scheduling application.
The "sessionType" is a string that indicates the type of the session. It can be one of 'session', 'keynote', 'panel', or 'workshop'.
For example, if a user asks for three lectures about green energy, you might output:
{
	"title": "Wind Power",
	"abstract": "Dr. Alexander Pardes provides an analysis of the latest wind turbine designs and how they've improved upon existing technologies.",
	"sessionType": "session"
},
{
	"title": "Solar Complacency",
	"abstract": "Recent trends in solar panel efficiency point to a future of diminishing returns. How can we encourage new ideas in a competitive engineering space?",
	"sessionType": "session"
},
{
	"title": "Exploring Deeper: Geothermal Energy with a Twist",
	"abstract": "Several leading scientists discuss how we can tap the pressure differentials in the earth's crust to generate 'friction-energy', a technique that has only recently moved beyond pure theoretical speculation.",
	"sessionType": "session"
}


Or, another example, if a user asks for two lectures about raccoons where one is a keynote, you might output:
{
	"title": "Furry Friends or Furious Foes?",
	"abstract": "Raccoon banditry is on the rise and homeowners aren't happy. However, with a few adjustments to our behavior, we can make a welcoming space for these critters rather than being their enemy.",
	"sessionType": "keynote"
},
{
	"title": "Recent Developments in Raccoon Chew-Toys",
	"abstract": "Thanks to their opposable thumbs, raccoons are capable of enjoying chew toys that are significantly more complex than those made for cats and docs. We'll discuss how and why raccoons need more interesting toy designs, and what that means for current trends in chew toy manufacturing.",
	"sessionType": "session"
}
`;

const sessionJsonSchema = getJsonSchema(Session);
console.log("Generated JSON Schema: ", sessionJsonSchema);

const jsonValidator = new Ajv.default({ strict: false });
const validateSession = jsonValidator.compile<Session>(sessionJsonSchema);

export async function azureOpenAITokenProvider(account: AccountInfo): Promise<string> {
	const tokenProvider = process.env.TOKEN_PROVIDER_URL + "/api/getopenaitoken";
	if (tokenProvider === undefined || tokenProvider === null) {
		throw Error(
			"Expected TOKEN_PROVIDER_URL to be set in environment variables or local storage",
		);
	}

	const functionTokenResponse = await axios.post(
		process.env.TOKEN_PROVIDER_URL + "/.auth/login/aad",
		{
			access_token: account.idToken,
		},
	);

	if (functionTokenResponse.status !== 200) {
		throw new Error("Failed to get function token");
	}
	const functionToken = functionTokenResponse.data.authenticationToken;

	// get the token from the token provider
	const response = await axios.get(tokenProvider, {
		headers: {
			"Content-Type": "application/json",
			"X-ZUMO-AUTH": functionToken,
		},
	});
	return response.data as string;
}

export function createSessionPrompter(
	account: AccountInfo,
): (prompt: string) => Promise<Iterable<Session> | undefined> {
	console.log("Creating Azure OpenAI prompter");

	const endpoint =
		process.env.AZURE_OPENAI_ENDPOINT ?? localStorage.getItem("AZURE_OPENAI_ENDPOINT");

	if (endpoint === undefined || endpoint === null) {
		throw Error(
			"Expected AZURE_OPENAI_ENDPOINT to be set in environment variables or local storage",
		);
	}

	const openai = new AzureOpenAI({
		azureADTokenProvider: () => azureOpenAITokenProvider(account),
		apiVersion: "2024-08-01-preview",
	});

	// OpenAI requires that the schema root be an object.
	// To accommodate, we'll do some surgery to craft a schema that fits their expectations.
	// Namely: create a root property called "session-list" that takes an array of sessions.
	const requestSchema: ResponseFormatJSONSchema.JSONSchema = {
		schema: {
			type: "object",
			$defs: sessionJsonSchema.$defs, // Defs must be at the root
			properties: {
				"session-list": {
					type: "array",
					description: "A list of conference sessions.",
					items: {
						// Our schema is not polymorphic, so it will always have a `$ref` property (rather than `anyOf`).
						$ref: (sessionJsonSchema as any).$ref,
					},
				},
			},
			additionalProperties: false,
			required: ["session-list"],
		},
		name: "session-list-response",
		strict: true,
	};

	console.log("Request Schema: ", requestSchema);

	return async (prompt) => {
		console.log("Prompting Azure OpenAI with:", prompt);

		const body: ChatCompletionCreateParamsNonStreaming = {
			messages: [
				{ role: "system", content: sessionSystemPrompt },
				{ role: "user", content: prompt },
			],
			model: "gpt-4o",
			response_format: {
				type: "json_schema",
				json_schema: requestSchema,
			},
		};

		try {
			const result = await openai.chat.completions.create(body);
			if (!result.created) {
				throw new Error("AI did not return result");
			}
			if (result.choices.length === 0) {
				throw new Error("AI result contained no choices");
			}
			if (result.choices[0].finish_reason !== "stop") {
				return undefined;
			}

			if (!result.choices[0].message.content) {
				throw new Error("AI result contained no content");
			}

			const sessions: Session[] = [];
			const resultJson = JSON.parse(result.choices[0].message.content);

			const generatedSessionList = resultJson["session-list"] as unknown[];
			for (const generatedSession of generatedSessionList) {
				validateSession(generatedSession);
				const currentTime = new Date().getTime();
				sessions.push(
					new Session({
						// Since we gave the entire Session schema, the AI will be generating some values we don't want (timestamp, id, etc.).
						// We will override those with our own.
						...(generatedSession as Session),
						created: currentTime,
						lastChanged: currentTime,
						id: uuid(),
					}),
				);
			}

			return sessions;
		} catch (e) {
			console.error(e);
			return undefined;
		}
	};
}

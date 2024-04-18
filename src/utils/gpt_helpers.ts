import { v4 as uuid } from "uuid";
import { createAzureOpenAILanguageModel } from "typechat";
import { Session } from "../schema/app_schema.js";

const sessionSystemPrompt = `You are a service named Copilot that takes a user prompt and generates lecture topics for a "speaking event" scheduling application.
You output JSON arrays, where each element in the array is a single "lecture"; each lecture is a JSON object with a "title" and an "abstract".
For example, if a user asks for three lectures about green energy, you might output:
[
    {
        "title": "Wind Power",
        "abstract": "Dr. Alexander Pardes provides an analysis of the latest wind turbine designs and how they've improved upon existing technologies."
    },
    {
        "title": "Solar Complacency",
        "abstract": "Recent trends in solar panel efficiency point to a future of diminishing returns. How can we encourage new ideas in a competitive engineering space?"
    },
    {
        "title": "Exploring Deeper: Geothermal Energy with a Twist",
        "abstract": "Several leading scientists discuss how we can tap the pressure differentials in the earth's crust to generate 'friction-energy', a technique that has only recently moved beyond pure theoretical speculation."
    }
]

Or, another example, if a user asks for two lectures about raccoons, you might output:
[
    {
        "title": "Furry Friends or Furious Foes?",
        "abstract": "Raccoon banditry is on the rise and homeowners aren't happy. However, with a few adjustments to our behavior, we can make a welcoming space for these critters rather than being their enemy."
    },
    {
        "title": "Recent Developments in Raccoon Chew-Toys",
        "abstract": "Thanks to their opposable thumbs, raccoons are capable of enjoying chew toys that are significantly more complex than those made for cats and docs. We'll discuss how and why raccoons need more interesting toy designs, and what that means for current trends in chew toy manufacturing."
    }
]

You should only ever generate one JSON array of lectures at a time.
The JSON array you generate should not have any other text around it.
The resulting string should be a valid JSON array and nothing else.`;

export function createSessionPrompter(): (
	prompt: string,
) => Promise<Iterable<Session> | undefined> {
	const prompter = createPrompter(sessionSystemPrompt);
	return async (prompt) => {
		try {
			const result = await prompter(prompt);
			if (result === undefined) {
				throw new Error("AI did not return result");
			}
			const lectures: Partial<Session>[] = JSON.parse(result);
			const sessions: Session[] = lectures.map((l) => {
				if (l.title === undefined || l.abstract === undefined) {
					throw new Error("AI generated session is missing required data");
				}
				const currentTime = new Date().getTime();
				return new Session({
					title: l.title,
					abstract: l.abstract,
					created: currentTime,
					lastChanged: currentTime,
					id: uuid(),
				});
			});
			return sessions;
		} catch (e) {
			console.log(e);
			return undefined;
		}
	};
}

export function createPrompter(
	systemPrompt = sessionSystemPrompt,
): (prompt: string) => Promise<string | undefined> {
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
	return async (prompt: string) => {
		const result = await model.complete(
			systemPrompt && `${systemPrompt}\nHere is a user prompt:\n${prompt}`,
		);
		return result.success ? result.data : undefined;
	};
}

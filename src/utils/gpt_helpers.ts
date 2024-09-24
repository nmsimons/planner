import { Conference, Session } from "../schema/app_schema.js";
import { AzureOpenAI } from "openai";
import { PublicClientApplication } from "@azure/msal-browser";

import { TreeNode, TreeView } from "fluid-framework";

import { getAccessToken, getSessionToken } from "./auth_helpers.js";

import { generateTreeEdits } from "@fluidframework/tree/internal";

export async function azureOpenAITokenProvider(
	msalInstance: PublicClientApplication,
): Promise<string> {
	const tokenProvider = process.env.TOKEN_PROVIDER_URL + "/api/getopenaitoken";
	if (tokenProvider === undefined || tokenProvider === null) {
		throw Error(
			"Expected TOKEN_PROVIDER_URL to be set in environment variables or local storage",
		);
	}
	const sessionToken = await getSessionToken(msalInstance);
	// get the token from the token provider
	const token = await getAccessToken(tokenProvider, sessionToken);
	return token;
}

export type PrompterResult = "success" | "tooManyErrors" | "tooManyModelCalls" | "aborted";

export function createSessionPrompter(
	msalInstance: PublicClientApplication,
): (
	prompt: string,
	treeView: TreeView<typeof Conference>,
	abortController: AbortController,
) => Promise<PrompterResult> {
	console.log("Creating Azure OpenAI prompter");

	const endpoint =
		process.env.AZURE_OPENAI_ENDPOINT ?? localStorage.getItem("AZURE_OPENAI_ENDPOINT");

	if (endpoint === undefined || endpoint === null) {
		throw Error(
			"Expected AZURE_OPENAI_ENDPOINT to be set in environment variables or local storage",
		);
	}

	const openai = new AzureOpenAI({
		azureADTokenProvider: () => azureOpenAITokenProvider(msalInstance),
		apiVersion: "2024-08-01-preview",
	});

	return async (prompt, treeView, abortController) => {
		console.log("Prompting Azure OpenAI with:", prompt);
		return generateTreeEdits({
			openAIClient: openai,
			treeView,
			prompt,
			abortController,
			maxModelCalls: 20,
			finalReviewStep: true,
			dumpDebugLog: true,
			validator: (newContent: TreeNode) => {
				// validate the new content
				if (newContent instanceof Session) {
					const sessionTypes = ["session", "workshop", "keynote", "panel"];
					if (!sessionTypes.includes(newContent.sessionType)) {
						throw new Error(
							"sessionType must be one of: session, workshop, keynote, panel",
						);
					}
				}
			},
		});
	};
}

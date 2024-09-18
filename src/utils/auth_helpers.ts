import { AccountInfo, PublicClientApplication } from "@azure/msal-browser";
import axios from "axios";

export async function getFunctionToken(account: AccountInfo) {
	if (!account) {
		throw new Error("Account is required for acquiring function token");
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
	return functionTokenResponse.data.authenticationToken;
}

// Helper function to authenticate the user
export async function getMsalInstance(): Promise<PublicClientApplication> {
	// Get the client id (app id) from the environment variables
	const clientId = process.env.CLIENT_ID;

	if (!clientId) {
		throw new Error("CLIENT_ID is not defined");
	}

	// Create the MSAL instance
	const msalConfig = {
		auth: {
			clientId,
			authority: "https://login.microsoftonline.com/" + process.env.TENANT_ID,
			tenantId: process.env.TENANT_ID,
		},
	};

	// Initialize the MSAL instance
	const msalInstance = new PublicClientApplication(msalConfig);
	await msalInstance.initialize();

	return msalInstance;
}

import { PublicClientApplication } from "@azure/msal-browser";

// Helper function to authenticate the user
export async function authHelper(): Promise<PublicClientApplication> {
	// Get the client id (app id) from the environment variables
	const clientId = process.env.CLIENT_ID;

	if (!clientId) {
		throw new Error("CLIENT_ID is not defined");
	}

	// Create the MSAL instance
	const msalConfig = {
		auth: {
			clientId,
			authority: "https://login.microsoftonline.com/72f988bf-86f1-41af-91ab-2d7cd011db47/",
			tenantId: "72f988bf-86f1-41af-91ab-2d7cd011db47",
		},
	};

	// Initialize the MSAL instance
	const msalInstance = new PublicClientApplication(msalConfig);
	await msalInstance.initialize();

	return msalInstance;
}

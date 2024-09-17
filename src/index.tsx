/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

/* eslint-disable react/jsx-key */
import { speStart } from "./start/spe_start.js";
import { signedInAzureStart } from "./start/azure_start.js";

async function start() {
	const client = process.env.FLUID_CLIENT;
	const clientId = process.env.CLIENT_ID;

	switch (client) {
		case "spe":
			// Start the app in SPE mode
			await speStart();
			break;
		case "azure":
			// Start the app in Azure mode
			if (clientId === undefined) {
				throw new Error("CLIENT_ID is not defined");
			} else {
				await signedInAzureStart();
			}
			break;
		default:
			throw new Error("CLIENT_ID is not defined");
			break;
	}
}

start().catch((error) => console.error(error));

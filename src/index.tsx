/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

/* eslint-disable react/jsx-key */
import { speStart } from "./start/spe_start.js";
import { anonymousAzureStart, signedInAzureStart } from "./start/azure_start.js";

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
				await anonymousAzureStart();
			} else {
				await signedInAzureStart();
			}
			break;
		default:
			// Start the app in Azure mode
			await anonymousAzureStart();
			break;
	}
}

start().catch((error) => console.error(error));

/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { AzureMember, ITokenProvider, ITokenResponse, IUser } from "@fluidframework/azure-client";
import { ITokenClaims } from "@fluidframework/azure-client/legacy";
import { ScopeType } from "@fluidframework/protocol-definitions";
import { AxiosRequestConfig } from "axios";
import { KJUR as jsrsasign } from "jsrsasign";
import { v4 as uuid } from "uuid";
import { uniqueNamesGenerator, names } from "unique-names-generator";
import { getAccessToken } from "../../utils/auth_helpers.js";

/**
 * Insecure user definition.
 */
export interface IInsecureUser extends IUser {
	/**
	 * Name of the user making the connection to the service.
	 */
	name: string;
}

/**
 * Token Provider implementation for connecting to an Azure Function endpoint for
 * Azure Fluid Relay token resolution.
 */
export class AzureFunctionTokenProvider implements ITokenProvider {
	/**
	 * Creates a new instance using configuration parameters.
	 * @param azFunctionUrl - URL to Azure Function endpoint
	 * @param user - User object
	 */
	constructor(
		private readonly azFunctionUrl: string,
		private readonly user?: Pick<AzureMember, "name" | "id" | "additionalDetails">,
		private sessionToken?: string,
	) {}

	public async fetchOrdererToken(tenantId: string, documentId?: string): Promise<ITokenResponse> {
		return {
			jwt: await this.getAfrToken(tenantId, documentId),
		};
	}

	public async fetchStorageToken(tenantId: string, documentId: string): Promise<ITokenResponse> {
		return {
			jwt: await this.getAfrToken(tenantId, documentId),
		};
	}

	private async getAfrToken(tenantId: string, documentId: string | undefined): Promise<string> {
		if (!this.sessionToken) {
			throw new Error("sessionToken is required for acquiring AFR token");
		}

		const config: AxiosRequestConfig = {
			params: {
				tenantId,
				documentId,
				userName: this.user?.name,
				userId: this.user?.id,
				additionalDetails: this.user?.additionalDetails,
			},
		};

		const token = await getAccessToken(this.azFunctionUrl, this.sessionToken, config);
		return token;
	}
}

/**
 * Provides an in memory implementation of a Fluid Token Provider that can be
 * used to insecurely connect to the Fluid Relay.
 *
 * As the name implies, this is not secure and should not be used in production.
 * It simply makes examples where authentication is not relevant easier to bootstrap.
 */
export class InsecureTokenProvider implements ITokenProvider {
	constructor(
		/**
		 * Private server tenantKey for generating tokens.
		 */
		private readonly tenantKey: string,

		/**
		 * User with whom generated tokens will be associated.
		 */
		private readonly user: IInsecureUser,
	) {}

	/**
	 * {@inheritDoc @fluidframework/routerlicious-driver#ITokenProvider.fetchOrdererToken}
	 */
	public async fetchOrdererToken(tenantId: string, documentId?: string): Promise<ITokenResponse> {
		return {
			fromCache: true,
			jwt: generateToken(
				tenantId,
				this.tenantKey,
				[ScopeType.DocRead, ScopeType.DocWrite, ScopeType.SummaryWrite],
				documentId,
				this.user,
			),
		};
	}

	/**
	 * {@inheritDoc @fluidframework/routerlicious-driver#ITokenProvider.fetchStorageToken}
	 */
	public async fetchStorageToken(tenantId: string, documentId: string): Promise<ITokenResponse> {
		return {
			fromCache: true,
			jwt: generateToken(
				tenantId,
				this.tenantKey,
				[ScopeType.DocRead, ScopeType.DocWrite, ScopeType.SummaryWrite],
				documentId,
				this.user,
			),
		};
	}
}

export const user = generateUser();

export const azureUser = {
	id: user.id,
	name: user.name,
};

/**
 * Generates a {@link https://en.wikipedia.org/wiki/JSON_Web_Token | JSON Web Token} (JWT)
 * to authorize access to a Routerlicious-based Fluid service.
 *
 * @remarks Note: this function uses a browser friendly auth library
 * ({@link https://www.npmjs.com/package/jsrsasign | jsrsasign}) and may only be used in client (browser) context.
 * It is **not** Node.js-compatible.
 *
 * @param tenantId - See {@link @fluidframework/protocol-definitions#ITokenClaims.tenantId}
 * @param key - API key to authenticate user. Must be {@link https://en.wikipedia.org/wiki/UTF-8 | UTF-8}-encoded.
 * @param scopes - See {@link @fluidframework/protocol-definitions#ITokenClaims.scopes}
 * @param documentId - See {@link @fluidframework/protocol-definitions#ITokenClaims.documentId}.
 * If not specified, the token will not be associated with a document, and an empty string will be used.
 * @param user - User with whom generated tokens will be associated.
 * If not specified, the token will not be associated with a user, and a randomly generated mock user will be
 * used instead.
 * See {@link @fluidframework/protocol-definitions#ITokenClaims.user}
 * @param lifetime - Used to generate the {@link @fluidframework/protocol-definitions#ITokenClaims.exp | expiration}.
 * Expiration = now + lifetime.
 * Expressed in seconds.
 * Default: 3600 (1 hour).
 * @param ver - See {@link @fluidframework/protocol-definitions#ITokenClaims.ver}.
 * Default: `1.0`.
 */
export function generateToken(
	tenantId: string,
	key: string,
	scopes: ScopeType[],
	documentId?: string,
	user?: IInsecureUser,
	lifetime: number = 60 * 60,
	ver = "1.0",
): string {
	let userClaim = user ? user : generateUser();
	if (userClaim.id === "" || userClaim.id === undefined) {
		userClaim = generateUser();
	}

	// Current time in seconds
	const now = Math.round(Date.now() / 1000);
	const docId = documentId ?? "";

	const claims: ITokenClaims & { jti: string } = {
		documentId: docId,
		scopes,
		tenantId,
		user: userClaim,
		iat: now,
		exp: now + lifetime,
		ver,
		jti: uuid(),
	};

	const utf8Key = { utf8: key };
	return jsrsasign.jws.JWS.sign(
		null,
		JSON.stringify({ alg: "HS256", typ: "JWT" }),
		claims,
		utf8Key,
	);
}

/**
 * Generates an arbitrary ("random") {@link IInsecureUser} by generating a
 * random UUID for its {@link @fluidframework/protocol-definitions#IUser.id | id} and {@link IInsecureUser.name | name} properties.
 */
export function generateUser(): IInsecureUser {
	const randomUser = {
		id: uuid(),
		name: uniqueNamesGenerator({
			dictionaries: [names],
		}),
	};

	return randomUser;
}

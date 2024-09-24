/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { ImplicitFieldSchema, TreeView } from "fluid-framework";

export const undefinedUserId = "[UNDEFINED]";

export enum dragType {
	SESSION = "Session",
}

export enum selectAction {
	MULTI,
	REMOVE,
	SINGLE,
}

export interface ExtendedTreeView<T extends ImplicitFieldSchema> extends TreeView<T> {
	isBranch: boolean;
}

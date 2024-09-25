/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { ImplicitFieldSchema, TreeView } from "fluid-framework";
import { TreeBranch, TreeBranchFork } from "fluid-framework/alpha";

export const undefinedUserId = "[UNDEFINED]";

export enum dragType {
	SESSION = "Session",
}

export enum selectAction {
	MULTI,
	REMOVE,
	SINGLE,
}

export interface MainBranch<T extends ImplicitFieldSchema> {
	name: "main";
	view: TreeView<T>;
}

export interface TempBranch<T extends ImplicitFieldSchema> {
	name: "temp";
	view: TreeView<T>;
	branch: TreeBranchFork;
}

export type ViewBranch<T extends ImplicitFieldSchema> = MainBranch<T> | TempBranch<T>;

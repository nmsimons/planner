import { IMember, TreeView } from "fluid-framework";
import React from "react";
import { UserAvatars } from "./avatars_ux.js";
import { HeaderPrompt } from "./prompt_ux.js";
import { Conference } from "../schema/app_schema.js";
import { PrompterResult } from "../utils/gpt_helpers.js";
import { ExtendedTreeView } from "../utils/utils.js";

export function Header(props: {
	saved: boolean;
	connectionState: string;
	fluidMembers: IMember[];
	currentUser: IMember | undefined;
	applyAgentEdits: (
		prompt: string,
		treeView: TreeView<typeof Conference>,
		abortController: AbortController,
	) => Promise<PrompterResult>;
	treeViewBase: TreeView<typeof Conference>;
	abortController: AbortController;
	setCurrentView: (arg: ExtendedTreeView<typeof Conference>) => void;
	currentView: ExtendedTreeView<typeof Conference>;
}): JSX.Element {
	return (
		<div className="h-[48px] flex shrink-0 flex-row items-center justify-between bg-black text-base text-white z-40 w-full gap-4">
			<div className="flex m-2 text-nowrap">
				Planner | {props.connectionState} | {props.saved ? "saved" : "not saved"}
			</div>
			<HeaderPrompt
				applyAgentEdits={props.applyAgentEdits}
				treeViewBase={props.treeViewBase}
				abortController={props.abortController}
				setCurrentView={props.setCurrentView}
				currentView={props.currentView}
			/>
			<UserAvatars
				currentUser={props.currentUser}
				fluidMembers={props.fluidMembers}
				layoutType="stack"
			/>
		</div>
	);
}

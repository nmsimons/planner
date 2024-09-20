import { IMember } from "fluid-framework";
import React from "react";
import { UserAvatars } from "./avatars_ux.js";
import { HeaderPrompt } from "./prompt_ux.js";

export function Header(props: {
	saved: boolean;
	connectionState: string;
	fluidMembers: IMember[];
	currentUser: IMember | undefined;
	insertTemplate: (prompt: string) => Promise<void>;
}): JSX.Element {
	return (
		<div className="h-[48px] flex shrink-0 flex-row items-center justify-between bg-black text-base text-white z-40 w-full gap-4">
			<div className="flex m-2 text-nowrap">
				Planner | {props.connectionState} | {props.saved ? "saved" : "not saved"}
			</div>
			<HeaderPrompt insertTemplate={props.insertTemplate} />
			<UserAvatars
				currentUser={props.currentUser}
				fluidMembers={props.fluidMembers}
				layoutType="stack"
			/>
		</div>
	);
}

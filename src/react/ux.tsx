/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { Conference } from "../schema/app_schema.js";
import { ClientSession } from "../schema/session_schema.js";
import "../output.css";
import { IFluidContainer, IMember, IServiceAudience, TreeView } from "fluid-framework";
import { Canvas } from "./canvas_ux.js";
import { undoRedo } from "../utils/undo.js";
import { Header } from "./header_ux.js";
import { PrompterResult } from "../utils/gpt_helpers.js";
import { MainBranch, ViewBranch } from "../utils/utils.js";

export function ReactApp(props: {
	conferenceTree: TreeView<typeof Conference>;
	sessionTree: TreeView<typeof ClientSession>;
	audience: IServiceAudience<IMember>;
	container: IFluidContainer;
	undoRedo: undoRedo;
	applyAgentEdits: (
		prompt: string,
		treeView: TreeView<typeof Conference>,
		abortController: AbortController,
	) => Promise<PrompterResult>;
	abortController: AbortController;
}): JSX.Element {
	const [currentUser, setCurrentUser] = useState<IMember | undefined>(undefined);
	const [connectionState, setConnectionState] = useState("");
	const [saved, setSaved] = useState(false);
	const [fluidMembers, setFluidMembers] = useState<IMember[]>([]);

	const treeViewBase: MainBranch<typeof Conference> = {
		name: "main",
		view: props.conferenceTree,
	};
	const [currentView, setCurrentView] = useState<ViewBranch<typeof Conference>>(treeViewBase);

	/** Unsubscribe to undo-redo events when the component unmounts */
	useEffect(() => {
		return props.undoRedo.dispose;
	}, [props.undoRedo]);

	/** Update the fluidMembers array whenever the audience changes */
	useEffect(() => {
		// convert the audience values to an array of IMember objects
		setFluidMembers(Array.from(props.audience.getMembers().values()));
		setCurrentUser(props.audience.getMyself());
		// subscribe to audience changes
		props.audience.on("membersChanged", () => {
			// convert the audience values to an array of IMember objects
			setFluidMembers(Array.from(props.audience.getMembers().values()));
			setCurrentUser(props.audience.getMyself());
		});
	}, [props.audience]);

	// Disable the right-click context menu
	window.addEventListener("contextmenu", (e) => {
		e.preventDefault();
	});

	return (
		<>
			<div
				id="main"
				className="flex flex-col bg-gray-100 h-screen w-full overflow-hidden overscroll-none"
			>
				<Header
					saved={saved}
					connectionState={connectionState}
					fluidMembers={fluidMembers}
					currentUser={currentUser}
					applyAgentEdits={props.applyAgentEdits}
					treeViewBase={treeViewBase}
					abortController={props.abortController}
					setCurrentView={setCurrentView}
					currentView={currentView}
				/>
				<div className="flex h-[calc(100vh-48px)] flex-row ">
					<Canvas
						conferenceTree={currentView.view}
						showingBranch={currentView.name === "temp"}
						sessionTree={props.sessionTree}
						audience={props.audience}
						container={props.container}
						fluidMembers={fluidMembers}
						currentUser={currentUser}
						undoRedo={props.undoRedo}
						setCurrentUser={setCurrentUser}
						setConnectionState={setConnectionState}
						setSaved={setSaved}
						setFluidMembers={setFluidMembers}
					/>
				</div>
			</div>
		</>
	);
}

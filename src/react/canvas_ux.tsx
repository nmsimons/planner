/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { useCallback, useEffect, useState } from "react";
import { Conference } from "../schema/app_schema.js";
import { ClientSession } from "../schema/session_schema.js";
import {
	ConnectionState,
	IFluidContainer,
	IMember,
	IServiceAudience,
	Tree,
	TreeView,
} from "fluid-framework";
import { RootSessionWrapper } from "./session_ux.js";
import {
	Floater,
	NewDayButton,
	NewSessionButton,
	ButtonGroup,
	UndoButton,
	RedoButton,
	DeleteDayButton,
	DeleteSessionsButton,
} from "./button_ux.js";
import { undoRedo } from "../utils/undo.js";
import { SessionsView } from "./sessions_ux.js";

export function Canvas(props: {
	conferenceTree: TreeView<typeof Conference>;
	/**
	 * Whether or not the canvas is showing the temp branch, or the main branch.
	 */
	showingBranch: boolean;
	sessionTree: TreeView<typeof ClientSession>;
	audience: IServiceAudience<IMember>;
	container: IFluidContainer;
	fluidMembers: IMember[];
	currentUser: IMember | undefined;
	undoRedo: undoRedo;
	setCurrentUser: (arg: IMember) => void;
	setConnectionState: (arg: string) => void;
	setSaved: (arg: boolean) => void;
	setFluidMembers: (arg: IMember[]) => void;
}): JSX.Element {
	const {
		audience,
		conferenceTree,
		showingBranch,
		container,
		currentUser,
		fluidMembers,
		sessionTree,
		setConnectionState,
		setCurrentUser,
		setFluidMembers,
		setSaved,
		undoRedo,
	} = props;

	const [invalidations, setInvalidations] = useState(0);

	// Register for tree deltas when the component mounts.
	// Any time the tree changes, the app will update
	// For more complex apps, this code can be included
	// on lower level components.
	useEffect(() => {
		const unsubscribe = Tree.on(conferenceTree.root, "treeChanged", () => {
			setInvalidations(invalidations + Math.random());
		});
		return unsubscribe;
	}, [invalidations, conferenceTree.root]);

	useEffect(() => {
		const updateConnectionState = () => {
			if (container.connectionState === ConnectionState.Connected) {
				setConnectionState("connected");
			} else if (container.connectionState === ConnectionState.Disconnected) {
				setConnectionState("disconnected");
			} else if (container.connectionState === ConnectionState.EstablishingConnection) {
				setConnectionState("connecting");
			} else if (container.connectionState === ConnectionState.CatchingUp) {
				setConnectionState("catching up");
			}
		};
		updateConnectionState();
		setSaved(!container.isDirty);
		container.on("connected", updateConnectionState);
		container.on("disconnected", updateConnectionState);
		container.on("dirty", () => setSaved(false));
		container.on("saved", () => setSaved(true));
		container.on("disposed", updateConnectionState);
	}, [container, setConnectionState, setSaved]);

	const updateMembers = useCallback(() => {
		if (audience.getMyself() == undefined) return;
		if (audience.getMyself()?.id == undefined) return;
		if (audience.getMembers() == undefined) return;
		if (container.connectionState !== ConnectionState.Connected) return;
		if (currentUser === undefined) {
			const user = audience.getMyself();
			if (user !== undefined) {
				setCurrentUser(user);
			}
		}
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		setFluidMembers(Array.from(audience.getMembers()).map(([_, member]) => member));
	}, [audience, container, currentUser, setCurrentUser, setFluidMembers]);

	useEffect(() => {
		audience.on("membersChanged", updateMembers);
		return () => {
			audience.off("membersChanged", updateMembers);
		};
	}, [audience, updateMembers]);

	const clientId = currentUser?.id ?? "";
	let borderStyle = "border-2 border-gray-200";
	if (showingBranch) {
		console.log("isBranch");
		borderStyle = "border-dashed border-8 border-red-500 rounded-lg";
	} else {
		console.log("notBranch");
		borderStyle = "border-0";
	}

	return (
		<div className={`relative flex grow-0 h-full w-full bg-transparent ${borderStyle}`}>
			<ConferenceView
				conference={conferenceTree.root}
				clientId={clientId}
				clientSession={sessionTree.root}
				fluidMembers={fluidMembers}
			/>
			<Floater>
				<ButtonGroup>
					<NewSessionButton conference={conferenceTree.root} clientId={clientId} />
					<NewDayButton
						days={conferenceTree.root.days}
						session={sessionTree.root}
						clientId={clientId}
					/>
					<DeleteDayButton
						days={conferenceTree.root.days}
						session={sessionTree.root}
						clientId={clientId}
					/>
				</ButtonGroup>
				<ButtonGroup>
					<DeleteSessionsButton conference={conferenceTree.root} clientId={clientId} />
					<UndoButton undo={() => undoRedo.undo()} />
					<RedoButton redo={() => undoRedo.redo()} />
				</ButtonGroup>
			</Floater>
		</div>
	);
}

export function ConferenceView(props: {
	conference: Conference;
	clientId: string;
	clientSession: ClientSession;
	fluidMembers: IMember[];
}): JSX.Element {
	const sessionArray = [];
	for (const i of props.conference.unscheduled.sessions) {
		sessionArray.push(
			<RootSessionWrapper
				key={i.id}
				session={i}
				clientId={props.clientId}
				clientSession={props.clientSession}
				fluidMembers={props.fluidMembers}
			/>,
		);
	}

	return (
		<div className="h-full w-full overflow-auto">
			<div className="flex flex-row h-full w-full content-start">
				<div className="flex h-full w-fit p-4">
					<SessionsView
						sessions={props.conference.unscheduled.sessions}
						title={props.conference.name}
						{...props}
					/>
				</div>
				<div className="flex flex-row h-full w-full flex-nowrap gap-4 p-4 content-start">
					<DaysView {...props} />
				</div>
			</div>
		</div>
	);
}

// React component that renders each day in the conference side by side
export function DaysView(props: {
	conference: Conference;
	clientId: string;
	clientSession: ClientSession;
	fluidMembers: IMember[];
}): JSX.Element {
	const dayArray = [];
	for (const day of props.conference.days) {
		dayArray.push(
			<SessionsView
				key={Tree.key(day)}
				sessions={day.sessions}
				clientSession={props.clientSession}
				clientId={props.clientId}
				fluidMembers={props.fluidMembers}
				title={"Day " + ((Tree.key(day) as number) + 1)}
			/>,
		);
	}

	return <>{dayArray}</>;
}

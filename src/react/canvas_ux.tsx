/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { useEffect, useState } from "react";
import { Life } from "../schema/app_schema.js";
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
	NewMomentButton,
	ButtonGroup,
	UndoButton,
	RedoButton,
	DeleteDayButton,
	ShowPromptButton,
	Divider,
	DeleteSessionsButton,
} from "./button_ux.js";
import { Moments } from "../schema/app_schema.js";
import { undoRedo } from "../utils/undo.js";
import { SessionsView } from "./sessions_ux.js";
import { TextField } from "@mui/material";

export function Canvas(props: {
	lifeTree: TreeView<typeof Life>;
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
	setShowPrompt: (arg: boolean) => void;
}): JSX.Element {
	const [invalidations, setInvalidations] = useState(0);

	// Register for tree deltas when the component mounts.
	// Any time the tree changes, the app will update
	// For more complex apps, this code can be included
	// on lower level components.
	useEffect(() => {
		const unsubscribe = Tree.on(props.lifeTree.root, "treeChanged", () => {
			setInvalidations(invalidations + Math.random());
		});
		return unsubscribe;
	}, []);

	useEffect(() => {
		const updateConnectionState = () => {
			if (props.container.connectionState === ConnectionState.Connected) {
				props.setConnectionState("connected");
			} else if (props.container.connectionState === ConnectionState.Disconnected) {
				props.setConnectionState("disconnected");
			} else if (props.container.connectionState === ConnectionState.EstablishingConnection) {
				props.setConnectionState("connecting");
			} else if (props.container.connectionState === ConnectionState.CatchingUp) {
				props.setConnectionState("catching up");
			}
		};
		updateConnectionState();
		props.setSaved(!props.container.isDirty);
		props.container.on("connected", updateConnectionState);
		props.container.on("disconnected", updateConnectionState);
		props.container.on("dirty", () => props.setSaved(false));
		props.container.on("saved", () => props.setSaved(true));
		props.container.on("disposed", updateConnectionState);
	}, []);

	const updateMembers = () => {
		if (props.audience.getMyself() == undefined) return;
		if (props.audience.getMyself()?.userId == undefined) return;
		if (props.audience.getMembers() == undefined) return;
		if (props.container.connectionState !== ConnectionState.Connected) return;
		if (props.currentUser === undefined) {
			const user = props.audience.getMyself();
			if (user !== undefined) {
				props.setCurrentUser(user);
			}
		}
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		props.setFluidMembers(Array.from(props.audience.getMembers()).map(([_, member]) => member));
	};

	useEffect(() => {
		props.audience.on("membersChanged", updateMembers);
		return () => {
			props.audience.off("membersChanged", updateMembers);
		};
	}, []);

	const clientId = props.currentUser?.userId ?? "";

	return (
		<div className="relative flex grow-0 h-full w-full bg-transparent">
			<LifeView
				life={props.lifeTree.root}
				clientId={clientId}
				clientSession={props.sessionTree.root}
				fluidMembers={props.fluidMembers}
			/>
			<Floater>
				<ButtonGroup>
					<NewMomentButton life={props.lifeTree.root} clientId={clientId} />
					<NewDayButton
						days={props.lifeTree.root.days}
						session={props.sessionTree.root}
						clientId={clientId}
					/>
					<DeleteDayButton
						days={props.lifeTree.root.days}
						session={props.sessionTree.root}
						clientId={clientId}
					/>
				</ButtonGroup>
				<Divider />
				<ButtonGroup>
					<DeleteSessionsButton life={props.lifeTree.root} clientId={clientId} />
				</ButtonGroup>
				<Divider />
				<ButtonGroup>
					<ShowPromptButton show={props.setShowPrompt} />
				</ButtonGroup>
				<Divider />
				<ButtonGroup>
					<UndoButton undo={() => props.undoRedo.undo()} />
					<RedoButton redo={() => props.undoRedo.redo()} />
				</ButtonGroup>
			</Floater>
		</div>
	);
}

export function LifeView(props: {
	life: Life;
	clientId: string;
	clientSession: ClientSession;
	fluidMembers: IMember[];
}): JSX.Element {
	const sessionArray =
		props.life.moment.length > 0
			? props.life.moment.map((session) => (
					<RootSessionWrapper
						key={session.id}
						session={session}
						clientId={props.clientId}
						clientSession={props.clientSession}
						fluidMembers={props.fluidMembers}
					/>
			  ))
			: null;

	const [inputValue, setInputValue] = useState<string>("");
	const inputRef = React.useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (inputRef.current) {
			inputRef.current.focus();
		}
	}, []);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			props.life.moment.addSession("" + inputValue + " - " + getDateTime());
			setInputValue("");
		}
	};
	function getDateTime(): string {
		const now = new Date();

		const options: Intl.DateTimeFormatOptions = {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "numeric",
			hour12: true,
		};
		const formatter = new Intl.DateTimeFormat("en-US", options);
		return formatter.format(now);
	}

	return (
		<div
			className={`h-full w-full flex flex-col ${
				sessionArray ? "items-center" : "items-center justify-center"
			} ${sessionArray ? "justify-between" : ""}`}
		>
			<SessionsViewContent sessions={props.life.moment} {...props} />
			<TextField
				variant="standard"
				value={inputValue}
				placeholder="What just happened?"
				style={{ width: "160px", position: "fixed", bottom: "150px" }}
				InputProps={{
					disableUnderline: true,
				}}
				inputRef={inputRef}
				onChange={(e) => setInputValue(e.target.value)}
				onKeyDown={(e) => handleKeyDown(e)}
			/>
		</div>
	);
}

// React component that renders each day in the Life side by side
export function DaysView(props: {
	life: Life;
	clientId: string;
	clientSession: ClientSession;
	fluidMembers: IMember[];
}): JSX.Element {
	const dayArray = [];
	for (const day of props.life.days) {
		dayArray.push(
			<SessionsView
				key={Tree.key(day)}
				sessions={day}
				clientSession={props.clientSession}
				clientId={props.clientId}
				fluidMembers={props.fluidMembers}
				title={"Day " + ((Tree.key(day) as number) + 1)}
			/>,
		);
	}

	return <>{dayArray}</>;
}

function SessionsViewContent(props: {
	sessions: Moments;
	clientId: string;
	clientSession: ClientSession;
	fluidMembers: IMember[];
}): JSX.Element {
	const sessionsArray =
		props.sessions.length > 0
			? props.sessions.map((session) => (
					<RootSessionWrapper
						key={session.id}
						session={session}
						clientId={props.clientId}
						clientSession={props.clientSession}
						fluidMembers={props.fluidMembers}
					/>
			  ))
			: null;

	const parent = Tree.parent(props.sessions);

	if (Tree.is(parent, Life)) {
		return (
			<>
				<div
					className={`flex ${
						sessionsArray ? "flex-wrap" : "hidden"
					} w-full gap-4 p-4 content-start`}
					style={sessionsArray ? {} : { flex: "none" }}
				>
					{sessionsArray}
				</div>
			</>
		);
	} else {
		return (
			<div className="flex flex-col flex-nowrap gap-4 p-4 content-start">{sessionsArray}</div>
		);
	}
}

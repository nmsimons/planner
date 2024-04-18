/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React from "react";
import { Conference, Days, Session, Sessions } from "../schema/app_schema.js";
import { moveItem } from "../utils/app_helpers.js";
import { ConnectableElement, useDrop } from "react-dnd";
import { dragType } from "../utils/utils.js";
import { ClientSession } from "../schema/session_schema.js";
import { Tree } from "fluid-framework";
import { SessionView } from "./session_ux.js";

export function SessionsView(props: {
	sessions: Sessions;
	clientId: string;
	clientSession: ClientSession;
	fluidMembers: string[];
	title: string;
}): JSX.Element {
	const [{ isOver, canDrop }, drop] = useDrop(() => ({
		accept: [dragType.SESSION],
		collect: (monitor) => ({
			isOver: !!monitor.isOver({ shallow: true }),
			canDrop: !!monitor.canDrop(),
		}),
		canDrop: (item) => {
			if (Tree.is(item, Session)) return true;
			return false;
		},
		drop: (item, monitor) => {
			const didDrop = monitor.didDrop();
			if (didDrop) {
				return;
			}

			const isOver = monitor.isOver({ shallow: true });
			if (!isOver) {
				return;
			}

			const droppedItem = item;
			if (Tree.is(droppedItem, Session)) {
				moveItem(droppedItem, props.sessions.length, props.sessions);
			}

			return;
		},
	}));

	function attachRef(el: ConnectableElement) {
		drop(el);
	}

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
	};

	let backgroundColor = "bg-gray-200";
	const parent = Tree.parent(props.sessions);
	if (Tree.is(parent, Conference)) {
		backgroundColor = "bg-blue-200";
	} else if (Tree.is(parent, Days)) {
		const grandParent = Tree.parent(parent);
		if (Tree.is(grandParent, Conference)) {
			if (props.sessions.length > grandParent.length) {
				backgroundColor = "bg-red-400";
			} else if (props.sessions.length == grandParent.length) {
				backgroundColor = "bg-green-200";
			}
		}
	}

	return (
		<div
			onClick={(e) => handleClick(e)}
			ref={attachRef}
			className={
				"transition-all border-4 border-dashed h-fit " +
				(isOver && canDrop ? "border-gray-500" : "border-transparent")
			}
		>
			<div className={backgroundColor + " p-2 h-fit min-h-96 min-w-72 transition-all "}>
				<SessionsToolbar title={props.title} />
				<SessionsViewContent {...props} />
			</div>
		</div>
	);
}

function SessionsToolbar(props: { title: string }): JSX.Element {
	return (
		<div className="flex flex-row justify-between">
			<div className="flex w-0 grow p-1 mb-2 mr-2 text-lg font-bold text-black bg-transparent">
				{props.title}
			</div>
		</div>
	);
}

function SessionsViewContent(props: {
	sessions: Sessions;
	clientId: string;
	clientSession: ClientSession;
	fluidMembers: string[];
}): JSX.Element {
	const sessionsArray = [];
	for (const s of props.sessions) {
		sessionsArray.push(
			<SessionView
				key={s.id}
				session={s}
				clientId={props.clientId}
				clientSession={props.clientSession}
				fluidMembers={props.fluidMembers}
			/>,
		);
	}

	return <div className="flex flex-col gap-4 p-4 content-start">{sessionsArray}</div>;
}

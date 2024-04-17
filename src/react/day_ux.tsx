/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React from "react";
import { Session, Day, Days } from "../schema/app_schema.js";
import { moveItem } from "../utils/app_helpers.js";
import { ConnectableElement, useDrop } from "react-dnd";
import { dragType } from "../utils/utils.js";
import { ClientSession } from "../schema/session_schema.js";
import { Tree } from "fluid-framework";
import { SessionView } from "./session_ux.js";

export function DayView(props: {
	day: Day;
	clientId: string;
	clientSession: ClientSession;
	fluidMembers: string[];
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
				moveItem(droppedItem, props.day.length, props.day);
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

	return (
		<div
			onClick={(e) => handleClick(e)}
			ref={attachRef}
			className={
				"transition-all border-l-4 border-dashed " +
				(isOver && canDrop ? "border-gray-500" : "border-transparent")
			}
		>
			<div
				className={
					"p-2 bg-gray-200 min-h-64 transition-all " +
					(isOver && canDrop ? "translate-x-3" : "")
				}
			>
				<DayToolbar day={props.day} />
				<DayViewContent {...props} />
			</div>
		</div>
	);
}

function DayName(props: { day: Day }): JSX.Element {
	const parent = Tree.parent(props.day);

	if (Tree.is(parent, Days)) {
		return (
			<div className="flex w-0 grow p-1 mb-2 mr-2 text-lg font-bold text-black bg-transparent">
				{parent.getKeyFromValue(props.day)}
			</div>
		);
	}

	return <></>;
}

function DayToolbar(props: { day: Day }): JSX.Element {
	return (
		<div className="flex flex-row justify-between">
			<DayName day={props.day} />
		</div>
	);
}

function DayViewContent(props: {
	day: Day;
	clientId: string;
	clientSession: ClientSession;
	fluidMembers: string[];
}): JSX.Element {
	const sessionsArray = [];
	for (const i of props.day) {
		if (Tree.is(i, Session)) {
			sessionsArray.push(
				<SessionView
					key={i.id}
					session={i}
					clientId={props.clientId}
					clientSession={props.clientSession}
					fluidMembers={props.fluidMembers}
				/>,
			);
		}
	}

	return <div className="flex flex-row flex-wrap gap-4 p-4 content-start">{sessionsArray}</div>;
}

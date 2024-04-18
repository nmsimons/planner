/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { useEffect, useRef, useState } from "react";
import { Session, Sessions } from "../schema/app_schema.js";
import { moveItem } from "../utils/app_helpers.js";
import { dragType, selectAction } from "../utils/utils.js";
import { testRemoteNoteSelection, updateRemoteNoteSelection } from "../utils/session_helpers.js";
import { ConnectableElement, useDrag, useDrop } from "react-dnd";
import { useTransition } from "react-transition-state";
import { Tree } from "fluid-framework";
import { ClientSession } from "../schema/session_schema.js";
import { DragFilled } from "@fluentui/react-icons";
import { Dialog } from "@headlessui/react";
import { ShowDetailsButton } from "./button_ux.js";

export function RootSessionWrapper(props: {
	session: Session;
	clientId: string;
	clientSession: ClientSession;
	fluidMembers: string[];
}): JSX.Element {
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);

	return (
		<div className="bg-transparent flex flex-col justify-center h-36">
			<SessionView setIsDetailsShowing={setIsDetailsOpen} {...props} />
			<SessionDetails
				isOpen={isDetailsOpen}
				setIsOpen={setIsDetailsOpen}
				session={props.session}
			/>
		</div>
	);
}

export function SessionView(props: {
	session: Session;
	clientId: string;
	clientSession: ClientSession;
	fluidMembers: string[];
	setIsDetailsShowing: (arg: boolean) => void;
}): JSX.Element {
	const mounted = useRef(false);

	const parent = Tree.parent(props.session);

	const [{ status }, toggle] = useTransition({
		timeout: 1000,
	});

	const [selected, setSelected] = useState(false);

	const [remoteSelected, setRemoteSelected] = useState(false);

	const [bgColor, setBgColor] = useState("bg-gray-100");

	const [invalidations, setInvalidations] = useState(0);

	const test = () => {
		testRemoteNoteSelection(
			props.session,
			props.clientSession,
			props.clientId,
			setRemoteSelected,
			setSelected,
			props.fluidMembers,
		);
	};

	const update = (action: selectAction) => {
		updateRemoteNoteSelection(props.session, action, props.clientSession, props.clientId);
	};

	// Register for tree deltas when the component mounts.
	// Any time the tree changes, the app will update
	// For more complex apps, this code can be included
	// on lower level components.
	useEffect(() => {
		// Returns the cleanup function to be invoked when the component unmounts.
		const unsubscribe = Tree.on(props.clientSession, "treeChanged", () => {
			setInvalidations(invalidations + Math.random());
		});
		return unsubscribe;
	}, []);

	useEffect(() => {
		test();
	}, [invalidations]);

	useEffect(() => {
		test();
	}, [props.fluidMembers]);

	useEffect(() => {
		mounted.current = true;
		test();

		return () => {
			mounted.current = false;
		};
	}, []);

	useEffect(() => {
		if (selected) {
			setBgColor("bg-white");
		} else {
			setBgColor("bg-yellow-100");
		}
	}, [selected]);

	toggle(false);

	useEffect(() => {
		toggle(true);
	}, [Tree.parent(props.session)]);

	useEffect(() => {
		if (mounted.current) {
			toggle(true);
		}
	}, [props.session.title, props.session.abstract]);

	const [{ isDragging }, drag] = useDrag(() => ({
		type: dragType.SESSION,
		item: props.session,
		collect: (monitor) => ({
			isDragging: monitor.isDragging(),
		}),
	}));

	const [{ isOver, canDrop }, drop] = useDrop(() => ({
		accept: [dragType.SESSION],
		collect: (monitor) => ({
			isOver: !!monitor.isOver(),
			canDrop: !!monitor.canDrop(),
		}),
		canDrop: (item) => {
			if (Tree.is(item, Session) && item !== props.session) return true;
			return false;
		},
		drop: (item) => {
			const droppedItem = item;
			if (Tree.is(droppedItem, Session) && Tree.is(parent, Sessions)) {
				moveItem(droppedItem, parent.indexOf(props.session), parent);
			}
			return;
		},
	}));

	const attachRef = (el: ConnectableElement) => {
		drag(el);
		drop(el);
	};

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (selected) {
			update(selectAction.REMOVE);
		} else if (e.shiftKey || e.ctrlKey) {
			update(selectAction.MULTI);
		} else {
			update(selectAction.SINGLE);
		}
	};

	return (
		<div
			onClick={(e) => handleClick(e)}
			className={`transition duration-500${
				status === "exiting" ? " transform ease-out scale-110" : ""
			}`}
		>
			<div
				ref={attachRef}
				className={
					isOver && canDrop
						? "border-t-4 border-dashed border-gray-500"
						: "border-t-4 border-dashed border-transparent"
				}
			>
				<div
					style={{ opacity: isDragging ? 0.5 : 1 }}
					className={
						"relative transition-all flex flex-col " +
						bgColor +
						" h-32 w-60 shadow-md hover:shadow-lg p-2 " +
						" " +
						(isOver && canDrop ? "translate-y-3" : "")
					}
				>
					<SessionToolbar
						session={props.session}
						setIsDetailsShowing={props.setIsDetailsShowing}
					/>
					<SessionTitle session={props.session} update={update} />
					<RemoteSelection show={remoteSelected} />
				</div>
			</div>
		</div>
	);
}

function RemoteSelection(props: { show: boolean }): JSX.Element {
	if (props.show) {
		return (
			<div className="absolute -top-2 -left-2 h-36 w-64 rounded border-dashed border-indigo-800 border-4" />
		);
	} else {
		return <></>;
	}
}

function SessionTitle(props: {
	session: Session;
	update: (value: selectAction) => void;
}): JSX.Element {
	// The text field updates the Fluid data model on every keystroke in this demo.
	// This works well with small strings but doesn't scale to very large strings.
	// A Future iteration of SharedTree will include support for collaborative strings
	// that make real-time collaboration on this type of data efficient and simple.

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (e.ctrlKey) {
			props.update(selectAction.MULTI);
		} else {
			props.update(selectAction.SINGLE);
		}
	};

	return (
		<textarea
			className="p-2 bg-transparent h-full w-full resize-none z-50"
			value={props.session.title}
			onClick={(e) => handleClick(e)}
			onChange={(e) => props.session.updateTitle(e.target.value)}
		/>
	);
}

function SessionToolbar(props: {
	session: Session;
	setIsDetailsShowing: (arg: boolean) => void;
}): JSX.Element {
	return (
		<div className="flex justify-between z-50">
			<DragFilled />
			<ShowDetailsButton show={props.setIsDetailsShowing} />
		</div>
	);
}

export default function SessionDetails(props: {
	isOpen: boolean;
	setIsOpen: (arg: boolean) => void;
	session: Session;
}): JSX.Element {
	return (
		<Dialog
			className="absolute border-2 border-black bg-white p-4 w-1/2 top-1/4 left-1/4 z-50"
			open={props.isOpen}
			onClose={() => props.setIsOpen(false)}
		>
			<Dialog.Panel className="w-full text-left align-middle">
				<Dialog.Title className="font-bold text-lg">Session Details</Dialog.Title>
				<div>
					<textarea
						rows={1}
						className="resize-none border-2 border-black bg-white p-2 my-2 text-black w-full h-full"
						value={props.session.title}
						onChange={(e) => {
							props.session.updateTitle(e.target.value);
						}}
					/>
					<textarea
						rows={4}
						className="resize-none border-2 border-black bg-white p-2 my-2 text-black w-full h-full"
						value={props.session.abstract}
						onChange={(e) => {
							props.session.updateAbstract(e.target.value);
						}}
					/>
					<div className="flex flex-row gap-4">
						<button
							className="bg-gray-500 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded"
							onClick={() => props.setIsOpen(false)}
						>
							Close
						</button>
					</div>
				</div>
			</Dialog.Panel>
		</Dialog>
	);
}

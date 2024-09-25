import React, { useState } from "react";
import { Conference } from "../schema/app_schema.js";
import { TreeView, TreeViewConfiguration } from "fluid-framework";
import { getBranch } from "fluid-framework/alpha";
import { PrompterResult } from "../utils/gpt_helpers.js";
import { MainBranch, TempBranch, ViewBranch } from "../utils/utils.js";

enum PromptState {
	Idle,
	Prompting,
	Reviewing,
}

export function HeaderPrompt(props: {
	applyAgentEdits: (
		prompt: string,
		treeView: TreeView<typeof Conference>,
		abortController: AbortController,
	) => Promise<PrompterResult>;
	treeViewBase: MainBranch<typeof Conference>;
	abortController: AbortController;
	setCurrentView: (arg: ViewBranch<typeof Conference>) => void;
	currentView: ViewBranch<typeof Conference>;
}): JSX.Element {
	const placeholderType = "Type here to talk to a robot...";
	const placeholderTalk = "Talking to a robot...";

	const [promptState, setPromptState] = useState<PromptState>(PromptState.Idle);
	const isPrompting = promptState === PromptState.Prompting;

	const [promptText, setPromptText] = useState("");

	const handleSubmitPrompt = () => {
		const prompt = promptText;
		setPromptState(PromptState.Prompting);
		setPromptText("");

		// If we're already on an unmerged temp branch, keep using it.
		// Otherwise, create a new temp branch and set it as the current view.
		let branch: TempBranch<typeof Conference>;
		if (props.currentView.name === "temp") {
			branch = props.currentView;
		} else {
			const tempBranch = getBranch(props.treeViewBase.view).branch();
			const tempBranchView = tempBranch.viewWith(
				new TreeViewConfiguration({ schema: Conference }),
			);
			branch = {
				branch: tempBranch,
				view: tempBranchView,
				name: "temp",
			};
		}

		// Kick off the prompt, asynchronously applying the edits to the temp branch
		props
			.applyAgentEdits(prompt, branch.view, props.abortController)
			.then((result: PrompterResult) => {
				switch (result) {
					case "success":
						console.log("Prompt successful");
						break;
					case "tooManyErrors":
						console.error("Too many errors");
						break;
					case "tooManyModelCalls":
						console.error("Too many model calls");
						break;
					case "aborted":
						console.error("Aborted");
						break;
				}
				// TODO: this should probably cancel out of and return to `Idle` when an error is encountered.
				setPromptState(PromptState.Reviewing);
			});

		// Set the temp branch as the current view
		props.setCurrentView(branch);
	};

	const handleCancelClick = () => {
		props.abortController.abort("User cancelled");
		setPromptState(PromptState.Idle);
		setPromptText("");

		// Set the current view back to the main branch
		props.setCurrentView(props.treeViewBase);
	};

	const handleRevertClick = () => {
		setPromptState(PromptState.Idle);
		props.setCurrentView(props.treeViewBase);
	};

	const handleKeepClick = () => {
		if (props.currentView.name === "temp") {
			getBranch(props.treeViewBase.view).merge(props.currentView.branch, true);
		}
		setPromptState(PromptState.Idle);
		props.setCurrentView(props.treeViewBase);
	};

	// capture the return key to insert the template
	// when the input field is focused
	document.onkeydown = (e) => {
		if (
			e.key === "Enter" &&
			document.activeElement?.id === "insertPrompt" &&
			promptState !== PromptState.Prompting
		) {
			handleSubmitPrompt();
		}
	};

	return (
		<div className="h-full w-full flex flex-row items-center gap-2">
			<div className="flex h-fit w-full">
				<textarea
					disabled={isPrompting}
					placeholder={isPrompting ? placeholderTalk : placeholderType}
					rows={1}
					style={{ resize: "none" }}
					className="w-full bg-white text-black py-1 px-2 rounded-sm"
					value={promptText}
					id="insertPrompt"
					aria-label="Describe the prompt to be passed to the robot"
					onChange={(e) => {
						setPromptText(e.target.value);
					}}
				/>
			</div>
			<div className={`flex h-fit w-fit ${isPrompting ? "hidden" : ""}`}>
				<HeaderPromptButton
					isDisabled={promptText === "" || isPrompting}
					onClick={handleSubmitPrompt}
				/>
			</div>
			<div className={`flex h-fit w-fit ${isPrompting ? "" : "hidden"}`}>
				<HeaderCancelButton onClick={handleCancelClick} />
			</div>
			<div
				className={`flex h-fit w-fit ${
					promptState === PromptState.Reviewing ? "" : "hidden"
				}`}
			>
				<HeaderCommitButtons
					onKeep={() => handleKeepClick()}
					onDiscard={() => handleRevertClick()}
				/>
			</div>
		</div>
	);
}

// React component that renders the button to talk to the robot
export function HeaderPromptButton(props: {
	isDisabled: boolean;
	onClick: () => void;
}): JSX.Element {
	const buttonTalkColor = "bg-gray-500";

	return (
		<HeaderButton
			onClick={() => {
				props.onClick();
			}}
			color={buttonTalkColor}
			isDisabled={props.isDisabled}
			text={"Talk"}
		/>
	);
}

// React component that renders the button to cancel talking to the robot
export function HeaderCancelButton(props: { onClick: () => void }): JSX.Element {
	const buttonCancelColor = "bg-red-500";

	return (
		<HeaderButton
			onClick={() => {
				props.onClick();
			}}
			color={buttonCancelColor}
			text={"Cancel"}
		/>
	);
}

// React component that renders two buttons that give the
// user the option to keep or discard the changes made
export function HeaderCommitButtons(props: {
	onKeep: () => void;
	onDiscard: () => void;
}): JSX.Element {
	const buttonKeepColor = "bg-green-500";
	const buttonRevertColor = "bg-red-500";
	return (
		<div className="h-full w-full flex flex-row items-center gap-2">
			<div className="flex h-fit w-fit">
				<HeaderButton text="Keep" color={buttonKeepColor} onClick={props.onKeep} />
			</div>
			<div className="flex h-fit w-fit">
				<HeaderButton text="Discard" color={buttonRevertColor} onClick={props.onDiscard} />
			</div>
		</div>
	);
}

export function HeaderButton(props: {
	text: string;
	onClick: () => void;
	color: string;
	isDisabled?: boolean;
}): JSX.Element {
	return (
		<button
			className={`${props.color} hover:bg-gray-800 text-white font-bold w-20 h-full py-1 px-2 rounded`}
			onClick={() => {
				props.onClick();
			}}
			disabled={props.isDisabled}
		>
			{props.text}
		</button>
	);
}

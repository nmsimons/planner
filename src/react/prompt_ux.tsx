import React, { useEffect, useState } from "react";
import { Conference } from "../schema/app_schema.js";
import { TreeView, TreeViewConfiguration } from "fluid-framework";
import { PrompterResult } from "../utils/gpt_helpers.js";
import { getBranch, TreeBranch, TreeBranchFork } from "fluid-framework/alpha";
import { ExtendedTreeView } from "../utils/utils.js";

export function HeaderPrompt(props: {
	applyAgentEdits: (
		prompt: string,
		treeView: ExtendedTreeView<typeof Conference>,
		abortController: AbortController,
	) => Promise<PrompterResult>;
	treeViewBase: TreeView<typeof Conference>;
	abortController: AbortController;
	setCurrentView: (arg: ExtendedTreeView<typeof Conference>) => void;
	currentView: ExtendedTreeView<typeof Conference>;
}): JSX.Element {
	const placeholderType = "Type here to talk to a robot...";
	const placeholderTalk = "Talking to a robot...";

	const [isPrompting, setIsPrompting] = useState(false);
	const [promptText, setPromptText] = useState("");
	const [branch, setBranch] = useState<TreeBranchFork>();

	const handlePromptClick = () => {
		if (isPrompting) {
			props.setCurrentView(props.treeViewBase as ExtendedTreeView<typeof Conference>);
			props.abortController.abort("User cancelled");
			setIsPrompting(false);
			setPromptText("");
		} else {
			const prompt = promptText;
			setIsPrompting(true);
			setPromptText("");

			const b = getBranch(props.treeViewBase).branch();
			setBranch(b);

			let branchView: ExtendedTreeView<typeof Conference>;
			if (props.currentView.isBranch) {
				branchView = props.currentView;
			} else {
				branchView = b.viewWith(
					new TreeViewConfiguration({ schema: Conference }),
				) as ExtendedTreeView<typeof Conference>;
				branchView.isBranch = true;
			}

			props.setCurrentView(branchView);
			props
				.applyAgentEdits(prompt, branchView, props.abortController)
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
					setIsPrompting(false);
				});
		}
	};

	const handleRevertClick = () => {
		props.setCurrentView(props.treeViewBase as ExtendedTreeView<typeof Conference>);
	};

	const handleKeepClick = () => {
		props.setCurrentView(props.treeViewBase as ExtendedTreeView<typeof Conference>);
		getBranch(props.treeViewBase).merge(branch!, true);
	};

	// capture the return key to insert the template
	// when the input field is focused
	document.onkeydown = (e) => {
		if (e.key === "Enter" && document.activeElement?.id === "insertPrompt") {
			handlePromptClick();
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
			<div className="flex h-fit w-fit">
				<HeaderPromptButton
					isPrompting={isPrompting}
					isDisabled={promptText === "" && !isPrompting}
					onClick={handlePromptClick}
				/>
			</div>
			<div
				className={`flex h-fit w-fit ${
					props.currentView.isBranch && !isPrompting ? "" : "hidden"
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
	isPrompting: boolean;
	isDisabled: boolean;
	onClick: () => void;
}): JSX.Element {
	const buttonTalkColor = "bg-gray-500";
	const buttonCancelColor = "bg-red-500";

	return (
		<HeaderButton
			onClick={() => {
				props.onClick();
			}}
			color={props.isPrompting ? buttonCancelColor : buttonTalkColor}
			isDisabled={props.isDisabled}
			text={props.isPrompting ? "Cancel" : "Talk"}
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

import React, { useState } from "react";
import { Conference } from "../schema/app_schema.js";
import { TreeView } from "fluid-framework";
import { PrompterResult } from "../utils/gpt_helpers.js";

export function HeaderPrompt(props: {
	applyAgentEdits: (
		prompt: string,
		treeView: TreeView<typeof Conference>,
		abortController: AbortController,
	) => Promise<PrompterResult>;
	treeView: TreeView<typeof Conference>;
	abortController: AbortController;
	setCurrentView: (arg: TreeView<typeof Conference>) => void;
}): JSX.Element {
	const placeholderType = "Type here to talk to a robot...";
	const placeholderTalk = "Talking to a robot...";
	const buttonTalkColor = "bg-gray-500";
	const buttonCancelColor = "bg-red-500";

	const [isPrompting, setIsPrompting] = useState(false);
	const [promptText, setPromptText] = useState("");

	const onClick = () => {
		if (isPrompting) {
			props.abortController.abort("User cancelled");
			setIsPrompting(false);
			setPromptText("");
		} else {
			const prompt = promptText;
			setIsPrompting(true);
			setPromptText("");
			console.log("Inserting template: " + prompt);
			props
				.applyAgentEdits(prompt, props.treeView, props.abortController)
				.then((result: PrompterResult) => {
					switch (result) {
						case "success":
							console.log("Template inserted successfully");
							break;
						case "tooManyErrors":
							console.error("Too many errors");
							break;
						case "tooManyEdits":
							console.error("Too many edits");
							break;
						case "aborted":
							console.error("Aborted");
							break;
					}
					setIsPrompting(false);
				});
		}
	};

	// capture the return key to insert the template
	// when the input field is focused
	document.onkeydown = (e) => {
		if (e.key === "Enter" && document.activeElement?.id === "insertTemplateInput") {
			onClick();
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
					id="insertTemplateInput"
					aria-label="Describe the template to be inserted"
					onChange={(e) => {
						setPromptText(e.target.value);
					}}
				/>
			</div>
			<div className="flex h-fit w-fit">
				<button
					className={`${
						isPrompting ? buttonCancelColor : buttonTalkColor
					} hover:bg-gray-800 text-white font-bold w-20 h-full py-1 px-2 rounded`}
					id="insertTemplateButton"
					onClick={() => {
						onClick();
					}}
					disabled={!promptText.length && !isPrompting}
				>
					{isPrompting ? "Cancel" : "Talk"}
				</button>
			</div>
		</div>
	);
}

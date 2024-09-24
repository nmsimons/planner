import React, { useState } from "react";
import { Conference } from "../schema/app_schema.js";
import { TreeView } from "fluid-framework";
import { PrompterResult } from "../utils/gpt_helpers.js";

export function HeaderPrompt(props: {
	applyAgentEdits: (
		prompt: string,
		treeView: TreeView<typeof Conference>,
	) => Promise<PrompterResult>;
	treeView: TreeView<typeof Conference>;
}): JSX.Element {
	const placeholderType = "Type here to talk to a robot...";
	const placeholderTalk = "Talking to a robot...";
	const buttonDefaultColor = "bg-gray-500";
	const [promptText, setPromptText] = useState("");
	const [prompt, setTemplatePrompt] = useState("");
	const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
	const [buttonPrompt, setButtonPrompt] = useState("Talk");
	const [placeholder, setPlaceholder] = useState(placeholderType);
	const [buttonColor, setButtonColor] = useState(buttonDefaultColor);

	return (
		<div className="h-full w-full flex flex-row items-center gap-2">
			<div className="flex h-fit w-full">
				<textarea
					disabled={isLoadingTemplate}
					placeholder={placeholder}
					rows={1}
					style={{ resize: "none" }}
					className="w-full bg-white text-black py-1 px-2 rounded-sm"
					value={promptText}
					id="insertTemplateInput"
					aria-label="Describe the template to be inserted"
					onChange={(e) => {
						setPromptText(e.target.value);
						setTemplatePrompt(e.target.value);
					}}
				/>
			</div>
			<div className="flex h-fit w-fit">
				<button
					className={`${buttonColor} hover:bg-gray-800 text-white font-bold w-20 h-full py-1 px-2 rounded`}
					id="insertTemplateButton"
					onClick={() => {
						if (isLoadingTemplate) {
							// cancel the robot talk
							return;
						} else {
							setIsLoadingTemplate(true);
							setButtonPrompt("Cancel");
							setPlaceholder(placeholderTalk);
							setPromptText("");
							setButtonColor("bg-red-500");
							console.log("Inserting template: " + prompt);
							props.applyAgentEdits(prompt, props.treeView).then(() => {
								setButtonColor(buttonDefaultColor);
								setIsLoadingTemplate(false);
								setButtonPrompt("Talk");
								setPlaceholder(placeholderType);
								setPromptText(prompt);
							});
						}
					}}
				>
					{buttonPrompt}
				</button>
			</div>
		</div>
	);
}

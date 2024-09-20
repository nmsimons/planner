import def from "ajv/dist/vocabularies/applicator/additionalItems.js";
import React, { useState } from "react";

export function HeaderPrompt(props: {
	insertTemplate: (prompt: string) => Promise<void>;
}): JSX.Element {
	const placeholderType = "Type here to talk to a robot...";
	const placeholderTalk = "Talking to a robot...";
	const buttonDefaultColor = "bg-gray-500";
	const [promptText, setPromptText] = useState("");
	const [templatePrompt, setTemplatePrompt] = useState("");
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
							console.log("Inserting template: " + templatePrompt);
							props.insertTemplate(templatePrompt).then(() => {
								setButtonColor(buttonDefaultColor);
								setIsLoadingTemplate(false);
								setButtonPrompt("Talk");
								setPlaceholder(placeholderType);
								setPromptText(templatePrompt);
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

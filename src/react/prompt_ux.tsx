import React, { useState } from "react";

export function HeaderPrompt(props: {
	insertTemplate: (prompt: string) => Promise<void>;
}): JSX.Element {
	const [templatePrompt, setTemplatePrompt] = useState("");
	const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
	return (
		<div className="h-full w-full flex flex-row items-center gap-2">
			<div className="flex h-fit w-full">
				<textarea
					placeholder="Type here to talk to a robot..."
					rows={1}
					style={{ resize: "none" }}
					className="w-full bg-white text-black py-1 px-2 rounded-sm"
					value={templatePrompt}
					id="insertTemplateInput"
					aria-label="Describe the template to be inserted"
					onChange={(e) => {
						setTemplatePrompt(e.target.value);
					}}
				/>
			</div>
			<div className="flex h-fit w-fit">
				<button
					className="bg-gray-500 hover:bg-gray-800 text-white font-bold w-20 h-full py-1 px-2 rounded"
					id="insertTemplateButton"
					onClick={() => {
						setIsLoadingTemplate(true);
						props.insertTemplate(templatePrompt).then(() => {
							setIsLoadingTemplate(false);
						});
					}}
				>
					Talk
				</button>
			</div>
		</div>
	);
}

import { Dialog } from "@headlessui/react";
import React, { useState } from "react";

export default function Prompt(props: {
	isOpen: boolean;
	setIsOpen: (arg: boolean) => void;
	insertTemplate: (prompt: string) => Promise<void>;
}): JSX.Element {
	const [templatePrompt, setTemplatePrompt] = useState(
		"Help me brainstorm new features to add to my digital Whiteboard application",
	);
	const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
	return (
		<Dialog
			className="absolute border-2 border-black bg-white p-4 w-1/2 top-1/4 left-1/4 z-50"
			open={props.isOpen}
			onClose={() => props.setIsOpen(false)}
		>
			<Dialog.Panel className="w-full text-left align-middle">
				<Dialog.Title className="font-bold text-lg">Get things started...</Dialog.Title>
				<Dialog.Description>
					{isLoadingTemplate
						? "Generating template..."
						: "Populate your board with ideas based on this prompt."}
				</Dialog.Description>
				<div className={isLoadingTemplate ? "invisible" : ""}>
					<textarea
						rows={4}
						className="resize-none border-2 border-black bg-white p-2 my-2 text-black w-full h-full"
						value={templatePrompt}
						id="insertTemplateInput"
						aria-label="Describe the template to be inserted"
						onChange={(e) => {
							setTemplatePrompt(e.target.value);
						}}
					/>
					<div className="flex flex-row gap-4">
						<button
							className="bg-gray-500 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded"
							id="insertTemplateButton"
							onClick={() => {
								setIsLoadingTemplate(true);
								props.insertTemplate(templatePrompt).then(() => {
									setIsLoadingTemplate(false);
									props.setIsOpen(false);
								});
							}}
						>
							Get me started
						</button>
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

import React from "react";
import {
	AvatarGroup,
	AvatarGroupItem,
	AvatarGroupPopover,
	FluentProvider,
	Tooltip,
	partitionAvatarGroupItems,
	makeStyles,
	webLightTheme,
	tokens,
} from "@fluentui/react-components";
import { IMember } from "fluid-framework";
import { AzureMember } from "@fluidframework/azure-client";
import { OdspMember } from "@fluid-experimental/odsp-client";

const avatarClasses = makeStyles({
	avatars: { backgroundColor: tokens.colorSubtleBackground },
});

export function UserAvatars(props: {
	fluidMembers: IMember[];
	layoutType: "spread" | "stack" | "pie" | undefined;
}): JSX.Element {
	let isAzureUser = false;

	// Test the type of fluidMembers to see if it is an AzureMember in a try-catch block
	// If it is an AzureMember, set isAzureUser to true
	// Otherwise, set isAzureUser to false
	try {
		if ((props.fluidMembers[0] as AzureMember).userName !== undefined) {
			isAzureUser = true;
		}
	} catch (e) {
		isAzureUser = false;
	}

	const { inlineItems, overflowItems } = partitionAvatarGroupItems({
		items: props.fluidMembers as AzureMember[],
	});

	const getUserName = (member: IMember, isAzureUser: boolean) => {
		if (isAzureUser) {
			return (member as AzureMember).userName;
		} else {
			return (member as OdspMember).name;
		}
	};

	const classes = avatarClasses();

	return (
		<FluentProvider theme={webLightTheme} className={classes.avatars}>
			<AvatarGroup size={32} className="pl-2 pr-2" layout={props.layoutType}>
				{inlineItems.map((member) => (
					<Tooltip
						content={getUserName(member, isAzureUser)}
						key={member.userId}
						relationship="description"
					>
						<AvatarGroupItem
							name={getUserName(member, isAzureUser)}
							key={member.userId}
						/>
					</Tooltip>
				))}
				{overflowItems && (
					<AvatarGroupPopover>
						{overflowItems.map((member) => (
							<AvatarGroupItem
								name={getUserName(member, isAzureUser)}
								key={member.userId}
							/>
						))}
					</AvatarGroupPopover>
				)}
			</AvatarGroup>
		</FluentProvider>
	);
}

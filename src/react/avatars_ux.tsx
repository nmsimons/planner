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
import { OdspMember } from "@fluidframework/odsp-client/beta";

const avatarClasses = makeStyles({
	avatars: { backgroundColor: tokens.colorSubtleBackground },
});

export function UserAvatars(props: {
	currentUser: IMember | undefined;
	fluidMembers: IMember[];
	layoutType: "spread" | "stack" | "pie" | undefined;
}): JSX.Element {
	const classes = avatarClasses();
	let isAzureUser = false;

	// Test to see if the fluidMembers array is empty
	// If it is empty, return an empty AvatarGroup
	if (props.fluidMembers.length === 0) {
		return (
			<FluentProvider theme={webLightTheme} className={classes.avatars}>
				<AvatarGroup
					size={32}
					className="pl-2 pr-2"
					layout={props.layoutType}
				></AvatarGroup>
			</FluentProvider>
		);
	}

	// Test the type of fluidMembers to see if it is an AzureMember
	// If it is an AzureMember, set isAzureUser to true
	// Otherwise, set isAzureUser to false
	if ((props.fluidMembers[0] as AzureMember).name !== undefined) {
		isAzureUser = true;
	}

	const { inlineItems, overflowItems } = partitionAvatarGroupItems({
		items: props.fluidMembers,
	});

	const getUserName = (member: IMember, isAzureUser: boolean) => {
		if (isAzureUser) {
			return (member as AzureMember).name;
		} else {
			return (member as OdspMember).name;
		}
	};

	return (
		<FluentProvider theme={webLightTheme} className={classes.avatars}>
			<AvatarGroup size={32} className="pl-2 pr-2" layout={props.layoutType}>
				{inlineItems.map((member) => (
					<Tooltip
						content={getUserName(member, isAzureUser)}
						key={member.id}
						relationship="description"
					>
						<AvatarGroupItem name={getUserName(member, isAzureUser)} key={member.id} />
					</Tooltip>
				))}
				{overflowItems && (
					<AvatarGroupPopover>
						{overflowItems.map((member) => (
							<AvatarGroupItem
								name={getUserName(member, isAzureUser)}
								key={member.id}
							/>
						))}
					</AvatarGroupPopover>
				)}
			</AvatarGroup>
		</FluentProvider>
	);
}

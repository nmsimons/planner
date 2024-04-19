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

const avatarClasses = makeStyles({
	avatars: { backgroundColor: tokens.colorSubtleBackground },
});

export function UserAvatars(props: {
	fluidMembers: string[];
	layoutType: "spread" | "stack" | "pie" | undefined;
}): JSX.Element {
	const { inlineItems, overflowItems } = partitionAvatarGroupItems({
		items: props.fluidMembers,
	});

	const classes = avatarClasses();

	return (
		<FluentProvider theme={webLightTheme} className={classes.avatars}>
			<AvatarGroup size={32} className="pl-2 pr-2" layout={props.layoutType}>
				{inlineItems.map((member) => (
					<Tooltip content={member} key={member} relationship="description">
						<AvatarGroupItem name={member} key={member} />
					</Tooltip>
				))}
				{overflowItems && (
					<AvatarGroupPopover>
						{overflowItems.map((member) => (
							<AvatarGroupItem name={member} key={member} />
						))}
					</AvatarGroupPopover>
				)}
			</AvatarGroup>
		</FluentProvider>
	);
}

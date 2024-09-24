/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { TreeViewConfiguration, SchemaFactory, Tree } from "fluid-framework";
import {} from "@fluidframework/tree/alpha";

// Schema is defined using a factory object that generates classes for objects as well
// as list and map nodes.

// Include a UUID to guarantee that this schema will be uniquely identifiable.
const sf = new SchemaFactory("Planner");

// Define the schema for the session object.
// Helper functions for working with the data contained in this object
// are included in this class definition as methods.
export class Session extends sf.object(
	"Session",
	{
		id: sf.identifier,
		title: sf.string,
		abstract: sf.string,
		sessionType: sf.required(sf.string, {
			metadata: {
				description:
					"This is one of four possible strings: 'session', 'workshop', 'panel', or 'keynote'. NOTHING IS ELSE IS ALLOWED.",
			},
		}),
		created: sf.required(sf.number, { metadata: { llmDefault: () => Date.now() } }),
		lastChanged: sf.required(sf.number, { metadata: { llmDefault: () => Date.now() } }),
	},
	{
		metadata: {
			description:
				"A session object that represents a session, workshop, panel, or keynote." +
				"'sessionType' must be one of four possible types: 'session', 'workshop', 'panel', or 'keynote'." +
				"The session should be related to the conference name.",
		},
	},
) {
	// Update the title text and also update the timestamp
	public updateTitle(text: string) {
		this.lastChanged = new Date().getTime();
		this.title = text;
	}

	// Update the abstract text and also update the timestamp
	public updateAbstract(text: string) {
		this.lastChanged = new Date().getTime();
		this.abstract = text;
	}

	// Update the session type and also update the timestamp
	public updateSessionType(type: keyof typeof SessionType) {
		this.lastChanged = new Date().getTime();
		this.sessionType = type;
	}

	/**
	 * Removes a node from its parent.
	 */
	public delete() {
		const parent = Tree.parent(this);
		// Use type narrowing to ensure that parent is correct.
		if (Tree.is(parent, Sessions)) {
			const index = parent.indexOf(this);
			parent.removeAt(index);
		}
	}
}

const SessionType = {
	session: "Session",
	workshop: "Workshop",
	panel: "Panel",
	keynote: "Keynote",
};

export class Sessions extends sf.array("Sessions", Session) {
	// Add a session to the conference
	public addSession() {
		const currentTime = new Date().getTime();
		const session = new Session({
			title: "New Session",
			abstract: "New Abstract",
			sessionType: "session",
			created: currentTime,
			lastChanged: currentTime,
		});
		this.insertAtEnd(session);
		return session;
	}
}

export class Unscheduled extends sf.object("Unscheduled", {
	sessions: sf.required(Sessions, {
		metadata: {
			description:
				"These sessions are not scheduled yet. The user (or AI agent) can move them to a specific day.",
		},
	}),
}) {}

export class Day extends sf.object("Day", {
	sessions: sf.required(Sessions, {
		metadata: {
			description: "The sessions scheduled on this day.",
		},
	}),
}) {}

export class Days extends sf.array("Days", Day) {
	// Add a day to the conference
	public addDay(): Day {
		const day = new Day({ sessions: [] });
		this.insertAtEnd(day);
		return day;
	}

	// Remove the last day from the conference
	public removeDay() {
		if (this.length === 0) {
			return;
		}
		// Get the conference object from the parent of this map
		const conference = Tree.parent(this);
		// Get the unscheduled sessions array from the conference object
		// and move all the sessions in the Day to the sessions array
		if (Tree.is(conference, Conference)) {
			const sessions = conference?.unscheduled.sessions;
			const lastDay = this[this.length - 1];
			if (lastDay) {
				Tree.runTransaction<Days>(this, () => {
					// Move all the sessions in the Day to the sessions array
					if (lastDay.sessions.length !== 0) {
						const index = sessions.length;
						sessions.moveRangeToIndex(
							index,
							0,
							lastDay.sessions.length,
							lastDay.sessions,
						);
					}
					// Remove the day from the conference
					this.removeAt(this.length - 1);
				});
			}
		}
	}
}

export class Conference extends sf.object(
	"Conference",
	{
		name: sf.string,
		unscheduled: Unscheduled,
		days: Days,
		sessionsPerDay: sf.number,
	},
	{
		metadata: {
			description:
				"A conference object that contains all the sessions. Sessions should be based on the Conference name." +
				"Each day should have a maximum of 'sessionsPerDay' sessions.",
		},
	},
) {
	// Clear all the sessions from the conference
	public clear() {
		Tree.runTransaction<Conference>(this, () => {
			if (this.unscheduled.sessions.length > 0) this.unscheduled.sessions.removeRange();
			if (this.days.length > 0) this.days.removeRange();
		});
	}
}

// Export the tree config appropriate for this schema.
// This is passed into the SharedTree when it is initialized.
export const appTreeConfiguration = new TreeViewConfiguration({
	// Schema for the root
	schema: Conference,
});

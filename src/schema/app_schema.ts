/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { TreeConfiguration, SchemaFactory, Tree } from "fluid-framework";
import { v4 as uuid } from "uuid";

// Schema is defined using a factory object that generates classes for objects as well
// as list and map nodes.

// Include a UUID to guarantee that this schema will be uniquely identifiable.
// As this schema uses a recursive type, the beta SchemaFactoryRecursive is used instead of just SchemaFactory.
const sf = new SchemaFactory("a7245fab-24f7-489d-a726-4ff3ee793719");

// Define the schema for the session object.
// Helper functions for working with the data contained in this object
// are included in this class definition as methods.
export class Session extends sf.object(
	"Session",
	// Fields for sessions which SharedTree will store and synchronize across clients.
	// These fields are exposed as members of instances of the Session class.
	{
		id: sf.string,
		title: sf.string,
		abstract: sf.string,
		created: sf.number,
		lastChanged: sf.number,
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

	/**
	 * Removes a node from its parent.
	 */
	public delete() {
		const parent = Tree.parent(this);
		// Use type narrowing to ensure that parent is correct.
		if (Tree.is(parent, Sessions) || Tree.is(parent, Day)) {
			const index = parent.indexOf(this);
			parent.removeAt(index);
		}
	}
}

export class Placeholder extends sf.object("Placeholder", {
	// Placeholder for an empty slot in a day
}) {}

export class Sessions extends sf.array("Sessions", Session) {
	// Add a session to the conference
	public addSession() {
		const session = new Session({
			id: uuid(),
			title: "New Session",
			abstract: "New Abstract",
			created: new Date().getTime(),
			lastChanged: new Date().getTime(),
		});
		this.insertAtEnd(session);
		return session;
	}
}

export class Day extends sf.array("Day", [Placeholder, Session]) {}

export class Days extends sf.map("Days", Day) {
	// Add a day to the conference with a number as its key
	public addDay(): Day {
		let day: Day | undefined;
		Tree.runTransaction<Days>(this, () => {
			day = new Day([]);
			this.set((this.size + 1).toString(), day);
		});
		if (day === undefined) {
			throw new Error("Failed to add day");
		}
		return day;
	}

	getKeyFromValue(item: Day) {
		return Tree.key(item);
	}
}

export class Conference extends sf.object("Conference", {
	name: sf.string,
	sessions: Sessions,
	days: Days,
}) {}

// Export the tree config appropriate for this schema.
// This is passed into the SharedTree when it is initialized.
export const appTreeConfiguration = new TreeConfiguration(
	// Schema for the root
	Conference,
	// initial tree
	() => new Conference({ name: "Conference", sessions: [], days: new Map() }),
);

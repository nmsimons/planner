/**
 * @file This file contains workaround solution for eventing in the CanvasSchema until a better
 *  eventing system is introduced by @fluidframework/tree.
 */

import { Tree, TreeNode, TreeStatus } from "fluid-framework";


/**
 * @internal
 */
export interface _IWorkaroundNotifyChangeFromChild {
  /**
   * Notify the current node that there is a change occurred from its child.
   * Only the direct child object will call this method.
   * @see workaround_listenToNodeChangeAndNotifyParent
   */
  _notifyChangeFromChild(changedNode: TreeNode): void;

  /**
   * Whether this node has already subscribed to "nodeChanged" event.
   */
  isSubscribedToNodeChanged: boolean;
}

/**
 * @internal
 * This is a workaround before @fluidframework/tree provides better eventing model.
 * This workaround monitor *every* node change inside Canvas and notify the changes all the way
 *  up to the root Canvas node. When Canvas detects the tree is changed, it will look at all the
 *  nodes that have reported change and be able to figure our which part of the tree is changed.
 * This allows Canvas to do
 *  - Incremental re-render when something is changed
 *  - Build animation to display when some node is removed.
 * @param node - The node to listen to node changes/
 */
export function workaround_listenToNodeChangeAndNotifyParent(node: TreeNode): void {
  // Set timeout so it register event after the node is attached to the tree.
  window.setTimeout(() => {
    _listenToNodeChangeAndNotifyParent(node, /* remainingAttempt */ 30);
  });
}

/**
 * @returns true if first attempt successfully subscribes to the "nodeChanged" event.
 */
function _listenToNodeChangeAndNotifyParent(node: TreeNode, remainingAttempt = 0): boolean {
  if ((node as unknown as _IWorkaroundNotifyChangeFromChild).isSubscribedToNodeChanged) {
    return false;
  }

  if (workaround_isNodeInTree(node)) {
    Tree.on(node, 'nodeChanged', () => {
      (node as unknown as _IWorkaroundNotifyChangeFromChild)._notifyChangeFromChild?.(node);
    });
    (node as unknown as _IWorkaroundNotifyChangeFromChild).isSubscribedToNodeChanged = true;

    return true;
  } else if (remainingAttempt > 0) {
    window.setTimeout(() => {
      // If the node is not in document, try again in 100ms.
      _listenToNodeChangeAndNotifyParent(node, remainingAttempt - 1);
    }, 100);
  } else {
    const error: Error = new Error('Node not added to document after created.');
    console.error(error.message);
  }

  return false;
}

/**
 * @internal
 * @see workaround_listenToNodeChangeAndNotifyParent
 */
export function workaround_notifyParentAboutNodeChange(nodeToNotify: TreeNode, changedNode: TreeNode): void {
  const parent: TreeNode | undefined = Tree.parent(nodeToNotify);

  if (!parent) {
    return;
  }

  (parent as unknown as _IWorkaroundNotifyChangeFromChild)._notifyChangeFromChild?.(changedNode);
}

/**
 * @internal
 * Utility to check if a node is inserted in the tree at this moment.
 * Today it throws exception when checking Tree.status on a node that is not inserted in the tree.
 *  which under current expectation is not needed in future version of SharedTree.
 */
function workaround_isNodeInTree(node: TreeNode): boolean {
  try {
    return Tree.status(node) === TreeStatus.InDocument;
  } catch (error) {
    return false;
  }
}

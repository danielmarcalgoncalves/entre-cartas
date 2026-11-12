"use client";

export interface JournalNavigationGuard {
  hasPendingChanges: () => boolean;
  flushBeforeNavigation: () => Promise<boolean>;
  promptSaveFailureModal: (onSuccessAction: () => void) => void;
}

let activeGuard: JournalNavigationGuard | null = null;

export function registerJournalNavigationGuard(
  guard: JournalNavigationGuard
): () => void {
  activeGuard = guard;
  return () => {
    if (activeGuard === guard) {
      activeGuard = null;
    }
  };
}

export function getJournalNavigationGuard(): JournalNavigationGuard | null {
  return activeGuard;
}

/**
 * Runs the registered journal navigation guard before executing an action
 * (e.g., search submission, logout, or route transition).
 * Returns true if the caller may proceed immediately; returns false if saving
 * failed and the failure warning modal was opened to let the user retry or stay.
 */
export async function guardJournalNavigation(
  proceedAction: () => void
): Promise<boolean> {
  if (!activeGuard || !activeGuard.hasPendingChanges()) {
    proceedAction();
    return true;
  }

  const saved = await activeGuard.flushBeforeNavigation();
  if (saved) {
    proceedAction();
    return true;
  }

  activeGuard.promptSaveFailureModal(proceedAction);
  return false;
}


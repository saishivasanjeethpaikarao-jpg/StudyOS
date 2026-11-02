import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  SHORTCUTS,
  matchesShortcut,
  shouldIgnoreShortcut,
  useShortcutsModal,
} from "@/hooks/useKeyboardShortcuts";
import { useSearch } from "@/hooks/useSearch";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { prefetchCommandPalette } from "@/components/command-palette/command-palette.lazy";
import { prefetchShortcutsModal } from "@/components/ui/shortcuts-modal.lazy";

interface GlobalShortcutsHandlerProps {
  onAddTask: () => void;
}

/**
 * Global keyboard shortcuts handler.
 * Handles shortcuts that work across all pages (not task-specific).
 * Renders nothing - just listens for keyboard events.
 */
export function GlobalShortcutsHandler({ onAddTask }: GlobalShortcutsHandlerProps) {
  const navigate = useNavigate();
  const { setShowShortcutsModal } = useShortcutsModal();
  const { openSearch } = useSearch();
  const { undo, redo } = useUndoRedo();

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Ignore if typing in input
      if (shouldIgnoreShortcut(event)) return;

      // Show shortcuts modal (Shift + ?)
      if (SHORTCUTS.showShortcuts && matchesShortcut(event, SHORTCUTS.showShortcuts)) {
        event.preventDefault();
        void prefetchShortcutsModal();
        setShowShortcutsModal(true);
        return;
      }

      // Search/Command Palette (Cmd+K / Ctrl+K)
      if (SHORTCUTS.search && matchesShortcut(event, SHORTCUTS.search)) {
        event.preventDefault();
        void prefetchCommandPalette();
        openSearch();
        return;
      }

      // Add task (A)
      if (SHORTCUTS.addTask && matchesShortcut(event, SHORTCUTS.addTask)) {
        event.preventDefault();
        onAddTask();
        return;
      }

      // Redo (Cmd+Shift+Z / Ctrl+Shift+Z)
      if (SHORTCUTS.redo && matchesShortcut(event, SHORTCUTS.redo)) {
        event.preventDefault();
        redo();
        return;
      }

      // Undo (Cmd+Z / Ctrl+Z)
      if (SHORTCUTS.undo && matchesShortcut(event, SHORTCUTS.undo)) {
        event.preventDefault();
        undo();
        return;
      }

      // Navigation shortcuts (Ctrl+1 through Ctrl+6 / Cmd+1 through Cmd+6)
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
        if (event.key === "1") {
          event.preventDefault();
          void navigate({ to: "/app/board" });
          return;
        }
        if (event.key === "2") {
          event.preventDefault();
          void navigate({ to: "/app/calendar" });
          return;
        }
        if (event.key === "3") {
          event.preventDefault();
          void navigate({ to: "/app/assignments" });
          return;
        }
        if (event.key === "4") {
          event.preventDefault();
          void navigate({ to: "/app/subjects" });
          return;
        }
        if (event.key === "5") {
          event.preventDefault();
          void navigate({ to: "/app/resources" });
          return;
        }
        if (event.key === "6") {
          event.preventDefault();
          void navigate({ to: "/app/notes" });
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, setShowShortcutsModal, openSearch, onAddTask, undo, redo]);

  return null;
}

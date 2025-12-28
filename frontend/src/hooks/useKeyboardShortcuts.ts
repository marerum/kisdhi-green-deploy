/**
 * useKeyboardShortcuts Hook
 * Comprehensive keyboard shortcut management for the flow editor
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  category: string;
  action: () => void;
  preventDefault?: boolean;
  disabled?: boolean;
}

export interface KeyboardShortcutOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  ignoreWhenEditing?: boolean;
}

export interface UseKeyboardShortcutsReturn {
  shortcuts: KeyboardShortcut[];
  isShortcutActive: (key: string, modifiers?: { ctrl?: boolean; meta?: boolean; shift?: boolean; alt?: boolean }) => boolean;
  getShortcutsByCategory: (category: string) => KeyboardShortcut[];
  getAllCategories: () => string[];
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  ignoreWhenEditing = true,
}: KeyboardShortcutOptions): UseKeyboardShortcutsReturn {
  const shortcutsRef = useRef(shortcuts);
  
  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const isEditingContext = useCallback(() => {
    if (!ignoreWhenEditing) return false;
    
    const activeElement = document.activeElement;
    return (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement?.getAttribute('contenteditable') === 'true' ||
      activeElement?.closest('[contenteditable="true"]') !== null
    );
  }, [ignoreWhenEditing]);

  const matchesShortcut = useCallback((event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
    // Check if key matches (case insensitive)
    if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
      return false;
    }

    // Check modifier keys
    const ctrlMatch = (shortcut.ctrlKey ?? false) === event.ctrlKey;
    const metaMatch = (shortcut.metaKey ?? false) === event.metaKey;
    const shiftMatch = (shortcut.shiftKey ?? false) === event.shiftKey;
    const altMatch = (shortcut.altKey ?? false) === event.altKey;

    return ctrlMatch && metaMatch && shiftMatch && altMatch;
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    // Skip if we're in an editing context
    if (isEditingContext()) return;

    // Find matching shortcut
    const matchingShortcut = shortcutsRef.current.find(shortcut => 
      !shortcut.disabled && matchesShortcut(event, shortcut)
    );

    if (matchingShortcut) {
      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault();
      }
      matchingShortcut.action();
    }
  }, [enabled, isEditingContext, matchesShortcut]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  const isShortcutActive = useCallback((
    key: string, 
    modifiers: { ctrl?: boolean; meta?: boolean; shift?: boolean; alt?: boolean } = {}
  ): boolean => {
    return shortcuts.some(shortcut => 
      shortcut.key.toLowerCase() === key.toLowerCase() &&
      (shortcut.ctrlKey ?? false) === (modifiers.ctrl ?? false) &&
      (shortcut.metaKey ?? false) === (modifiers.meta ?? false) &&
      (shortcut.shiftKey ?? false) === (modifiers.shift ?? false) &&
      (shortcut.altKey ?? false) === (modifiers.alt ?? false) &&
      !shortcut.disabled
    );
  }, [shortcuts]);

  const getShortcutsByCategory = useCallback((category: string): KeyboardShortcut[] => {
    return shortcuts.filter(shortcut => shortcut.category === category);
  }, [shortcuts]);

  const getAllCategories = useCallback((): string[] => {
    const categories = new Set(shortcuts.map(shortcut => shortcut.category));
    return Array.from(categories).sort();
  }, [shortcuts]);

  return {
    shortcuts,
    isShortcutActive,
    getShortcutsByCategory,
    getAllCategories,
  };
}

/**
 * Utility function to format shortcut display text
 */
export function formatShortcutText(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.metaKey) parts.push('Cmd');
  if (shortcut.shiftKey) parts.push('Shift');
  if (shortcut.altKey) parts.push('Alt');
  
  // Format key display
  let keyDisplay = shortcut.key;
  switch (shortcut.key.toLowerCase()) {
    case ' ':
      keyDisplay = 'Space';
      break;
    case 'arrowup':
      keyDisplay = '↑';
      break;
    case 'arrowdown':
      keyDisplay = '↓';
      break;
    case 'arrowleft':
      keyDisplay = '←';
      break;
    case 'arrowright':
      keyDisplay = '→';
      break;
    case 'enter':
      keyDisplay = 'Enter';
      break;
    case 'escape':
      keyDisplay = 'Esc';
      break;
    case 'delete':
      keyDisplay = 'Delete';
      break;
    case 'backspace':
      keyDisplay = 'Backspace';
      break;
    default:
      keyDisplay = shortcut.key.toUpperCase();
  }
  
  parts.push(keyDisplay);
  
  return parts.join(' + ');
}

/**
 * Check if we're on macOS for Cmd vs Ctrl display
 */
export function isMacOS(): boolean {
  return typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

/**
 * Get the appropriate modifier key for the current platform
 */
export function getPlatformModifierKey(): 'ctrlKey' | 'metaKey' {
  return isMacOS() ? 'metaKey' : 'ctrlKey';
}
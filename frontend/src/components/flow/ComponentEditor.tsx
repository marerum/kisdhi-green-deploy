/**
 * ComponentEditor Component
 * Inline text editor for flow components
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FlowComponentData } from '@/types/flowComponents';

export interface ComponentEditorProps {
  component: FlowComponentData;
  isEditing: boolean;
  onSave: (text: string) => void;
  onCancel: () => void;
  scale: number;
  className?: string;
}

export default function ComponentEditor({
  component,
  isEditing,
  onSave,
  onCancel,
  scale,
  className = '',
}: ComponentEditorProps) {
  const [text, setText] = useState(component.text);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isMultiline, setIsMultiline] = useState(false);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing) {
      setText(component.text);
      setIsMultiline(component.text.includes('\n') || component.text.length > 30);
      
      // Focus after a short delay to ensure the element is rendered
      setTimeout(() => {
        if (isMultiline && textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        } else if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 10);
    }
  }, [isEditing, component.text, isMultiline]);

  const handleSave = useCallback(() => {
    const trimmedText = text.trim();
    if (trimmedText !== component.text) {
      onSave(trimmedText);
    } else {
      onCancel();
    }
  }, [text, component.text, onSave, onCancel]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    event.stopPropagation(); // Prevent canvas shortcuts
    
    switch (event.key) {
      case 'Enter':
        if (!isMultiline || event.ctrlKey || event.metaKey) {
          event.preventDefault();
          handleSave();
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        onCancel();
        break;
        
      case 'Tab':
        event.preventDefault();
        if (isMultiline && textareaRef.current) {
          // Insert tab character in textarea
          const start = textareaRef.current.selectionStart;
          const end = textareaRef.current.selectionEnd;
          const newText = text.substring(0, start) + '\t' + text.substring(end);
          setText(newText);
          
          // Restore cursor position
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = start + 1;
              textareaRef.current.selectionEnd = start + 1;
            }
          }, 0);
        }
        break;
    }
  }, [isMultiline, text, handleSave, onCancel]);

  const handleBlur = useCallback(() => {
    // Save on blur, but with a small delay to allow for other interactions
    setTimeout(() => {
      handleSave();
    }, 100);
  }, [handleSave]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setText(event.target.value);
  }, []);

  if (!isEditing) {
    return null;
  }

  // Calculate editor position and size
  const editorStyle: React.CSSProperties = {
    position: 'absolute',
    left: component.position.x,
    top: component.position.y,
    width: component.size.width,
    height: isMultiline ? Math.max(component.size.height, 60) : component.size.height,
    fontSize: Math.max(12, 14 / scale),
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 500,
    color: '#1f2937',
    backgroundColor: '#ffffff',
    border: '2px solid #3b82f6',
    borderRadius: '4px',
    padding: '8px',
    outline: 'none',
    resize: 'none',
    zIndex: 1000,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  };

  const commonProps = {
    value: text,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onBlur: handleBlur,
    style: editorStyle,
    className: `${className}`,
    placeholder: 'テキストを入力...',
    autoComplete: 'off',
    spellCheck: false,
  };

  return (
    <foreignObject
      x={component.position.x}
      y={component.position.y}
      width={component.size.width}
      height={isMultiline ? Math.max(component.size.height, 60) : component.size.height}
      className="pointer-events-auto"
    >
      {isMultiline ? (
        <textarea
          ref={textareaRef}
          {...commonProps}
          rows={Math.max(2, Math.ceil(component.size.height / 20))}
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          {...commonProps}
        />
      )}
    </foreignObject>
  );
}

// Hook for managing component editing state
export function useComponentEditor() {
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);

  const startEditing = useCallback((componentId: string) => {
    setEditingComponentId(componentId);
  }, []);

  const stopEditing = useCallback(() => {
    setEditingComponentId(null);
  }, []);

  const isEditing = useCallback((componentId: string) => {
    return editingComponentId === componentId;
  }, [editingComponentId]);

  return {
    editingComponentId,
    startEditing,
    stopEditing,
    isEditing,
  };
}
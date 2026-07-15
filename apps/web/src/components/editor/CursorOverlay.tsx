'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { WebsocketProvider } from 'y-websocket';

/* ============================================================ */
/* Types */
/* ============================================================ */

interface RemoteCursor {
  clientId: number;
  name: string;
  color: string;
  x: number;
  y: number;
  visible: boolean;
}

interface CursorOverlayProps {
  provider: WebsocketProvider;
  currentUser: { name: string; color: string };
  /** CSS selector for the editor content area */
  containerSelector?: string;
}

/* ============================================================ */
/* Component */
/* ============================================================ */

/**
 * Renders remote user cursors as colored labels that follow their
 * cursor position inside the editor, using Yjs awareness data.
 *
 * This replaces @tiptap/extension-collaboration-cursor which has
 * compatibility issues with TipTap v3.27+.
 */
export function CursorOverlay({
  provider,
  currentUser,
  containerSelector = '.ProseMirror',
}: CursorOverlayProps) {
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Track mouse position locally (sent via awareness) */
  const mouseRef = useRef({ x: 0, y: 0 });

  /* Listen to Yjs awareness for remote cursors */
  useEffect(() => {
    const awareness = provider.awareness;
    if (!awareness) return;

    /* Send our cursor position on mouse move */
    const editorEl = document.querySelector(containerSelector);
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      awareness.setLocalStateField('cursor', {
        x: e.clientX,
        y: e.clientY,
        visible: true,
      });
    };

    const handleMouseLeave = () => {
      awareness.setLocalStateField('cursor', {
        ...mouseRef.current,
        visible: false,
      });
    };

    const handleMouseEnter = () => {
      awareness.setLocalStateField('cursor', {
        ...mouseRef.current,
        visible: true,
      });
    };

    if (editorEl) {
      editorEl.addEventListener('mousemove', handleMouseMove as EventListener);
      editorEl.addEventListener('mouseleave', handleMouseLeave as EventListener);
      editorEl.addEventListener('mouseenter', handleMouseEnter as EventListener);
    }

    /* Update remote cursors when awareness changes */
    const handleAwarenessChange = () => {
      const states = awareness.getStates();
      const remoteCursors: RemoteCursor[] = [];

      states.forEach((state: any, clientId: number) => {
        const user = state?.user as { name?: string; color?: string } | undefined;
        const cursor = state?.cursor as
          | { x?: number; y?: number; visible?: boolean }
          | undefined;

        if (!user?.name || !cursor) return;

        /* Skip self */
        if (user.name === currentUser.name && user.color === currentUser.color) {
          return;
        }

        remoteCursors.push({
          clientId,
          name: user.name,
          color: user.color || '#0f62fe',
          x: cursor.x || 0,
          y: cursor.y || 0,
          visible: cursor.visible !== false,
        });
      });

      setCursors(remoteCursors);
    };

    /* Initial update */
    handleAwarenessChange();

    awareness.on('change', handleAwarenessChange);

    return () => {
      if (editorEl) {
        editorEl.removeEventListener('mousemove', handleMouseMove as EventListener);
        editorEl.removeEventListener('mouseleave', handleMouseLeave as EventListener);
        editorEl.removeEventListener('mouseenter', handleMouseEnter as EventListener);
      }
      awareness.off('change', handleAwarenessChange);
      /* Clean up our cursor data */
      awareness.setLocalStateField('cursor', null);
    };
  }, [provider, currentUser, containerSelector]);

  return (
    <div ref={containerRef} className="pointer-events-none fixed inset-0 z-[9999]">
      {cursors.map(
        (cursor) =>
          cursor.visible && (
            <div
              key={cursor.clientId}
              className="absolute pointer-events-none transition-none"
              style={{
                left: cursor.x,
                top: cursor.y,
                transform: 'translate(8px, -4px)',
              }}
            >
              {/* Cursor arrow */}
              <svg
                width="12"
                height="16"
                viewBox="0 0 12 16"
                fill="none"
                className="block"
              >
                <path
                  d="M2 1L10 9H6.5L6 11L4 14L3 9H2V1Z"
                  fill={cursor.color}
                  stroke="white"
                  strokeWidth="0.5"
                />
              </svg>
              {/* User label */}
              <span
                className="absolute left-4 -top-1 text-caption font-medium text-white px-1 py-0.5 whitespace-nowrap rounded-none pointer-events-none"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.name}
              </span>
            </div>
          ),
      )}
    </div>
  );
}

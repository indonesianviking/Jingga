'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { WebsocketProvider } from 'y-websocket';

/* ============================================================ */
/* Types */
/* ============================================================ */

interface AwarenessUser {
  name: string;
  color: string;
  /** wallet address or unique identifier */
  id?: string;
}

interface RoomUsersProps {
  provider: WebsocketProvider;
  /** Current user's info - excluded from the "others" list if matched */
  currentUser: AwarenessUser;
}

/* ============================================================ */
/* Component */
/* ============================================================ */

export function RoomUsers({ provider, currentUser }: RoomUsersProps) {
  const [others, setOthers] = useState<AwarenessUser[]>([]);
  const [total, setTotal] = useState(1);
  /* Use ref to avoid effect re-running when currentUser object reference changes */
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  /* Listen to Yjs awareness changes */
  useEffect(() => {
    const awareness = provider.awareness;

    if (!awareness) return;

    const update = () => {
      const states = awareness.getStates();
      const users: AwarenessUser[] = [];
      const me = currentUserRef.current;

      states.forEach((state: any, _clientId: number) => {
        const user = state?.user as AwarenessUser | undefined;
        if (!user?.name) return;

        /* Skip current user (matched by name + color) */
        if (user.name === me.name && user.color === me.color) {
          return;
        }

        users.push(user);
      });

      setOthers(users);
      setTotal(states.size);
    };

    /* Initial update */
    update();

    /* Listen for awareness changes (fires on connect/disconnect/update) */
    awareness.on('change', update);

    return () => {
      awareness.off('change', update);
    };
  }, [provider]);

  return (
    <div className="bg-canvas border border-hairline p-lg">
      <h3 className="text-card-title text-ink mb-md flex items-center justify-between">
        <span>In Room</span>
        <span className="text-body-sm text-ink-muted font-normal">{total} online</span>
      </h3>

      {/* Current user (you) */}
      <div className="flex items-center gap-sm py-sm border-b border-hairline mb-sm">
        <div
          className="w-6 h-6 flex items-center justify-center text-caption font-medium text-white flex-shrink-0"
          style={{ backgroundColor: currentUser.color }}
        >
          {currentUser.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-body-sm text-ink font-medium block truncate">
            {currentUser.name}
          </span>
          <span className="text-caption text-ink-subtle">You</span>
        </div>
      </div>

      {/* Other users */}
      {others.length === 0 ? (
        <p className="text-body-sm text-ink-muted text-center py-sm">
          No other users connected
        </p>
      ) : (
        <div className="space-y-sm">
          {others.map((user, i) => (
            <div key={user.name + user.color + i} className="flex items-center gap-sm">
              <div
                className="w-6 h-6 flex items-center justify-center text-caption font-medium text-white flex-shrink-0"
                style={{ backgroundColor: user.color }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-body-sm text-ink block truncate">{user.name}</span>
              </div>
              <span className="w-1.5 h-1.5 bg-semantic-success" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

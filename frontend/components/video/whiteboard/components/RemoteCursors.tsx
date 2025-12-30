'use client';

import { memo } from 'react';
import { RemoteCursor } from '../types';
import { worldToScreen } from '../utils';

interface LocalCursor {
    x: number;
    y: number;
    participantId: string;
    participantName: string;
    color: string;
}

interface CursorsProps {
    cursors: Map<string, RemoteCursor>;
    localCursor: LocalCursor | null;
    scale: number;
    panOffset: { x: number; y: number };
}

interface CursorItemProps {
    x: number;
    y: number;
    color: string;
    name: string;
    isLocal?: boolean;
    scale: number;
    panOffset: { x: number; y: number };
}

function CursorItem({ x, y, color, name, isLocal, scale, panOffset }: CursorItemProps) {
    const { x: screenX, y: screenY } = worldToScreen(x, y, panOffset, scale);

    return (
        <div
            className="absolute pointer-events-none z-30 transition-all duration-75 ease-out"
            style={{
                left: screenX,
                top: screenY,
                transform: 'translate(-2px, -2px)',
            }}
        >
            {/* Cursor Arrow SVG */}
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                className="drop-shadow-md"
            >
                <path
                    d="M5.65376 3.54639C5.10764 3.07987 4.27906 3.52968 4.33765 4.24087L5.6469 20.1293C5.70985 20.8954 6.62952 21.2376 7.1747 20.6834L10.4723 17.3858L13.894 22.3122C14.1962 22.7468 14.8014 22.8441 15.2207 22.5211L17.2008 21.0141C17.6049 20.7025 17.6837 20.1191 17.3779 19.7091L13.8946 14.6997L18.5529 13.4569C19.2763 13.264 19.4572 12.3395 18.8672 11.8807L5.65376 3.54639Z"
                    fill={color}
                    stroke="white"
                    strokeWidth="1.5"
                />
            </svg>

            {/* Name Badge */}
            <div
                className="absolute left-5 top-4 flex items-center gap-1.5 px-2 py-1 rounded-full text-white text-xs font-medium whitespace-nowrap shadow-lg"
                style={{ backgroundColor: color }}
            >
                <span className="max-w-[100px] truncate">
                    {name}
                </span>
                {isLocal && (
                    <span className="opacity-70">(나)</span>
                )}
            </div>
        </div>
    );
}

function CursorsComponent({ cursors, localCursor, scale, panOffset }: CursorsProps) {
    return (
        <>
            {/* Remote Cursors */}
            {Array.from(cursors.values()).map((cursor) => (
                <CursorItem
                    key={cursor.participantId}
                    x={cursor.x}
                    y={cursor.y}
                    color={cursor.color}
                    name={cursor.participantName}
                    scale={scale}
                    panOffset={panOffset}
                />
            ))}

            {/* Local Cursor */}
            {localCursor && (
                <CursorItem
                    x={localCursor.x}
                    y={localCursor.y}
                    color={localCursor.color}
                    name={localCursor.participantName}
                    isLocal
                    scale={scale}
                    panOffset={panOffset}
                />
            )}
        </>
    );
}

export const RemoteCursors = memo(CursorsComponent);

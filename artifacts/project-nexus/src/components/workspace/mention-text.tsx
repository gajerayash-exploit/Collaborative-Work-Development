import React from "react";

interface MentionTextProps {
  content: string;
  currentUserId?: string;
  isMe?: boolean;
}

// Renders message content with @[Name|userId] tokens as highlighted chips
export function MentionText({ content, currentUserId, isMe }: MentionTextProps) {
  const parts: React.ReactNode[] = [];
  const regex = /@\[([^\]|]+)\|([^\]]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    const name = match[1];
    const userId = match[2];
    const isMentioningMe = userId === currentUserId;
    parts.push(
      <span
        key={match.index}
        className={`inline-flex items-center rounded px-1 py-0.5 text-xs font-semibold mx-0.5 ${
          isMentioningMe
            ? "bg-amber-200/80 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
            : isMe
            ? "bg-white/20 text-white"
            : "bg-primary/10 text-primary"
        }`}
      >
        @{name}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return <>{parts}</>;
}

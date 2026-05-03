import { useRef, useState, type KeyboardEvent } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface Member {
  userId: string;
  user?: { name: string; avatarUrl?: string | null } | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  members: Member[];
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Converts display-format text (with @Name) to raw storage format (@[Name|userId]).
 * Sort members by name length descending so longer names are matched before shorter
 * ones that may be a prefix (e.g. "John Smith" before "John").
 */
export function toRawFormat(displayText: string, members: Member[]): string {
  let raw = displayText;
  const sorted = [...members].sort(
    (a, b) => (b.user?.name?.length ?? 0) - (a.user?.name?.length ?? 0)
  );
  for (const m of sorted) {
    if (!m.user?.name) continue;
    const escaped = m.user.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    raw = raw.replace(
      new RegExp(`@${escaped}(?!\\w)`, "g"),
      `@[${m.user.name}|${m.userId}]`
    );
  }
  return raw;
}

/**
 * Single-line input that detects @ and shows a member-picker dropdown.
 * Both `value` and `onChange` operate in display format (@Name, not @[Name|id]).
 * Call `toRawFormat` before sending to the API.
 */
export function MentionInput({
  value,
  onChange,
  onSubmit,
  members,
  disabled,
  placeholder,
}: MentionInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [mentionStartPos, setMentionStartPos] = useState<number>(-1);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const filteredMembers =
    mentionSearch !== null
      ? members
          .filter(
            (m) =>
              m.user?.name &&
              m.user.name.toLowerCase().includes(mentionSearch.toLowerCase())
          )
          .slice(0, 6)
      : [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;
    onChange(val);

    const textBeforeCursor = val.slice(0, cursor);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setMentionSearch(atMatch[1]);
      setMentionStartPos(cursor - atMatch[0].length);
      setSelectedIdx(0);
    } else {
      setMentionSearch(null);
      setMentionStartPos(-1);
    }
  };

  const insertMention = (member: Member) => {
    if (!member.user?.name) return;
    const cursor = inputRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, mentionStartPos);
    const after = value.slice(cursor);
    const newVal = `${before}@${member.user.name} ${after}`;
    onChange(newVal);
    setMentionSearch(null);
    setMentionStartPos(-1);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (mentionSearch !== null && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, filteredMembers.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMembers[selectedIdx]);
        return;
      }
      if (e.key === "Escape") {
        setMentionSearch(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="w-full h-10 px-4 pr-2 rounded-full border border-muted-foreground/20 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
      />

      {mentionSearch !== null && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-card border rounded-xl shadow-lg overflow-hidden z-30">
          <div className="px-3 py-1.5 border-b bg-muted/30">
            <span className="text-xs text-muted-foreground font-medium">
              Mention a member
            </span>
          </div>
          {filteredMembers.map((m, i) => (
            <button
              key={m.userId}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition-colors ${
                i === selectedIdx ? "bg-muted" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(m);
              }}
            >
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={m.user?.avatarUrl ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {(m.user?.name ?? "?").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate">{m.user?.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

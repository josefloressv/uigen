import { Loader2 } from "lucide-react";

interface ToolCallBadgeProps {
  toolName: string;
  args: Record<string, unknown>;
  state: "call" | "partial-call" | "result";
}

export function getToolCallLabel(
  toolName: string,
  args: Record<string, unknown>
): string {
  const cmd = args.command as string | undefined;
  const path = args.path as string | undefined;

  if (toolName === "str_replace_editor") {
    if (cmd === "create") return `Creating file ${path}`;
    if (cmd === "str_replace") return `Editing file ${path}`;
    if (cmd === "insert") return `Editing file ${path}`;
    if (cmd === "view") return `Reading file ${path}`;
    if (cmd === "undo_edit") return `Undoing edit in ${path}`;
  }
  if (toolName === "file_manager") {
    if (cmd === "rename") return `Renaming ${path} → ${args.new_path}`;
    if (cmd === "delete") return `Deleting file ${path}`;
  }
  return toolName;
}

export function ToolCallBadge({ toolName, args, state }: ToolCallBadgeProps) {
  const label = getToolCallLabel(toolName, args);
  const isDone = state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}

import { useRef, useEffect, useState } from "react";
import {
  StickyNote,
  Heading1,
  Heading2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Minus,
  Quote,
  Eye,
  Pencil,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LessonNotesProps {
  content: string;
  onChange: (text: string) => void;
}

type ToolbarAction =
  | { kind: "wrap"; before: string; after: string; placeholder: string }
  | { kind: "linePrefix"; prefix: string }
  | { kind: "block"; text: string }
  | { kind: "link" };

const TOOLBAR: Array<{
  icon: typeof StickyNote;
  label: string;
  action: ToolbarAction;
}> = [
  { icon: Heading1, label: "Titulo grande", action: { kind: "linePrefix", prefix: "# " } },
  { icon: Heading2, label: "Titulo menor", action: { kind: "linePrefix", prefix: "## " } },
  { icon: Bold, label: "Negrito", action: { kind: "wrap", before: "**", after: "**", placeholder: "texto" } },
  { icon: Italic, label: "Italico", action: { kind: "wrap", before: "_", after: "_", placeholder: "texto" } },
  { icon: List, label: "Lista", action: { kind: "linePrefix", prefix: "- " } },
  { icon: ListOrdered, label: "Lista numerada", action: { kind: "linePrefix", prefix: "1. " } },
  { icon: Quote, label: "Citacao", action: { kind: "linePrefix", prefix: "> " } },
  { icon: Minus, label: "Separador", action: { kind: "block", text: "\n---\n" } },
  { icon: Link2, label: "Link", action: { kind: "link" } },
];

export function LessonNotes({ content, onChange }: LessonNotesProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = useState(content);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  // Sync external content changes (e.g. lesson switch)
  useEffect(() => {
    setValue(content);
  }, [content]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function commit(next: string) {
    setValue(next);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(next), 500);
  }

  function applyAction(action: ToolbarAction) {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    let next = value;
    let cursorStart = start;
    let cursorEnd = end;

    if (action.kind === "wrap") {
      const inner = selected || action.placeholder;
      const insert = action.before + inner + action.after;
      next = value.slice(0, start) + insert + value.slice(end);
      cursorStart = start + action.before.length;
      cursorEnd = cursorStart + inner.length;
    } else if (action.kind === "linePrefix") {
      // Apply the prefix to every line in the current selection (or current line)
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = value.indexOf("\n", end);
      const blockEnd = lineEnd === -1 ? value.length : lineEnd;
      const block = value.slice(lineStart, blockEnd);
      const lines = block.split("\n");
      const allPrefixed = lines.every((l) => l.startsWith(action.prefix));
      const transformed = lines
        .map((l) =>
          allPrefixed ? l.slice(action.prefix.length) : action.prefix + l
        )
        .join("\n");
      next = value.slice(0, lineStart) + transformed + value.slice(blockEnd);
      cursorStart = lineStart;
      cursorEnd = lineStart + transformed.length;
    } else if (action.kind === "block") {
      next = value.slice(0, end) + action.text + value.slice(end);
      cursorStart = end + action.text.length;
      cursorEnd = cursorStart;
    } else if (action.kind === "link") {
      const url = window.prompt("URL do link:", "https://");
      if (!url) return;
      const label = selected || "texto do link";
      const insert = `[${label}](${url})`;
      next = value.slice(0, start) + insert + value.slice(end);
      cursorStart = start + 1;
      cursorEnd = cursorStart + label.length;
    }

    commit(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <StickyNote className="h-4 w-4" />
          Minhas anotacoes
          {value.trim() && (
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse-soft" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="rounded-lg border border-border/60 overflow-hidden bg-background/50">
          <div className="flex items-center justify-between gap-2 border-b border-border/40 px-2 py-1.5 bg-muted/20">
            <div className="flex flex-wrap items-center gap-0.5">
              {TOOLBAR.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.label}
                    type="button"
                    title={tool.label}
                    onClick={() => applyAction(tool.action)}
                    disabled={mode === "preview"}
                    className={cn(
                      "h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors",
                      "hover:bg-muted hover:text-foreground",
                      "disabled:opacity-40 disabled:cursor-not-allowed"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setMode("edit")}
                title="Editar"
                className={cn(
                  "h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors",
                  mode === "edit"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setMode("preview")}
                title="Visualizar"
                className={cn(
                  "h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors",
                  mode === "preview"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {mode === "edit" ? (
            <Textarea
              ref={textareaRef}
              placeholder="Escreva suas anotacoes. Use a barra acima para formatar (titulos, listas, links, etc)."
              value={value}
              onChange={(e) => commit(e.target.value)}
              className="min-h-[180px] resize-y border-0 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 font-mono text-sm leading-relaxed"
            />
          ) : (
            <div className="min-h-[180px] px-3 py-3 prose prose-sm dark:prose-invert max-w-none prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-hr:my-3 prose-a:text-primary">
              {value.trim() ? (
                <ReactMarkdown>{value}</ReactMarkdown>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Nada escrito ainda.
                </p>
              )}
            </div>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground/70 mt-1.5 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500/60" />
          Salvo automaticamente
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

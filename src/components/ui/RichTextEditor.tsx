import { useEffect, useState, type FormEvent } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Heading1,
  Heading2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link2,
  Strikethrough,
  Undo2,
  Redo2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  /** When true the toolbar is hidden until the editor is focused (for compact comment inputs). */
  compactToolbar?: boolean;
}

/**
 * Tiptap-based WYSIWYG editor used by LessonNotes, LessonComments and any
 * other place that needs inline rich text. Stores HTML, not Markdown — render
 * with `dangerouslySetInnerHTML` plus the same `prose` typography classes.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = "min-h-[140px]",
  className,
  compactToolbar = false,
}: RichTextEditorProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "Escreva aqui...",
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none px-3 py-3",
          "prose-headings:mt-3 prose-headings:mb-2",
          "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0",
          "prose-hr:my-3 prose-blockquote:my-2 prose-a:text-primary",
          minHeight,
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes (e.g. switching between lessons).
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  function openLinkDialog() {
    if (!editor) return;
    const previousUrl =
      (editor.getAttributes("link").href as string | undefined) ?? "";
    setLinkUrl(previousUrl || "https://");
    setLinkOpen(true);
  }

  function applyLink(e: FormEvent) {
    e.preventDefault();
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url || url === "https://") {
      // Empty URL removes the link from the current selection.
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setLinkOpen(false);
    setLinkUrl("");
  }

  function removeLink() {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
    setLinkUrl("");
  }

  type ToolbarButton = {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
  };

  const buttons: ToolbarButton[] = [
    {
      icon: Heading1,
      label: "Titulo grande",
      onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive("heading", { level: 1 }),
    },
    {
      icon: Heading2,
      label: "Titulo menor",
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive("heading", { level: 2 }),
    },
    {
      icon: Bold,
      label: "Negrito",
      onClick: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive("bold"),
    },
    {
      icon: Italic,
      label: "Italico",
      onClick: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive("italic"),
    },
    {
      icon: Strikethrough,
      label: "Riscado",
      onClick: () => editor.chain().focus().toggleStrike().run(),
      isActive: editor.isActive("strike"),
    },
    {
      icon: List,
      label: "Lista",
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive("bulletList"),
    },
    {
      icon: ListOrdered,
      label: "Lista numerada",
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive("orderedList"),
    },
    {
      icon: Quote,
      label: "Citacao",
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive("blockquote"),
    },
    {
      icon: Minus,
      label: "Separador",
      onClick: () => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      icon: Link2,
      label: "Link",
      onClick: openLinkDialog,
      isActive: editor.isActive("link"),
    },
    {
      icon: Undo2,
      label: "Desfazer",
      onClick: () => editor.chain().focus().undo().run(),
      disabled: !editor.can().chain().focus().undo().run(),
    },
    {
      icon: Redo2,
      label: "Refazer",
      onClick: () => editor.chain().focus().redo().run(),
      disabled: !editor.can().chain().focus().redo().run(),
    },
  ];

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-background/50 overflow-hidden",
        "focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15",
        "transition-all duration-200",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-0.5 border-b border-border/40 px-2 py-1.5 bg-muted/20",
          compactToolbar && "hidden group-focus-within/editor:flex",
        )}
      >
        {buttons.map((btn, idx) => {
          const Icon = btn.icon;
          // Insert a vertical separator before the link button and before undo/redo
          const showSep = idx === 5 || idx === 9 || idx === 10;
          return (
            <span key={btn.label} className="flex items-center">
              {showSep && (
                <span className="mx-1 h-4 w-px bg-border/40" aria-hidden />
              )}
              <button
                type="button"
                title={btn.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={btn.onClick}
                disabled={btn.disabled}
                aria-pressed={btn.isActive}
                className={cn(
                  "h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors",
                  "text-muted-foreground hover:bg-muted hover:text-foreground",
                  // Active state is signaled with color only — no background or
                  // border — so neighbouring buttons don't visually overlap.
                  btn.isActive && "text-primary hover:text-primary",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            </span>
          );
        })}
      </div>
      <EditorContent editor={editor} />

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inserir link</DialogTitle>
            <DialogDescription>
              Cole o endereco completo (incluindo https://). Deixe vazio e
              clique em remover para tirar o link do texto selecionado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={applyLink} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="rte-link-url">URL</Label>
              <Input
                id="rte-link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://exemplo.com"
                autoFocus
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              {editor.isActive("link") && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={removeLink}
                  className="text-destructive hover:text-destructive"
                >
                  Remover link
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLinkOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Aplicar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Read-only renderer for HTML produced by RichTextEditor. Applies the same
 * prose typography classes so the output looks identical to edit mode.
 */
export function RichTextRenderer({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  if (!html || !html.trim() || html === "<p></p>") {
    return null;
  }
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-headings:mt-3 prose-headings:mb-2",
        "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0",
        "prose-hr:my-3 prose-blockquote:my-2 prose-a:text-primary",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

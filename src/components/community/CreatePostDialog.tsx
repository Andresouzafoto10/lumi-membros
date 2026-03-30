import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Maximize2,
  Minimize2,
  Hash,
  Paperclip,
  ImagePlus,
  Smile,
  BarChart3,
  Mic,
  Plus,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Code,
  AtSign,
  FileUp,
} from "lucide-react";
import { toast } from "sonner";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCommunities } from "@/hooks/useCommunities";
import { usePosts } from "@/hooks/usePosts";
import { useRestrictions } from "@/hooks/useRestrictions";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Slash command menu items
// ---------------------------------------------------------------------------
const SLASH_BASIC = [
  { label: "Parágrafo", icon: Type, insert: "" },
  { label: "Título 1", icon: Heading1, insert: "# " },
  { label: "Título 2", icon: Heading2, insert: "## " },
  { label: "Título 3", icon: Heading3, insert: "### " },
  { label: "Lista numerada", icon: ListOrdered, insert: "1. " },
  { label: "Lista com marcadores", icon: List, insert: "- " },
  { label: "Citação em bloco", icon: Quote, insert: "> " },
  { label: "Divisor", icon: Minus, insert: "\n---\n" },
  { label: "Código", icon: Code, insert: "```\n" },
] as const;

const SLASH_INSERT = [
  { label: "Emoji", icon: Smile, insert: "" },
  { label: "Menção (@)", icon: AtSign, insert: "@" },
] as const;

const SLASH_UPLOAD = [
  { label: "Imagem", icon: ImagePlus, action: "image" as const },
  { label: "Arquivo", icon: FileUp, action: "file" as const },
] as const;

export function CreatePostDialog({
  open,
  onOpenChange,
  defaultCommunityId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCommunityId?: string;
}) {
  const { currentUserId } = useCurrentUser();
  const { getCommunitiesForStudent } = useCommunities();
  const { createPost } = usePosts();
  const { isRestricted } = useRestrictions();

  const myCommunities = getCommunitiesForStudent(currentUserId);
  const postable = myCommunities.filter((c) => c.settings.allowStudentPosts);

  const [communityId, setCommunityId] = useState(
    defaultCommunityId ?? postable[0]?.id ?? ""
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashIdx, setSlashIdx] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const slashMenuRef = useRef<HTMLDivElement>(null);

  const restricted = isRestricted(currentUserId);
  const selectedCommunity = myCommunities.find((c) => c.id === communityId);
  const requiresApproval = selectedCommunity?.settings.requireApproval ?? false;
  const allowImages = selectedCommunity?.settings.allowImages ?? true;

  // All slash items flattened for keyboard navigation
  const allSlashItems = [
    ...SLASH_BASIC.map((s) => ({ ...s, action: undefined })),
    ...SLASH_INSERT.map((s) => ({ ...s, action: undefined })),
    ...SLASH_UPLOAD,
  ];

  // Auto-resize textarea
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.style.height = "auto";
      bodyRef.current.style.height = `${Math.max(bodyRef.current.scrollHeight, 160)}px`;
    }
  }, [body]);

  // Close slash menu on outside click
  useEffect(() => {
    if (!slashOpen) return;
    function handleClick(e: MouseEvent) {
      if (slashMenuRef.current && !slashMenuRef.current.contains(e.target as Node)) {
        setSlashOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [slashOpen]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTitle("");
      setBody("");
      setImages([]);
      setSlashOpen(false);
      setExpanded(false);
    }
  }, [open]);

  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setBody(val);

    // Detect "/" at start of a line
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastNewline = textBeforeCursor.lastIndexOf("\n");
    const lineStart = textBeforeCursor.slice(lastNewline + 1);

    if (lineStart === "/") {
      setSlashOpen(true);
      setSlashIdx(0);
    } else {
      setSlashOpen(false);
    }
  }

  function handleBodyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!slashOpen) return;

    if (e.key === "Escape") {
      e.preventDefault();
      setSlashOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSlashIdx((prev) => (prev + 1) % allSlashItems.length);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSlashIdx((prev) => (prev - 1 + allSlashItems.length) % allSlashItems.length);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      selectSlashItem(slashIdx);
      return;
    }
  }

  function selectSlashItem(idx: number) {
    const item = allSlashItems[idx];
    setSlashOpen(false);

    if ("action" in item && item.action === "image") {
      fileInputRef.current?.click();
      // Remove the "/" from body
      removeSlashFromBody();
      return;
    }

    if ("action" in item && item.action === "file") {
      toast.info("Upload de arquivo em breve.");
      removeSlashFromBody();
      return;
    }

    if ("insert" in item && item.insert !== undefined) {
      // Replace the "/" with the insert text
      const ta = bodyRef.current;
      if (!ta) return;
      const cursorPos = ta.selectionStart;
      const textBeforeCursor = body.slice(0, cursorPos);
      const lastNewline = textBeforeCursor.lastIndexOf("\n");
      const before = body.slice(0, lastNewline + 1);
      const after = body.slice(cursorPos);
      const insert = item.insert ?? "";
      const newBody = before + insert + after;
      setBody(newBody);

      // Move cursor after inserted text
      requestAnimationFrame(() => {
        if (bodyRef.current) {
          const pos = (before + insert).length;
          bodyRef.current.selectionStart = pos;
          bodyRef.current.selectionEnd = pos;
          bodyRef.current.focus();
        }
      });
    }
  }

  function removeSlashFromBody() {
    const ta = bodyRef.current;
    if (!ta) return;
    const cursorPos = ta.selectionStart;
    const textBeforeCursor = body.slice(0, cursorPos);
    const lastNewline = textBeforeCursor.lastIndexOf("\n");
    const before = body.slice(0, lastNewline + 1);
    const after = body.slice(cursorPos);
    setBody(before + after);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const remaining = 6 - images.length;
    const toProcess = Array.from(files).slice(0, remaining);

    for (const file of toProcess) {
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => {
          if (prev.length >= 6) return prev;
          return [...prev, reader.result as string];
        });
      };
      reader.readAsDataURL(file);
    }

    e.target.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (restricted) {
      toast.error("Você está restrito de publicar.");
      return;
    }
    if (!communityId) {
      toast.error("Selecione uma comunidade.");
      return;
    }
    if (!body.trim()) {
      toast.error("Escreva algo na publicação.");
      return;
    }

    createPost({
      communityId,
      authorId: currentUserId,
      title: title.trim(),
      body: body.trim(),
      images,
      requireApproval: requiresApproval,
    });

    toast.success(
      requiresApproval
        ? "Publicação enviada para aprovação!"
        : "Publicação criada!"
    );

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 p-0 overflow-hidden border-border/50",
          expanded
            ? "sm:max-w-3xl h-[85vh]"
            : "sm:max-w-lg max-h-[80vh]"
        )}
        // Hide default close button — we have our own
        hideCloseButton
      >
        {/* Accessible title (visually hidden) */}
        <DialogTitle className="sr-only">Criar publicação</DialogTitle>
        <DialogDescription className="sr-only">Crie uma nova publicação na comunidade.</DialogDescription>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/30">
          <h2 className="text-base font-semibold">Criar publicação</h2>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {restricted ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-sm text-destructive">
              Você está temporariamente restrito de publicar.
            </p>
          </div>
        ) : (
          <>
            {/* Editor area */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Title */}
              <input
                type="text"
                placeholder="Título (opcional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xl font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 mb-3"
              />

              {/* Body with slash command */}
              <div className="relative">
                <textarea
                  ref={bodyRef}
                  placeholder="Escreva algo..."
                  value={body}
                  onChange={handleBodyChange}
                  onKeyDown={handleBodyKeyDown}
                  className="w-full bg-transparent border-none outline-none resize-none text-sm leading-relaxed placeholder:text-muted-foreground/40 min-h-[160px]"
                />

                {/* Slash command dropdown */}
                {slashOpen && (
                  <div
                    ref={slashMenuRef}
                    className="absolute left-0 top-6 z-50 w-64 rounded-lg border border-border/50 bg-popover shadow-xl overflow-hidden animate-fade-in"
                  >
                    <div className="max-h-[300px] overflow-y-auto py-1">
                      {/* BÁSICO */}
                      <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em]">
                        Básico
                      </p>
                      {SLASH_BASIC.map((item, i) => {
                        const globalIdx = i;
                        return (
                          <button
                            key={item.label}
                            className={cn(
                              "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                              slashIdx === globalIdx
                                ? "bg-accent text-accent-foreground"
                                : "text-foreground hover:bg-accent/50"
                            )}
                            onMouseEnter={() => setSlashIdx(globalIdx)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectSlashItem(globalIdx);
                            }}
                          >
                            <item.icon className="h-4 w-4 text-muted-foreground" />
                            {item.label}
                          </button>
                        );
                      })}

                      {/* INSERIR */}
                      <p className="px-3 pt-3 pb-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em]">
                        Inserir
                      </p>
                      {SLASH_INSERT.map((item, i) => {
                        const globalIdx = SLASH_BASIC.length + i;
                        return (
                          <button
                            key={item.label}
                            className={cn(
                              "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                              slashIdx === globalIdx
                                ? "bg-accent text-accent-foreground"
                                : "text-foreground hover:bg-accent/50"
                            )}
                            onMouseEnter={() => setSlashIdx(globalIdx)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectSlashItem(globalIdx);
                            }}
                          >
                            <item.icon className="h-4 w-4 text-muted-foreground" />
                            {item.label}
                          </button>
                        );
                      })}

                      {/* FAZER UPLOAD */}
                      <p className="px-3 pt-3 pb-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em]">
                        Fazer upload
                      </p>
                      {SLASH_UPLOAD.map((item, i) => {
                        const globalIdx = SLASH_BASIC.length + SLASH_INSERT.length + i;
                        return (
                          <button
                            key={item.label}
                            className={cn(
                              "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                              slashIdx === globalIdx
                                ? "bg-accent text-accent-foreground"
                                : "text-foreground hover:bg-accent/50"
                            )}
                            onMouseEnter={() => setSlashIdx(globalIdx)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectSlashItem(globalIdx);
                            }}
                          >
                            <item.icon className="h-4 w-4 text-muted-foreground" />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Image preview grid */}
              {images.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground/60 mb-2">
                    {images.length}/6 imagens
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img, i) => (
                      <div
                        key={i}
                        className="relative rounded-lg overflow-hidden bg-muted aspect-square ring-1 ring-border/20 group/img"
                      >
                        <img
                          src={img}
                          alt={`Upload ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors" />
                        <button
                          className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/80"
                          onClick={() => removeImage(i)}
                        >
                          <X className="h-3.5 w-3.5 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Toolbar */}
            <div className="border-t border-border/30 px-4 py-3 flex items-center gap-1">
              {/* Action icons */}
              <div className="flex items-center gap-0.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    if (bodyRef.current) {
                      const pos = bodyRef.current.selectionStart;
                      const newBody = body.slice(0, pos) + "\n" + body.slice(pos);
                      setBody(newBody);
                      requestAnimationFrame(() => {
                        if (bodyRef.current) {
                          bodyRef.current.selectionStart = pos + 1;
                          bodyRef.current.selectionEnd = pos + 1;
                          bodyRef.current.focus();
                        }
                      });
                    }
                  }}
                  title="Adicionar bloco"
                >
                  <Plus className="h-4 w-4" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    if (bodyRef.current) {
                      const pos = bodyRef.current.selectionStart;
                      const newBody = body.slice(0, pos) + "#" + body.slice(pos);
                      setBody(newBody);
                      requestAnimationFrame(() => {
                        if (bodyRef.current) {
                          bodyRef.current.selectionStart = pos + 1;
                          bodyRef.current.selectionEnd = pos + 1;
                          bodyRef.current.focus();
                        }
                      });
                    }
                  }}
                  title="Hashtag"
                >
                  <Hash className="h-4 w-4" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => toast.info("Anexo em breve.")}
                  title="Anexo"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                {allowImages && images.length < 6 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                    title="Imagem"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => toast.info("Emoji picker em breve.")}
                  title="Emoji"
                >
                  <Smile className="h-4 w-4" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => toast.info("Enquete em breve.")}
                  title="Enquete"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => toast.info("Áudio em breve.")}
                  title="Áudio"
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </div>

              {/* Separator */}
              <div className="h-5 w-px bg-border/40 mx-1.5" />

              {/* Community select + Publish */}
              <div className="flex items-center gap-2 ml-auto">
                <Select value={communityId} onValueChange={setCommunityId}>
                  <SelectTrigger className="h-8 w-[180px] text-xs border-border/40">
                    <SelectValue placeholder="Escolha uma comunidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {postable.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!body.trim() || !communityId}
                  className="rounded-full px-5 shadow-sm shadow-primary/15 hover:shadow-md hover:shadow-primary/20 active:scale-[0.97] transition-all"
                >
                  {requiresApproval ? "Enviar" : "Publicar"}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageUpload}
        />
      </DialogContent>
    </Dialog>
  );
}

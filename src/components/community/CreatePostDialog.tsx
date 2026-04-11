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
  FileText,
  Eye,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";

import type { PostAttachment, PostPoll } from "@/types/student";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCommunities } from "@/hooks/useCommunities";
import { usePosts } from "@/hooks/usePosts";
import { useRestrictions } from "@/hooks/useRestrictions";
import { useProfiles } from "@/hooks/useProfiles";
import { uploadToR2, deleteFromR2, isR2Url } from "@/lib/r2Upload";

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

// ---------------------------------------------------------------------------
// Common emojis for quick picker
// ---------------------------------------------------------------------------
const COMMON_EMOJIS = [
  "😀", "😂", "🥰", "😍", "😎", "🤩", "😊", "🙏",
  "👍", "👎", "❤️", "🔥", "✨", "🎉", "💯", "👏",
  "😢", "😱", "🤔", "😅", "💪", "🙌", "📸", "⭐",
  "💛", "💚", "💙", "💜", "🖼️", "🎊",
];

// ---------------------------------------------------------------------------
// Accepted file types for attachments
// ---------------------------------------------------------------------------
const ATTACHMENT_ACCEPT = ".pdf,.doc,.docx,.txt,.zip,.xls,.xlsx,.ppt,.pptx";
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Poll state type
// ---------------------------------------------------------------------------
type PollDraft = {
  question: string;
  options: string[];
  duration: "1d" | "3d" | "7d" | "14d";
};

// ---------------------------------------------------------------------------
// Markdown preview helpers
// ---------------------------------------------------------------------------
function preprocessForPreview(
  body: string,
  profiles: { username: string; studentId: string }[]
): string {
  let processed = body;
  processed = processed.replace(
    /(^|\s)@([\w.]+)/gm,
    (_match, prefix: string, username: string) => {
      const profile = profiles.find(
        (p) => p.username === username.toLowerCase()
      );
      if (profile) return `${prefix}[@${username}](/perfil/${profile.studentId})`;
      return `${prefix}@${username}`;
    }
  );
  processed = processed.replace(/(^|\s)#([\w-]+)/gm, "$1[#$2](/comunidade/feed?tag=$2)");
  processed = processed.replace(/([^\n])\n(?!\n)/g, "$1  \n");
  return processed;
}

const previewMdComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    if (href?.startsWith("/")) {
      return <Link to={href} className="text-primary hover:underline font-medium">{children}</Link>;
    }
    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>;
  },
};

const PROSE_CLASSES = [
  "prose prose-sm dark:prose-invert max-w-none",
  "prose-headings:font-bold prose-headings:text-foreground prose-headings:mt-3 prose-headings:mb-1",
  "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
  "prose-p:text-foreground/90 prose-p:my-1 prose-p:leading-relaxed",
  "prose-strong:text-foreground",
  "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none",
  "prose-pre:bg-muted prose-pre:rounded-lg prose-pre:p-3 prose-pre:my-2",
  "prose-blockquote:border-l-2 prose-blockquote:border-primary/50 prose-blockquote:pl-4 prose-blockquote:text-muted-foreground prose-blockquote:italic prose-blockquote:my-2",
  "prose-ul:list-disc prose-ul:pl-5 prose-ul:my-1",
  "prose-ol:list-decimal prose-ol:pl-5 prose-ol:my-1",
  "prose-li:my-0.5 prose-li:text-foreground/90",
  "prose-hr:border-border/40 prose-hr:my-3",
].join(" ");

export function CreatePostDialog({
  open,
  onOpenChange,
  defaultCommunityId,
  mode = "create",
  editPost,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCommunityId?: string;
  mode?: "create" | "edit";
  editPost?: {
    id: string;
    title: string;
    body: string;
    images: string[];
    attachments: PostAttachment[];
    poll: PostPoll | null;
    communityId: string;
  };
}) {
  const { currentUserId } = useCurrentUser();
  const { getCommunitiesForStudent } = useCommunities();
  const { createPost, updatePost } = usePosts();
  const { isRestricted } = useRestrictions();
  const { profiles } = useProfiles();
  const isEdit = mode === "edit" && !!editPost;

  const myCommunities = getCommunitiesForStudent(currentUserId);
  const postable = myCommunities.filter((c) => c.settings.allowStudentPosts);

  const [communityId, setCommunityId] = useState(
    defaultCommunityId ?? postable[0]?.id ?? ""
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<PostAttachment[]>([]);
  const [poll, setPoll] = useState<PollDraft | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashIdx, setSlashIdx] = useState(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // @mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const mentionStartRef = useRef(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const slashMenuRef = useRef<HTMLDivElement>(null);
  const mentionMenuRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const slashFromToolbar = useRef(false);
  const cursorPosRef = useRef(0);

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

  // Filtered mention results
  const mentionResults =
    mentionQuery !== null
      ? profiles
          .filter(
            (p) =>
              p.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
              p.displayName.toLowerCase().includes(mentionQuery.toLowerCase())
          )
          .slice(0, 5)
      : [];

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
        slashFromToolbar.current = false;
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [slashOpen]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!emojiOpen) return;
    function handleClick(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [emojiOpen]);

  // Close mention menu on outside click
  useEffect(() => {
    if (mentionQuery === null) return;
    function handleClick(e: MouseEvent) {
      if (mentionMenuRef.current && !mentionMenuRef.current.contains(e.target as Node)) {
        setMentionQuery(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mentionQuery]);

  // Reset on close / pre-populate on open in edit mode
  useEffect(() => {
    if (!open) {
      setTitle("");
      setBody("");
      setImages([]);
      setAttachments([]);
      setPoll(null);
      setSlashOpen(false);
      setExpanded(false);
      setEmojiOpen(false);
      setSubmitting(false);
      setPreviewMode(false);
      setMentionQuery(null);
      slashFromToolbar.current = false;
      cursorPosRef.current = 0;
    } else if (isEdit && editPost) {
      setTitle(editPost.title);
      setBody(editPost.body);
      setImages(editPost.images);
      setAttachments(editPost.attachments);
      setCommunityId(editPost.communityId);
      if (editPost.poll) {
        setPoll({
          question: editPost.poll.question,
          options: editPost.poll.options.map((o) => o.text),
          duration: editPost.poll.duration,
        });
      } else {
        setPoll(null);
      }
    }
  }, [open, isEdit, editPost]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const insertAtCursor = useCallback(
    (text: string) => {
      const ta = bodyRef.current;
      if (!ta) return;
      // Use saved cursor position for reliable insertion
      const pos = cursorPosRef.current;
      const newBody = body.slice(0, pos) + text + body.slice(pos);
      setBody(newBody);
      const newPos = pos + text.length;
      cursorPosRef.current = newPos;
      requestAnimationFrame(() => {
        if (bodyRef.current) {
          bodyRef.current.selectionStart = newPos;
          bodyRef.current.selectionEnd = newPos;
          bodyRef.current.focus();
        }
      });
    },
    [body]
  );

  // ---------------------------------------------------------------------------
  // Slash command handling
  // ---------------------------------------------------------------------------

  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setBody(val);

    const cursorPos = e.target.selectionStart;
    cursorPosRef.current = cursorPos;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastNewline = textBeforeCursor.lastIndexOf("\n");
    const lineStart = textBeforeCursor.slice(lastNewline + 1);

    // Detect "/" at start of a line → slash command
    if (lineStart === "/") {
      slashFromToolbar.current = false;
      setSlashOpen(true);
      setSlashIdx(0);
      setMentionQuery(null);
      return;
    } else {
      setSlashOpen(false);
    }

    // Detect @mention query
    const mentionMatch = textBeforeCursor.match(/@([\w.]*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionStartRef(cursorPos - mentionMatch[0].length);
      setMentionIdx(0);
    } else {
      setMentionQuery(null);
    }
  }

  function setMentionStartRef(pos: number) {
    mentionStartRef.current = pos;
  }

  function handleBodyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // --- Slash menu navigation ---
    if (slashOpen) {
      if (e.key === "Escape") { e.preventDefault(); setSlashOpen(false); slashFromToolbar.current = false; return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashIdx((prev) => (prev + 1) % allSlashItems.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlashIdx((prev) => (prev - 1 + allSlashItems.length) % allSlashItems.length); return; }
      if (e.key === "Enter") { e.preventDefault(); selectSlashItem(slashIdx); return; }
      return;
    }

    // --- Mention menu navigation ---
    if (mentionQuery !== null && mentionResults.length > 0) {
      if (e.key === "Escape") { e.preventDefault(); setMentionQuery(null); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIdx((prev) => (prev + 1) % mentionResults.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIdx((prev) => (prev - 1 + mentionResults.length) % mentionResults.length); return; }
      if (e.key === "Enter") { e.preventDefault(); selectMention(mentionResults[mentionIdx]); return; }
    }

    const ta = e.currentTarget;
    const pos = ta.selectionStart;

    // --- Enter: list continuation ---
    if (e.key === "Enter" && !e.shiftKey) {
      const lines = body.slice(0, pos).split("\n");
      const currentLine = lines[lines.length - 1];

      // Numbered list
      const numMatch = currentLine.match(/^(\d+)\.\s/);
      if (numMatch) {
        const content = currentLine.replace(/^\d+\.\s/, "");
        if (!content.trim()) {
          // Empty list item → remove prefix, exit list
          e.preventDefault();
          const lineStart = pos - currentLine.length;
          const newBody = body.slice(0, lineStart) + body.slice(pos);
          setBody(newBody);
          cursorPosRef.current = lineStart;
          requestAnimationFrame(() => {
            if (bodyRef.current) {
              bodyRef.current.selectionStart = lineStart;
              bodyRef.current.selectionEnd = lineStart;
            }
          });
        } else {
          // Continue list with next number
          e.preventDefault();
          const nextNum = parseInt(numMatch[1]) + 1;
          const insert = `\n${nextNum}. `;
          const newBody = body.slice(0, pos) + insert + body.slice(pos);
          setBody(newBody);
          const newPos = pos + insert.length;
          cursorPosRef.current = newPos;
          requestAnimationFrame(() => {
            if (bodyRef.current) {
              bodyRef.current.selectionStart = newPos;
              bodyRef.current.selectionEnd = newPos;
            }
          });
        }
        return;
      }

      // Bullet list
      const bulletMatch = currentLine.match(/^([-*])\s/);
      if (bulletMatch) {
        const content = currentLine.replace(/^[-*]\s/, "");
        if (!content.trim()) {
          e.preventDefault();
          const lineStart = pos - currentLine.length;
          const newBody = body.slice(0, lineStart) + body.slice(pos);
          setBody(newBody);
          cursorPosRef.current = lineStart;
          requestAnimationFrame(() => {
            if (bodyRef.current) {
              bodyRef.current.selectionStart = lineStart;
              bodyRef.current.selectionEnd = lineStart;
            }
          });
        } else {
          e.preventDefault();
          const insert = `\n${bulletMatch[1]} `;
          const newBody = body.slice(0, pos) + insert + body.slice(pos);
          setBody(newBody);
          const newPos = pos + insert.length;
          cursorPosRef.current = newPos;
          requestAnimationFrame(() => {
            if (bodyRef.current) {
              bodyRef.current.selectionStart = newPos;
              bodyRef.current.selectionEnd = newPos;
            }
          });
        }
        return;
      }

      // Blockquote continuation
      const quoteMatch = currentLine.match(/^>\s/);
      if (quoteMatch) {
        const content = currentLine.replace(/^>\s/, "");
        if (!content.trim()) {
          e.preventDefault();
          const lineStart = pos - currentLine.length;
          const newBody = body.slice(0, lineStart) + body.slice(pos);
          setBody(newBody);
          cursorPosRef.current = lineStart;
          requestAnimationFrame(() => {
            if (bodyRef.current) {
              bodyRef.current.selectionStart = lineStart;
              bodyRef.current.selectionEnd = lineStart;
            }
          });
        } else {
          e.preventDefault();
          const insert = "\n> ";
          const newBody = body.slice(0, pos) + insert + body.slice(pos);
          setBody(newBody);
          const newPos = pos + insert.length;
          cursorPosRef.current = newPos;
          requestAnimationFrame(() => {
            if (bodyRef.current) {
              bodyRef.current.selectionStart = newPos;
              bodyRef.current.selectionEnd = newPos;
            }
          });
        }
        return;
      }
    }

    // --- Tab: insert 2 spaces inside code blocks ---
    if (e.key === "Tab") {
      const beforeCursor = body.slice(0, pos);
      const openTicks = (beforeCursor.match(/```/g) || []).length;
      if (openTicks % 2 === 1) {
        e.preventDefault();
        const newBody = body.slice(0, pos) + "  " + body.slice(pos);
        setBody(newBody);
        const newPos = pos + 2;
        cursorPosRef.current = newPos;
        requestAnimationFrame(() => {
          if (bodyRef.current) {
            bodyRef.current.selectionStart = newPos;
            bodyRef.current.selectionEnd = newPos;
          }
        });
      }
    }
  }

  function selectSlashItem(idx: number) {
    const item = allSlashItems[idx];
    const fromToolbar = slashFromToolbar.current;
    setSlashOpen(false);
    slashFromToolbar.current = false;

    if (item.label === "Emoji") {
      if (!fromToolbar) removeSlashFromBody();
      setEmojiOpen(true);
      return;
    }

    if ("action" in item && item.action === "image") {
      fileInputRef.current?.click();
      if (!fromToolbar) removeSlashFromBody();
      return;
    }

    if ("action" in item && item.action === "file") {
      attachmentInputRef.current?.click();
      if (!fromToolbar) removeSlashFromBody();
      return;
    }

    if ("insert" in item && item.insert !== undefined) {
      const insertText = item.insert ?? "";

      if (fromToolbar) {
        insertAtCursor(insertText);
        return;
      }

      const ta = bodyRef.current;
      if (!ta) return;
      const cursorPos = ta.selectionStart;
      const textBeforeCursor = body.slice(0, cursorPos);
      const lastNewline = textBeforeCursor.lastIndexOf("\n");
      const before = body.slice(0, lastNewline + 1);
      const after = body.slice(cursorPos);
      const newBody = before + insertText + after;
      setBody(newBody);

      const newPos = (before + insertText).length;
      cursorPosRef.current = newPos;
      requestAnimationFrame(() => {
        if (bodyRef.current) {
          bodyRef.current.selectionStart = newPos;
          bodyRef.current.selectionEnd = newPos;
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
    cursorPosRef.current = before.length;
  }

  // ---------------------------------------------------------------------------
  // @mention autocomplete
  // ---------------------------------------------------------------------------

  function selectMention(profile: { username: string; studentId: string }) {
    const before = body.slice(0, mentionStartRef.current);
    const afterCursor = body.slice(cursorPosRef.current);
    const mention = `@${profile.username} `;
    const newBody = before + mention + afterCursor;
    setBody(newBody);
    setMentionQuery(null);
    const newPos = (before + mention).length;
    cursorPosRef.current = newPos;
    requestAnimationFrame(() => {
      if (bodyRef.current) {
        bodyRef.current.selectionStart = newPos;
        bodyRef.current.selectionEnd = newPos;
        bodyRef.current.focus();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Image handling
  // ---------------------------------------------------------------------------

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const remaining = 4 - images.length;
    const toProcess = Array.from(files).slice(0, remaining);
    for (const file of toProcess) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`"${file.name}" excede 5 MB.`);
        continue;
      }
      try {
        const url = await uploadToR2(file, "posts/images", { preset: "banner" });
        setImages((prev) => {
          if (prev.length >= 4) return prev;
          return [...prev, url];
        });
      } catch {
        toast.error(`Erro ao enviar "${file.name}".`);
      }
    }
    e.target.value = "";
  }

  function removeImage(index: number) {
    const url = images[index];
    if (url && isR2Url(url)) {
      deleteFromR2(url).catch(() => {});
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  // ---------------------------------------------------------------------------
  // Attachment handling
  // ---------------------------------------------------------------------------

  async function handleAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const remaining = MAX_ATTACHMENTS - attachments.length;
    const toProcess = Array.from(files).slice(0, remaining);
    for (const file of toProcess) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(`"${file.name}" excede 10 MB.`);
        continue;
      }
      try {
        const url = await uploadToR2(file, "posts/attachments");
        setAttachments((prev) => {
          if (prev.length >= MAX_ATTACHMENTS) return prev;
          return [...prev, { name: file.name, size: file.size, type: file.type, dataUrl: url }];
        });
      } catch {
        toast.error(`Erro ao enviar "${file.name}".`);
      }
    }
    e.target.value = "";
  }

  function removeAttachment(index: number) {
    const att = attachments[index];
    if (att?.dataUrl && isR2Url(att.dataUrl)) {
      deleteFromR2(att.dataUrl).catch(() => {});
    }
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  async function handleSubmit() {
    if (restricted) { toast.error("Você está restrito de publicar."); return; }
    if (!communityId) { toast.error("Selecione uma comunidade."); return; }
    if (!body.trim()) { toast.error("Escreva algo na publicação."); return; }

    if (poll) {
      if (!poll.question.trim()) { toast.error("Escreva a pergunta da enquete."); return; }
      const filledOptions = poll.options.filter((o) => o.trim());
      if (filledOptions.length < 2) { toast.error("A enquete precisa de pelo menos 2 opções preenchidas."); return; }
    }

    setSubmitting(true);
    try {
      if (isEdit && editPost) {
        // --- Edit mode ---
        await updatePost(editPost.id, {
          title: title.trim(),
          body: body.trim(),
          images,
          attachments,
          poll: poll
            ? {
                question: poll.question.trim(),
                options: poll.options.filter((o) => o.trim()).map((text, i) => ({
                  id: editPost.poll?.options[i]?.id ?? `opt-${i}`,
                  text,
                  votedBy: editPost.poll?.options[i]?.votedBy ?? [],
                })),
                duration: poll.duration,
                endsAt: editPost.poll?.endsAt ?? new Date().toISOString(),
              }
            : null,
        });
        toast.success("Publicação atualizada!");
      } else {
        // --- Create mode ---
        await createPost({
          communityId,
          authorId: currentUserId,
          title: title.trim(),
          body: body.trim(),
          images,
          attachments: attachments.length > 0 ? attachments : undefined,
          poll: poll
            ? { question: poll.question.trim(), options: poll.options.filter((o) => o.trim()), duration: poll.duration }
            : undefined,
          requireApproval: requiresApproval,
        });
        toast.success(requiresApproval ? "Publicação enviada para aprovação!" : "Publicação criada!");
      }
      onOpenChange(false);
    } catch {
      toast.error(isEdit ? "Erro ao atualizar publicação." : "Erro ao criar publicação. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render slash command menu
  // ---------------------------------------------------------------------------
  function renderSlashMenu() {
    if (!slashOpen) return null;
    return (
      <div
        ref={slashMenuRef}
        className="absolute left-0 top-6 z-50 w-64 rounded-lg border border-border/50 bg-popover shadow-xl overflow-hidden animate-fade-in"
      >
        <div className="max-h-[300px] overflow-y-auto py-1">
          <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em]">Básico</p>
          {SLASH_BASIC.map((item, i) => (
            <button
              key={item.label}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                slashIdx === i ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50"
              )}
              onMouseEnter={() => setSlashIdx(i)}
              onMouseDown={(e) => { e.preventDefault(); selectSlashItem(i); }}
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              {item.label}
            </button>
          ))}
          <p className="px-3 pt-3 pb-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em]">Inserir</p>
          {SLASH_INSERT.map((item, i) => {
            const idx = SLASH_BASIC.length + i;
            return (
              <button
                key={item.label}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                  slashIdx === idx ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50"
                )}
                onMouseEnter={() => setSlashIdx(idx)}
                onMouseDown={(e) => { e.preventDefault(); selectSlashItem(idx); }}
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </button>
            );
          })}
          <p className="px-3 pt-3 pb-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em]">Fazer upload</p>
          {SLASH_UPLOAD.map((item, i) => {
            const idx = SLASH_BASIC.length + SLASH_INSERT.length + i;
            return (
              <button
                key={item.label}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                  slashIdx === idx ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50"
                )}
                onMouseEnter={() => setSlashIdx(idx)}
                onMouseDown={(e) => { e.preventDefault(); selectSlashItem(idx); }}
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render @mention dropdown
  // ---------------------------------------------------------------------------
  function renderMentionMenu() {
    if (mentionQuery === null || mentionResults.length === 0) return null;
    return (
      <div
        ref={mentionMenuRef}
        className="absolute left-0 top-6 z-50 w-64 rounded-lg border border-border/50 bg-popover shadow-xl overflow-hidden animate-fade-in"
      >
        <div className="max-h-[200px] overflow-y-auto py-1">
          <p className="px-3 pt-1.5 pb-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em]">Mencionar</p>
          {mentionResults.map((profile, i) => (
            <button
              key={profile.studentId}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                mentionIdx === i ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50"
              )}
              onMouseEnter={() => setMentionIdx(i)}
              onMouseDown={(e) => { e.preventDefault(); selectMention(profile); }}
            >
              <div className="h-6 w-6 rounded-full overflow-hidden bg-muted shrink-0">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary text-[10px] font-bold">
                    {profile.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate text-xs">{profile.displayName}</p>
                <p className="text-[10px] text-muted-foreground truncate">@{profile.username}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 p-0 overflow-hidden border-border/50",
          expanded ? "sm:max-w-3xl h-[85vh]" : "sm:max-w-lg max-h-[80vh]"
        )}
        hideCloseButton
      >
        <DialogTitle className="sr-only">{isEdit ? "Editar publicação" : "Criar publicação"}</DialogTitle>
        <DialogDescription className="sr-only">{isEdit ? "Edite sua publicação." : "Crie uma nova publicação na comunidade."}</DialogDescription>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/30">
          <h2 className="text-base font-semibold">{isEdit ? "Editar publicação" : "Criar publicação"}</h2>
          <div className="flex items-center gap-1">
            {/* Preview toggle */}
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-8 w-8 text-muted-foreground hover:text-foreground",
                previewMode && "text-primary bg-primary/10"
              )}
              onClick={() => setPreviewMode(!previewMode)}
              title={previewMode ? "Editar" : "Preview"}
            >
              {previewMode ? <PenLine className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
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
            <p className="text-sm text-destructive">Você está temporariamente restrito de publicar.</p>
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

              {previewMode ? (
                /* Preview mode */
                <div className={cn("min-h-[160px]", PROSE_CLASSES)}>
                  {body.trim() ? (
                    <ReactMarkdown components={previewMdComponents}>
                      {preprocessForPreview(body, profiles)}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground/40 text-sm">Nada para visualizar...</p>
                  )}
                </div>
              ) : (
                /* Editor mode */
                <div className="relative">
                  <textarea
                    ref={bodyRef}
                    placeholder="Escreva algo..."
                    value={body}
                    onChange={handleBodyChange}
                    onKeyDown={handleBodyKeyDown}
                    onSelect={(e) => {
                      cursorPosRef.current = e.currentTarget.selectionStart;
                    }}
                    className="w-full bg-transparent border-none outline-none resize-none text-sm leading-relaxed placeholder:text-muted-foreground/40 min-h-[160px]"
                  />
                  {renderSlashMenu()}
                  {renderMentionMenu()}
                </div>
              )}

              {/* Poll editing section */}
              {poll && (
                <div className="mt-4 rounded-lg border border-border/30 p-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">Enquete</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setPoll(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <input
                    type="text"
                    placeholder="Qual é a sua pergunta?"
                    value={poll.question}
                    onChange={(e) => setPoll({ ...poll, question: e.target.value })}
                    className="w-full bg-transparent border border-border/40 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/15 mb-3 placeholder:text-muted-foreground/50"
                  />
                  <div className="space-y-2">
                    {poll.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Opção ${i + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const newOptions = [...poll.options];
                            newOptions[i] = e.target.value;
                            setPoll({ ...poll, options: newOptions });
                          }}
                          className="flex-1 bg-transparent border border-border/40 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/15 placeholder:text-muted-foreground/50"
                        />
                        {poll.options.length > 2 && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => setPoll({ ...poll, options: poll.options.filter((_, j) => j !== i) })}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {poll.options.length < 5 && (
                    <Button variant="ghost" size="sm" className="mt-2 text-xs text-primary hover:text-primary"
                      onClick={() => setPoll({ ...poll, options: [...poll.options, ""] })}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar opção
                    </Button>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Duração:</span>
                    <Select value={poll.duration} onValueChange={(v) => setPoll({ ...poll, duration: v as PollDraft["duration"] })}>
                      <SelectTrigger className="h-7 w-[120px] text-xs border-border/40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1d">1 dia</SelectItem>
                        <SelectItem value="3d">3 dias</SelectItem>
                        <SelectItem value="7d">7 dias</SelectItem>
                        <SelectItem value="14d">14 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Attachment list */}
              {attachments.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  <p className="text-xs text-muted-foreground/60 mb-1">{attachments.length}/{MAX_ATTACHMENTS} arquivos</p>
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-border/30 px-3 py-2 group/att">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate flex-1">{att.name}</span>
                      <span className="text-xs text-muted-foreground/60 shrink-0">{formatFileSize(att.size)}</span>
                      <button className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover/att:opacity-100 transition-opacity shrink-0" onClick={() => removeAttachment(i)}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Image preview grid */}
              {images.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground/60 mb-2">{images.length}/6 imagens</p>
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img, i) => (
                      <div key={i} className="relative rounded-lg overflow-hidden bg-muted aspect-square ring-1 ring-border/20 group/img">
                        <img src={img} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors" />
                        <button className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/80" onClick={() => removeImage(i)}>
                          <X className="h-3.5 w-3.5 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Emoji picker panel (inline above toolbar to avoid overflow-hidden clipping) */}
            {emojiOpen && (
              <div ref={emojiRef} className="border-t border-border/30 px-4 py-3 animate-fade-in">
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] mb-2">Emojis</p>
                <div className="grid grid-cols-10 gap-1">
                  {COMMON_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-accent text-lg transition-colors active:scale-90"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setPreviewMode(false);
                        insertAtCursor(emoji);
                        setEmojiOpen(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Toolbar */}
            <div className="border-t border-border/30 px-4 py-3 flex items-center gap-1">
              <div className="flex items-center gap-0.5">
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => { setEmojiOpen(false); slashFromToolbar.current = true; setSlashOpen(true); setSlashIdx(0); setPreviewMode(false); bodyRef.current?.focus(); }}
                  title="Adicionar bloco"
                ><Plus className="h-4 w-4" /></Button>

                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => { setPreviewMode(false); requestAnimationFrame(() => { insertAtCursor("#"); bodyRef.current?.focus(); }); }}
                  title="Hashtag"
                ><Hash className="h-4 w-4" /></Button>

                {attachments.length < MAX_ATTACHMENTS && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => attachmentInputRef.current?.click()} title="Anexo"
                  ><Paperclip className="h-4 w-4" /></Button>
                )}

                {allowImages && images.length < 6 && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()} title="Imagem"
                  ><ImagePlus className="h-4 w-4" /></Button>
                )}

                {/* Emoji toggle */}
                <Button
                  size="icon" variant="ghost"
                  className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", emojiOpen && "text-foreground bg-accent")}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (!emojiOpen && bodyRef.current) {
                      cursorPosRef.current = bodyRef.current.selectionStart;
                    }
                    setEmojiOpen(!emojiOpen);
                  }}
                  title="Emoji"
                ><Smile className="h-4 w-4" /></Button>

                <Button size="icon" variant="ghost"
                  className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", poll && "text-primary bg-primary/10")}
                  onClick={() => { if (poll) setPoll(null); else setPoll({ question: "", options: ["", ""], duration: "7d" }); }}
                  title="Enquete"
                ><BarChart3 className="h-4 w-4" /></Button>
              </div>

              <div className="h-5 w-px bg-border/40 mx-1.5" />

              <div className="flex items-center gap-2 ml-auto">
                <Select value={communityId} onValueChange={setCommunityId} disabled={isEdit}>
                  <SelectTrigger className={cn("h-8 w-[180px] text-xs border-border/40", isEdit && "opacity-60")}><SelectValue placeholder="Escolha uma comunidade" /></SelectTrigger>
                  <SelectContent>
                    {postable.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleSubmit} disabled={!body.trim() || !communityId || submitting}
                  className="rounded-full px-5 shadow-sm shadow-primary/15 hover:shadow-md hover:shadow-primary/20 active:scale-[0.97] transition-all"
                >
                  {submitting
                    ? (isEdit ? "Salvando..." : "Publicando...")
                    : isEdit
                      ? "Salvar"
                      : requiresApproval
                        ? "Enviar"
                        : "Publicar"}
                </Button>
              </div>
            </div>
          </>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
        <input ref={attachmentInputRef} type="file" accept={ATTACHMENT_ACCEPT} multiple className="hidden" onChange={handleAttachmentUpload} />
      </DialogContent>
    </Dialog>
  );
}

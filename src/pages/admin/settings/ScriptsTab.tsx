import { useState, useEffect } from "react";
import { Plus, Code, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ScriptInjectionInsert, ScriptInjectionRow } from "@/hooks/useScriptInjections";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POSITION_LABELS: Record<string, { label: string; color: string }> = {
  head: { label: "HEAD", color: "bg-blue-500/15 text-blue-500" },
  body_start: { label: "BODY INÍCIO", color: "bg-amber-500/15 text-amber-500" },
  body_end: { label: "BODY FIM", color: "bg-purple-500/15 text-purple-500" },
};

const SCOPE_LABELS: Record<string, string> = {
  all: "Todas as páginas",
  admin_only: "Só Admin",
  student_only: "Só Alunos",
  specific_pages: "Páginas específicas",
};

// ---------------------------------------------------------------------------
// ScriptsTabContent
// ---------------------------------------------------------------------------

export function ScriptsTabContent({
  scripts,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
}: {
  scripts: ScriptInjectionRow[];
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (s: ScriptInjectionRow) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Injeção de Scripts</h2>
          <p className="text-sm text-muted-foreground">
            Adicione pixels de rastreamento, meta tags, scripts externos e outros códigos.
          </p>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" />
          Adicionar Script
        </Button>
      </div>

      {scripts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Code className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum script cadastrado. Clique em "Adicionar Script" para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {scripts.map((script) => {
            const pos = POSITION_LABELS[script.position] ?? POSITION_LABELS.head;
            return (
              <Card key={script.id} className="border-border/50 hover:border-border transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium text-sm">{script.name}</p>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${pos.color}`}>
                          {pos.label}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {SCOPE_LABELS[script.apply_to] ?? script.apply_to}
                        </Badge>
                      </div>
                      {script.description && (
                        <p className="text-xs text-muted-foreground truncate">{script.description}</p>
                      )}
                      {script.apply_to === "specific_pages" && script.specific_pages?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Páginas: {script.specific_pages.join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={script.enabled}
                        onCheckedChange={(v) => onToggle(script.id, v)}
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(script)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDelete(script.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// ScriptDialog
// ---------------------------------------------------------------------------

export function ScriptDialog({
  open,
  onOpenChange,
  script,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  script: ScriptInjectionRow | null;
  onSave: (data: ScriptInjectionInsert) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [position, setPosition] = useState<string>("head");
  const [applyTo, setApplyTo] = useState<string>("all");
  const [specificPages, setSpecificPages] = useState("");
  const [content, setContent] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(script?.name ?? "");
      setDescription(script?.description ?? "");
      setPosition(script?.position ?? "head");
      setApplyTo(script?.apply_to ?? "all");
      setSpecificPages(script?.specific_pages?.join(", ") ?? "");
      setContent(script?.content ?? "");
      setEnabled(script?.enabled ?? true);
    }
  }, [open, script]);

  const handleSubmit = async () => {
    if (!name.trim() || !content.trim() || !position) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        position,
        apply_to: applyTo,
        specific_pages: applyTo === "specific_pages"
          ? specificPages.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        content,
        enabled,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{script ? "Editar Script" : "Adicionar Script"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Google Analytics" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição do script"
              className="h-16 resize-none"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Posição *</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="head">{"<head>"}</SelectItem>
                  <SelectItem value="body_start">{"<body>"} início</SelectItem>
                  <SelectItem value="body_end">{"<body>"} fim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Aplicar em *</Label>
              <Select value={applyTo} onValueChange={setApplyTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as páginas</SelectItem>
                  <SelectItem value="admin_only">Apenas área admin</SelectItem>
                  <SelectItem value="student_only">Apenas área aluno</SelectItem>
                  <SelectItem value="specific_pages">Páginas específicas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {applyTo === "specific_pages" && (
            <div className="space-y-1.5">
              <Label>Páginas (separadas por vírgula)</Label>
              <Input
                value={specificPages}
                onChange={(e) => setSpecificPages(e.target.value)}
                placeholder="/cursos, /ranking, /comunidade"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Conteúdo *</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"<!-- Cole aqui tags <script>, <meta>, pixels de rastreamento, etc. -->\n<script>\n  // Ex: Google Analytics, Facebook Pixel\n</script>"}
              className="min-h-[200px] font-mono text-xs resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Cole aqui tags {"<script>"}, {"<meta>"}, pixels de rastreamento, etc.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <Label className="text-sm">Ativar imediatamente</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim() || !content.trim()}>
            {saving ? "Salvando..." : script ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

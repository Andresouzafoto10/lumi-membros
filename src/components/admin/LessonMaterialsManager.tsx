import { useState, useRef } from "react";
import {
  FileText,
  Archive,
  Music,
  ImageIcon,
  File,
  Trash2,
  Upload,
  Loader2,
  Shield,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { useLessonMaterials } from "@/hooks/useLessonMaterials";
import type { LessonMaterial } from "@/types/course";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function fileTypeIcon(type: LessonMaterial["file_type"]) {
  switch (type) {
    case "pdf":
      return <FileText className="h-4 w-4 text-red-500" />;
    case "zip":
      return <Archive className="h-4 w-4 text-amber-500" />;
    case "mp3":
      return <Music className="h-4 w-4 text-purple-500" />;
    case "image":
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    default:
      return <File className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LessonMaterialsManager({ lessonId }: { lessonId: string }) {
  const { materials, isLoading, uploadMaterial, deleteMaterial } =
    useLessonMaterials(lessonId);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [drmEnabled, setDrmEnabled] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
  }

  async function handleUpload() {
    if (!selectedFile || !title.trim()) {
      toast.error("Selecione um arquivo e informe o título.");
      return;
    }
    setUploading(true);
    try {
      await uploadMaterial.mutateAsync({
        file: selectedFile,
        title: title.trim(),
        drmEnabled,
      });
      toast.success("Material enviado.");
      setTitle("");
      setSelectedFile(null);
      setDrmEnabled(true);
      setShowForm(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar material.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(material: LessonMaterial) {
    try {
      await deleteMaterial.mutateAsync(material);
      toast.success("Material removido.");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao remover material.");
    }
  }

  const isPdf =
    selectedFile?.name?.toLowerCase().endsWith(".pdf") ?? false;

  return (
    <div className="space-y-2 pt-2 border-t border-border/40">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          Materiais ({materials.length})
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="mr-1 h-3 w-3" />
          Adicionar
        </Button>
      </div>

      {/* Lista de materiais existentes */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
        </div>
      ) : (
        materials.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-2 text-sm rounded-md px-2 py-1.5 bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            {fileTypeIcon(m.file_type)}
            <span className="flex-1 truncate">{m.title}</span>
            {m.file_size_bytes && (
              <span className="text-xs text-muted-foreground shrink-0">
                {formatSize(m.file_size_bytes)}
              </span>
            )}
            {m.drm_enabled && m.file_type === "pdf" && (
              <Badge
                variant="outline"
                className="text-[10px] h-5 px-1.5 border-primary/30 text-primary shrink-0"
              >
                <Shield className="h-2.5 w-2.5 mr-0.5" />
                DRM
              </Badge>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0">
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover material?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O arquivo será excluído permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(m)}>
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))
      )}

      {/* Formulário de upload */}
      {showForm && (
        <div className="space-y-3 rounded-md border border-border/50 p-3 bg-muted/20">
          <div className="space-y-1.5">
            <Label className="text-xs">Arquivo</Label>
            <Input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do material"
              className="h-8 text-sm"
            />
          </div>

          {isPdf && (
            <div className="flex items-center gap-2">
              <Switch
                id={`drm-${lessonId}`}
                checked={drmEnabled}
                onCheckedChange={setDrmEnabled}
              />
              <Label htmlFor={`drm-${lessonId}`} className="text-xs cursor-pointer flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Proteção DRM (nome + email + CPF no PDF)
              </Label>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="h-7 text-xs"
            >
              {uploading ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Upload className="mr-1 h-3 w-3" />
              )}
              Enviar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => {
                setShowForm(false);
                setSelectedFile(null);
                setTitle("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

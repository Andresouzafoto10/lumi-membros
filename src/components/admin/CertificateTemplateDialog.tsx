import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type {
  CertificateTemplate,
  CertificateBlock,
  CertificateBlockType,
  BackgroundFit,
  BackgroundConfig,
} from "@/types/student";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/FileUpload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
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
import { Separator } from "@/components/ui/separator";
import {
  CertificateRenderer,
  type CertificateData,
} from "@/components/certificates/CertificateRenderer";
import { downloadCertificateAsPng } from "@/lib/generateCertificate";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ---------------------------------------------------------------------------

const BLOCK_TYPE_LABELS: Record<CertificateBlockType, string> = {
  certificate_title: "Título do Certificado",
  platform_name: "Nome da Plataforma",
  student_name: "Nome do Aluno",
  course_name: "Nome do Curso",
  completion_date: "Data de Conclusão",
  course_hours: "Carga Horária",
  custom_text: "Texto Personalizado",
};

const DEFAULT_BLOCK: Omit<CertificateBlock, "id" | "type"> = {
  fontSize: 24,
  fontWeight: "normal",
  color: "#ffffff",
  textAlign: "center",
  top: 50,
  left: 10,
  width: 80,
};

function uuid() {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: CertificateTemplate | null;
  onSave: (
    data: Omit<CertificateTemplate, "id" | "createdAt" | "updatedAt">
  ) => void;
};

export function CertificateTemplateDialog({
  open,
  onOpenChange,
  template,
  onSave,
}: Props) {
  const { settings } = usePlatformSettings();

  const [name, setName] = useState(template?.name ?? "");
  const [backgroundUrl, setBackgroundUrl] = useState(
    template?.backgroundUrl ?? ""
  );
  const [blocks, setBlocks] = useState<CertificateBlock[]>(
    template?.blocks ?? []
  );
  const defaultBgConfig: BackgroundConfig = { fit: "cover", position: "50% 50%" };
  const [bgConfig, setBgConfig] = useState<BackgroundConfig>(
    template?.backgroundConfig ?? defaultBgConfig
  );
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Sync form state whenever dialog opens or template changes
  const prevOpenRef = useRef(open);
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (justOpened) {
      setName(template?.name ?? "");
      setBackgroundUrl(template?.backgroundUrl ?? "");
      setBgConfig(template?.backgroundConfig ?? defaultBgConfig);
      setBlocks(template?.blocks ?? []);
    }
  }, [open, template]);

  function addBlock() {
    const newBlock: CertificateBlock = {
      id: uuid(),
      type: "custom_text",
      content: "",
      ...DEFAULT_BLOCK,
    };
    setBlocks((prev) => [...prev, newBlock]);
  }

  function updateBlock(id: string, patch: Partial<CertificateBlock>) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } : b))
    );
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function moveBlock(id: string, direction: "up" | "down") {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error("Informe o nome do modelo.");
      return;
    }
    onSave({ name: name.trim(), backgroundUrl, backgroundConfig: bgConfig, blocks });
    onOpenChange(false);
  }

  // Preview data (example values for admin preview)
  const previewData: CertificateData = {
    studentName: "Ana Paula Ferreira",
    courseName: "Fotografia Avançada",
    completionDate: format(new Date(), "dd 'de' MMMM 'de' yyyy", {
      locale: ptBR,
    }),
    courseHours: 40,
    platformName: settings.name || "Master Membros",
  };

  const previewTemplate: CertificateTemplate = {
    id: "preview",
    name,
    backgroundUrl,
    backgroundConfig: bgConfig,
    blocks,
    createdAt: "",
    updatedAt: "",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Editar modelo" : "Novo modelo de certificado"}
          </DialogTitle>
          <DialogDescription>
            Configure o layout e os blocos de conteúdo do certificado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left panel — Config */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Nome do modelo</Label>
              <Input
                id="tpl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Certificado Padrão"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Imagem de fundo</Label>
              <FileUpload
                value={backgroundUrl}
                onChange={setBackgroundUrl}
                folder="certificates/backgrounds"
                imagePreset="banner"
                allowUrl={true}
                aspectRatio="1.414/1"
                maxSizeMB={10}
                placeholder="Arraste ou clique (recomendado: 1754x1240px — A4 landscape)"
              />
              <p className="text-xs text-muted-foreground">
                Sem imagem, um fundo escuro degrade sera usado.
              </p>
            </div>

            {/* Background position / fit controls */}
            {backgroundUrl && (
              <div className="space-y-2 rounded-lg border border-border/50 p-3 bg-card/50">
                <Label className="text-xs font-medium text-muted-foreground">
                  Ajuste da imagem de fundo
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-[10px]">Encaixe</Label>
                    <Select
                      value={bgConfig.fit}
                      onValueChange={(v) =>
                        setBgConfig((prev) => ({
                          ...prev,
                          fit: v as BackgroundFit,
                        }))
                      }
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cover">Preencher</SelectItem>
                        <SelectItem value="contain">Conter</SelectItem>
                        <SelectItem value="fill">Esticar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px]">
                      Pos. X ({bgConfig.position.split(" ")[0]})
                    </Label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={parseInt(bgConfig.position.split(" ")[0]) || 50}
                      onChange={(e) => {
                        const y = bgConfig.position.split(" ")[1] || "50%";
                        setBgConfig((prev) => ({
                          ...prev,
                          position: `${e.target.value}% ${y}`,
                        }));
                      }}
                      className="w-full h-1.5 accent-primary"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px]">
                      Pos. Y ({bgConfig.position.split(" ")[1]})
                    </Label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={
                        parseInt(bgConfig.position.split(" ")[1]) || 50
                      }
                      onChange={(e) => {
                        const x = bgConfig.position.split(" ")[0] || "50%";
                        setBgConfig((prev) => ({
                          ...prev,
                          position: `${x} ${e.target.value}%`,
                        }));
                      }}
                      className="w-full h-1.5 accent-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Blocos de conteúdo
              </Label>
              <Button size="sm" variant="outline" onClick={addBlock}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Adicionar bloco
              </Button>
            </div>

            {blocks.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">
                Nenhum bloco adicionado. Clique em "Adicionar bloco" para
                começar.
              </p>
            )}

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {blocks.map((block, idx) => (
                <div
                  key={block.id}
                  className="rounded-lg border border-border/50 p-3 space-y-2.5 bg-card/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Bloco {idx + 1}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => moveBlock(block.id, "up")}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => moveBlock(block.id, "down")}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => removeBlock(block.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Type */}
                  <Select
                    value={block.type}
                    onValueChange={(v) =>
                      updateBlock(block.id, {
                        type: v as CertificateBlockType,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BLOCK_TYPE_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Custom text content */}
                  {block.type === "custom_text" && (
                    <Textarea
                      rows={2}
                      value={block.content ?? ""}
                      onChange={(e) =>
                        updateBlock(block.id, { content: e.target.value })
                      }
                      placeholder="Texto livre..."
                      className="text-xs"
                    />
                  )}

                  {/* Style controls */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <Label className="text-[10px]">Tamanho ({block.fontSize}px)</Label>
                      <input
                        type="range"
                        min={10}
                        max={72}
                        value={block.fontSize}
                        onChange={(e) =>
                          updateBlock(block.id, {
                            fontSize: Number(e.target.value),
                          })
                        }
                        className="w-full h-1.5 accent-primary"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px]">Peso</Label>
                      <Select
                        value={block.fontWeight}
                        onValueChange={(v) =>
                          updateBlock(block.id, {
                            fontWeight: v as "normal" | "bold",
                          })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="bold">Negrito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <Label className="text-[10px]">Cor</Label>
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          value={block.color}
                          onChange={(e) =>
                            updateBlock(block.id, { color: e.target.value })
                          }
                          className="h-7 w-8 cursor-pointer rounded border bg-transparent p-0.5"
                        />
                        <Input
                          value={block.color}
                          onChange={(e) =>
                            updateBlock(block.id, { color: e.target.value })
                          }
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px]">Alinhamento</Label>
                      <Select
                        value={block.textAlign}
                        onValueChange={(v) =>
                          updateBlock(block.id, {
                            textAlign: v as "left" | "center" | "right",
                          })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Esquerda</SelectItem>
                          <SelectItem value="center">Centro</SelectItem>
                          <SelectItem value="right">Direita</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-0.5">
                      <Label className="text-[10px]">Topo ({block.top}%)</Label>
                      <input
                        type="range"
                        min={0}
                        max={95}
                        value={block.top}
                        onChange={(e) =>
                          updateBlock(block.id, {
                            top: Number(e.target.value),
                          })
                        }
                        className="w-full h-1.5 accent-primary"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px]">Esq. ({block.left}%)</Label>
                      <input
                        type="range"
                        min={0}
                        max={90}
                        value={block.left}
                        onChange={(e) =>
                          updateBlock(block.id, {
                            left: Number(e.target.value),
                          })
                        }
                        className="w-full h-1.5 accent-primary"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px]">Larg. ({block.width}%)</Label>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={block.width}
                        onChange={(e) =>
                          updateBlock(block.id, {
                            width: Number(e.target.value),
                          })
                        }
                        className="w-full h-1.5 accent-primary"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel — Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Preview ao vivo</Label>
              <Button
                size="sm"
                variant="outline"
                disabled={downloading || !previewRef.current}
                onClick={async () => {
                  if (!previewRef.current) return;
                  setDownloading(true);
                  try {
                    await downloadCertificateAsPng(
                      previewRef.current,
                      `certificado-preview-${(name || "modelo").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`
                    );
                  } catch {
                    toast.error("Erro ao gerar preview.");
                  } finally {
                    setDownloading(false);
                  }
                }}
              >
                {downloading ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1 h-3.5 w-3.5" />
                )}
                Baixar preview
              </Button>
            </div>
            <div ref={previewRef} className="rounded-lg border overflow-hidden">
              <CertificateRenderer
                template={previewTemplate}
                data={previewData}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Dados de exemplo (nome, curso, carga horaria, data). No
              certificado real, os valores serao preenchidos automaticamente.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar modelo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

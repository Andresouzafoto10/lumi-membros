import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MessageSquare, Save } from "lucide-react";
import { toast } from "sonner";

import { useCommunities } from "@/hooks/useCommunities";
import { useClasses } from "@/hooks/useClasses";
import {
  AVAILABLE_EMOJIS,
  AVAILABLE_LUCIDE_ICONS,
  detectIconType,
  getLucideIcon,
} from "@/lib/communityIcon";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { FileUpload } from "@/components/ui/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminCommunityEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { findCommunity, createCommunity, updateCommunity } = useCommunities();
  const { classes } = useClasses();

  const isNew = id === "nova";
  const existing = isNew ? null : findCommunity(id);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [allowStudentPosts, setAllowStudentPosts] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [allowImages, setAllowImages] = useState(true);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setSlug(existing.slug);
      setDescription(existing.description);
      setCoverUrl(existing.coverUrl);
      setIconUrl(existing.iconUrl);
      setClassIds(existing.classIds);
      setStatus(existing.status);
      setAllowStudentPosts(existing.settings.allowStudentPosts);
      setRequireApproval(existing.settings.requireApproval);
      setAllowImages(existing.settings.allowImages);
    }
  }, [existing]);

  function generateSlug(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function toggleClass(classId: string) {
    setClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error("Informe o nome da comunidade.");
      return;
    }
    if (!slug.trim()) {
      toast.error("Informe o slug.");
      return;
    }

    const settings = {
      allowStudentPosts,
      requireApproval,
      allowImages,
    };

    if (isNew) {
      const newId = createCommunity({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        coverUrl: coverUrl.trim(),
        iconUrl: iconUrl.trim(),
        classIds,
        settings,
      });
      toast.success("Comunidade criada!");
      navigate(`/admin/comunidade/${newId}/edit`);
    } else if (existing) {
      updateCommunity(existing.id, {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        coverUrl: coverUrl.trim(),
        iconUrl: iconUrl.trim(),
        classIds,
        status,
        settings,
      });
      toast.success("Comunidade atualizada!");
    }
  }

  const pageTitle = isNew ? "Nova comunidade" : (existing?.name ?? "Editar comunidade");

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Admin", to: "/admin" },
          { label: "Comunidades", to: "/admin/comunidade" },
          { label: pageTitle },
        ]}
      />

      <div className="flex items-center gap-3">
        <MessageSquare className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: basic info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informacoes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="comm-name">Nome</Label>
              <Input
                id="comm-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (isNew) setSlug(generateSlug(e.target.value));
                }}
              />
            </div>
            <div>
              <Label htmlFor="comm-slug">Slug (URL)</Label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">/comunidade/</span>
                <Input
                  id="comm-slug"
                  value={slug}
                  onChange={(e) => setSlug(generateSlug(e.target.value))}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="comm-desc">Descricao</Label>
              <Textarea
                id="comm-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <Label>Capa da comunidade</Label>
              <FileUpload
                value={coverUrl}
                onChange={setCoverUrl}
                folder="communities/covers"
                imagePreset="banner"
                allowUrl={true}
                aspectRatio="3/1"
                placeholder="Arraste ou clique para enviar a capa"
              />
            </div>
            <div>
              <Label>Icone da comunidade</Label>
              <Tabs
                defaultValue={
                  detectIconType(iconUrl) === "lucide"
                    ? "lucide"
                    : detectIconType(iconUrl) === "image"
                      ? "upload"
                      : "emoji"
                }
                className="mt-1"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="emoji">Emoji</TabsTrigger>
                  <TabsTrigger value="lucide">Icone</TabsTrigger>
                  <TabsTrigger value="upload">Upload</TabsTrigger>
                </TabsList>

                <TabsContent value="emoji" className="mt-3">
                  <div className="grid grid-cols-10 gap-1.5">
                    {AVAILABLE_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIconUrl(emoji)}
                        className={`h-9 w-9 flex items-center justify-center rounded-md text-lg transition-all hover:bg-accent ${
                          iconUrl === emoji
                            ? "ring-2 ring-primary bg-primary/10"
                            : "hover:scale-110"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="lucide" className="mt-3">
                  <div className="grid grid-cols-8 gap-1.5">
                    {AVAILABLE_LUCIDE_ICONS.map((name) => {
                      const Icon = getLucideIcon(name);
                      const isSelected = iconUrl === `icon:${name}`;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setIconUrl(`icon:${name}`)}
                          className={`h-9 w-9 flex items-center justify-center rounded-md transition-all hover:bg-accent ${
                            isSelected
                              ? "ring-2 ring-primary bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:scale-110"
                          }`}
                          title={name}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="mt-3">
                  <FileUpload
                    value={detectIconType(iconUrl) === "image" ? iconUrl : ""}
                    onChange={setIconUrl}
                    folder="communities/icons"
                    imagePreset="avatar"
                    allowUrl={true}
                    aspectRatio="1/1"
                    placeholder="Arraste ou clique para enviar o icone"
                    className="max-w-[200px]"
                  />
                </TabsContent>
              </Tabs>

              {/* Preview */}
              {iconUrl && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Selecionado:</span>
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                    {detectIconType(iconUrl) === "emoji" && (
                      <span className="text-xl">{iconUrl}</span>
                    )}
                    {detectIconType(iconUrl) === "lucide" && (() => {
                      const Icon = getLucideIcon(iconUrl.replace("icon:", ""));
                      return <Icon className="h-5 w-5 text-primary" />;
                    })()}
                    {detectIconType(iconUrl) === "image" && (
                      <img src={iconUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    )}
                  </div>
                </div>
              )}
            </div>
            {!isNew && (
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="inactive">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: classes + settings */}
        <div className="space-y-6">
          {/* Classes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Turmas com acesso</CardTitle>
              <p className="text-xs text-muted-foreground">
                {classIds.length === 0
                  ? "Nenhuma turma selecionada — a comunidade sera publica (todos os alunos autenticados terao acesso)."
                  : `${classIds.length} turma${classIds.length > 1 ? "s" : ""} selecionada${classIds.length > 1 ? "s" : ""} — acesso restrito.`}
              </p>
            </CardHeader>
            <CardContent>
              {classes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma turma cadastrada.</p>
              ) : (
                <div className="space-y-2">
                  {classIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {classIds.map((cid) => {
                        const cls = classes.find((c) => c.id === cid);
                        return (
                          <Badge
                            key={cid}
                            variant="secondary"
                            className="gap-1 cursor-pointer"
                            onClick={() => toggleClass(cid)}
                          >
                            {cls?.name ?? cid}
                            <span className="text-muted-foreground ml-0.5">x</span>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {classes
                      .filter((c) => !classIds.includes(c.id))
                      .map((c) => (
                        <button
                          key={c.id}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left"
                          onClick={() => toggleClass(c.id)}
                        >
                          <span className="text-primary">+</span>
                          {c.name}
                        </button>
                      ))}
                    {classes.filter((c) => !classIds.includes(c.id)).length === 0 && (
                      <p className="text-xs text-muted-foreground">Todas as turmas ja foram adicionadas.</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuracoes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Permitir alunos publicar</p>
                  <p className="text-xs text-muted-foreground">
                    Se desativado, apenas admin/moderador pode publicar.
                  </p>
                </div>
                <Switch checked={allowStudentPosts} onCheckedChange={setAllowStudentPosts} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Requerer aprovacao</p>
                  <p className="text-xs text-muted-foreground">
                    Posts precisam de aprovacao antes de aparecer.
                  </p>
                </div>
                <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Permitir upload de fotos</p>
                  <p className="text-xs text-muted-foreground">
                    Alunos podem anexar imagens nos posts.
                  </p>
                </div>
                <Switch checked={allowImages} onCheckedChange={setAllowImages} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pb-6">
        <Button onClick={handleSave}>
          <Save className="mr-1.5 h-4 w-4" />
          {isNew ? "Criar comunidade" : "Salvar alteracoes"}
        </Button>
      </div>
    </div>
  );
}

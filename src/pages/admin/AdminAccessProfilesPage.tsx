import { useState } from "react";
import { ShieldCheck, Plus, Pencil, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";

import { useAccessProfiles } from "@/hooks/useAccessProfiles";
import type { AccessProfile } from "@/types/student";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

// ---------------------------------------------------------------------------
const PERMISSION_LABELS: Record<keyof AccessProfile["permissions"], string> = {
  courses: "Gerenciar cursos, módulos e aulas",
  students: "Gerenciar alunos e matrículas",
  classes: "Gerenciar turmas e conteúdo programado",
  settings: "Acessar e alterar configurações da plataforma",
  community: "Participar da área de comunidade",
};

type PermKey = keyof AccessProfile["permissions"];
const PERM_KEYS: PermKey[] = ["courses", "students", "classes", "settings", "community"];

type FormState = {
  name: string;
  description: string;
  permissions: AccessProfile["permissions"];
};

const emptyForm: FormState = {
  name: "",
  description: "",
  permissions: {
    courses: false,
    students: false,
    classes: false,
    settings: false,
    community: false,
  },
};

// ---------------------------------------------------------------------------
// Permission pill
// ---------------------------------------------------------------------------
function PermBadge({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        enabled
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground line-through"
      }`}
    >
      {label}
    </span>
  );
}

const PERM_SHORT: Record<PermKey, string> = {
  courses: "Cursos",
  students: "Alunos",
  classes: "Turmas",
  settings: "Configurações",
  community: "Comunidade",
};

// ---------------------------------------------------------------------------
// Profile card
// ---------------------------------------------------------------------------
function ProfileCard({
  profile,
  isSystem,
  onEdit,
  onDelete,
}: {
  profile: AccessProfile;
  isSystem: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{profile.name}</CardTitle>
            {isSystem && (
              <Badge variant="outline" className="text-xs gap-1">
                <Lock className="h-2.5 w-2.5" />
                Sistema
              </Badge>
            )}
          </div>
          {!isSystem && (
            <div className="flex items-center gap-1 shrink-0">
              <Button size="icon" variant="ghost" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover perfil?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O perfil <strong>{profile.name}</strong> será removido
                      permanentemente. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {profile.description && (
          <p className="text-sm text-muted-foreground">{profile.description}</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {PERM_KEYS.map((key) => (
            <PermBadge
              key={key}
              enabled={profile.permissions[key]}
              label={PERM_SHORT[key]}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AdminAccessProfilesPage() {
  const { systemProfiles, customProfiles, createProfile, updateProfile, deleteProfile } =
    useAccessProfiles();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(profile: AccessProfile) {
    setEditingId(profile.id);
    setForm({
      name: profile.name,
      description: profile.description,
      permissions: { ...profile.permissions },
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast.error("Informe o nome do perfil.");
      return;
    }
    if (editingId) {
      updateProfile(editingId, {
        name: form.name.trim(),
        description: form.description.trim(),
        permissions: form.permissions,
      });
      toast.success("Perfil atualizado.");
    } else {
      createProfile({
        name: form.name.trim(),
        description: form.description.trim(),
        permissions: form.permissions,
      });
      toast.success("Perfil criado.");
    }
    setDialogOpen(false);
  }

  function togglePerm(key: PermKey) {
    setForm((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }));
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <Breadcrumb
        items={[
          { label: "Admin", to: "/admin" },
          { label: "Configurações", to: "/admin/configuracoes" },
          { label: "Perfis de Acesso" },
        ]}
      />

      <div className="flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Perfis de Acesso</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os níveis de acesso dos usuários da plataforma
          </p>
        </div>
      </div>

      {/* ====== Perfis de sistema ====== */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Perfis de sistema</h2>
          <p className="text-sm text-muted-foreground">
            Estes perfis são fixos e não podem ser editados ou removidos.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {systemProfiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} isSystem />
          ))}
        </div>
      </section>

      {/* ====== Perfis personalizados ====== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Perfis personalizados</h2>
            <p className="text-sm text-muted-foreground">
              Crie perfis customizados com permissões específicas.
            </p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Novo perfil
          </Button>
        </div>

        {customProfiles.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum perfil personalizado criado ainda.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {customProfiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                isSystem={false}
                onEdit={() => openEdit(profile)}
                onDelete={() => {
                  deleteProfile(profile.id);
                  toast.success("Perfil removido.");
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* ====== Create / Edit dialog ====== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar perfil" : "Novo perfil de acesso"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Altere o nome, descrição e permissões do perfil."
                : "Defina um nome, descrição e as permissões deste perfil."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="prof-name">Nome</Label>
              <Input
                id="prof-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex.: Tutor"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-desc">Descrição</Label>
              <Textarea
                id="prof-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Breve descrição das responsabilidades deste perfil"
              />
            </div>

            <div className="space-y-2">
              <Label>Permissões</Label>
              <div className="rounded-lg border divide-y">
                {PERM_KEYS.map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{PERM_SHORT[key]}</p>
                      <p className="text-xs text-muted-foreground">
                        {PERMISSION_LABELS[key]}
                      </p>
                    </div>
                    <Switch
                      checked={form.permissions[key]}
                      onCheckedChange={() => togglePerm(key)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingId ? "Salvar alterações" : "Criar perfil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

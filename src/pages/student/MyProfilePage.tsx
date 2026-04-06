import { useState, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import {
  Camera,
  MapPin,
  LinkIcon,
  CalendarDays,
  Pencil,
  FileText,
  Bookmark,
  Info,
  GraduationCap,
  Award,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  Upload,
  Bell,
  Move,
  ExternalLink,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useProfiles } from "@/hooks/useProfiles";
import { useStudents } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { useCourses } from "@/hooks/useCourses";
import { usePosts } from "@/hooks/usePosts";
import { useGamification } from "@/hooks/useGamification";
import { useGamificationConfig } from "@/hooks/useGamificationConfig";
import { uploadToR2, deleteFromR2, isR2Url } from "@/lib/r2Upload";
import { useCommunities } from "@/hooks/useCommunities";
import { useCertificates } from "@/hooks/useCertificates";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { CertificateCard } from "@/components/certificates/CertificateCard";
import { GamificationRanking } from "@/components/community/GamificationRanking";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { GamificationGuide } from "@/components/gamification/GamificationGuide";
import { EmptyState } from "@/components/courses/EmptyState";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ImageCropDialog } from "@/components/ui/ImageCropDialog";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Notification Preferences Tab
// ---------------------------------------------------------------------------

const NOTIF_ROWS: { label: string; emailField?: string; notifField?: string }[] = [
  { label: "Comentários nas minhas publicações", emailField: "email_comments", notifField: "notif_comments" },
  { label: "Respostas aos meus comentários", emailField: "email_comment_replies", notifField: "notif_comment_replies" },
  { label: "Menções", emailField: "email_mentions", notifField: "notif_mentions" },
  { label: "Curtidas nas minhas publicações", emailField: "email_likes", notifField: "notif_likes" },
  { label: "Novos seguidores", emailField: "email_follows", notifField: "notif_follows" },
  { label: "Novo conteúdo do curso", emailField: "email_new_course", notifField: "notif_new_course" },
  { label: "Nova aula disponível", emailField: "email_new_lesson", notifField: "notif_new_lesson" },
  { label: "Certificado disponível", emailField: "email_certificate", notifField: "notif_certificate" },
  { label: "Missão concluída", emailField: "email_mission_complete", notifField: "notif_mission_complete" },
  { label: "Badge conquistado", emailField: "email_badge_earned", notifField: "notif_badge_earned" },
  { label: "Resposta no meu post", emailField: "email_post_reply", notifField: "notif_post_reply" },
  { label: "Resumo semanal", emailField: "email_weekly_digest" },
  { label: "Marco de seguidores", emailField: "email_follower_milestone" },
];

function NotificationPreferencesTab() {
  const { preferences, isLoading, updatePreference, disableAllEmail, disableAllNotif } =
    useNotificationPreferences();

  const handleToggle = (field: string, value: boolean) => {
    updatePreference.mutate({ field, value });
  };

  if (isLoading || !preferences) {
    return (
      <div className="py-8 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 rounded bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3">Preferencias de e-mail</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <Checkbox
            checked={preferences.email_marketing}
            onCheckedChange={(v) => handleToggle("email_marketing", !!v)}
          />
          <span className="text-sm">Ofertas, novidades e atualizacoes por e-mail</span>
        </label>
      </div>
      <Separator />
      <div>
        <h3 className="text-sm font-semibold mb-4">Notificacoes da comunidade</h3>
        <div className="grid grid-cols-[1fr_60px_60px] sm:grid-cols-[1fr_80px_80px] gap-2 mb-2 px-1">
          <span className="text-xs text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground text-center font-medium">E-mail</span>
          <span className="text-[11px] text-muted-foreground text-center font-medium">Na plataforma</span>
        </div>
        <div className="space-y-1">
          {NOTIF_ROWS.map((row) => (
            <div key={row.label} className="grid grid-cols-[1fr_60px_60px] sm:grid-cols-[1fr_80px_80px] gap-2 items-center py-2 px-1 rounded hover:bg-muted/10">
              <span className="text-sm">{row.label}</span>
              <div className="flex justify-center">
                {row.emailField ? (
                  <Checkbox checked={preferences[row.emailField as keyof typeof preferences] as boolean} onCheckedChange={(v) => handleToggle(row.emailField!, !!v)} />
                ) : <span className="text-muted-foreground/30">—</span>}
              </div>
              <div className="flex justify-center">
                {row.notifField ? (
                  <Checkbox checked={preferences[row.notifField as keyof typeof preferences] as boolean} onCheckedChange={(v) => handleToggle(row.notifField!, !!v)} />
                ) : <span className="text-muted-foreground/30">—</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Separator />
      <Button variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300" onClick={() => { disableAllEmail.mutate(); disableAllNotif.mutate(); toast.success("Todas as notificacoes foram desativadas"); }}>
        Desativar todas as notificacoes da comunidade
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini PostCard (compact for profile lists)
// ---------------------------------------------------------------------------
function MiniPostCard({
  title,
  body,
  communityName,
  likesCount,
  commentsCount,
  createdAt,
  onClick,
}: {
  title: string;
  body: string;
  communityName: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className="border-border/50 hover:border-border hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-1.5">
        {title && (
          <p className="font-semibold text-sm leading-snug">{title}</p>
        )}
        <p className="text-sm text-muted-foreground line-clamp-2">{body}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pt-1.5">
          <span className="text-primary/70">{communityName}</span>
          <span>·</span>
          <span>{likesCount} curtida{likesCount !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{commentsCount} comentario{commentsCount !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{format(new Date(createdAt), "dd MMM yyyy", { locale: ptBR })}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function MyProfilePage() {
  const { updatePassword, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const { currentUserId } = useCurrentUser();
  const { findProfile, updateProfile, checkUsernameAvailable } = useProfiles();
  const { findStudent, enrollments } = useStudents();
  const { findClass } = useClasses();
  const { allCourses, findCourse } = useCourses();
  const { getPostsByAuthor, getSavedPosts } = usePosts();
  const { getPlayerData, getPlayerMissions, getPlayerMissionsInProgress } = useGamification();
  // Upload handled directly via uploadToR2/deleteFromR2
  const { findCommunity } = useCommunities();
  const { getEarnedCertificates } = useCertificates();

  const earnedCerts = useMemo(
    () => getEarnedCertificates(currentUserId),
    [getEarnedCertificates, currentUserId]
  );

  const profile = findProfile(currentUserId);
  const student = findStudent(currentUserId);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: "",
    username: "",
    bio: "",
    link: "",
    location: "",
    socialInstagram: "",
    socialYoutube: "",
    socialTiktok: "",
    socialTwitter: "",
    socialLinkedin: "",
    socialWebsite: "",
  });
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [guideOpen, setGuideOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ newPassword: "", confirm: "" });
  const [pwShow, setPwShow] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [confirmRemoveCover, setConfirmRemoveCover] = useState(false);
  const [confirmRemoveAvatar, setConfirmRemoveAvatar] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const [cropTarget, setCropTarget] = useState<"avatar" | "cover" | null>(null);
  const [repositioning, setRepositioning] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const coverImgRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ startY: number; startPosY: number } | null>(null);

  // Gamification
  const { getLevelForPoints, levels } = useGamificationConfig();
  const playerData = getPlayerData(currentUserId);
  const completedMissions = getPlayerMissions(currentUserId);
  const inProgressMissions = getPlayerMissionsInProgress(currentUserId);
  const currentLevel = getLevelForPoints(playerData.points);
  const nextLevel = useMemo(() => {
    const sorted = [...levels].sort((a, b) => a.pointsRequired - b.pointsRequired);
    return sorted.find((l) => l.pointsRequired > playerData.points) ?? null;
  }, [levels, playerData.points]);

  // Posts
  const myPosts = useMemo(
    () => getPostsByAuthor(currentUserId),
    [getPostsByAuthor, currentUserId]
  );
  const savedPosts = useMemo(
    () => getSavedPosts(currentUserId),
    [getSavedPosts, currentUserId]
  );

  // Enrolled courses (deduplicated)
  const enrolledCourses = useMemo(() => {
    const studentEnrollments = enrollments.filter(
      (e) => e.studentId === currentUserId && e.status === "active"
    );
    const courseIdSet = new Set<string>();
    for (const e of studentEnrollments) {
      const cls = findClass(e.classId);
      if (cls) cls.courseIds.forEach((id) => courseIdSet.add(id));
    }
    return [...courseIdSet]
      .map((id) => findCourse(id))
      .filter(Boolean) as typeof allCourses;
  }, [enrollments, currentUserId, findClass, findCourse, allCourses]);

  if (!profile || !student) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Perfil nao encontrado.</p>
      </div>
    );
  }

  function openEditDialog() {
    if (!profile) return;
    setEditForm({
      displayName: profile.displayName,
      username: profile.username,
      bio: profile.bio,
      link: profile.link,
      location: profile.location,
      socialInstagram: profile.socialInstagram,
      socialYoutube: profile.socialYoutube,
      socialTiktok: profile.socialTiktok,
      socialTwitter: profile.socialTwitter,
      socialLinkedin: profile.socialLinkedin,
      socialWebsite: profile.socialWebsite,
    });
    setUsernameError(null);
    setEditOpen(true);
  }

  async function handleSavePassword() {
    if (!pwForm.newPassword || !pwForm.confirm) return;
    if (pwForm.newPassword !== pwForm.confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (pwForm.newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setPwLoading(true);
    const { error } = await updatePassword(pwForm.newPassword);
    setPwLoading(false);
    if (error) { toast.error(error); return; }
    toast.success("Senha alterada com sucesso!");
    setPwOpen(false);
    setPwForm({ newPassword: "", confirm: "" });
  }

  async function handleSaveEdit() {
    if (!profile) return;
    if (!editForm.displayName.trim()) {
      toast.error("Nome de exibicao e obrigatorio.");
      return;
    }
    const trimmedUsername = editForm.username.trim().toLowerCase();
    if (!trimmedUsername) {
      toast.error("Username e obrigatorio.");
      return;
    }
    setSavingEdit(true);
    setUsernameError(null);

    // FASE 3: check username uniqueness
    if (trimmedUsername !== profile.username) {
      const available = await checkUsernameAvailable(trimmedUsername, profile.id);
      if (!available) {
        setUsernameError("Este @ ja esta em uso. Escolha outro.");
        setSavingEdit(false);
        return;
      }
    }

    try {
      await updateProfile(profile.id, {
        displayName: editForm.displayName.trim(),
        username: trimmedUsername,
        bio: editForm.bio.slice(0, 160),
        link: editForm.link.trim(),
        location: editForm.location.trim(),
        socialInstagram: editForm.socialInstagram.trim(),
        socialYoutube: editForm.socialYoutube.trim(),
        socialTiktok: editForm.socialTiktok.trim(),
        socialTwitter: editForm.socialTwitter.trim(),
        socialLinkedin: editForm.socialLinkedin.trim(),
        socialWebsite: editForm.socialWebsite.trim(),
      });
      setEditOpen(false);
      toast.success("Perfil atualizado!");
    } catch {
      toast.error("Erro ao salvar perfil.");
    } finally {
      setSavingEdit(false);
    }
  }

  // -- File select → open crop dialog --
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, target: "avatar" | "cover") {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxMB = target === "avatar" ? 10 : 15; // generous pre-crop limit
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`Imagem muito grande. Maximo: ${maxMB}MB`);
      e.target.value = "";
      return;
    }
    const src = URL.createObjectURL(file);
    setCropSrc(src);
    setCropTarget(target);
    e.target.value = "";
  }

  // -- After crop confirmed → upload to R2 --
  async function handleCropConfirm(croppedFile: File) {
    if (!profile || !cropTarget) return;
    // Close crop dialog and revoke object URL
    const src = cropSrc;
    setCropSrc("");
    setCropTarget(null);
    URL.revokeObjectURL(src);

    if (cropTarget === "cover") {
      setUploadingCover(true);
      try {
        const url = await uploadToR2(croppedFile, "profiles/covers", {
          oldUrl: profile.coverUrl || undefined,
          preset: "cover",
        });
        await updateProfile(profile.id, { coverUrl: url });
        toast.success("Capa atualizada!");
      } catch {
        toast.error("Erro ao atualizar capa.");
      } finally {
        setUploadingCover(false);
      }
    } else {
      setUploadingAvatar(true);
      try {
        const url = await uploadToR2(croppedFile, "profiles/avatars", {
          oldUrl: profile.avatarUrl || undefined,
          preset: "avatar",
        });
        await updateProfile(profile.id, { avatarUrl: url });
        toast.success("Avatar atualizado!");
      } catch {
        toast.error("Erro ao atualizar avatar.");
      } finally {
        setUploadingAvatar(false);
      }
    }
  }

  function handleCropCancel() {
    const src = cropSrc;
    setCropSrc("");
    setCropTarget(null);
    URL.revokeObjectURL(src);
  }

  // -- Remove handlers --
  async function handleRemoveCover() {
    if (!profile) return;
    setUploadingCover(true);
    try {
      if (profile.coverUrl && isR2Url(profile.coverUrl)) {
        await deleteFromR2(profile.coverUrl);
      }
      await updateProfile(profile.id, { coverUrl: "" });
      toast.success("Capa removida.");
    } catch {
      toast.error("Erro ao remover capa.");
    } finally {
      setUploadingCover(false);
      setConfirmRemoveCover(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!profile) return;
    setUploadingAvatar(true);
    try {
      if (profile.avatarUrl && isR2Url(profile.avatarUrl)) {
        await deleteFromR2(profile.avatarUrl);
      }
      await updateProfile(profile.id, { avatarUrl: "" });
      toast.success("Avatar removido.");
    } catch {
      toast.error("Erro ao remover avatar.");
    } finally {
      setUploadingAvatar(false);
      setConfirmRemoveAvatar(false);
    }
  }

  // -- Cover reposition handlers --
  function startRepositioning() {
    if (!profile) return;
    const pos = profile.coverPosition || "50% 50%";
    const parts = pos.split(" ").map((s) => parseFloat(s));
    setDragPos({ x: parts[0] ?? 50, y: parts[1] ?? 50 });
    setRepositioning(true);
  }

  function handleCoverPointerDown(e: React.PointerEvent) {
    if (!repositioning) return;
    // Only start drag on the cover container itself, not on buttons
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    dragStartRef.current = { startY: e.clientY, startPosY: dragPos.y };
  }

  function handleCoverPointerMove(e: React.PointerEvent) {
    if (!repositioning || !dragStartRef.current || !coverImgRef.current) return;
    const containerH = coverImgRef.current.offsetHeight;
    const deltaY = e.clientY - dragStartRef.current.startY;
    const deltaPct = (deltaY / containerH) * 100;
    const newY = Math.max(0, Math.min(100, dragStartRef.current.startPosY - deltaPct));
    setDragPos((prev) => ({ ...prev, y: newY }));
  }

  function handleCoverPointerUp() {
    dragStartRef.current = null;
  }

  async function saveReposition() {
    if (!profile) return;
    const position = `50% ${Math.round(dragPos.y)}%`;
    try {
      await updateProfile(profile.id, { coverPosition: position });
      toast.success("Posicao salva!");
    } catch {
      toast.error("Erro ao salvar posicao.");
    }
    setRepositioning(false);
  }

  function cancelReposition() {
    setRepositioning(false);
  }

  function handlePostClick(postId: string, communityId: string) {
    const community = findCommunity(communityId);
    if (!community) {
      toast.error("Esta publicacao nao esta mais disponivel");
      return;
    }
    navigate(`/comunidade/${community.slug}#post-${postId}`);
  }

  // Compute current cover object-position
  const coverObjectPosition = repositioning
    ? `50% ${Math.round(dragPos.y)}%`
    : profile.coverPosition || "50% 50%";

  return (
    <div className="mx-auto max-w-3xl pb-20 sm:pb-12">
      <div className="px-4 pt-4 sm:px-5">
        <Breadcrumb items={[{ label: "Cursos", to: "/cursos" }, { label: "Meu Perfil" }]} />
      </div>

      {/* Cover */}
      <div
        className={`relative mt-4 px-4 sm:px-5 group/cover ${repositioning ? "cursor-grab active:cursor-grabbing" : ""}`}
        onPointerDown={handleCoverPointerDown}
        onPointerMove={handleCoverPointerMove}
        onPointerUp={handleCoverPointerUp}
        style={{ touchAction: repositioning ? "none" : undefined }}
      >
        <div
          ref={coverImgRef}
          className="h-[120px] overflow-hidden rounded-[1.25rem] bg-muted sm:h-[200px] sm:rounded-xl"
        >
          {profile.coverUrl ? (
            <img
              src={profile.coverUrl}
              alt="Capa"
              className="w-full h-full object-cover transition-opacity duration-300 select-none pointer-events-none"
              style={{ objectPosition: coverObjectPosition }}
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/15 to-primary/5" />
          )}
          {profile.coverUrl && !repositioning && (
            <div className="absolute inset-0 bg-black/10 rounded-[1.25rem] sm:rounded-xl" />
          )}
          {!repositioning && (
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent rounded-[1.25rem] sm:rounded-xl" />
          )}

          {/* Repositioning overlay */}
          {repositioning && (
            <div className="absolute inset-0 bg-black/30 rounded-[1.25rem] sm:rounded-xl flex items-center justify-center pointer-events-none">
              <p className="text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
                Arraste para reposicionar
              </p>
            </div>
          )}

          {/* Loading overlay */}
          {uploadingCover && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-[1.25rem] sm:rounded-xl z-10">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Reposition controls — z-20 + pointer-events-auto to stay above drag area */}
        {repositioning && (
          <div className="absolute bottom-3 right-3 flex gap-1.5 z-20 sm:bottom-4 sm:right-4">
            <Button
              size="sm"
              variant="secondary"
              className="backdrop-blur-sm shadow-md pointer-events-auto"
              onClick={cancelReposition}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="shadow-md pointer-events-auto"
              onClick={saveReposition}
            >
              Salvar posicao
            </Button>
          </div>
        )}

        {/* Cover action buttons (hidden during reposition) */}
        {!repositioning && (
          <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover/cover:opacity-100 transition-opacity z-10 sm:top-4 sm:right-4">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-full backdrop-blur-sm shadow-md"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              title={profile.coverUrl ? "Trocar capa" : "Adicionar capa"}
            >
              {profile.coverUrl ? <Upload className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            </Button>
            {profile.coverUrl && (
              <>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 rounded-full backdrop-blur-sm shadow-md"
                  onClick={startRepositioning}
                  disabled={uploadingCover}
                  title="Reposicionar capa"
                >
                  <Move className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8 rounded-full backdrop-blur-sm shadow-md"
                  onClick={() => setConfirmRemoveCover(true)}
                  disabled={uploadingCover}
                  title="Remover capa"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}

        {/* Fallback: always-visible camera button on mobile when no cover */}
        {!profile.coverUrl && !uploadingCover && !repositioning && (
          <Button
            size="icon"
            variant="secondary"
            className="absolute bottom-3 right-3 h-8 w-8 rounded-full opacity-70 hover:opacity-100 backdrop-blur-sm transition-opacity sm:hidden"
            onClick={() => coverInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
          </Button>
        )}

        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e, "cover")}
        />
      </div>

      {/* Avatar + Info */}
      <div className="relative z-10 -mt-10 px-4 sm:-mt-14 sm:px-5">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
          <div className="relative group/avatar">
            <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-background bg-muted shadow-lg ring-2 ring-primary/20 sm:h-28 sm:w-28">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary text-2xl font-bold">
                  {profile.displayName.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Avatar loading overlay */}
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              )}
            </div>

            {/* Avatar action buttons */}
            <div className="absolute -bottom-1 -right-1 flex gap-0.5 opacity-0 group-hover/avatar:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="secondary"
                className="h-7 w-7 rounded-full backdrop-blur-sm shadow-sm"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                title={profile.avatarUrl ? "Trocar avatar" : "Adicionar avatar"}
              >
                {profile.avatarUrl ? <Upload className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
              </Button>
              {profile.avatarUrl && (
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-7 w-7 rounded-full backdrop-blur-sm shadow-sm"
                  onClick={() => setConfirmRemoveAvatar(true)}
                  disabled={uploadingAvatar}
                  title="Remover avatar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Fallback: always-visible camera button when no hover support */}
            {!profile.avatarUrl && !uploadingAvatar && (
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 h-7 w-7 rounded-full opacity-70 hover:opacity-100 backdrop-blur-sm transition-opacity shadow-sm sm:hidden"
                onClick={() => avatarInputRef.current?.click()}
              >
                <Camera className="h-3.5 w-3.5" />
              </Button>
            )}

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e, "avatar")}
            />
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold leading-tight tracking-[-0.02em] sm:truncate">
                {profile.displayName}
              </h1>
              {completedMissions.length > 0 && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {completedMissions[completedMissions.length - 1].name}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={openEditDialog}
            className="w-full shrink-0 active:scale-95 transition-all sm:w-auto"
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Editar perfil
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setPwOpen(true); setPwForm({ newPassword: "", confirm: "" }); }}
            className="w-full shrink-0 active:scale-95 transition-all sm:w-auto text-muted-foreground"
          >
            <KeyRound className="mr-1.5 h-3.5 w-3.5" />
            Alterar senha
          </Button>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-4 text-sm leading-7 sm:mt-3 sm:leading-relaxed">
            {profile.bio}
          </p>
        )}

        {/* Meta row */}
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:mt-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
          {profile.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary/50" />
              {profile.location}
            </span>
          )}
          {profile.link && (
            <a
              href={profile.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              {profile.link.replace(/^https?:\/\//, "")}
            </a>
          )}
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5 text-primary/50" />
            Entrou em{" "}
            {format(new Date(profile.createdAt), "MMM yyyy", { locale: ptBR })}
          </span>
        </div>

        {/* Followers / Following */}
        <div className="mt-5 grid grid-cols-3 gap-2 text-center sm:mt-3 sm:flex sm:gap-4 sm:text-left">
          <Link to="#" className="rounded-2xl border border-border/70 px-3 py-3 hover:underline sm:rounded-none sm:border-0 sm:px-0 sm:py-0">
            <span className="font-bold text-foreground">{profile.following.length}</span>{" "}
            <span className="text-muted-foreground sm:inline">seguindo</span>
          </Link>
          <Link to="#" className="rounded-2xl border border-border/70 px-3 py-3 hover:underline sm:rounded-none sm:border-0 sm:px-0 sm:py-0">
            <span className="font-bold text-foreground">{profile.followers.length}</span>{" "}
            <span className="text-muted-foreground">
              seguidor{profile.followers.length !== 1 ? "es" : ""}
            </span>
          </Link>
          <span className="rounded-2xl border border-primary/20 bg-primary/5 px-3 py-3 text-sm sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
            <span className="font-bold text-primary">{playerData.points}</span>{" "}
            <span className="text-muted-foreground">pontos</span>
          </span>
        </div>

        {/* Level Progress Card */}
        {currentLevel && (
          <div className="mt-4 rounded-xl border border-border/50 bg-card/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <LevelBadge
                  iconName={currentLevel.iconName}
                  iconColor={currentLevel.iconColor}
                  levelName={currentLevel.name}
                  size="md"
                />
                <span className="text-sm text-muted-foreground">
                  Nivel {currentLevel.levelNumber}
                </span>
              </div>
              {nextLevel && (
                <span className="text-xs text-muted-foreground">
                  {nextLevel.pointsRequired - playerData.points} pts para{" "}
                  <span style={{ color: nextLevel.iconColor }} className="font-medium">
                    {nextLevel.iconName} {nextLevel.name}
                  </span>
                </span>
              )}
            </div>
            {nextLevel && (
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      ((playerData.points - currentLevel.pointsRequired) /
                        (nextLevel.pointsRequired - currentLevel.pointsRequired)) *
                        100
                    )}%`,
                    backgroundColor: currentLevel.iconColor,
                  }}
                />
              </div>
            )}
            {!nextLevel && (
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: "100%", backgroundColor: currentLevel.iconColor }}
                />
              </div>
            )}
          </div>
        )}

        {/* Guide link */}
        <button
          onClick={() => setGuideOpen(true)}
          className="mt-2 text-xs text-primary/70 hover:text-primary flex items-center gap-1 transition-colors"
        >
          <Info className="h-3 w-3" />
          Como ganhar pontos e subir de nivel
        </button>
      </div>

      {/* Gamification Guide Dialog */}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Guia de Gamificacao</DialogTitle>
            <DialogDescription>
              Veja como ganhar pontos, subir de nivel e completar missões
            </DialogDescription>
          </DialogHeader>
          <GamificationGuide studentId={currentUserId} />
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <div className="mt-6 px-4 sm:px-5">
        <Tabs defaultValue="posts">
          <TabsList className="flex w-full overflow-x-auto">
            <TabsTrigger value="posts" className="shrink-0 gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Publicacoes</span>
              <span className="sm:hidden">Posts</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="shrink-0 gap-1.5">
              <Bookmark className="h-3.5 w-3.5" />
              Salvos
            </TabsTrigger>
            <TabsTrigger value="about" className="shrink-0 gap-1.5">
              <Info className="h-3.5 w-3.5" />
              Sobre
            </TabsTrigger>
            <TabsTrigger value="certificates" className="shrink-0 gap-1.5">
              <Award className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Certificados</span>
              <span className="sm:hidden">Certs</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="shrink-0 gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Notificacoes</span>
              <span className="sm:hidden">Notif.</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Posts */}
          <TabsContent value="posts">
            {myPosts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Voce ainda nao publicou nada.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {myPosts.map((post) => (
                  <MiniPostCard
                    key={post.id}
                    title={post.title}
                    body={post.body}
                    communityName={findCommunity(post.communityId)?.name ?? post.communityId}
                    likesCount={post.likesCount}
                    commentsCount={post.commentsCount}
                    createdAt={post.createdAt}
                    onClick={() => handlePostClick(post.id, post.communityId)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Saved */}
          <TabsContent value="saved">
            {savedPosts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum post salvo ainda.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {savedPosts.map((post) => (
                  <MiniPostCard
                    key={post.id}
                    title={post.title}
                    body={post.body}
                    communityName={findCommunity(post.communityId)?.name ?? post.communityId}
                    likesCount={post.likesCount}
                    commentsCount={post.commentsCount}
                    createdAt={post.createdAt}
                    onClick={() => handlePostClick(post.id, post.communityId)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: About */}
          <TabsContent value="about">
            <div className="mt-3 space-y-6">
              {/* Bio */}
              {profile.bio && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Bio</h3>
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                </div>
              )}

              {/* Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {profile.location && (
                  <div>
                    <span className="text-muted-foreground">Localizacao:</span>{" "}
                    {profile.location}
                  </div>
                )}
                {profile.link && (
                  <div>
                    <span className="text-muted-foreground">Link:</span>{" "}
                    <a
                      href={profile.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {profile.link.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Membro desde:</span>{" "}
                  {format(new Date(profile.createdAt), "dd/MM/yyyy")}
                </div>
                {/* FASE 4: Email visible only to own user */}
                {user?.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{user.email}</span>
                  </div>
                )}
                {/* FASE 4: CPF visible only to own user */}
                {profile.cpf && (
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      CPF: {profile.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                    </span>
                  </div>
                )}
              </div>

              {/* FASE 2: Social links */}
              {(profile.socialInstagram || profile.socialYoutube || profile.socialTiktok || profile.socialTwitter || profile.socialLinkedin || profile.socialWebsite) && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Redes sociais</h3>
                  <div className="flex flex-wrap gap-3">
                    {profile.socialInstagram && (
                      <a href={profile.socialInstagram.startsWith("http") ? profile.socialInstagram : `https://instagram.com/${profile.socialInstagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Instagram
                      </a>
                    )}
                    {profile.socialYoutube && (
                      <a href={profile.socialYoutube.startsWith("http") ? profile.socialYoutube : `https://youtube.com/@${profile.socialYoutube.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" />
                        YouTube
                      </a>
                    )}
                    {profile.socialTiktok && (
                      <a href={profile.socialTiktok.startsWith("http") ? profile.socialTiktok : `https://tiktok.com/@${profile.socialTiktok.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" />
                        TikTok
                      </a>
                    )}
                    {profile.socialTwitter && (
                      <a href={profile.socialTwitter.startsWith("http") ? profile.socialTwitter : `https://x.com/${profile.socialTwitter.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Twitter/X
                      </a>
                    )}
                    {profile.socialLinkedin && (
                      <a href={profile.socialLinkedin.startsWith("http") ? profile.socialLinkedin : `https://linkedin.com/in/${profile.socialLinkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" />
                        LinkedIn
                      </a>
                    )}
                    {profile.socialWebsite && (
                      <a href={profile.socialWebsite.startsWith("http") ? profile.socialWebsite : `https://${profile.socialWebsite}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Site
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Missões */}
              {(completedMissions.length > 0 || inProgressMissions.length > 0) && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Missões</h3>
                  {/* Missões concluídas */}
                  {completedMissions.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                      {completedMissions.map((m) => (
                        <div key={m.id} className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-center">
                          <div className="text-2xl mb-1">{m.icon}</div>
                          <p className="text-xs font-bold">{m.name}</p>
                          <p className="text-[10px] text-muted-foreground">{m.description}</p>
                          <p className="text-[10px] text-primary mt-1">Concluída</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Missões em progresso */}
                  {inProgressMissions.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Em progresso</p>
                      <div className="space-y-0">
                        {inProgressMissions.map((m) => (
                          <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border/10">
                            <span className="text-xl grayscale opacity-50">{m.icon}</span>
                            <div className="flex-1">
                              <p className="text-xs font-medium">{m.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full bg-primary/60 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, (m.progress / m.conditionThreshold) * 100)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                  {m.progress}/{m.conditionThreshold}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Ranking */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-500" />
                  Ranking da plataforma
                </h3>
                <div className="rounded-lg border border-border/50 bg-card/50 p-2">
                  <GamificationRanking limit={5} compact />
                </div>
              </div>

              {/* Enrolled courses */}
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4" />
                  Cursos matriculados
                </h3>
                {enrolledCourses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum curso matriculado.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {enrolledCourses.map((course) => (
                      <Card key={course.id}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="h-10 w-14 rounded bg-muted overflow-hidden shrink-0">
                            {course.bannerUrl && (
                              <img
                                src={course.bannerUrl}
                                alt={course.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {course.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {course.modules.length} modulo
                              {course.modules.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab: Certificates */}
          <TabsContent value="certificates">
            {earnedCerts.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={Award}
                  title="Nenhum certificado ainda"
                  description="Complete os cursos para ganhar seus certificados"
                />
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                {earnedCerts.map((cert) => (
                  <CertificateCard key={cert.id} certificate={cert} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Notifications */}
          <TabsContent value="notifications">
            <NotificationPreferencesTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar senha</DialogTitle>
            <DialogDescription>Escolha uma nova senha para sua conta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pw-new">Nova senha</Label>
              <div className="relative">
                <Input
                  id="pw-new"
                  type={pwShow ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                  disabled={pwLoading}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setPwShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {pwShow ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw-confirm">Confirmar senha</Label>
              <Input
                id="pw-confirm"
                type={pwShow ? "text" : "password"}
                placeholder="Repita a nova senha"
                value={pwForm.confirm}
                onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                disabled={pwLoading}
                className="h-11"
              />
              {pwForm.confirm && pwForm.newPassword !== pwForm.confirm && (
                <p className="text-xs text-destructive">As senhas não coincidem</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)} disabled={pwLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleSavePassword}
              disabled={pwLoading || !pwForm.newPassword || !pwForm.confirm}
            >
              {pwLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando…</> : "Salvar senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
            <DialogDescription>
              Atualize suas informacoes de perfil publico.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-displayName">Nome de exibicao</Label>
              <Input
                id="edit-displayName"
                value={editForm.displayName}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, displayName: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-username">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  @
                </span>
                <Input
                  id="edit-username"
                  className={cn("pl-7", usernameError && "border-destructive/50")}
                  value={editForm.username}
                  onChange={(e) => {
                    setUsernameError(null);
                    setEditForm((f) => ({
                      ...f,
                      username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""),
                    }));
                  }}
                />
              </div>
              {usernameError && (
                <p className="text-xs text-destructive mt-1">{usernameError}</p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-bio">
                Bio{" "}
                <span className="text-muted-foreground font-normal">
                  ({editForm.bio.length}/160)
                </span>
              </Label>
              <Textarea
                id="edit-bio"
                rows={3}
                maxLength={160}
                value={editForm.bio}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, bio: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-link">Link externo</Label>
              <Input
                id="edit-link"
                placeholder="https://..."
                value={editForm.link}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, link: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-location">Localizacao</Label>
              <Input
                id="edit-location"
                placeholder="Cidade, Estado"
                value={editForm.location}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, location: e.target.value }))
                }
              />
            </div>

            {/* Social Links */}
            <Separator />
            <h4 className="text-sm font-semibold">Redes Sociais</h4>
            <div>
              <Label htmlFor="edit-instagram">Instagram</Label>
              <Input
                id="edit-instagram"
                placeholder="@seu_usuario ou URL"
                value={editForm.socialInstagram}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, socialInstagram: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-youtube">YouTube</Label>
              <Input
                id="edit-youtube"
                placeholder="@canal ou URL"
                value={editForm.socialYoutube}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, socialYoutube: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-tiktok">TikTok</Label>
              <Input
                id="edit-tiktok"
                placeholder="@usuario ou URL"
                value={editForm.socialTiktok}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, socialTiktok: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-twitter">Twitter/X</Label>
              <Input
                id="edit-twitter"
                placeholder="@usuario ou URL"
                value={editForm.socialTwitter}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, socialTwitter: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-linkedin">LinkedIn</Label>
              <Input
                id="edit-linkedin"
                placeholder="username ou URL"
                value={editForm.socialLinkedin}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, socialLinkedin: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-website">Site</Label>
              <Input
                id="edit-website"
                placeholder="https://..."
                value={editForm.socialWebsite}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, socialWebsite: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando…</> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image crop dialog */}
      <ImageCropDialog
        open={!!cropSrc && !!cropTarget}
        onClose={handleCropCancel}
        onConfirm={handleCropConfirm}
        imageSrc={cropSrc}
        aspect={cropTarget === "avatar" ? 1 : 16 / 9}
        shape={cropTarget === "avatar" ? "round" : "rect"}
        title={cropTarget === "avatar" ? "Ajustar foto de perfil" : "Ajustar foto de capa"}
      />

      {/* Confirm remove cover */}
      <AlertDialog open={confirmRemoveCover} onOpenChange={setConfirmRemoveCover}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover capa?</AlertDialogTitle>
            <AlertDialogDescription>
              Sua foto de capa sera removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveCover}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm remove avatar */}
      <AlertDialog open={confirmRemoveAvatar} onOpenChange={setConfirmRemoveAvatar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover avatar?</AlertDialogTitle>
            <AlertDialogDescription>
              Sua foto de perfil sera removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAvatar}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

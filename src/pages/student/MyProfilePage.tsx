import { useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
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
import { useCommunities } from "@/hooks/useCommunities";

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
import { Breadcrumb } from "@/components/ui/breadcrumb";

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
}: {
  title: string;
  body: string;
  communityName: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}) {
  return (
    <Card className="border-border/50 hover:border-border transition-colors">
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
  const { currentUserId } = useCurrentUser();
  const { findProfile, updateProfile } = useProfiles();
  const { findStudent, enrollments } = useStudents();
  const { findClass } = useClasses();
  const { allCourses, findCourse } = useCourses();
  const { getPostsByAuthor, getSavedPosts } = usePosts();
  const { getPlayerData, getPlayerBadges } = useGamification();
  const { findCommunity } = useCommunities();

  const profile = findProfile(currentUserId);
  const student = findStudent(currentUserId);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: "",
    username: "",
    bio: "",
    link: "",
    location: "",
  });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Gamification
  const playerData = getPlayerData(currentUserId);
  const playerBadges = getPlayerBadges(currentUserId);

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
    });
    setEditOpen(true);
  }

  function handleSaveEdit() {
    if (!profile) return;
    if (!editForm.displayName.trim()) {
      toast.error("Nome de exibicao e obrigatorio.");
      return;
    }
    if (!editForm.username.trim()) {
      toast.error("Username e obrigatorio.");
      return;
    }
    updateProfile(profile.id, {
      displayName: editForm.displayName.trim(),
      username: editForm.username.trim().toLowerCase(),
      bio: editForm.bio.slice(0, 160),
      link: editForm.link.trim(),
      location: editForm.location.trim(),
    });
    setEditOpen(false);
    toast.success("Perfil atualizado!");
  }

  function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "avatarUrl" | "coverUrl"
  ) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      updateProfile(profile.id, { [type]: base64 });
      toast.success(
        type === "avatarUrl" ? "Avatar atualizado!" : "Capa atualizada!"
      );
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="px-4 pt-4">
        <Breadcrumb items={[{ label: "Cursos", to: "/cursos" }, { label: "Meu Perfil" }]} />
      </div>

      {/* Cover */}
      <div className="relative mt-4">
        <div className="h-40 sm:h-52 rounded-xl overflow-hidden bg-muted">
          {profile.coverUrl ? (
            <img
              src={profile.coverUrl}
              alt="Capa"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/15 to-primary/5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
        </div>
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-3 right-3 h-8 w-8 rounded-full opacity-70 hover:opacity-100 backdrop-blur-sm transition-opacity"
          onClick={() => coverInputRef.current?.click()}
        >
          <Camera className="h-4 w-4" />
        </Button>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleImageUpload(e, "coverUrl")}
        />
      </div>

      {/* Avatar + Info */}
      <div className="px-4 -mt-12 sm:-mt-14 relative z-10">
        <div className="flex items-end gap-4">
          <div className="relative">
            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-4 border-background overflow-hidden bg-muted shadow-lg ring-2 ring-primary/20">
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
            </div>
            <Button
              size="icon"
              variant="secondary"
              className="absolute bottom-0 right-0 h-7 w-7 rounded-full opacity-70 hover:opacity-100 backdrop-blur-sm transition-opacity shadow-sm"
              onClick={() => avatarInputRef.current?.click()}
            >
              <Camera className="h-3.5 w-3.5" />
            </Button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e, "avatarUrl")}
            />
          </div>

          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold truncate">{profile.displayName}</h1>
              {playerBadges.length > 0 && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {playerBadges[playerBadges.length - 1].name}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>

          <Button size="sm" variant="outline" onClick={openEditDialog} className="shrink-0 active:scale-95 transition-all">
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Editar perfil
          </Button>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-3 text-sm leading-relaxed">{profile.bio}</p>
        )}

        {/* Meta row */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {profile.location && (
            <span className="flex items-center gap-1">
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
        <div className="mt-3 flex gap-4 text-sm">
          <Link to="#" className="hover:underline">
            <span className="font-bold text-foreground">{profile.following.length}</span>{" "}
            <span className="text-muted-foreground">seguindo</span>
          </Link>
          <Link to="#" className="hover:underline">
            <span className="font-bold text-foreground">{profile.followers.length}</span>{" "}
            <span className="text-muted-foreground">
              seguidor{profile.followers.length !== 1 ? "es" : ""}
            </span>
          </Link>
          <span className="text-muted-foreground">·</span>
          <span className="text-sm">
            <span className="font-bold text-primary">{playerData.points}</span>{" "}
            <span className="text-muted-foreground">pontos</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-6">
        <Tabs defaultValue="posts">
          <TabsList className="w-full">
            <TabsTrigger value="posts" className="flex-1 gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Publicacoes
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex-1 gap-1.5">
              <Bookmark className="h-3.5 w-3.5" />
              Salvos
            </TabsTrigger>
            <TabsTrigger value="about" className="flex-1 gap-1.5">
              <Info className="h-3.5 w-3.5" />
              Sobre
            </TabsTrigger>
          </TabsList>

          {/* Tab: Posts */}
          <TabsContent value="posts">
            {myPosts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Voce ainda nao publicou nada.
              </p>
            ) : (
              <div className="space-y-3 mt-3">
                {myPosts.map((post) => (
                  <MiniPostCard
                    key={post.id}
                    title={post.title}
                    body={post.body}
                    communityName={findCommunity(post.communityId)?.name ?? post.communityId}
                    likesCount={post.likesCount}
                    commentsCount={post.commentsCount}
                    createdAt={post.createdAt}
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
              <div className="space-y-3 mt-3">
                {savedPosts.map((post) => (
                  <MiniPostCard
                    key={post.id}
                    title={post.title}
                    body={post.body}
                    communityName={findCommunity(post.communityId)?.name ?? post.communityId}
                    likesCount={post.likesCount}
                    commentsCount={post.commentsCount}
                    createdAt={post.createdAt}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: About */}
          <TabsContent value="about">
            <div className="space-y-6 mt-3">
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
              </div>

              {/* Badges */}
              {playerBadges.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Conquistas</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {playerBadges.map((badge) => (
                      <div key={badge.id} className="rounded-lg border border-border/50 bg-gradient-to-br from-primary/5 to-transparent p-3 text-center">
                        <div className="text-2xl mb-1">{badge.icon}</div>
                        <p className="text-xs font-semibold">{badge.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{badge.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
        </Tabs>
      </div>

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
                  className="pl-7"
                  value={editForm.username}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""),
                    }))
                  }
                />
              </div>
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

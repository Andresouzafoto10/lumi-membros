import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  MapPin,
  LinkIcon,
  CalendarDays,
  FileText,
  Info,
  GraduationCap,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useProfiles } from "@/hooks/useProfiles";
import { useStudents } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { useCourses } from "@/hooks/useCourses";
import { usePosts } from "@/hooks/usePosts";
import { useCommunities } from "@/hooks/useCommunities";
import { useGamification } from "@/hooks/useGamification";
import { useGamificationConfig } from "@/hooks/useGamificationConfig";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { GamificationGuide } from "@/components/gamification/GamificationGuide";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/courses/EmptyState";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Mini PostCard (compact)
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
export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { currentUserId } = useCurrentUser();
  const { findProfile, isFollowing, follow, unfollow } = useProfiles();
  const { enrollments } = useStudents();
  const { findClass } = useClasses();
  const { allCourses, findCourse } = useCourses();
  const { getPostsByAuthor } = usePosts();
  const { findCommunity } = useCommunities();
  const { getPlayerData, getPlayerMissions, getPlayerMissionsInProgress } = useGamification();
  const { getLevelForPoints, levels } = useGamificationConfig();

  const [guideOpen, setGuideOpen] = useState(false);

  const profile = findProfile(id);
  const isOwnProfile = id === currentUserId;
  const following = id ? isFollowing(currentUserId, id) : false;

  // Gamification
  const playerData = id ? getPlayerData(id) : { points: 0, badges: [] };
  const completedMissions = id ? getPlayerMissions(id) : [];
  const inProgressMissions = id ? getPlayerMissionsInProgress(id) : [];
  const currentLevel = getLevelForPoints(playerData.points);
  const nextLevel = useMemo(() => {
    const sorted = [...levels].sort((a, b) => a.pointsRequired - b.pointsRequired);
    return sorted.find((l) => l.pointsRequired > playerData.points) ?? null;
  }, [levels, playerData.points]);

  // Posts
  const authorPosts = useMemo(
    () => (id ? getPostsByAuthor(id) : []),
    [getPostsByAuthor, id]
  );

  // Enrolled courses (deduplicated)
  const enrolledCourses = useMemo(() => {
    if (!id) return [];
    const studentEnrollments = enrollments.filter(
      (e) => e.studentId === id && e.status === "active"
    );
    const courseIdSet = new Set<string>();
    for (const e of studentEnrollments) {
      const cls = findClass(e.classId);
      if (cls) cls.courseIds.forEach((cid) => courseIdSet.add(cid));
    }
    return [...courseIdSet]
      .map((cid) => findCourse(cid))
      .filter(Boolean) as typeof allCourses;
  }, [enrollments, id, findClass, findCourse, allCourses]);

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <EmptyState
          icon={FileText}
          title="Perfil nao encontrado"
          description="Este usuario nao possui um perfil publico."
        />
      </div>
    );
  }

  function handleToggleFollow() {
    if (!id) return;
    if (following) {
      unfollow(currentUserId, id);
      toast.success("Voce deixou de seguir.");
    } else {
      follow(currentUserId, id);
      toast.success("Seguindo!");
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-20 sm:pb-12">
      <div className="px-4 pt-4 sm:px-5">
        <Breadcrumb
          items={[
            { label: "Cursos", to: "/cursos" },
            { label: profile.displayName },
          ]}
        />
      </div>

      {/* Cover */}
      <div className="relative mt-4 px-4 sm:px-5">
        <div className="h-32 overflow-hidden rounded-[1.25rem] bg-muted sm:h-52 sm:rounded-xl">
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
      </div>

      {/* Avatar + Info */}
      <div className="relative z-10 -mt-10 px-4 sm:-mt-14 sm:px-5">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-background bg-muted shadow-lg ring-2 ring-primary/20 sm:h-28 sm:w-28">
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
            <p className="text-sm text-muted-foreground">
              @{profile.username}
            </p>
          </div>

          {!isOwnProfile && (
            <Button
              size="sm"
              variant={following ? "outline" : "default"}
              onClick={handleToggleFollow}
              className={cn(
                "w-full shrink-0 active:scale-95 transition-all sm:w-auto",
                following && "hover:text-destructive hover:border-destructive/30",
                !following && "shadow-sm shadow-primary/15"
              )}
            >
              {following ? (
                <>
                  <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                  Seguindo
                </>
              ) : (
                <>
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Seguir
                </>
              )}
            </Button>
          )}
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
          <span className="rounded-2xl border border-border/70 px-3 py-3 sm:rounded-none sm:border-0 sm:px-0 sm:py-0">
            <span className="font-bold text-foreground">{profile.following.length}</span>{" "}
            <span className="text-muted-foreground">seguindo</span>
          </span>
          <span className="rounded-2xl border border-border/70 px-3 py-3 sm:rounded-none sm:border-0 sm:px-0 sm:py-0">
            <span className="font-bold text-foreground">{profile.followers.length}</span>{" "}
            <span className="text-muted-foreground">
              seguidor{profile.followers.length !== 1 ? "es" : ""}
            </span>
          </span>
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
          {id && <GamificationGuide studentId={id} />}
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <div className="mt-6 px-4 sm:px-5">
        <Tabs defaultValue="posts">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="posts" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Publicacoes
            </TabsTrigger>
            <TabsTrigger value="about" className="gap-1.5">
              <Info className="h-3.5 w-3.5" />
              Sobre
            </TabsTrigger>
          </TabsList>

          {/* Tab: Posts */}
          <TabsContent value="posts">
            {authorPosts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma publicacao ainda.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {authorPosts.map((post) => (
                  <MiniPostCard
                    key={post.id}
                    title={post.title}
                    body={post.body}
                    communityName={
                      findCommunity(post.communityId)?.name ?? post.communityId
                    }
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
            <div className="mt-3 space-y-6">
              {profile.bio && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Bio</h3>
                  <p className="text-sm text-muted-foreground">
                    {profile.bio}
                  </p>
                </div>
              )}

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

              {/* Missões */}
              {(completedMissions.length > 0 || inProgressMissions.length > 0) && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Missões</h3>
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
    </div>
  );
}

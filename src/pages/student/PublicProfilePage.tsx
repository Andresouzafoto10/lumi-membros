import { useMemo } from "react";
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

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/courses/EmptyState";

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
    <Card>
      <CardContent className="p-4 space-y-1.5">
        {title && (
          <p className="font-medium text-sm leading-snug">{title}</p>
        )}
        <p className="text-sm text-muted-foreground line-clamp-2">{body}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pt-1">
          <span>{communityName}</span>
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
  const { getPlayerData, getPlayerBadges } = useGamification();

  const profile = findProfile(id);
  const isOwnProfile = id === currentUserId;
  const following = id ? isFollowing(currentUserId, id) : false;

  // Gamification
  const playerData = id ? getPlayerData(id) : { points: 0, badges: [] };
  const playerBadges = id ? getPlayerBadges(id) : [];

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
    <div className="max-w-3xl mx-auto pb-12">
      <div className="px-4 pt-4">
        <Breadcrumb
          items={[
            { label: "Cursos", to: "/cursos" },
            { label: profile.displayName },
          ]}
        />
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
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10" />
          )}
        </div>
      </div>

      {/* Avatar + Info */}
      <div className="px-4 -mt-12 sm:-mt-14 relative z-10">
        <div className="flex items-end gap-4">
          <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-4 border-background overflow-hidden bg-muted shrink-0">
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

          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold truncate">
                {profile.displayName}
              </h1>
              {playerBadges.length > 0 && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {playerBadges[playerBadges.length - 1].name}
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
              variant={following ? "secondary" : "default"}
              onClick={handleToggleFollow}
              className="shrink-0"
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
          <p className="mt-3 text-sm leading-relaxed">{profile.bio}</p>
        )}

        {/* Meta row */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {profile.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
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
            <CalendarDays className="h-3.5 w-3.5" />
            Entrou em{" "}
            {format(new Date(profile.createdAt), "MMM yyyy", { locale: ptBR })}
          </span>
        </div>

        {/* Followers / Following */}
        <div className="mt-2 flex gap-4 text-sm">
          <span>
            <span className="font-semibold">{profile.following.length}</span>{" "}
            <span className="text-muted-foreground">seguindo</span>
          </span>
          <span>
            <span className="font-semibold">{profile.followers.length}</span>{" "}
            <span className="text-muted-foreground">
              seguidor{profile.followers.length !== 1 ? "es" : ""}
            </span>
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-sm">
            <span className="font-semibold">{playerData.points}</span>{" "}
            <span className="text-muted-foreground">pontos</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-6">
        <Tabs defaultValue="posts">
          <TabsList>
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
              <div className="space-y-3 mt-3">
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
            <div className="space-y-6 mt-3">
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

              {/* Badges */}
              {playerBadges.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Badges</h3>
                  <div className="flex flex-wrap gap-2">
                    {playerBadges.map((badge) => (
                      <Badge
                        key={badge.id}
                        variant="secondary"
                        className="gap-1.5 py-1"
                      >
                        {badge.name}
                      </Badge>
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
    </div>
  );
}

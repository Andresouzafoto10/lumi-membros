import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCertificates } from "@/hooks/useCertificates";
import { supabase } from "@/lib/supabase";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/courses/EmptyState";
import { CertificateCard } from "@/components/certificates/CertificateCard";

export default function MyCertificatesPage() {
  const { currentUserId } = useCurrentUser();
  const { getEarnedCertificates } = useCertificates();

  const { data: courseCertConfigs } = useQuery({
    queryKey: ["courses-cert-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, certificate_config");
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const earnedCerts = useMemo(() => {
    const all = getEarnedCertificates(currentUserId);
    if (!courseCertConfigs) return all;
    return all.filter((cert) => {
      const course = courseCertConfigs.find((c) => c.id === cert.courseId);
      if (!course?.certificate_config) return false;
      const config = course.certificate_config as Record<string, unknown>;
      const templateId = config.templateId as string | null | undefined;
      return !!templateId && templateId !== "" && templateId !== "none";
    });
  }, [getEarnedCertificates, currentUserId, courseCertConfigs]);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-12 pt-6 sm:px-6">
      <Helmet>
        <title>Meus Certificados</title>
      </Helmet>

      <Breadcrumb
        items={[
          { label: "Cursos", to: "/cursos" },
          { label: "Meus Certificados" },
        ]}
        className="mb-5"
      />

      <div className="flex items-center gap-3 mb-6">
        <Award className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Meus Certificados
          </h1>
          <p className="text-sm text-muted-foreground">
            Certificados que você conquistou ao completar cursos
          </p>
        </div>
      </div>

      {earnedCerts.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Nenhum certificado ainda"
          description="Complete os cursos para ganhar seus certificados. Cada curso pode ter um percentual mínimo de conclusão necessário."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {earnedCerts.map((cert) => (
            <CertificateCard key={cert.id} certificate={cert} />
          ))}
        </div>
      )}
    </div>
  );
}

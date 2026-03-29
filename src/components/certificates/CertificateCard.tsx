import { useState, useRef } from "react";
import { Download, Calendar, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import type { EarnedCertificate } from "@/types/student";
import { useCertificates } from "@/hooks/useCertificates";
import { useCourses } from "@/hooks/useCourses";
import { useStudents } from "@/hooks/useStudents";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { downloadCertificateAsPng } from "@/lib/generateCertificate";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CertificateRenderer } from "@/components/certificates/CertificateRenderer";

type Props = {
  certificate: EarnedCertificate;
};

export function CertificateCard({ certificate }: Props) {
  const { getTemplateById, markDownloaded, generateCertificateData } =
    useCertificates();
  const { findCourse } = useCourses();
  const { findStudent } = useStudents();
  const { settings } = usePlatformSettings();

  const [downloading, setDownloading] = useState(false);
  const hiddenRef = useRef<HTMLDivElement>(null);
  const containerId = `cert-download-${certificate.id}`;

  const course = findCourse(certificate.courseId);
  const student = findStudent(certificate.studentId);
  const template = getTemplateById(certificate.templateId);

  if (!course || !template) return null;

  const certData = generateCertificateData(
    student?.name ?? "Aluno",
    course.title,
    course.certificateConfig?.hoursLoad ?? 0,
    settings.name || "Lumi Membros",
    certificate.templateId,
    certificate.earnedAt
  );

  if (!certData) return null;

  async function handleDownload() {
    setDownloading(true);
    try {
      const slugName = (course?.title ?? "curso")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const slugStudent = (student?.name ?? "aluno")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      await downloadCertificateAsPng(
        containerId,
        `certificado-${slugName}-${slugStudent}.png`
      );
      markDownloaded(certificate.id);
      toast.success("Download iniciado!");
    } catch {
      toast.error("Erro ao gerar o certificado.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <Card className="overflow-hidden border-border/50 hover:border-border hover:shadow-md transition-all duration-200">
        {/* Preview */}
        <div className="border-b overflow-hidden">
          <CertificateRenderer template={certData.template} data={certData} />
        </div>

        <CardContent className="p-4 space-y-3">
          <p className="font-semibold text-sm">{course.title}</p>

          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              Concluído em{" "}
              {format(new Date(certificate.earnedAt), "dd 'de' MMMM 'de' yyyy", {
                locale: ptBR,
              })}
            </span>
            {(course.certificateConfig?.hoursLoad ?? 0) > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Carga: {course.certificateConfig?.hoursLoad} horas
              </span>
            )}
          </div>

          <Button
            size="sm"
            className="w-full gap-1.5"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Baixar Certificado PNG
          </Button>
        </CardContent>
      </Card>

      {/* Hidden full-size renderer for download */}
      <div
        ref={hiddenRef}
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: 1920,
          height: 1080,
        }}
      >
        <CertificateRenderer
          template={certData.template}
          data={certData}
          containerId={containerId}
          className="w-[1920px] h-[1080px]"
        />
      </div>
    </>
  );
}

import { useEffect, useMemo, useRef } from "react";
import landingHtml from "@/assets/escola-master-vendas.html?raw";

const ensureHeadLink = (id: string, rel: string, href: string, crossOrigin?: string) => {
  if (document.getElementById(id)) {
    return;
  }

  const link = document.createElement("link");
  link.id = id;
  link.rel = rel;
  link.href = href;

  if (crossOrigin) {
    link.crossOrigin = crossOrigin;
  }

  document.head.appendChild(link);
};

const extractStyle = (html: string) => html.match(/<style>([\s\S]*?)<\/style>/i)?.[1] ?? "";

const extractBody = (html: string) =>
  (html.match(/<body[^>]*>([\s\S]*?)<script>/i)?.[1] ?? html)
    .replace(/\sonclick="toggleAccordion\(this\)"/g, "");

const LandingPage = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const styles = useMemo(() => extractStyle(landingHtml), []);
  const content = useMemo(() => extractBody(landingHtml), []);

  useEffect(() => {
    document.title = "Escola Master para Fotógrafos";

    ensureHeadLink("landing-fonts-preconnect", "preconnect", "https://fonts.googleapis.com");
    ensureHeadLink("landing-fonts-stylesheet", "stylesheet", "https://fonts.googleapis.com/css2?family=Inter:wght@200;400;600;700&family=Poppins:wght@400;500;600;700&family=Archivo:wght@400;600&display=swap");
    ensureHeadLink("landing-fontawesome", "stylesheet", "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css");
  }, []);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const header = target?.closest(".accordion-header") as HTMLElement | null;

      if (!header) {
        return;
      }

      const body = header.nextElementSibling as HTMLElement | null;
      const isOpen = header.classList.contains("open");

      container.querySelectorAll<HTMLElement>(".accordion-header").forEach((item) => item.classList.remove("open"));
      container.querySelectorAll<HTMLElement>(".accordion-body").forEach((item) => item.classList.remove("open"));

      if (!isOpen) {
        header.classList.add("open");
        body?.classList.add("open");
      }
    };

    container.addEventListener("click", handleClick);

    return () => {
      container.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <>
      <style>{styles}</style>
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: content }} />
    </>
  );
};

export default LandingPage;

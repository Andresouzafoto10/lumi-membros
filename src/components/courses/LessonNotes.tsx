import { useRef, useEffect } from "react";
import { StickyNote } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

interface LessonNotesProps {
  content: string;
  onChange: (text: string) => void;
}

export function LessonNotes({ content, onChange }: LessonNotesProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  function handleChange(html: string) {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(html), 500);
  }

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // Treat empty markup as "no content" for the indicator dot.
  const hasContent =
    !!content && content.trim() !== "" && content.trim() !== "<p></p>";

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <StickyNote className="h-4 w-4" />
          Minhas anotacoes
          {hasContent && (
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse-soft" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <RichTextEditor
          value={content}
          onChange={handleChange}
          placeholder="Escreva suas anotacoes. Selecione um trecho e clique nos botoes acima para formatar."
          minHeight="min-h-[180px]"
        />
        <p className="text-[11px] text-muted-foreground/70 mt-1.5 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500/60" />
          Salvo automaticamente
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

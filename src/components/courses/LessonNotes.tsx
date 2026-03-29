import { useRef, useEffect } from "react";
import { StickyNote } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface LessonNotesProps {
  content: string;
  onChange: (text: string) => void;
}

export function LessonNotes({ content, onChange }: LessonNotesProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = (value: string) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => onChange(value), 500);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <StickyNote className="h-4 w-4" />
          Minhas anotacoes
          {content.trim() && (
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse-soft" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <Textarea
          placeholder="Escreva suas anotacoes sobre esta aula..."
          defaultValue={content}
          onChange={(e) => handleChange(e.target.value)}
          className="min-h-[120px] resize-y border-border/60 transition-all duration-200 focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:shadow-sm"
        />
        <p className="text-[11px] text-muted-foreground/70 mt-1.5 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500/60" />
          Salvo automaticamente
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

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
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <StickyNote className="h-4 w-4" />
          Minhas anotacoes
          {content.trim() && (
            <span className="h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <Textarea
          placeholder="Escreva suas anotacoes sobre esta aula..."
          defaultValue={content}
          onChange={(e) => handleChange(e.target.value)}
          className="min-h-[120px] resize-y"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Salvo automaticamente
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

import { Link } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <FileQuestion className="h-16 w-16 text-muted-foreground/50" />
        <h1 className="text-2xl font-semibold">Pagina nao encontrada</h1>
        <p className="max-w-sm text-muted-foreground">
          A pagina que voce procura nao existe ou foi movida.
        </p>
        <Button asChild>
          <Link to="/cursos">Voltar para Cursos</Link>
        </Button>
      </div>
    </div>
  );
}

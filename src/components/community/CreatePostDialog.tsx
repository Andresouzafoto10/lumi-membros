import { useState, useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCommunities } from "@/hooks/useCommunities";
import { usePosts } from "@/hooks/usePosts";
import { useRestrictions } from "@/hooks/useRestrictions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CreatePostDialog({
  open,
  onOpenChange,
  defaultCommunityId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCommunityId?: string;
}) {
  const { currentUserId } = useCurrentUser();
  const { getCommunitiesForStudent } = useCommunities();
  const { createPost } = usePosts();
  const { isRestricted } = useRestrictions();

  const myCommunities = getCommunitiesForStudent(currentUserId);
  const postable = myCommunities.filter((c) => c.settings.allowStudentPosts);

  const [communityId, setCommunityId] = useState(
    defaultCommunityId ?? postable[0]?.id ?? ""
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const restricted = isRestricted(currentUserId);

  const selectedCommunity = myCommunities.find((c) => c.id === communityId);
  const requiresApproval = selectedCommunity?.settings.requireApproval ?? false;
  const allowImages = selectedCommunity?.settings.allowImages ?? true;

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const remaining = 6 - images.length;
    const toProcess = Array.from(files).slice(0, remaining);

    for (const file of toProcess) {
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => {
          if (prev.length >= 6) return prev;
          return [...prev, reader.result as string];
        });
      };
      reader.readAsDataURL(file);
    }

    e.target.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (restricted) {
      toast.error("Voce esta restrito de publicar.");
      return;
    }
    if (!communityId) {
      toast.error("Selecione uma comunidade.");
      return;
    }
    if (!body.trim()) {
      toast.error("Escreva algo na publicacao.");
      return;
    }

    createPost({
      communityId,
      authorId: currentUserId,
      title: title.trim(),
      body: body.trim(),
      images,
      status: requiresApproval ? "pending" : "published",
    });

    toast.success(
      requiresApproval
        ? "Publicacao enviada para aprovacao!"
        : "Publicacao criada!"
    );

    // Reset
    setTitle("");
    setBody("");
    setImages([]);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar publicacao</DialogTitle>
          <DialogDescription>
            Compartilhe com a comunidade.
          </DialogDescription>
        </DialogHeader>

        {restricted ? (
          <p className="text-sm text-destructive py-4">
            Voce esta temporariamente restrito de publicar.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Community select */}
            <div>
              <Label>Comunidade</Label>
              <Select value={communityId} onValueChange={setCommunityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {postable.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {requiresApproval && (
                <p className="text-xs text-muted-foreground mt-1">
                  Posts nesta comunidade requerem aprovacao antes de serem publicados.
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <Label>Titulo (opcional)</Label>
              <Input
                placeholder="Titulo da publicacao"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Body */}
            <div>
              <Label>
                Conteudo{" "}
                <span className="text-muted-foreground font-normal">
                  (use **negrito**, *italico*, #hashtag, @mencao)
                </span>
              </Label>
              <Textarea
                placeholder="Escreva sua publicacao..."
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            {/* Images */}
            {allowImages && (
              <div>
                <Label>Imagens ({images.length}/6)</Label>
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {images.map((img, i) => (
                      <div
                        key={i}
                        className="relative rounded-md overflow-hidden bg-muted aspect-square"
                      >
                        <img
                          src={img}
                          alt={`Upload ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          size="icon"
                          variant="secondary"
                          className="absolute top-1 right-1 h-5 w-5 rounded-full"
                          onClick={() => removeImage(i)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {images.length < 6 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    Adicionar imagem
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={restricted || !body.trim() || !communityId}
          >
            {requiresApproval ? "Enviar para aprovacao" : "Publicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

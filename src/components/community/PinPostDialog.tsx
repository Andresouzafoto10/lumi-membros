import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pin } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { usePinnedPosts } from "@/hooks/usePinnedPosts";
import { useCommunities } from "@/hooks/useCommunities";

interface PinPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  communityId: string | null;
}

export function PinPostDialog({
  open,
  onOpenChange,
  postId,
  communityId,
}: PinPostDialogProps) {
  const { getPinDestinations, pinPost, unpinPost } = usePinnedPosts();
  const { findCommunity } = useCommunities();
  const community = findCommunity(communityId ?? undefined);

  const [inCommunity, setInCommunity] = useState(false);
  const [inFeed, setInFeed] = useState(false);
  const [inSidebar, setInSidebar] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const current = getPinDestinations(postId, communityId);
    setInCommunity(current.community);
    setInFeed(current.feed);
    setInSidebar(current.sidebar);
  }, [open, postId, communityId, getPinDestinations]);

  async function handleSave() {
    setSaving(true);
    const current = getPinDestinations(postId, communityId);
    const ops: Promise<void>[] = [];

    const diff = (
      desired: boolean,
      currentVal: boolean,
      scope: "community" | "feed" | "sidebar",
      cid: string | null
    ) => {
      if (desired === currentVal) return;
      if (desired) {
        ops.push(pinPost({ postId, scope, communityId: cid }));
      } else {
        ops.push(unpinPost({ postId, scope, communityId: cid }));
      }
    };

    diff(inCommunity, current.community, "community", communityId);
    diff(inFeed, current.feed, "feed", null);
    diff(inSidebar, current.sidebar, "sidebar", null);

    try {
      await Promise.all(ops);
      toast.success("Fixação atualizada");
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao fixar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pin className="h-4 w-4 text-primary" />
            Fixar publicação
          </DialogTitle>
          <DialogDescription>
            Escolha onde esta publicação deve aparecer fixada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3">
            <Checkbox
              id="pin-community"
              checked={inCommunity}
              disabled={!communityId}
              onCheckedChange={(v) => setInCommunity(v === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label htmlFor="pin-community" className="cursor-pointer font-medium">
                Fixar nesta comunidade
              </Label>
              {community ? (
                <p className="text-xs text-muted-foreground">{community.name}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Post sem comunidade — opção indisponível
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="pin-feed"
              checked={inFeed}
              onCheckedChange={(v) => setInFeed(v === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label htmlFor="pin-feed" className="cursor-pointer font-medium">
                Fixar no feed global
              </Label>
              <p className="text-xs text-muted-foreground">
                Aparece no topo de /comunidade/feed
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="pin-sidebar"
              checked={inSidebar}
              onCheckedChange={(v) => setInSidebar(v === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label htmlFor="pin-sidebar" className="cursor-pointer font-medium">
                Destacar na sidebar
              </Label>
              <p className="text-xs text-muted-foreground">
                Aparece em "Mais curtidos do mês"
              </p>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground/80 border-t border-border/30 pt-3">
            Máximo 3 fixados por destino. Os mais recentes aparecem primeiro.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

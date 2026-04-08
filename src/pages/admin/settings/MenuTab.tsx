import { useState, useEffect } from "react";
import { Plus, Menu as MenuIcon, ChevronUp, ChevronDown, ExternalLink, EyeOff, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NavMenuItemRow, NavMenuItemInsert } from "@/hooks/useNavMenuItems";

// ---------------------------------------------------------------------------
// MenuTabContent
// ---------------------------------------------------------------------------

export function MenuTabContent({
  studentItems,
  adminItems,
  onAddStudent,
  onAddAdmin,
  onEditStudent,
  onEditAdmin,
  onDeleteStudent,
  onDeleteAdmin,
  onToggleStudent,
  onToggleAdmin,
  onReorderStudent,
  onReorderAdmin,
}: {
  studentItems: NavMenuItemRow[];
  adminItems: NavMenuItemRow[];
  onAddStudent: () => void;
  onAddAdmin: () => void;
  onEditStudent: (item: NavMenuItemRow) => void;
  onEditAdmin: (item: NavMenuItemRow) => void;
  onDeleteStudent: (id: string) => void;
  onDeleteAdmin: (id: string) => void;
  onToggleStudent: (id: string, visible: boolean) => void;
  onToggleAdmin: (id: string, visible: boolean) => void;
  onReorderStudent: (items: { id: string; sort_order: number }[]) => void;
  onReorderAdmin: (items: { id: string; sort_order: number }[]) => void;
}) {
  const [menuTab, setMenuTab] = useState<"student" | "admin">("student");

  return (
    <>
      <div>
        <h2 className="text-base font-semibold">Navegação</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie os itens de menu exibidos para alunos e administradores.
        </p>
      </div>

      <Tabs value={menuTab} onValueChange={(v) => setMenuTab(v as "student" | "admin")}>
        <TabsList>
          <TabsTrigger value="student">Menu do Aluno</TabsTrigger>
          <TabsTrigger value="admin">Menu Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="student" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={onAddStudent}>
              <Plus className="mr-1 h-4 w-4" />
              Adicionar item de menu
            </Button>
          </div>
          <MenuItemList
            items={studentItems}
            onEdit={onEditStudent}
            onDelete={onDeleteStudent}
            onToggle={onToggleStudent}
            onReorder={onReorderStudent}
          />
        </TabsContent>

        <TabsContent value="admin" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={onAddAdmin}>
              <Plus className="mr-1 h-4 w-4" />
              Adicionar item de menu
            </Button>
          </div>
          <MenuItemList
            items={adminItems}
            onEdit={onEditAdmin}
            onDelete={onDeleteAdmin}
            onToggle={onToggleAdmin}
            onReorder={onReorderAdmin}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

// ---------------------------------------------------------------------------
// MenuItemList
// ---------------------------------------------------------------------------

function MenuItemList({
  items,
  onEdit,
  onDelete,
  onToggle,
  onReorder,
}: {
  items: NavMenuItemRow[];
  onEdit: (item: NavMenuItemRow) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, visible: boolean) => void;
  onReorder: (items: { id: string; sort_order: number }[]) => void;
}) {
  const moveItem = (index: number, direction: -1 | 1) => {
    const newItems = [...items];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newItems.length) return;
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    onReorder(newItems.map((item, i) => ({ id: item.id, sort_order: i + 1 })));
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MenuIcon className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhum item de menu. Clique em "Adicionar item de menu" para criar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <Card key={item.id} className="border-border/50 hover:border-border transition-all">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-0.5 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  disabled={index === 0}
                  onClick={() => moveItem(index, -1)}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  disabled={index === items.length - 1}
                  onClick={() => moveItem(index, 1)}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{item.label}</p>
                  {item.icon && (
                    <span className="text-xs text-muted-foreground">({item.icon})</span>
                  )}
                  {item.is_external ? (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <ExternalLink className="h-2.5 w-2.5" />
                      EXTERNO
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">INTERNO</Badge>
                  )}
                  {item.is_default && (
                    <Badge className="text-[10px] bg-primary/15 text-primary hover:bg-primary/20">DEFAULT</Badge>
                  )}
                  {!item.visible && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                      <EyeOff className="h-2.5 w-2.5" />
                      Oculto
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{item.url}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={item.visible}
                  onCheckedChange={(v) => onToggle(item.id, v)}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(item)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={item.is_default}
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MenuItemDialog
// ---------------------------------------------------------------------------

export function MenuItemDialog({
  open,
  onOpenChange,
  item,
  area,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: NavMenuItemRow | null;
  area: "student" | "admin";
  onSave: (data: NavMenuItemInsert) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [target, setTarget] = useState<string>("_self");
  const [icon, setIcon] = useState("");
  const [visible, setVisible] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel(item?.label ?? "");
      setUrl(item?.url ?? "");
      setTarget(item?.target ?? "_self");
      setIcon(item?.icon ?? "");
      setVisible(item?.visible ?? true);
    }
  }, [open, item]);

  const handleSubmit = async () => {
    if (!label.trim() || !url.trim()) return;
    setSaving(true);
    try {
      const isExternal = url.trim().startsWith("http");
      await onSave({
        label: label.trim(),
        url: url.trim(),
        target,
        icon: icon.trim() || null,
        visible,
        area,
        is_external: isExternal,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {item ? "Editar Item de Menu" : "Adicionar Item de Menu"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Label *</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Dashboard" />
          </div>
          <div className="space-y-1.5">
            <Label>URL *</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/cursos ou https://exemplo.com"
            />
            <p className="text-xs text-muted-foreground">
              Rota interna (/cursos) ou URL externa (https://...)
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Abrir em</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_self">Mesma aba</SelectItem>
                  <SelectItem value="_blank">Nova aba</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ícone (Lucide)</Label>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="Ex: Star, BookOpen"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={visible} onCheckedChange={setVisible} />
            <Label className="text-sm">Visível</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !label.trim() || !url.trim()}>
            {saving ? "Salvando..." : item ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

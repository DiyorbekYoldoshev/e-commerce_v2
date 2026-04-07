import React, { useEffect, useState } from "react";
import { categoryApi } from "@/lib/api";
import type { Category } from "@/types";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Tag, X, ChevronRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Attribute {
  id: number;
  name: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const AdminCategories: React.FC = () => {
  const { toast } = useToast();

  const [categories, setCategories]   = useState<Category[]>([]);
  const [loading, setLoading]         = useState(true);

  // Category dialog
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [form, setForm]               = useState({ name: "", type: "main", parent: "" });
  const [editId, setEditId]           = useState<number | null>(null);

  // Attribute dialog
  const [attrDialogOpen, setAttrDialogOpen] = useState(false);
  const [selectedCat, setSelectedCat]       = useState<Category | null>(null);
  const [catAttributes, setCatAttributes]   = useState<Attribute[]>([]);
  const [newAttrName, setNewAttrName]       = useState("");
  const [attrLoading, setAttrLoading]       = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    try {
      const res = await categoryApi.list();
      setCategories(res.data?.results ?? res.data ?? []);
    } catch {
      setCategories([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadCatAttributes = async (catId: number) => {
    setAttrLoading(true);
    try {
      const res = await categoryApi.attributes(catId);
      setCatAttributes(res.data?.results ?? res.data ?? []);
    } catch {
      setCatAttributes([]);
    }
    setAttrLoading(false);
  };

  // ── Category CRUD ───────────────────────────────────────────────────────────

  const handleSave = async () => {
    try {
      const data: any = { name: form.name, type: form.type };
      if (form.type === "sub" && form.parent) data.parent = Number(form.parent);

      if (editId) {
        await categoryApi.update(editId, data);
        toast({ title: "Yangilandi ✓" });
      } else {
        await categoryApi.create(data);
        toast({ title: "Qo'shildi ✓" });
      }
      setDialogOpen(false);
      setForm({ name: "", type: "main", parent: "" });
      setEditId(null);
      load();
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: JSON.stringify(err.response?.data),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("O'chirishni xohlaysizmi?")) return;
    try {
      await categoryApi.delete(id);
      toast({ title: "O'chirildi" });
      load();
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  };

  const openEdit = (cat: Category) => {
    setForm({ name: cat.name, type: cat.type, parent: cat.parent?.toString() || "" });
    setEditId(cat.id);
    setDialogOpen(true);
  };

  const openNew = () => {
    setForm({ name: "", type: "main", parent: "" });
    setEditId(null);
    setDialogOpen(true);
  };

  // ── Attribute management ────────────────────────────────────────────────────

  const openAttrDialog = async (cat: Category) => {
    setSelectedCat(cat);
    setNewAttrName("");
    await loadCatAttributes(cat.id);
    setAttrDialogOpen(true);
  };

  const addAttribute = async () => {
    if (!selectedCat || !newAttrName.trim()) {
      toast({ title: "Atribut nomini kiriting", variant: "destructive" });
      return;
    }
    try {
      // POST /categories/category/{id}/attributes/add/
      // { name: "O'lcham" } — backend get_or_create qiladi
      await categoryApi.addAttribute(selectedCat.id, { name: newAttrName.trim() });
      toast({ title: `"${newAttrName}" qo'shildi ✓` });
      setNewAttrName("");
      await loadCatAttributes(selectedCat.id);
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: JSON.stringify(err.response?.data),
        variant: "destructive",
      });
    }
  };

  const removeAttribute = async (attrId: number, attrName: string) => {
    if (!selectedCat) return;
    try {
      // DELETE /categories/category/{id}/attributes/remove/{attr_id}/
      await categoryApi.removeAttribute(selectedCat.id, attrId);
      toast({ title: `"${attrName}" olib tashlandi` });
      await loadCatAttributes(selectedCat.id);
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const mainCategories = categories.filter(c => c.type === "main");

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Kategoriyalar</h1>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Qo'shish
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap w-12">ID</TableHead>
              <TableHead className="whitespace-nowrap">Nomi</TableHead>
              <TableHead className="whitespace-nowrap">Turi</TableHead>
              <TableHead className="whitespace-nowrap hidden sm:table-cell">Slug</TableHead>
              <TableHead className="whitespace-nowrap hidden md:table-cell">Quyi</TableHead>
              <TableHead className="whitespace-nowrap">Atributlar</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Yuklanmoqda...</TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Kategoriya topilmadi
                </TableCell>
              </TableRow>
            ) : categories.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{c.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {c.type === "sub" && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-medium text-xs md:text-sm">{c.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={c.type === "main" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {c.type === "main" ? "Asosiy" : "Quyi"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs hidden sm:table-cell">
                  {c.slug}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">
                  {c.children?.length ?? 0}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 gap-1"
                    onClick={() => openAttrDialog(c)}
                  >
                    <Tag className="h-3 w-3" />
                    Atributlar
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Category Create/Edit Dialog ──────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Tahrirlash" : "Yangi kategoriya"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nomi</Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Kategoriya nomi"
              />
            </div>
            <div className="space-y-2">
              <Label>Turi</Label>
              <Select
                value={form.type}
                onValueChange={v => setForm({ ...form, type: v, parent: "" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Asosiy</SelectItem>
                  <SelectItem value="sub">Quyi bo'lim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type === "sub" && (
              <div className="space-y-2">
                <Label>Parent kategoriya</Label>
                <Select
                  value={form.parent}
                  onValueChange={v => setForm({ ...form, parent: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                  <SelectContent>
                    {mainCategories.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleSave} className="w-full">
              {editId ? "Saqlash" : "Qo'shish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Attribute Management Dialog ──────────────────────────────────────── */}
      <Dialog open={attrDialogOpen} onOpenChange={setAttrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              {selectedCat?.name} — Atributlar
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add new attribute */}
            <div className="flex gap-2">
              <Input
                value={newAttrName}
                onChange={e => setNewAttrName(e.target.value)}
                placeholder="Masalan: Rang, O'lcham, Material..."
                onKeyDown={e => e.key === "Enter" && addAttribute()}
              />
              <Button onClick={addAttribute} disabled={!newAttrName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Current attributes */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium mb-2">
                Mavjud atributlar ({catAttributes.length})
              </p>

              {attrLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Yuklanmoqda...
                </p>
              ) : catAttributes.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
                  Hali atribut qo'shilmagan.
                  <br />
                  <span className="text-xs">
                    Masalan: Rang, O'lcham, Material...
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {catAttributes.map(attr => (
                    <div
                      key={attr.id}
                      className="flex items-center gap-1.5 bg-secondary rounded-full pl-3 pr-1.5 py-1"
                    >
                      <span className="text-sm">{attr.name}</span>
                      <button
                        onClick={() => removeAttribute(attr.id, attr.name)}
                        className="h-5 w-5 rounded-full hover:bg-destructive/20 flex items-center justify-center transition-colors"
                      >
                        <X className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Bu atributlar seller mahsulot variant qo'shganda xususiyat sifatida ko'rinadi.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCategories;
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHANNELS } from "@/lib/constants";

export function NewKpiButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("NUMBER");
  const [direction, setDirection] = useState("HIGHER_IS_BETTER");
  const [channel, setChannel] = useState<string>("");
  const [target, setTarget] = useState("100");
  const [current, setCurrent] = useState("0");
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/kpis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          unit,
          direction,
          target: Number(target),
          current: Number(current),
          channel: channel || undefined,
        }),
      });
      if (!res.ok) {
        toast.error("No se pudo crear el KPI");
        return;
      }
      toast.success("KPI creado");
      setOpen(false);
      setName("");
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="neon">
          <Plus className="h-4 w-4" /> Nuevo KPI
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo KPI</DialogTitle>
          <DialogDescription>Asigná un objetivo a medir.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kname">Nombre</Label>
            <Input id="kname" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NUMBER">Número</SelectItem>
                  <SelectItem value="PERCENT">Porcentaje</SelectItem>
                  <SelectItem value="CURRENCY">Moneda</SelectItem>
                  <SelectItem value="RATIO">Ratio</SelectItem>
                  <SelectItem value="DURATION">Duración</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGHER_IS_BETTER">↑ mayor es mejor</SelectItem>
                  <SelectItem value="LOWER_IS_BETTER">↓ menor es mejor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Canal (opcional)</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue placeholder="Global (sin canal)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Global</SelectItem>
                {CHANNELS.map((c) => (
                  <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ktarget">Objetivo</Label>
              <Input id="ktarget" type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kcurrent">Valor actual</Label>
              <Input id="kcurrent" type="number" step="0.01" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" type="button">Cancelar</Button>
            </DialogClose>
            <Button type="submit" variant="neon" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crear KPI
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

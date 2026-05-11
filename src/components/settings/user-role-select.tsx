"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Role } from "@/types/db";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function UserRoleSelect({
  id,
  role,
  disabled,
}: {
  id: string;
  role: Role;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState<Role>(role);
  const [, start] = useTransition();

  const change = (next: string) => {
    const nextRole = next as Role;
    setValue(nextRole);
    start(async () => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!res.ok) {
        toast.error("No se pudo actualizar el rol");
        return;
      }
      toast.success("Rol actualizado");
      router.refresh();
    });
  };

  return (
    <Select value={value} onValueChange={change} disabled={disabled}>
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ADMIN">Admin</SelectItem>
        <SelectItem value="MANAGER">Manager</SelectItem>
        <SelectItem value="VIEWER">Viewer</SelectItem>
      </SelectContent>
    </Select>
  );
}

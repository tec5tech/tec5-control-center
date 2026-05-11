"use client";

import { useEffect, useState } from "react";

/**
 * Renderiza una fecha localizada SIN causar hydration mismatch:
 * - En el primer render server-side devuelve un placeholder estable.
 * - Después de montar en el cliente, formatea con el timezone del usuario.
 *
 * Usar en componentes "use client" donde se muestren fechas que dependen
 * del timezone (ej: lastSyncAt, createdAt, updatedAt).
 */
export function RelativeTime({
  iso,
  dateStyle = "short",
  timeStyle,
  fallback = "—",
  className,
}: {
  iso: string | null | undefined;
  dateStyle?: "full" | "long" | "medium" | "short";
  timeStyle?: "full" | "long" | "medium" | "short";
  fallback?: string;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!iso) return <span className={className}>{fallback}</span>;
  if (!mounted) {
    // Placeholder estable que se renderiza igual en server y client.
    return (
      <span className={className} suppressHydrationWarning>
        {iso.slice(0, 10)}
      </span>
    );
  }
  const formatted = new Date(iso).toLocaleString("es-AR", {
    dateStyle,
    ...(timeStyle ? { timeStyle } : {}),
  });
  return (
    <span className={className} suppressHydrationWarning>
      {formatted}
    </span>
  );
}

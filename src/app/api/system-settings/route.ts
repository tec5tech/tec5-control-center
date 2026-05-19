import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const ALLOWED_ROLES = ["ADMIN", "MANAGER"];

const schema = z.object({
  lossRoiThreshold: z.number().positive().optional(),
  lowPerformanceRoiThreshold: z.number().positive().optional(),
  excellentRoiThreshold: z.number().positive().optional(),
  timezone: z.string().min(1).optional(),
  currency: z.string().min(1).optional(),
});

type SystemSettingsRow = {
  id: string;
  lossRoiThreshold: number;
  lowPerformanceRoiThreshold: number;
  excellentRoiThreshold: number;
  timezone: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
};

const DEFAULTS: Omit<SystemSettingsRow, "id" | "createdAt" | "updatedAt"> = {
  lossRoiThreshold: 1.0,
  lowPerformanceRoiThreshold: 2.0,
  excellentRoiThreshold: 3.0,
  timezone: "America/Buenos_Aires",
  currency: "ARS",
};

// Helper: upsert-or-default when the table might not exist yet
async function getOrCreateSettings(): Promise<Omit<SystemSettingsRow, "createdAt" | "updatedAt">> {
  try {
    const db = prisma as unknown as {
      systemSettings: {
        upsert: (args: unknown) => Promise<SystemSettingsRow>;
      };
    };
    const row = await db.systemSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", ...DEFAULTS },
    });
    return row;
  } catch {
    // Table doesn't exist yet — return defaults
    return { id: "default", ...DEFAULTS };
  }
}

export async function GET() {
  const settings = await getOrCreateSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role check — requires ADMIN or MANAGER
  const userRole = (session.user as { role?: string }).role ?? "VIEWER";
  if (!ALLOWED_ROLES.includes(userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const db = prisma as unknown as {
      systemSettings: {
        upsert: (args: unknown) => Promise<SystemSettingsRow>;
      };
    };
    const updated = await db.systemSettings.upsert({
      where: { id: "default" },
      update: parsed.data,
      create: { id: "default", ...DEFAULTS, ...parsed.data },
    });
    return NextResponse.json({ ok: true, settings: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("SystemSettings") ||
      msg.includes("system_settings") ||
      msg.includes("does not exist") ||
      msg.includes("column")
    ) {
      return NextResponse.json(
        { error: "schema_pending", message: "Corré `npm run db:push` para habilitar SystemSettings." },
        { status: 503 },
      );
    }
    throw e;
  }
}

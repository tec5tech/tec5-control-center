import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.alertEvent.updateMany({ where: { read: false }, data: { read: true } });
  return NextResponse.json({ ok: true });
}

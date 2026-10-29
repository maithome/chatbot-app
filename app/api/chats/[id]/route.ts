import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, withDb } from "@/lib/api";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withDb(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const chat = await prisma.chatSession.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!chat) return jsonError("Vestlust ei leitud.", 404);
  return NextResponse.json(chat);
});

// Saves per-session settings: model, system prompt, Temperature, Top-P.
export const PATCH = withDb(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.model === "string") data.model = body.model;
  if (typeof body.temperature === "number") data.temperature = body.temperature;
  if (typeof body.topP === "number") data.topP = body.topP;
  if (typeof body.systemPromptId === "string" || body.systemPromptId === null) data.systemPromptId = body.systemPromptId;
  const chat = await prisma.chatSession.update({ where: { id }, data });
  return NextResponse.json(chat);
});

export const DELETE = withDb(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  await prisma.chatSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withDb } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withDb(async () => {
  const chats = await prisma.chatSession.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });
  return NextResponse.json(chats);
});

export const POST = withDb(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const chat = await prisma.chatSession.create({
    data: {
      model: typeof body.model === "string" ? body.model : undefined,
      temperature: typeof body.temperature === "number" ? body.temperature : undefined,
      topP: typeof body.topP === "number" ? body.topP : undefined,
      systemPromptId: typeof body.systemPromptId === "string" ? body.systemPromptId : null,
    },
  });
  return NextResponse.json(chat, { status: 201 });
});

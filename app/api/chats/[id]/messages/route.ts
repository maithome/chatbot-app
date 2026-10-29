import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, validateMessage, withDb } from "@/lib/api";
import { sendMessage } from "@/lib/mockAi";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withDb(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const invalid = validateMessage(body.content);
  if (invalid) return jsonError(invalid, 400);
  const content = (body.content as string).trim();

  const chat = await prisma.chatSession.findUnique({
    where: { id },
    include: { systemPrompt: true, _count: { select: { messages: true } } },
  });
  if (!chat) return jsonError("Vestlust ei leitud.", 404);

  const userMessage = await prisma.message.create({ data: { sessionId: id, role: "user", content } });
  if (chat._count.messages === 0) {
    await prisma.chatSession.update({ where: { id }, data: { title: content.slice(0, 40) } });
  }

  const answer = await sendMessage(content, chat.model, {
    temperature: chat.temperature,
    topP: chat.topP,
    systemPrompt: chat.systemPrompt?.content,
  });
  const assistantMessage = await prisma.message.create({ data: { sessionId: id, role: "assistant", content: answer } });
  await prisma.chatSession.update({ where: { id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ userMessage, assistantMessage });
});

// "Tühjenda vestlus": removes the messages but keeps the session and its settings.
export const DELETE = withDb(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  await prisma.message.deleteMany({ where: { sessionId: id } });
  await prisma.chatSession.update({ where: { id }, data: { title: "Uus vestlus" } });
  return NextResponse.json({ ok: true });
});

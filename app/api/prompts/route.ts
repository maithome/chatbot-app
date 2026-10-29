import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, withDb } from "@/lib/api";

export const dynamic = "force-dynamic";

function readPrompt(body: { name?: unknown; content?: unknown }) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!name || !content) return null;
  return { name: name.slice(0, 60), content: content.slice(0, 2000) };
}

function isDuplicate(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export const GET = withDb(async () => {
  const prompts = await prisma.systemPrompt.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(prompts);
});

export const POST = withDb(async (req: Request) => {
  const data = readPrompt(await req.json().catch(() => ({})));
  if (!data) return jsonError("Nimi ja sisu on kohustuslikud.", 400);
  try {
    return NextResponse.json(await prisma.systemPrompt.create({ data }), { status: 201 });
  } catch (err) {
    if (isDuplicate(err)) return jsonError("Sellise nimega prompt on juba olemas.", 409);
    throw err;
  }
});

export const PUT = withDb(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const data = readPrompt(body);
  if (typeof body.id !== "string" || !data) return jsonError("Nimi ja sisu on kohustuslikud.", 400);
  try {
    return NextResponse.json(await prisma.systemPrompt.update({ where: { id: body.id }, data }));
  } catch (err) {
    if (isDuplicate(err)) return jsonError("Sellise nimega prompt on juba olemas.", 409);
    throw err;
  }
});

export const DELETE = withDb(async (req: Request) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return jsonError("Prompti id puudub.", 400);
  await prisma.systemPrompt.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});

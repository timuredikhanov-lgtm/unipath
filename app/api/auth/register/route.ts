import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return Response.json({ error: "Email и пароль обязательны" }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ error: "Пароль минимум 6 символов" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "Email уже занят" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { email, password: hashed } });

  return Response.json({ ok: true }, { status: 201 });
}

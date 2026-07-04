import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { token, password } = await req.json().catch(() => ({}));

  if (!token || typeof token !== "string") {
    return Response.json({ error: "Неверная ссылка" }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return Response.json({ error: "Пароль должен быть не короче 6 символов" }, { status: 400 });
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record || record.expiresAt < new Date()) {
    // Удаляем просроченный токен если нашли
    if (record) await prisma.passwordResetToken.delete({ where: { token } });
    return Response.json({ error: "Ссылка недействительна или истекла. Запроси новую." }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);

  // Обновляем пароль и удаляем использованный токен атомарно
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
    prisma.passwordResetToken.delete({ where: { token } }),
  ]);

  return Response.json({ message: "Пароль успешно изменён" });
}

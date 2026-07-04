import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { randomBytes } from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

// Одинаковый ответ независимо от того, найден ли email — защита от перебора
const SAFE_RESPONSE = Response.json(
  { message: "Если этот email зарегистрирован, мы отправили ссылку для сброса пароля." },
  { status: 200 }
);

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  if (!email || typeof email !== "string") {
    return Response.json({ error: "Укажи email" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  // Не раскрываем, найден ли пользователь
  if (!user) return SAFE_RESPONSE;

  // Удаляем старые токены этого пользователя, создаём новый
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 час

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: "UniPath <onboarding@resend.dev>",
    to: user.email,
    subject: "Сброс пароля UniPath",
    html: `
      <p>Привет!</p>
      <p>Ты (или кто-то другой) запросил сброс пароля для аккаунта UniPath.</p>
      <p>
        <a href="${resetUrl}" style="background:#2D6A4F;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
          Сбросить пароль
        </a>
      </p>
      <p>Ссылка действует 1 час. Если ты не запрашивал сброс — просто проигнорируй это письмо.</p>
      <p style="color:#888;font-size:12px;">Или перейди по ссылке: ${resetUrl}</p>
    `,
  });

  return SAFE_RESPONSE;
}

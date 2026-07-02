-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "messagesUsed" INTEGER NOT NULL DEFAULT 0,
    "lastResetDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

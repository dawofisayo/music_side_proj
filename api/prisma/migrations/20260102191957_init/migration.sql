-- CreateTable
CREATE TABLE "Heardle" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "youtubeUrl" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "startTimeSeconds" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "intervals" INTEGER[],
    "question" TEXT NOT NULL,
    "acceptableAnswers" TEXT[],
    "plays" INTEGER NOT NULL DEFAULT 0,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "Heardle_pkey" PRIMARY KEY ("id")
);

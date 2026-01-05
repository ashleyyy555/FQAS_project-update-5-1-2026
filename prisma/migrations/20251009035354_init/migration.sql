-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuttingOperation" (
    "id" TEXT NOT NULL,
    "operationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "StationID" INTEGER NOT NULL,
    "quantityForIH" INTEGER NOT NULL,
    "quantityForS" INTEGER NOT NULL,
    "quantityForOS" INTEGER NOT NULL,
    "quantityForB" INTEGER NOT NULL,

    CONSTRAINT "CuttingOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SewingOperation" (
    "id" TEXT NOT NULL,
    "operationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operationType" TEXT NOT NULL,
    "quantityForC1" INTEGER NOT NULL,
    "quantityForC2" INTEGER NOT NULL,
    "quantityForC3" INTEGER NOT NULL,
    "quantityForC4" INTEGER NOT NULL,
    "quantityForC5" INTEGER NOT NULL,
    "quantityForC6" INTEGER NOT NULL,
    "quantityForC7" INTEGER NOT NULL,
    "quantityForC8" INTEGER NOT NULL,
    "quantityForC9" INTEGER NOT NULL,
    "quantityForC10" INTEGER NOT NULL,
    "quantityForC11" INTEGER NOT NULL,
    "quantityForC12" INTEGER NOT NULL,
    "quantityForS1" INTEGER NOT NULL,
    "quantityForS2" INTEGER NOT NULL,
    "quantityForS3" INTEGER NOT NULL,
    "quantityForS4" INTEGER NOT NULL,
    "quantityForS5" INTEGER NOT NULL,
    "quantityForS6" INTEGER NOT NULL,
    "quantityForS7" INTEGER NOT NULL,
    "quantityForS8" INTEGER NOT NULL,
    "quantityForS9" INTEGER NOT NULL,
    "quantityForS10" INTEGER NOT NULL,
    "quantityForS11" INTEGER NOT NULL,
    "quantityForS12" INTEGER NOT NULL,
    "quantityForS13" INTEGER NOT NULL,
    "quantityForS14" INTEGER NOT NULL,
    "quantityForS15" INTEGER NOT NULL,
    "quantityForS16" INTEGER NOT NULL,
    "quantityForS17" INTEGER NOT NULL,
    "quantityForS18" INTEGER NOT NULL,
    "quantityForS19" INTEGER NOT NULL,
    "quantityForS20" INTEGER NOT NULL,
    "quantityForS21" INTEGER NOT NULL,
    "quantityForS22" INTEGER NOT NULL,
    "quantityForS23" INTEGER NOT NULL,
    "quantityForS24" INTEGER NOT NULL,
    "quantityForST1" INTEGER NOT NULL,
    "quantityForST2" INTEGER NOT NULL,

    CONSTRAINT "SewingOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionOperation" (
    "id" TEXT NOT NULL,
    "operationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "StationID" INTEGER NOT NULL,
    "quantityForIH" INTEGER NOT NULL,
    "quantityForS" INTEGER NOT NULL,
    "quantityForOS" INTEGER NOT NULL,
    "quantityForB" INTEGER NOT NULL,

    CONSTRAINT "InspectionOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingOperation" (
    "id" TEXT NOT NULL,
    "operationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "StationID" INTEGER NOT NULL,
    "quantityForInHouse" INTEGER NOT NULL,
    "quantityForSemi" INTEGER NOT NULL,
    "quantityForCompleteWt" INTEGER NOT NULL,
    "quantityForCompleteWO" INTEGER NOT NULL,

    CONSTRAINT "PackingOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

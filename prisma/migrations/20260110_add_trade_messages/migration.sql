-- CreateTable
CREATE TABLE "TradeMessage" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TradeMessage_tradeId_createdAt_idx" ON "TradeMessage"("tradeId", "createdAt");

-- CreateIndex
CREATE INDEX "TradeMessage_userId_idx" ON "TradeMessage"("userId");

-- AddForeignKey
ALTER TABLE "TradeMessage" ADD CONSTRAINT "TradeMessage_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeMessage" ADD CONSTRAINT "TradeMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

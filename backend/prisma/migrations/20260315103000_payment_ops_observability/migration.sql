-- AlterTable
ALTER TABLE `WebhookInbox`
    MODIFY `orderId` VARCHAR(191) NULL,
    ADD COLUMN `provider` VARCHAR(191) NOT NULL DEFAULT 'midtrans',
    ADD COLUMN `eventType` VARCHAR(191) NULL,
    ADD COLUMN `transactionId` VARCHAR(191) NULL,
    ADD COLUMN `sourceIp` VARCHAR(191) NULL,
    ADD COLUMN `userAgent` VARCHAR(191) NULL,
    ADD COLUMN `statusBeforeProcess` VARCHAR(191) NULL,
    ADD COLUMN `nextStatus` VARCHAR(191) NULL,
    ADD COLUMN `processingStatus` ENUM('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED', 'INVALID') NOT NULL DEFAULT 'RECEIVED',
    ADD COLUMN `processAttempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `duplicateCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `lastDuplicateAt` DATETIME(3) NULL,
    ADD COLUMN `lastError` VARCHAR(191) NULL,
    ADD COLUMN `lastProcessedBy` VARCHAR(191) NULL,
    ADD COLUMN `requestLatencyMs` INTEGER NULL,
    ADD COLUMN `processingLatencyMs` INTEGER NULL,
    ADD COLUMN `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

UPDATE `WebhookInbox`
SET `receivedAt` = `createdAt`,
    `processingStatus` = CASE
        WHEN `processedAt` IS NOT NULL THEN 'PROCESSED'
        ELSE 'RECEIVED'
    END;

-- CreateTable
CREATE TABLE `PaymentOpsAlert` (
    `id` VARCHAR(191) NOT NULL,
    `alertKey` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `severity` ENUM('INFO', 'WARNING', 'CRITICAL') NOT NULL,
    `status` ENUM('OPEN', 'ACKNOWLEDGED', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `webhookInboxId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `hitCount` INTEGER NOT NULL DEFAULT 1,
    `firstTriggeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastTriggeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `acknowledgedAt` DATETIME(3) NULL,
    `acknowledgedBy` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PaymentOpsAlert_alertKey_key`(`alertKey`),
    INDEX `PaymentOpsAlert_status_severity_lastTriggeredAt_idx`(`status`, `severity`, `lastTriggeredAt`),
    INDEX `PaymentOpsAlert_type_lastTriggeredAt_idx`(`type`, `lastTriggeredAt`),
    INDEX `PaymentOpsAlert_orderId_lastTriggeredAt_idx`(`orderId`, `lastTriggeredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `WebhookInbox_processingStatus_receivedAt_idx` ON `WebhookInbox`(`processingStatus`, `receivedAt`);

-- CreateIndex
CREATE INDEX `WebhookInbox_provider_receivedAt_idx` ON `WebhookInbox`(`provider`, `receivedAt`);

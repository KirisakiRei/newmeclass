-- AlterTable
ALTER TABLE `Disbursement`
    MODIFY `status` ENUM('PENDING', 'PROCESSING', 'APPROVED', 'REJECTED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `provider` VARCHAR(191) NOT NULL DEFAULT 'manual',
    ADD COLUMN `providerReferenceId` VARCHAR(191) NULL,
    ADD COLUMN `providerStatus` VARCHAR(191) NULL,
    ADD COLUMN `providerPayload` JSON NULL,
    ADD COLUMN `failureReason` VARCHAR(191) NULL,
    ADD COLUMN `bankName` VARCHAR(191) NULL,
    ADD COLUMN `bankAccount` VARCHAR(191) NULL,
    ADD COLUMN `accountName` VARCHAR(191) NULL,
    ADD COLUMN `submittedAt` DATETIME(3) NULL,
    ADD COLUMN `completedAt` DATETIME(3) NULL;

-- Backfill rekening snapshot from legacy notes payload when available
UPDATE `Disbursement`
SET
    `bankName` = COALESCE(`bankName`, JSON_UNQUOTE(JSON_EXTRACT(`notes`, '$.bankName'))),
    `bankAccount` = COALESCE(`bankAccount`, JSON_UNQUOTE(JSON_EXTRACT(`notes`, '$.bankAccount'))),
    `accountName` = COALESCE(`accountName`, JSON_UNQUOTE(JSON_EXTRACT(`notes`, '$.accountName')))
WHERE `notes` IS NOT NULL
  AND JSON_VALID(`notes`);

-- CreateIndex
CREATE INDEX `Disbursement_provider_providerStatus_createdAt_idx`
ON `Disbursement`(`provider`, `providerStatus`, `createdAt`);

-- CreateTable
CREATE TABLE `AuthBridgeTicket` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `sourceSessionId` VARCHAR(191) NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `targetPath` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `consumedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AuthBridgeTicket_tokenHash_key`(`tokenHash`),
    INDEX `AuthBridgeTicket_userId_expiresAt_idx`(`userId`, `expiresAt`),
    INDEX `AuthBridgeTicket_sourceSessionId_expiresAt_idx`(`sourceSessionId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AuthBridgeTicket`
    ADD CONSTRAINT `AuthBridgeTicket_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

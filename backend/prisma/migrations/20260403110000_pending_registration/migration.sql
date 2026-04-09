-- CreateTable
CREATE TABLE `PendingRegistration` (
    `id` VARCHAR(191) NOT NULL,
    `role` ENUM('USER', 'ADMIN', 'SUPERADMIN', 'OPERATOR', 'DEVELOPER', 'YAYASAN', 'MITRA') NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `referralContext` JSON NULL,
    `payload` JSON NULL,
    `registrationTokenHash` VARCHAR(191) NOT NULL,
    `otpHash` VARCHAR(191) NOT NULL,
    `otpExpiresAt` DATETIME(3) NOT NULL,
    `resendAvailableAt` DATETIME(3) NOT NULL,
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `verifiedAt` DATETIME(3) NULL,
    `consumedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PendingRegistration_registrationTokenHash_key`(`registrationTokenHash`),
    INDEX `PendingRegistration_email_role_expiresAt_idx`(`email`, `role`, `expiresAt`),
    INDEX `PendingRegistration_role_consumedAt_expiresAt_idx`(`role`, `consumedAt`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

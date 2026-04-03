-- Make password optional for Google-based accounts and store provider metadata on users.
ALTER TABLE `User`
    MODIFY `passwordHash` VARCHAR(191) NULL,
    ADD COLUMN `primaryAuthProvider` ENUM('LOCAL', 'GOOGLE') NOT NULL DEFAULT 'LOCAL' AFTER `role`,
    ADD COLUMN `avatarUrl` VARCHAR(191) NULL AFTER `primaryAuthProvider`,
    ADD COLUMN `onboardingCompletedAt` DATETIME(3) NULL AFTER `avatarUrl`;

CREATE INDEX `User_primaryAuthProvider_role_idx` ON `User`(`primaryAuthProvider`, `role`);

-- Expand sessions for cookie audiences and rolling refresh handling.
ALTER TABLE `AuthSession`
    ADD COLUMN `audience` ENUM('USER', 'ADMIN', 'YAYASAN', 'MITRA') NULL AFTER `userId`,
    ADD COLUMN `lastActivityAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) AFTER `userAgent`,
    ADD COLUMN `absoluteExpiresAt` DATETIME(3) NULL AFTER `lastActivityAt`;

UPDATE `AuthSession`
SET `audience` = 'USER',
    `absoluteExpiresAt` = `expiresAt`
WHERE `audience` IS NULL
   OR `absoluteExpiresAt` IS NULL;

ALTER TABLE `AuthSession`
    MODIFY `audience` ENUM('USER', 'ADMIN', 'YAYASAN', 'MITRA') NOT NULL,
    MODIFY `absoluteExpiresAt` DATETIME(3) NOT NULL;

CREATE INDEX `AuthSession_userId_audience_expiresAt_idx` ON `AuthSession`(`userId`, `audience`, `expiresAt`);
CREATE INDEX `AuthSession_audience_expiresAt_idx` ON `AuthSession`(`audience`, `expiresAt`);

-- Store third-party identities separately from the core user record.
CREATE TABLE `AuthIdentity` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `provider` ENUM('LOCAL', 'GOOGLE') NOT NULL,
    `providerUserId` VARCHAR(191) NOT NULL,
    `providerEmail` VARCHAR(191) NULL,
    `providerEmailVerified` BOOLEAN NOT NULL DEFAULT false,
    `avatarUrl` VARCHAR(191) NULL,
    `rawProfile` JSON NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AuthIdentity_provider_providerUserId_key`(`provider`, `providerUserId`),
    INDEX `AuthIdentity_userId_provider_idx`(`userId`, `provider`),
    INDEX `AuthIdentity_providerEmail_provider_idx`(`providerEmail`, `provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AuthIdentity`
    ADD CONSTRAINT `AuthIdentity_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

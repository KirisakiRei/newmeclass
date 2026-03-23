-- Mitra invite-only onboarding, capacity governance, and explicit yayasan ownership.

ALTER TABLE `YayasanProfile`
  ADD COLUMN `managedByMitraId` VARCHAR(191) NULL,
  ADD INDEX `YayasanProfile_managedByMitraId_createdAt_idx`(`managedByMitraId`, `createdAt`);

ALTER TABLE `MitraProfile`
  ADD COLUMN `capacityLimit` INTEGER NOT NULL DEFAULT 35,
  ADD COLUMN `capacityUsed` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `capacityUpdatedAt` DATETIME(3) NULL;

CREATE TABLE `MitraInvite` (
  `id` VARCHAR(191) NOT NULL,
  `mitraProfileId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING', 'CLAIMED', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
  `expiresAt` DATETIME(3) NOT NULL,
  `sentAt` DATETIME(3) NULL,
  `claimedAt` DATETIME(3) NULL,
  `revokedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `MitraInvite_tokenHash_key`(`tokenHash`),
  INDEX `MitraInvite_userId_status_idx`(`userId`, `status`),
  INDEX `MitraInvite_mitraProfileId_status_idx`(`mitraProfileId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MitraCapacityChangeLog` (
  `id` VARCHAR(191) NOT NULL,
  `mitraProfileId` VARCHAR(191) NOT NULL,
  `mitraUserId` VARCHAR(191) NOT NULL,
  `changedByAdminId` VARCHAR(191) NULL,
  `previousLimit` INTEGER NOT NULL,
  `newLimit` INTEGER NOT NULL,
  `note` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `MitraCapacityChangeLog_mitraProfileId_createdAt_idx`(`mitraProfileId`, `createdAt`),
  INDEX `MitraCapacityChangeLog_mitraUserId_createdAt_idx`(`mitraUserId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `YayasanProfile`
  ADD CONSTRAINT `YayasanProfile_managedByMitraId_fkey`
  FOREIGN KEY (`managedByMitraId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MitraInvite`
  ADD CONSTRAINT `MitraInvite_mitraProfileId_fkey`
  FOREIGN KEY (`mitraProfileId`) REFERENCES `MitraProfile`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `MitraInvite_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MitraCapacityChangeLog`
  ADD CONSTRAINT `MitraCapacityChangeLog_mitraProfileId_fkey`
  FOREIGN KEY (`mitraProfileId`) REFERENCES `MitraProfile`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `MitraCapacityChangeLog_mitraUserId_fkey`
  FOREIGN KEY (`mitraUserId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `MitraCapacityChangeLog_changedByAdminId_fkey`
  FOREIGN KEY (`changedByAdminId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE `User`
SET `status` = 'ACTIVE'
WHERE `role` = 'MITRA' AND `status` = 'PENDING_VERIFICATION';

UPDATE `MitraProfile`
SET `isVerified` = 1,
    `isActive` = 1,
    `capacityLimit` = COALESCE(`capacityLimit`, 35),
    `capacityUpdatedAt` = COALESCE(`capacityUpdatedAt`, CURRENT_TIMESTAMP(3));

UPDATE `YayasanProfile` yp
INNER JOIN `User` y ON y.`id` = yp.`userId`
INNER JOIN `User` m ON m.`role` = 'MITRA'
LEFT JOIN `MitraProfile` mp ON mp.`userId` = m.`id`
SET yp.`managedByMitraId` = m.`id`
WHERE yp.`managedByMitraId` IS NULL
  AND y.`referredByCode` IS NOT NULL
  AND (
    y.`referredByCode` = m.`myReferralCode`
    OR y.`referredByCode` = mp.`inviteCode`
  );

UPDATE `MitraProfile` mp
LEFT JOIN (
  SELECT yp.`managedByMitraId` AS `mitraUserId`, COUNT(*) AS `usedCount`
  FROM `YayasanProfile` yp
  WHERE yp.`managedByMitraId` IS NOT NULL
  GROUP BY yp.`managedByMitraId`
) usage_counts ON usage_counts.`mitraUserId` = mp.`userId`
SET mp.`capacityUsed` = COALESCE(usage_counts.`usedCount`, 0),
    mp.`capacityUpdatedAt` = CURRENT_TIMESTAMP(3);

-- Align legacy landing content tables with the current Prisma schema

ALTER TABLE `Article`
    ADD COLUMN `excerpt` VARCHAR(191) NULL AFTER `summary`,
    ADD COLUMN `category` VARCHAR(191) NULL AFTER `excerpt`,
    ADD COLUMN `tags` JSON NULL AFTER `category`,
    ADD COLUMN `featuredImage` VARCHAR(191) NULL AFTER `imageUrl`,
    ADD COLUMN `isPublished` BOOLEAN NOT NULL DEFAULT true AFTER `featuredImage`,
    ADD COLUMN `viewCount` INTEGER NOT NULL DEFAULT 0 AFTER `isPublished`;

ALTER TABLE `Article`
    MODIFY `content` LONGTEXT NOT NULL;

UPDATE `Article`
SET
    `excerpt` = COALESCE(`excerpt`, `summary`),
    `featuredImage` = COALESCE(`featuredImage`, `imageUrl`),
    `isPublished` = CASE
        WHEN `status` = 'PUBLISHED' THEN true
        ELSE false
    END;

ALTER TABLE `Banner`
    ADD COLUMN `description` VARCHAR(191) NULL AFTER `title`,
    ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'slider' AFTER `imageUrl`,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true AFTER `linkUrl`,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) AFTER `createdAt`;

UPDATE `Banner`
SET
    `isActive` = CASE
        WHEN `status` = 'PUBLISHED' THEN true
        ELSE false
    END,
    `updatedAt` = `createdAt`;

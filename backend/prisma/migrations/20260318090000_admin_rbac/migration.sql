-- AlterTable
ALTER TABLE `User`
    ADD COLUMN `username` VARCHAR(191) NULL,
    ADD COLUMN `adminRoleId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `AdminRole` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isProtected` BOOLEAN NOT NULL DEFAULT false,
    `isSystem` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdminRole_name_key`(`name`),
    UNIQUE INDEX `AdminRole_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminPermission` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `groupKey` VARCHAR(191) NOT NULL,
    `groupLabel` VARCHAR(191) NOT NULL,
    `groupOrder` INTEGER NOT NULL DEFAULT 0,
    `pageKey` VARCHAR(191) NOT NULL,
    `pageLabel` VARCHAR(191) NOT NULL,
    `pageOrder` INTEGER NOT NULL DEFAULT 0,
    `actionKey` VARCHAR(191) NOT NULL,
    `actionLabel` VARCHAR(191) NOT NULL,
    `actionOrder` INTEGER NOT NULL DEFAULT 0,
    `isSystem` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdminPermission_key_key`(`key`),
    INDEX `AdminPermission_groupKey_groupOrder_pageOrder_actionOrder_idx`(`groupKey`, `groupOrder`, `pageOrder`, `actionOrder`),
    INDEX `AdminPermission_pageKey_actionKey_idx`(`pageKey`, `actionKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminRolePermission` (
    `id` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AdminRolePermission_roleId_permissionId_key`(`roleId`, `permissionId`),
    INDEX `AdminRolePermission_permissionId_idx`(`permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `User_username_key` ON `User`(`username`);

-- CreateIndex
CREATE INDEX `User_adminRoleId_idx` ON `User`(`adminRoleId`);

-- CreateIndex
CREATE INDEX `User_username_role_idx` ON `User`(`username`, `role`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_adminRoleId_fkey` FOREIGN KEY (`adminRoleId`) REFERENCES `AdminRole`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminRolePermission` ADD CONSTRAINT `AdminRolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `AdminRole`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminRolePermission` ADD CONSTRAINT `AdminRolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `AdminPermission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

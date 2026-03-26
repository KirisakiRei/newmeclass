-- Align MySQL enum with the current Prisma Role enum used by seed/admin RBAC.
ALTER TABLE `User`
    MODIFY `role` ENUM('USER', 'ADMIN', 'SUPERADMIN', 'OPERATOR', 'DEVELOPER', 'YAYASAN', 'MITRA') NOT NULL DEFAULT 'USER';

import { SetMetadata } from '@nestjs/common';

export const ADMIN_PERMISSION_KEY = 'admin_permission_key';

export const AdminPermission = (...permissions: Array<string | string[]>) =>
  SetMetadata(
    ADMIN_PERMISSION_KEY,
    permissions.flat().filter((permission): permission is string => Boolean(permission)),
  );

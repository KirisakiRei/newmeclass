import { SetMetadata } from '@nestjs/common';
import { AuthAudience } from '@prisma/client';

export const AUTH_AUDIENCE_KEY = 'authAudience';

export const AuthAudienceAccess = (audience: AuthAudience | AuthAudience[]) => SetMetadata(AUTH_AUDIENCE_KEY, audience);

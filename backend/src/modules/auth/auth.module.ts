import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminRbacModule } from '../admin-rbac/admin-rbac.module';
import { MailModule } from '../mail/mail.module';
import { AuthController, AdminAuthController, YayasanAuthController, MitraAuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Global()
@Module({
  imports: [
    PrismaModule,
    AdminRbacModule,
    MailModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
    }),
  ],
  controllers: [AuthController, AdminAuthController, YayasanAuthController, MitraAuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtModule, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}

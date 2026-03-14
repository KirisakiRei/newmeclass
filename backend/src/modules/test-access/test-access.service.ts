import { Injectable } from '@nestjs/common';
import { AccessType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TestAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async check(userId: string) {
    const freeTaken = await this.prisma.testAccess.findFirst({ where: { userId, accessType: AccessType.FREE } });
    const paidAccess = await this.prisma.paymentOrder.findFirst({
      where: {
        userId,
        paymentType: 'TEST_PAYMENT',
        status: { in: ['SETTLEMENT', 'CAPTURE', 'SUCCESS'] },
      },
    });

    const hasTakenFreeTest = !!freeTaken;
    const canTakeFreeTest = !hasTakenFreeTest;
    const canTakePaidTest = !!paidAccess;

    return {
      hasTakenFreeTest,
      canTakeFreeTest,
      canTakePaidTest,
      message: canTakeFreeTest
        ? 'Anda masih memiliki akses test gratis.'
        : canTakePaidTest
        ? 'Akses premium aktif.'
        : 'Test gratis sudah digunakan. Silakan upgrade premium.',
      hasAccess: canTakeFreeTest || canTakePaidTest,
      remainingFreeTests: canTakeFreeTest ? 1 : 0,
      testedCategories: freeTaken ? [freeTaken.category] : [],
    };
  }

  async recordFreeTest(userId: string, category: string) {
    await this.prisma.testAccess.upsert({
      where: {
        userId_category_accessType: {
          userId,
          category,
          accessType: AccessType.FREE,
        },
      },
      create: { userId, category, accessType: AccessType.FREE, source: 'frontend' },
      update: {},
    });

    return { message: 'Free test recorded' };
  }
}

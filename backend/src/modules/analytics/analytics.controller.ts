import { Controller, Delete, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('pageview')
  trackPageview(@Query('page') page: string, @Query('sessionId') sessionId?: string) {
    return this.prisma.pageView.create({ data: { page: page || '/', sessionId: sessionId || `sess-${Date.now()}` } });
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('analytics.view')
  async stats() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalViews, viewsToday, viewsThisWeek, viewsThisMonth, uniqueVisitors, onlineUsers, topPagesRaw, lastSevenDays] = await Promise.all([
      this.prisma.pageView.count(),
      this.prisma.pageView.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.pageView.count({ where: { createdAt: { gte: startOfWeek } } }),
      this.prisma.pageView.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.pageView.groupBy({
        by: ['sessionId'],
        _count: { sessionId: true },
      }).then((rows) => rows.length),
      this.prisma.onlineSession.count({ where: { lastSeenAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } } }),
      this.prisma.pageView.groupBy({
        by: ['page'],
        _count: { page: true },
        orderBy: { _count: { page: 'desc' } },
        take: 10,
      }),
      this.prisma.pageView.findMany({
        where: { createdAt: { gte: startOfWeek } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const dailyViewsMap = new Map<string, number>();
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const key = date.toISOString().slice(0, 10);
      dailyViewsMap.set(key, 0);
    }

    for (const item of lastSevenDays) {
      const key = item.createdAt.toISOString().slice(0, 10);
      dailyViewsMap.set(key, (dailyViewsMap.get(key) || 0) + 1);
    }

    return {
      totalViews,
      totalPageviews: totalViews,
      viewsToday,
      viewsThisWeek,
      viewsThisMonth,
      uniqueVisitors,
      onlineUsers,
      dailyViews: Array.from(dailyViewsMap.entries()).map(([date, views]) => ({ date, views })),
      topPages: topPagesRaw.map((row) => ({ _id: row.page, count: row._count.page })),
    };
  }

  @Get('online-users')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('analytics.view')
  async onlineUsers() {
    const threshold = new Date(Date.now() - 5 * 60 * 1000);
    const sessions = await this.prisma.onlineSession.findMany({
      where: { lastSeenAt: { gte: threshold } },
      orderBy: { lastSeenAt: 'desc' },
    });
    return {
      count: sessions.length,
      users: sessions.map((session) => ({
        sessionId: session.sessionId,
        currentPage: '-',
        ipAddress: '-',
        lastActivity: session.lastSeenAt,
      })),
    };
  }

  @Delete('cleanup')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('analytics.manage')
  async cleanup() {
    const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await this.prisma.onlineSession.deleteMany({ where: { lastSeenAt: { lt: threshold } } });
    return { message: 'cleanup done' };
  }
}

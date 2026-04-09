import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { buildPaginatedResult, resolvePagination } from 'src/common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import type { ActivityLogQueryDto } from './dto/activity-log-query.dto';

type AdminActivityCategory =
  | 'auth'
  | 'admin_management'
  | 'settings'
  | 'content'
  | 'users'
  | 'yayasan'
  | 'mitra'
  | 'finance'
  | 'approval'
  | 'testing';

type ActivityActor = {
  id: string | null;
  name: string;
  email: string;
  roleLabel: string;
};

type ActivityTarget = {
  type: string;
  id: string | null;
  label: string;
};

type ActivityChange = {
  field: string;
  label: string;
  before: string;
  after: string;
};

type ActivityDetailItem = {
  label: string;
  value: string;
};

type ActivityDetailSection = {
  title: string;
  items: ActivityDetailItem[];
};

type ActivityLogPayload = {
  category?: AdminActivityCategory;
  summary?: string;
  targetLabel?: string;
  result?: string;
  changes?: ActivityChange[];
  meta?: Record<string, unknown>;
  login?: string;
  email?: string;
  username?: string;
  reason?: string;
  [key: string]: unknown;
};

type RecordActivityInput = {
  actorUserId?: string | null;
  action: string;
  category: AdminActivityCategory;
  targetType: string;
  targetId?: string | null;
  targetLabel?: string | null;
  summary?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
  ipAddress?: string | null;
  result?: string | null;
};

type RawAuditLogInput = {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  payload?: Prisma.InputJsonValue;
  ipAddress?: string | null;
};

type AuditRow = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  payload: ActivityLogPayload | null;
  ipAddress: string | null;
  createdAt: Date;
  actorUser: {
    id: string;
    fullName: string | null;
    email: string | null;
    username: string | null;
    role: string;
    adminRole: {
      name: string;
    } | null;
  } | null;
};

const CATEGORY_LABELS: Record<AdminActivityCategory, string> = {
  auth: 'Auth',
  admin_management: 'Manajemen Admin',
  settings: 'Pengaturan',
  content: 'Konten',
  users: 'User',
  yayasan: 'Yayasan',
  mitra: 'Mitra',
  finance: 'Keuangan',
  approval: 'Approval',
  testing: 'Testing',
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  admin_role: 'Role Admin',
  admin_user: 'User Admin',
  auth: 'Auth Admin',
  user: 'User',
  settings: 'Pengaturan',
  running_info: 'Running Text',
  team_management: 'Team Management',
  yayasan: 'Yayasan',
  yayasan_withdrawal: 'Penarikan Yayasan',
  mitra: 'Mitra',
  mitra_invite: 'Undangan Mitra',
  mitra_capacity: 'Kapasitas Mitra',
  mitra_withdrawal: 'Penarikan Mitra',
  price_change_request: 'Permintaan Ubah Harga',
  payment_ops_alert: 'Alert Payment Ops',
  payment_ops_webhook: 'Webhook Payment Ops',
  payment_proof: 'Bukti Pembayaran',
  disbursement: 'Disbursement',
  referral_settings: 'Pengaturan Referral',
  referral_withdrawal: 'Penarikan Referral',
  question: 'Pertanyaan',
  personality_result: 'Hasil Kepribadian',
  certificate_template: 'Template Sertifikat',
  certificate_asset: 'Aset Sertifikat',
  certificate_issue: 'Penerbitan Sertifikat',
  hero_slide: 'Hero Slide',
  homepage_product: 'Produk Homepage',
  testimonial: 'Testimonial',
  activity: 'Kegiatan',
  website_section: 'Section Website',
  website_content: 'Layout Website',
  landing_cms: 'Landing CMS',
  article: 'Artikel',
  media_asset: 'Media',
  shop_product: 'Produk Shop',
  banner: 'Banner',
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Nama',
  fullName: 'Nama Lengkap',
  title: 'Judul',
  description: 'Deskripsi',
  email: 'Email',
  username: 'Username',
  phone: 'No. Telepon',
  whatsapp: 'WhatsApp',
  status: 'Status',
  role: 'Role',
  adminRole: 'Role Admin',
  adminRoleId: 'Role Admin',
  institutionName: 'Nama Institusi',
  isActive: 'Status Aktif',
  isVerified: 'Status Verifikasi',
  approvalStatus: 'Status Approval',
  referralPrice: 'Harga Referral',
  mitraShare: 'Share Mitra',
  order: 'Urutan',
  type: 'Tipe',
  linkUrl: 'Link URL',
  message: 'Pesan',
  enabled: 'Aktif',
  durationSeconds: 'Durasi',
  category: 'Kategori',
  imageUrl: 'Gambar',
  badge: 'Badge',
  ctaText: 'CTA Text',
  ctaLink: 'CTA Link',
  subtitle: 'Subjudul',
  paymentStatus: 'Status Pembayaran',
  freeTestStatus: 'Status Test Gratis',
  paidTestStatus: 'Status Test Premium',
  userType: 'Tipe User',
  address: 'Alamat',
  province: 'Provinsi',
  city: 'Kota',
  district: 'Kecamatan',
  village: 'Kelurahan',
  price: 'Harga',
  amount: 'Nominal',
  note: 'Catatan',
  reason: 'Alasan',
};

const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /cookie/i,
  /hash/i,
  /csrf/i,
];

@Injectable()
export class AdminActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  private isSensitiveField(field: string) {
    return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(field));
  }

  private roleLabel(role?: string | null) {
    const normalized = String(role || '').trim().toUpperCase();
    if (normalized === 'SUPERADMIN') return 'Super Admin';
    if (normalized === 'DEVELOPER') return 'Developer';
    if (normalized === 'OPERATOR') return 'Operator';
    if (normalized === 'ADMIN') return 'Admin';
    return normalized || '-';
  }

  private fieldLabel(field: string) {
    return FIELD_LABELS[field] || field.replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private sanitizeRecord(input?: Record<string, unknown> | null) {
    if (!input || typeof input !== 'object') return null;
    const next: Record<string, unknown> = {};
    Object.entries(input).forEach(([key, value]) => {
      if (value === undefined) return;
      next[key] = this.isSensitiveField(key) ? '[disembunyikan]' : value;
    });
    return next;
  }

  private displayValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '-';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '-';
    if (typeof value === 'string') return value.trim() || '-';
    if (Array.isArray(value)) {
      const primitive = value.every((item) => ['string', 'number', 'boolean'].includes(typeof item));
      return primitive ? (value.map((item) => this.displayValue(item)).join(', ') || '-') : `${value.length} item`;
    }
    if (typeof value === 'object') return 'Data kompleks';
    return String(value);
  }

  private buildChanges(before?: Record<string, unknown> | null, after?: Record<string, unknown> | null): ActivityChange[] {
    const safeBefore = this.sanitizeRecord(before) || {};
    const safeAfter = this.sanitizeRecord(after) || {};
    const keys = Array.from(new Set([...Object.keys(safeBefore), ...Object.keys(safeAfter)]));
    return keys
      .filter((key) => !this.isSensitiveField(key))
      .map((key) => ({
        field: key,
        label: this.fieldLabel(key),
        before: this.displayValue(safeBefore[key]),
        after: this.displayValue(safeAfter[key]),
      }))
      .filter((item) => item.before !== item.after)
      .slice(0, 20);
  }

  private buildActionLabel(action: string) {
    const normalized = String(action || '').trim().toUpperCase();
    const specific: Record<string, string> = {
      ADMIN_LOGIN_SUCCESS: 'Login Admin Berhasil',
      ADMIN_LOGIN_FAILED: 'Login Admin Gagal',
      ADMIN_LOGIN_LOCKED: 'Login Admin Dikunci',
      ADMIN_LOGOUT: 'Logout Admin',
      ADMIN_ROLE_CREATED: 'Role Admin Dibuat',
      ADMIN_ROLE_UPDATED: 'Role Admin Diubah',
      ADMIN_ROLE_DELETED: 'Role Admin Dihapus',
      ADMIN_USER_CREATED: 'User Admin Dibuat',
      ADMIN_USER_UPDATED: 'User Admin Diubah',
      ADMIN_USER_PASSWORD_CHANGED: 'Password Admin Diubah',
      ADMIN_USER_DELETED: 'User Admin Dihapus',
      ADMIN_USER_UPDATED_PROFILE: 'User Diubah',
      ADMIN_USER_STATUS_UPDATED: 'Status User Diubah',
      ADMIN_USER_BANNED: 'User Diblokir',
      ADMIN_USER_UNBANNED: 'User Dibuka Blokir',
      ADMIN_USER_PASSWORD_RESET: 'Password User Direset',
      ADMIN_END_USER_DELETED: 'User Dihapus',
      ADMIN_SETTINGS_UPDATED: 'Pengaturan Diubah',
      ADMIN_SETTINGS_ASSET_UPLOADED: 'Aset Pengaturan Diunggah',
      ADMIN_JENJANG_CONFIG_UPDATED: 'Konfigurasi Jenjang Diubah',
      ADMIN_TEAM_MANAGEMENT_UPDATED: 'Team Management Diubah',
      ADMIN_RUNNING_INFO_CREATED: 'Running Text Dibuat',
      ADMIN_RUNNING_INFO_UPDATED: 'Running Text Diubah',
      ADMIN_RUNNING_INFO_DELETED: 'Running Text Dihapus',
      ADMIN_RUNNING_INFO_SETTINGS_UPDATED: 'Pengaturan Running Text Diubah',
      ADMIN_MITRA_CREATED: 'Mitra Ditambahkan',
      ADMIN_MITRA_UPDATED: 'Mitra Diubah',
      ADMIN_MITRA_VERIFIED: 'Mitra Diverifikasi',
      ADMIN_MITRA_PASSWORD_RESET: 'Password Mitra Direset',
      ADMIN_MITRA_INVITE_RESENT: 'Undangan Mitra Dikirim Ulang',
      ADMIN_MITRA_INVITE_REVOKED: 'Undangan Mitra Dicabut',
      ADMIN_MITRA_CAPACITY_UPDATED: 'Kapasitas Mitra Diubah',
      ADMIN_YAYASAN_VERIFIED: 'Yayasan Diverifikasi',
      ADMIN_YAYASAN_UPDATED: 'Yayasan Diubah',
      ADMIN_PRICE_CHANGE_REVIEWED: 'Permintaan Ubah Harga Direview',
      ADMIN_WITHDRAWAL_REVIEWED: 'Penarikan Direview',
      ADMIN_REFERRAL_SETTINGS_UPDATED: 'Pengaturan Referral Diubah',
      ADMIN_REFERRAL_WITHDRAWAL_REVIEWED: 'Penarikan Referral Direview',
      ADMIN_PAYMENT_PROOF_REVIEWED: 'Bukti Pembayaran Direview',
      ADMIN_PAYMENT_OPS_ALERT_ACKNOWLEDGED: 'Alert Payment Ops Diakui',
      ADMIN_PAYMENT_OPS_WEBHOOK_REPLAYED: 'Webhook Payment Ops Diulang',
      ADMIN_FINANCE_DISBURSEMENT_PROCESSED: 'Disbursement Diproses',
      ADMIN_FINANCE_DEVELOPER_DISBURSEMENT_CREATED: 'Disbursement Developer Dibuat',
      ADMIN_QUESTION_CREATED: 'Pertanyaan Dibuat',
      ADMIN_QUESTION_UPDATED: 'Pertanyaan Diubah',
      ADMIN_QUESTION_DELETED: 'Pertanyaan Dihapus',
      ADMIN_QUESTION_REORDERED: 'Urutan Pertanyaan Diubah',
      ADMIN_QUESTION_SEEDED: 'Seed Pertanyaan Dijalankan',
      ADMIN_PERSONALITY_RESULT_UPDATED: 'Hasil Kepribadian Diubah',
      ADMIN_CERTIFICATE_TEMPLATE_UPDATED: 'Template Sertifikat Diubah',
      ADMIN_CERTIFICATE_ASSET_UPLOADED: 'Aset Sertifikat Diunggah',
      ADMIN_CERTIFICATE_ISSUED: 'Sertifikat Diterbitkan',
      ADMIN_HERO_SLIDE_CREATED: 'Hero Slide Dibuat',
      ADMIN_HERO_SLIDE_UPDATED: 'Hero Slide Diubah',
      ADMIN_HERO_SLIDE_DELETED: 'Hero Slide Dihapus',
      ADMIN_HOMEPAGE_PRODUCT_CREATED: 'Produk Homepage Dibuat',
      ADMIN_HOMEPAGE_PRODUCT_UPDATED: 'Produk Homepage Diubah',
      ADMIN_HOMEPAGE_PRODUCT_DELETED: 'Produk Homepage Dihapus',
      ADMIN_TESTIMONIAL_CREATED: 'Testimonial Dibuat',
      ADMIN_TESTIMONIAL_UPDATED: 'Testimonial Diubah',
      ADMIN_TESTIMONIAL_DELETED: 'Testimonial Dihapus',
      ADMIN_ACTIVITY_CREATED: 'Kegiatan Dibuat',
      ADMIN_ACTIVITY_UPDATED: 'Kegiatan Diubah',
      ADMIN_ACTIVITY_DELETED: 'Kegiatan Dihapus',
      ADMIN_WEBSITE_SECTION_UPDATED: 'Section Website Diubah',
      ADMIN_WEBSITE_SECTION_REORDERED: 'Urutan Section Website Diubah',
      ADMIN_WEBSITE_CONTENT_SEEDED: 'Seed Website Content Dijalankan',
      ADMIN_LANDING_CMS_UPDATED: 'Landing CMS Diubah',
      ADMIN_ARTICLE_CREATED: 'Artikel Dibuat',
      ADMIN_ARTICLE_UPDATED: 'Artikel Diubah',
      ADMIN_ARTICLE_DELETED: 'Artikel Dihapus',
      ADMIN_ARTICLE_BULK_UPDATED: 'Artikel Bulk Diubah',
      ADMIN_MEDIA_CREATED: 'Media Dibuat',
      ADMIN_MEDIA_UPDATED: 'Media Diubah',
      ADMIN_MEDIA_SYNCED: 'Media Disinkronkan',
      ADMIN_MEDIA_DELETED: 'Media Dihapus',
      ADMIN_SHOP_PRODUCT_CREATED: 'Produk Shop Dibuat',
      ADMIN_SHOP_PRODUCT_UPDATED: 'Produk Shop Diubah',
      ADMIN_SHOP_PRODUCT_DELETED: 'Produk Shop Dihapus',
      ADMIN_BANNER_CREATED: 'Banner Dibuat',
      ADMIN_BANNER_UPDATED: 'Banner Diubah',
      ADMIN_BANNER_DELETED: 'Banner Dihapus',
      ADMIN_BANNER_REORDERED: 'Urutan Banner Diubah',
    };
    if (specific[normalized]) return specific[normalized];
    return normalized.replace(/^ADMIN_/, '').split('_').filter(Boolean).map((part) => `${part.slice(0, 1)}${part.slice(1).toLowerCase()}`).join(' ') || '-';
  }

  private inferCategory(action: string, payload?: ActivityLogPayload | null, targetType?: string | null): AdminActivityCategory {
    if (payload?.category && CATEGORY_LABELS[payload.category]) {
      return payload.category;
    }
    const normalizedAction = String(action || '').toUpperCase();
    const normalizedTargetType = String(targetType || '').toLowerCase();
    if (normalizedAction.startsWith('ADMIN_LOGIN') || normalizedAction === 'ADMIN_LOGOUT') return 'auth';
    if (normalizedTargetType === 'admin_role' || normalizedTargetType === 'admin_user') return 'admin_management';
    if (['settings', 'running_info', 'team_management'].includes(normalizedTargetType)) return 'settings';
    if (['user'].includes(normalizedTargetType)) return 'users';
    if (['yayasan', 'yayasan_withdrawal'].includes(normalizedTargetType)) return normalizedAction.includes('APPROV') || normalizedAction.includes('REJECT') || normalizedAction.includes('VERIFY') ? 'approval' : 'yayasan';
    if (['mitra', 'mitra_invite', 'mitra_capacity', 'mitra_withdrawal', 'price_change_request'].includes(normalizedTargetType)) {
      return normalizedAction.includes('APPROV') || normalizedAction.includes('REJECT') || normalizedAction.includes('VERIFY') || normalizedAction.includes('REVIEW')
        ? 'approval'
        : 'mitra';
    }
    if (['payment_ops_alert', 'payment_ops_webhook', 'disbursement', 'referral_withdrawal', 'referral_settings'].includes(normalizedTargetType)) {
      return normalizedTargetType === 'referral_settings'
        ? 'settings'
        : normalizedAction.includes('APPROV') || normalizedAction.includes('REJECT') || normalizedAction.includes('REVIEW')
          ? 'approval'
          : 'finance';
    }
    if (['question', 'personality_result', 'certificate_template', 'certificate_asset', 'certificate_issue'].includes(normalizedTargetType)) return 'testing';
    return 'content';
  }

  private targetTypeLabel(type: string) {
    return TARGET_TYPE_LABELS[type] || type.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private extractActor(row: AuditRow): ActivityActor {
    return {
      id: row.actorUser?.id || null,
      name: String(row.actorUser?.fullName || row.actorUser?.username || 'Admin Tidak Dikenal').trim(),
      email: String(row.actorUser?.email || '-').trim(),
      roleLabel: String(row.actorUser?.adminRole?.name || this.roleLabel(row.actorUser?.role || '')).trim(),
    };
  }

  private deriveLegacySummary(row: AuditRow) {
    const payload = row.payload || {};
    const loginIdentifier = this.displayValue(payload.login || payload.email || payload.username);
    if (row.action === 'ADMIN_LOGIN_SUCCESS') return `Login admin berhasil untuk ${loginIdentifier}.`;
    if (row.action === 'ADMIN_LOGIN_FAILED') return `Login admin gagal untuk ${loginIdentifier}.`;
    if (row.action === 'ADMIN_LOGIN_LOCKED') return `Akses login admin dikunci sementara untuk ${loginIdentifier}.`;
    if (row.action === 'ADMIN_LOGOUT') return `Admin logout dari dashboard.`;
    return `${this.buildActionLabel(row.action)} pada ${this.targetTypeLabel(row.targetType)}.`;
  }

  private buildMetaItems(meta?: Record<string, unknown> | null): ActivityDetailItem[] {
    const safeMeta = this.sanitizeRecord(meta);
    if (!safeMeta) return [];
    return Object.entries(safeMeta)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => ({
        label: this.fieldLabel(key),
        value: this.displayValue(value),
      }));
  }

  private formatRow(row: AuditRow) {
    const payload = row.payload || {};
    const category = this.inferCategory(row.action, payload, row.targetType);
    const targetLabel = this.displayValue(payload.targetLabel || row.targetId || this.targetTypeLabel(row.targetType));
    const summary = String(payload.summary || '').trim() || this.deriveLegacySummary(row);
    const changes = Array.isArray(payload.changes) ? payload.changes : [];
    const actor = this.extractActor(row);
    const target: ActivityTarget = {
      type: row.targetType,
      id: row.targetId || null,
      label: targetLabel,
    };
    const detailSections: ActivityDetailSection[] = [
      {
        title: 'Event',
        items: [
          { label: 'Kategori', value: CATEGORY_LABELS[category] || category },
          { label: 'Aktivitas', value: this.buildActionLabel(row.action) },
          { label: 'Result', value: this.displayValue(payload.result || 'success') },
          { label: 'Waktu', value: row.createdAt.toISOString() },
        ],
      },
      {
        title: 'Aktor',
        items: [
          { label: 'Nama', value: actor.name },
          { label: 'Email', value: actor.email },
          { label: 'Role', value: actor.roleLabel },
        ],
      },
      {
        title: 'Target',
        items: [
          { label: 'Tipe', value: this.targetTypeLabel(row.targetType) },
          { label: 'Label', value: target.label },
          { label: 'ID', value: this.displayValue(target.id) },
        ],
      },
    ];
    const metaItems = this.buildMetaItems(payload.meta as Record<string, unknown> | null);
    if (metaItems.length > 0) {
      detailSections.push({ title: 'Metadata', items: metaItems });
    }
    if (row.ipAddress) {
      detailSections.push({ title: 'Koneksi', items: [{ label: 'IP Address', value: row.ipAddress }] });
    }
    return {
      id: row.id,
      createdAt: row.createdAt,
      actor,
      category,
      action: {
        code: row.action,
        label: this.buildActionLabel(row.action),
      },
      target,
      summary,
      changes,
      meta: this.sanitizeRecord((payload.meta as Record<string, unknown>) || {}),
      detailSections,
      ipAddress: row.ipAddress || null,
    };
  }

  private getSelect() {
    return {
      id: true,
      action: true,
      targetType: true,
      targetId: true,
      payload: true,
      ipAddress: true,
      createdAt: true,
      actorUser: {
        select: {
          id: true,
          fullName: true,
          email: true,
          username: true,
          role: true,
          adminRole: {
            select: {
              name: true,
            },
          },
        },
      },
    };
  }

  private getDateRange(query: ActivityLogQueryDto) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (query.dateFrom) {
      const from = new Date(query.dateFrom);
      if (!Number.isNaN(from.getTime())) {
        createdAt.gte = from;
      }
    }
    if (query.dateTo) {
      const to = new Date(query.dateTo);
      if (!Number.isNaN(to.getTime())) {
        createdAt.lte = to;
      }
    }
    return Object.keys(createdAt).length > 0 ? createdAt : undefined;
  }

  private searchMatches(log: ReturnType<AdminActivityLogService['formatRow']>, search: string) {
    const haystack = [
      log.actor.name,
      log.actor.email,
      log.actor.roleLabel,
      log.action.code,
      log.action.label,
      log.target.label,
      log.target.type,
      log.target.id || '',
      log.summary,
    ].join(' ').toLowerCase();
    return haystack.includes(search);
  }

  private buildPayload(input: RecordActivityInput): ActivityLogPayload {
    const sanitizedMeta = this.sanitizeRecord(input.meta) || undefined;
    const sanitizedTargetLabel = String(input.targetLabel || '').trim() || undefined;
    return {
      category: input.category,
      summary: String(input.summary || '').trim() || `${this.buildActionLabel(input.action)} pada ${this.targetTypeLabel(input.targetType)}.`,
      targetLabel: sanitizedTargetLabel,
      result: String(input.result || 'success').trim(),
      changes: this.buildChanges(input.before, input.after),
      meta: sanitizedMeta,
    };
  }

  record(input: RecordActivityInput) {
    const payload = this.buildPayload(input);
    void this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId || null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId || null,
        payload: payload as Prisma.InputJsonValue,
        ipAddress: input.ipAddress || null,
      },
    }).catch(() => {});
  }

  recordRaw(input: RawAuditLogInput) {
    void this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId || null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId || null,
        payload: (input.payload || {}) as Prisma.InputJsonValue,
        ipAddress: input.ipAddress || null,
      },
    }).catch(() => {});
  }

  async list(query: ActivityLogQueryDto) {
    const pagination = resolvePagination(query, { pageSize: 10, maxPageSize: 100 });
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: String(query.action).trim().toUpperCase() } : {}),
      ...(query.actorUserId ? { actorUserId: String(query.actorUserId).trim() } : {}),
      ...(this.getDateRange(query) ? { createdAt: this.getDateRange(query) } : {}),
    };
    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: this.getSelect(),
    });
    const normalizedSearch = String(query.search || '').trim().toLowerCase();
    const items = rows
      .map((row) => this.formatRow(row as AuditRow))
      .filter((row) => !query.category || row.category === query.category)
      .filter((row) => !normalizedSearch || this.searchMatches(row, normalizedSearch));
    const pagedItems = items.slice(pagination.skip, pagination.skip + pagination.take).map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      actor: item.actor,
      category: item.category,
      action: item.action,
      target: item.target,
      summary: item.summary,
    }));
    return buildPaginatedResult(pagedItems, items.length, pagination.page, pagination.pageSize);
  }

  async getDetail(id: string) {
    const row = await this.prisma.auditLog.findUnique({
      where: { id },
      select: this.getSelect(),
    });
    if (!row) {
      throw new NotFoundException('Log aktivitas tidak ditemukan');
    }
    return this.formatRow(row as AuditRow);
  }
}

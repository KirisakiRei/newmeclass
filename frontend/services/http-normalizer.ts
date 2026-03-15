// @ts-nocheck
import axios from "axios";
import type { AxiosInstance, AxiosResponse } from "axios";
import type { ApiEnvelope } from "../types/api";

const NORMALIZER_FLAG = "__newme_normalizer_installed__";
const PUBLISHED_STATUS = new Set(["PUBLISHED", "published", "ACTIVE", "active"]);

const isObject = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const isBinaryPayload = (value: unknown) => {
  if (typeof ArrayBuffer !== "undefined") {
    if (value instanceof ArrayBuffer) return true;
    if (ArrayBuffer.isView(value)) return true;
  }

  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return true;
  }

  return false;
};

const hasOnlyEnvelopeKeys = (value: Record<string, any>) => {
  const keys = Object.keys(value);
  return keys.length === 3 && keys.includes("success") && keys.includes("message") && keys.includes("data");
};

const isStandardEnvelope = (value: unknown): value is ApiEnvelope<unknown> => {
  if (!isObject(value)) return false;
  return typeof value.success === "boolean" && typeof value.message === "string" && hasOnlyEnvelopeKeys(value);
};

const withIdAliases = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withIdAliases);
  if (!isObject(value)) return value;

  const normalized: Record<string, any> = {};
  for (const [key, val] of Object.entries(value)) {
    normalized[key] = withIdAliases(val);
  }

  if (normalized.id && !normalized._id) normalized._id = normalized.id;
  if (normalized.userId && !normalized.user_id) normalized.user_id = normalized.userId;
  return normalized;
};

const normalizeArticle = (item: Record<string, any>) => {
  const next = { ...item };
  if (!next.featuredImage && next.imageUrl) next.featuredImage = next.imageUrl;
  if (!next.excerpt && next.summary) next.excerpt = next.summary;
  if (typeof next.isPublished === "undefined") next.isPublished = PUBLISHED_STATUS.has(next.status);
  return next;
};

const normalizeBanner = (item: Record<string, any>) => {
  const next = { ...item };
  if (typeof next.isActive === "undefined") next.isActive = PUBLISHED_STATUS.has(next.status);
  return next;
};

const normalizePayment = (item: Record<string, any>) => {
  const next = { ...item };
  if (typeof next.paymentAmount === "undefined" && typeof next.amount !== "undefined") next.paymentAmount = next.amount;
  if (!next.paymentMethod && next.method) next.paymentMethod = next.method;
  if (!next.paymentProofUrl && next.fileUrl) next.paymentProofUrl = next.fileUrl;
  if (!next.userName && isObject(next.user) && next.user.fullName) next.userName = next.user.fullName;
  return next;
};

const detectResponseOrigin = (response?: AxiosResponse) => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "";
  if (backendUrl) return backendUrl.replace(/\/+$/, "");

  const responseUrl = response?.request?.responseURL;
  if (typeof responseUrl === "string" && /^https?:\/\//i.test(responseUrl)) {
    try {
      return new URL(responseUrl).origin;
    } catch {
      return "";
    }
  }

  const baseUrl = response?.config?.baseURL;
  if (typeof baseUrl === "string" && /^https?:\/\//i.test(baseUrl)) {
    try {
      return new URL(baseUrl).origin;
    } catch {
      return "";
    }
  }

  return "";
};

const normalizeCertificate = (item: Record<string, any>, response?: AxiosResponse) => {
  const next = { ...item };
  const meta = isObject(next.metadata) ? next.metadata : {};
  const template = isObject(next.template) ? { ...next.template } : null;
  const backendUrl = detectResponseOrigin(response);
  const toAbsoluteUrl = (value: unknown) => {
    if (typeof value !== "string" || !value.startsWith("/uploads/")) return value;
    return backendUrl ? `${backendUrl}${value}` : value;
  };
  if (!next.userName) next.userName = meta.userName || meta.fullName || meta.name || null;
  if (!next.courseName) next.courseName = meta.courseName || meta.programName || meta.course || null;
  if (!next.userEmail) next.userEmail = meta.userEmail || meta.email || null;
  next.backgroundUrl = toAbsoluteUrl(next.backgroundUrl);
  next.logoUrl = toAbsoluteUrl(next.logoUrl);
  next.signatureUrl = toAbsoluteUrl(next.signatureUrl);
  next.backgroundTextureUrl = toAbsoluteUrl(next.backgroundTextureUrl);
  next.brandLogoUrl = toAbsoluteUrl(next.brandLogoUrl);
  next.secondaryLogoUrl = toAbsoluteUrl(next.secondaryLogoUrl);
  next.productionBadgeUrl = toAbsoluteUrl(next.productionBadgeUrl);
  if (template) {
    template.backgroundUrl = toAbsoluteUrl(template.backgroundUrl);
    template.logoUrl = toAbsoluteUrl(template.logoUrl);
    template.signatureUrl = toAbsoluteUrl(template.signatureUrl);
    template.backgroundTextureUrl = toAbsoluteUrl(template.backgroundTextureUrl);
    template.brandLogoUrl = toAbsoluteUrl(template.brandLogoUrl);
    template.secondaryLogoUrl = toAbsoluteUrl(template.secondaryLogoUrl);
    template.productionBadgeUrl = toAbsoluteUrl(template.productionBadgeUrl);
    next.template = template;
  }
  return next;
};

const normalizeByPath = (path: string, payload: unknown, response?: AxiosResponse): unknown => {
  const normalizeCollection = (
    value: unknown,
    mapper: (item: Record<string, any>) => Record<string, any>,
  ) => {
    if (Array.isArray(value)) return value.map((item) => (isObject(item) ? mapper(item) : item));
    if (isObject(value)) return mapper(value);
    return value;
  };

  if (path.includes("/articles")) return normalizeCollection(payload, normalizeArticle);
  if (path.includes("/banners")) return normalizeCollection(payload, normalizeBanner);
  if (path.includes("/payments")) return normalizeCollection(payload, normalizePayment);
  if (path.includes("/certificates")) return normalizeCollection(payload, (item) => normalizeCertificate(item, response));
  return payload;
};

const normalizeResponse = (response: AxiosResponse) => {
  const raw = response.data;
  const path = response.config.url || "";
  const responseType = String(response.config.responseType || "").toLowerCase();

  if (responseType === "blob" || responseType === "arraybuffer" || isBinaryPayload(raw)) {
    return response;
  }

  if (isStandardEnvelope(raw)) {
    const unwrapped = normalizeByPath(path, raw.data, response);
    response.data = withIdAliases(unwrapped);
    return response;
  }

  const normalized = normalizeByPath(path, raw, response);
  response.data = withIdAliases(normalized);
  return response;
};

const toReadableMessage = (value: unknown) => {
  if (Array.isArray(value)) return value.map((item) => String(item)).join(". ");
  if (typeof value === "string") return value;
  return "";
};

const fallbackMessageByStatus = (status: number) => {
  switch (status) {
    case 400:
      return "Permintaan tidak valid. Periksa kembali data yang Anda masukkan.";
    case 401:
      return "Sesi Anda tidak valid atau sudah berakhir. Silakan masuk kembali.";
    case 403:
      return "Anda tidak memiliki akses untuk melakukan tindakan ini.";
    case 404:
      return "Data yang diminta tidak ditemukan.";
    case 409:
      return "Data yang Anda masukkan sudah digunakan. Silakan periksa kembali.";
    case 422:
      return "Data belum lengkap atau formatnya belum sesuai.";
    case 500:
      return "Terjadi gangguan pada server. Silakan coba lagi dalam beberapa saat.";
    default:
      return "Terjadi kesalahan. Silakan coba lagi.";
  }
};

const normalizeError = (error: any) => {
  if (!axios.isAxiosError(error) || !error.response) {
    return Promise.reject(error);
  }

  const status = error.response.status;
  const raw = isObject(error.response.data) ? error.response.data : {};
  const detail = toReadableMessage(raw.detail)
    || toReadableMessage(raw.message)
    || fallbackMessageByStatus(status);

  error.response.data = {
    ...raw,
    statusCode: raw.statusCode || status,
    error: raw.error || raw.code || `HTTP_${status}`,
    detail,
  };
  (error as any).userMessage = detail;

  return Promise.reject(error);
};

const attachNormalizer = (instance: AxiosInstance) => {
  if ((instance as any)[NORMALIZER_FLAG]) return;
  instance.interceptors.response.use((response) => normalizeResponse(response), (error) => normalizeError(error));
  (instance as any)[NORMALIZER_FLAG] = true;
};

export const setupGlobalAxiosNormalizer = () => {
  attachNormalizer(axios);
};

export const setupInstanceAxiosNormalizer = (instance: AxiosInstance) => {
  attachNormalizer(instance);
};


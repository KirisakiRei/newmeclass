// @ts-nocheck
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export type ApiNormalized<T> = T;


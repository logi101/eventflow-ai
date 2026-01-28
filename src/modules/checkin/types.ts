import { z } from 'zod';
import { Checkin, CheckinCreate, CheckinUpdate } from '../schemas/checkin';

// Check-in status types
export const CheckinStatus = {
  PENDING: 'pending',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out',
  ABSENT: 'absent',
} as const;

export type CheckinStatusType = typeof CheckinStatus[keyof typeof CheckinStatus];

// QR Code generation options
export const QRCodeOptions = {
  SIZE: 300,
  MARGIN: 2,
  LEVEL: 'M' as const,
  COLOR: {
    DARK: '#000000',
    LIGHT: '#FFFFFF',
  },
} as const;

// Check-in methods
export const CheckinMethods = {
  QR: 'qr',
  MANUAL: 'manual',
  API: 'api',
  BULK: 'bulk',
} as const;

export type CheckinMethod = typeof CheckinMethods[keyof typeof CheckinMethods];

// Real-time check-in data
export interface RealtimeCheckinData {
  id: string;
  participant_id: string;
  participant_name: string;
  event_id: string;
  event_name: string;
  checkin_time: string;
  checkin_method: CheckinMethod;
  location: string | null;
  status: CheckinStatusType;
  avatar_url: string | null;
}

// Check-in statistics
export interface CheckinStats {
  total_registered: number;
  checked_in: number;
  checked_out: number;
  absent: number;
  pending: number;
  checkin_rate: number;
  checkout_rate: number;
}

// QR Code generation request
export interface QRCodeRequest {
  participant_id: string;
  event_id: string;
  checkin_method: CheckinMethod;
  size?: number;
  data?: Record<string, any>;
}

// Check-in batch operation
export interface CheckinBatchOperation {
  participant_ids: string[];
  event_id: string;
  checkin_method: CheckinMethod;
  location?: string;
  notes?: string;
}

// Check-in history
export interface CheckinHistory {
  checkins: Checkin[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
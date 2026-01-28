import { QRCodeGenerator } from 'qrcode.react';
import { Checkin, QRCodeRequest } from '../types';

export class QRService {
  private static instance: QRService;
  private qrGenerator: typeof QRCodeGenerator;

  private constructor() {
    // Import dynamically to avoid SSR issues
    this.qrGenerator = require('qrcode.react').default;
  }

  public static getInstance(): QRService {
    if (!QRService.instance) {
      QRService.instance = new QRService();
    }
    return QRService.instance;
  }

  /**
   * Generate QR code data URL for participant check-in
   */
  public generateQRCode(request: QRCodeRequest): string {
    const { participant_id, event_id, checkin_method, data } = request;
    
    // Create check-in payload
    const payload = {
      participant_id,
      event_id,
      checkin_method,
      timestamp: new Date().toISOString(),
      ...data,
    };

    // Convert payload to string
    const payloadString = JSON.stringify(payload);

    // Generate QR code
    return this.qrGenerator.generateDataURL(payloadString, {
      size: QRCodeOptions.SIZE,
      margin: QRCodeOptions.MARGIN,
      level: QRCodeOptions.LEVEL,
      color: {
        dark: QRCodeOptions.COLOR.DARK,
        light: QRCodeOptions.COLOR.LIGHT,
      },
    });
  }

  /**
   * Generate QR code for event check-in page
   */
  public generateEventCheckinQR(event_id: string): string {
    const payload = {
      event_id,
      purpose: 'event_checkin',
      timestamp: new Date().toISOString(),
    };

    return this.qrGenerator.generateDataURL(JSON.stringify(payload), {
      size: QRCodeOptions.SIZE,
      margin: QRCodeOptions.MARGIN,
      level: QRCodeOptions.LEVEL,
      color: {
        dark: QRCodeOptions.COLOR.DARK,
        light: QRCodeOptions.COLOR.LIGHT,
      },
    });
  }

  /**
   * Generate QR code for participant badge
   */
  public generateParticipantBadgeQR(participant_id: string, event_id: string): string {
    const payload = {
      participant_id,
      event_id,
      purpose: 'participant_badge',
      timestamp: new Date().toISOString(),
    };

    return this.qrGenerator.generateDataURL(JSON.stringify(payload), {
      size: QRCodeOptions.SIZE,
      margin: QRCodeOptions.MARGIN,
      level: QRCodeOptions.LEVEL,
      color: {
        dark: QRCodeOptions.COLOR.DARK,
        light: QRCodeOptions.COLOR.LIGHT,
      });
  }

  /**
   * Parse QR code data
   */
  public parseQRCodeData(qrData: string): any {
    try {
      return JSON.parse(qrData);
    } catch (error) {
      throw new Error('Invalid QR code data format');
    }
  }

  /**
   * Validate QR code payload
   */
  public validateQRCodePayload(payload: any): boolean {
    return (
      payload &&
      typeof payload === 'object' &&
      'participant_id' in payload &&
      'event_id' in payload &&
      'checkin_method' in payload
    );
  }
}

// Export singleton instance
export const qrService = QRService.getInstance();
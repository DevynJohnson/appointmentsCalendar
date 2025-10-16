// Email service for sending booking confirmations and notifications
import jwt from 'jsonwebtoken';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface BookingDetails {
  id: string;
  customerName: string;
  customerEmail: string;
  providerName: string;
  providerEmail: string;
  scheduledAt: Date;
  duration: number;
  serviceType: string;
  notes?: string;
  location?: string;
}

interface MagicLinkData {
  bookingId: string;
  customerEmail: string;
  action: 'confirm' | 'cancel';
  exp: number;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure your email provider (Gmail, SendGrid, etc.)
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };

    this.transporter = nodemailer.createTransport(config);
  }

  /**
   * Generate a magic link token for booking confirmation
   */
  generateMagicLink(bookingId: string, customerEmail: string, action: 'confirm' | 'cancel'): string {
    const payload: MagicLinkData = {
      bookingId,
      customerEmail,
      action,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    return `${baseUrl}/client/booking/confirm?token=${token}`;
  }

  /**
   * Verify a magic link token
   */
  verifyMagicLink(token: string): MagicLinkData | null {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as MagicLinkData;
      return decoded;
    } catch (error) {
      console.error('Invalid magic link token:', error);
      return null;
    }
  }

  /**
   * Send magic link to customer for booking confirmation
   */
  async sendCustomerMagicLink(booking: BookingDetails): Promise<boolean> {
    try {
      const confirmLink = this.generateMagicLink(booking.id, booking.customerEmail, 'confirm');
      const cancelLink = this.generateMagicLink(booking.id, booking.customerEmail, 'cancel');

      const appointmentDate = booking.scheduledAt.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      const appointmentTime = booking.scheduledAt.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Confirm Your Appointment</h2>
          
          <p>Hello ${booking.customerName},</p>
          
          <p>You have requested an appointment with <strong>${booking.providerName}</strong>.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Appointment Details</h3>
            <p><strong>Date:</strong> ${appointmentDate}</p>
            <p><strong>Time:</strong> ${appointmentTime}</p>
            <p><strong>Duration:</strong> ${booking.duration} minutes</p>
            <p><strong>Service:</strong> ${booking.serviceType}</p>
            ${booking.location ? `<p><strong>Location:</strong> ${booking.location}</p>` : ''}
            ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
          </div>
          
          <div style="margin: 30px 0;">
            <a href="${confirmLink}" 
               style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px; display: inline-block;">
              ✅ Confirm Appointment
            </a>
            
            <a href="${cancelLink}" 
               style="background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              ❌ Cancel Request
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            This link will expire in 24 hours. If you have any questions, please contact ${booking.providerName} directly.
          </p>
        </div>
      `;

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: booking.customerEmail,
        subject: `Confirm Your Appointment with ${booking.providerName}`,
        html: emailHtml,
      });

      return true;
    } catch (error) {
      console.error('Failed to send customer magic link:', error);
      return false;
    }
  }

  /**
   * Send booking notification to provider
   */
  async sendProviderNotification(booking: BookingDetails): Promise<boolean> {
    try {
      const appointmentDate = booking.scheduledAt.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      const appointmentTime = booking.scheduledAt.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Appointment Booking</h2>
          
          <p>Hello ${booking.providerName},</p>
          
          <p>You have a new appointment booking from <strong>${booking.customerName}</strong>.</p>
          
          <div style="background: #f0f9ff; border-left: 4px solid #3B82F6; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1E40AF;">Appointment Details</h3>
            <p><strong>Client:</strong> ${booking.customerName}</p>
            <p><strong>Email:</strong> ${booking.customerEmail}</p>
            <p><strong>Date:</strong> ${appointmentDate}</p>
            <p><strong>Time:</strong> ${appointmentTime}</p>
            <p><strong>Duration:</strong> ${booking.duration} minutes</p>
            <p><strong>Service:</strong> ${booking.serviceType}</p>
            ${booking.location ? `<p><strong>Location:</strong> ${booking.location}</p>` : ''}
            ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
          </div>
          
          <p style="color: #666;">
            The client will receive a confirmation email with a magic link to confirm their appointment. 
            Once confirmed, a calendar event will be automatically created in your default calendar.
          </p>
          
          <p style="color: #666; font-size: 14px;">
            You can manage your appointments from your provider dashboard.
          </p>
        </div>
      `;

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: booking.providerEmail,
        subject: `New Appointment Booking from ${booking.customerName}`,
        html: emailHtml,
      });

      return true;
    } catch (error) {
      console.error('Failed to send provider notification:', error);
      return false;
    }
  }

  /**
   * Send booking confirmation to both customer and provider
   */
  async sendBookingConfirmation(booking: BookingDetails): Promise<boolean> {
    try {
      const appointmentDate = booking.scheduledAt.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      const appointmentTime = booking.scheduledAt.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      // Customer confirmation email
      const customerHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10B981;">✅ Appointment Confirmed!</h2>
          
          <p>Hello ${booking.customerName},</p>
          
          <p>Your appointment with <strong>${booking.providerName}</strong> has been confirmed.</p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Confirmed Appointment</h3>
            <p><strong>Date:</strong> ${appointmentDate}</p>
            <p><strong>Time:</strong> ${appointmentTime}</p>
            <p><strong>Duration:</strong> ${booking.duration} minutes</p>
            <p><strong>Service:</strong> ${booking.serviceType}</p>
            <p><strong>Provider:</strong> ${booking.providerName}</p>
            ${booking.location ? `<p><strong>Location:</strong> ${booking.location}</p>` : ''}
          </div>
          
          <p>We look forward to seeing you at your appointment!</p>
        </div>
      `;

      // Provider confirmation email
      const providerHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10B981;">✅ Appointment Confirmed</h2>
          
          <p>Hello ${booking.providerName},</p>
          
          <p>The appointment with <strong>${booking.customerName}</strong> has been confirmed and added to your calendar.</p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Confirmed Appointment</h3>
            <p><strong>Client:</strong> ${booking.customerName} (${booking.customerEmail})</p>
            <p><strong>Date:</strong> ${appointmentDate}</p>
            <p><strong>Time:</strong> ${appointmentTime}</p>
            <p><strong>Duration:</strong> ${booking.duration} minutes</p>
            <p><strong>Service:</strong> ${booking.serviceType}</p>
            ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
          </div>
          
          <p>The appointment has been automatically added to your default calendar.</p>
        </div>
      `;

      // Send both emails
      await Promise.all([
        this.transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: booking.customerEmail,
          subject: `Appointment Confirmed with ${booking.providerName}`,
          html: customerHtml,
        }),
        this.transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: booking.providerEmail,
          subject: `Appointment Confirmed - ${booking.customerName}`,
          html: providerHtml,
        }),
      ]);

      return true;
    } catch (error) {
      console.error('Failed to send booking confirmations:', error);
      return false;
    }
  }
}
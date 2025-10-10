// Email service using Maileroo for sending booking confirmations and notifications
import jwt from 'jsonwebtoken';

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

export class MailerooEmailService {
  private apiKey: string;
  private apiUrl: string = 'https://api.maileroo.com/v1/send';

  constructor() {
    if (!process.env.MAILEROO_API_KEY) {
      throw new Error('MAILEROO_API_KEY environment variable is required');
    }
    this.apiKey = process.env.MAILEROO_API_KEY;
  }

  /**
   * Send email via Maileroo API
   */
  private async sendEmail(emailData: {
    from: string;
    to: string[];
    subject: string;
    html: string;
  }) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          from: {
            email: emailData.from,
            name: 'Appointments Calendar'
          },
          to: emailData.to.map(email => ({ email })),
          subject: emailData.subject,
          html: emailData.html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Maileroo API error response:', errorText);
        throw new Error(`Maileroo API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return { data: result };
      return { data: result };
    } catch (error) {
      console.error('Maileroo send error:', error);
      throw error;
    }
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

      const result = await this.sendEmail({
        from: process.env.MAILEROO_FROM_EMAIL || 'appointments@yourdomain.com',
        to: [booking.customerEmail],
        subject: `Confirm Your Appointment with ${booking.providerName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #333; margin-bottom: 10px;">📅 Confirm Your Appointment</h1>
              <p style="color: #666; font-size: 16px;">Please confirm your appointment request</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #007bff;">
              <h2 style="margin-top: 0; color: #333; font-size: 18px;">Hello ${booking.customerName}!</h2>
              <p style="color: #666; margin-bottom: 20px;">
                You have requested an appointment with <strong>${booking.providerName}</strong>.
              </p>
            </div>
            
            <div style="background: #fff; border: 2px solid #e9ecef; padding: 25px; border-radius: 10px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #333; font-size: 16px;">📋 Appointment Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Date:</td>
                  <td style="padding: 8px 0; color: #333;">${appointmentDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Time:</td>
                  <td style="padding: 8px 0; color: #333;">${appointmentTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Duration:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.duration} minutes</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Service:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.serviceType}</td>
                </tr>
                ${booking.location ? `
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Location:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.location}</td>
                </tr>
                ` : ''}
                ${booking.notes ? `
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Notes:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.notes}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${confirmLink}" 
                 style="display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 0 10px 10px 0; font-size: 16px;">
                ✅ Confirm Appointment
              </a>
              
              <a href="${cancelLink}" 
                 style="display: inline-block; background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 0 10px 10px 0; font-size: 16px;">
                ❌ Cancel Request
              </a>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                ⏰ <strong>Important:</strong> This confirmation link will expire in 24 hours. 
                If you have any questions, please contact ${booking.providerName} directly.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This email was sent regarding your appointment request. If you did not request this appointment, you can safely ignore this email.
              </p>
            </div>
          </div>
        `,
      });

      console.log('Magic link email sent:', result.data?.id);
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

      const result = await this.sendEmail({
        from: process.env.MAILEROO_FROM_EMAIL || 'appointments@yourdomain.com',
        to: [booking.providerEmail],
        subject: `🔔 New Appointment Request from ${booking.customerName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #333; margin-bottom: 10px;">🔔 New Appointment Request</h1>
              <p style="color: #666; font-size: 16px;">You have a new booking request</p>
            </div>
            
            <div style="background: #e3f2fd; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #2196f3;">
              <h2 style="margin-top: 0; color: #1565c0; font-size: 18px;">Hello ${booking.providerName}!</h2>
              <p style="color: #666; margin-bottom: 20px;">
                You have received a new appointment request from <strong>${booking.customerName}</strong>.
              </p>
            </div>
            
            <div style="background: #fff; border: 2px solid #e9ecef; padding: 25px; border-radius: 10px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #333; font-size: 16px;">👤 Client & Appointment Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Client:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Email:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.customerEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Date:</td>
                  <td style="padding: 8px 0; color: #333;">${appointmentDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Time:</td>
                  <td style="padding: 8px 0; color: #333;">${appointmentTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Duration:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.duration} minutes</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Service:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.serviceType}</td>
                </tr>
                ${booking.location ? `
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Location:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.location}</td>
                </tr>
                ` : ''}
                ${booking.notes ? `
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Notes:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.notes}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h4 style="color: #333; margin-top: 0; font-size: 14px;">📋 Next Steps:</h4>
              <ul style="color: #666; margin: 10px 0; padding-left: 20px; font-size: 14px;">
                <li>The client will receive a confirmation email with a magic link</li>
                <li>Once they confirm, the appointment will be automatically added to your calendar</li>
                <li>You'll receive a final confirmation email when the appointment is confirmed</li>
                <li>You can manage appointments from your provider dashboard</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This is an automated notification from your appointment booking system.
              </p>
            </div>
          </div>
        `,
      });

      console.log('Provider notification sent:', result.data?.id);
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

      // Send customer confirmation
      const customerResult = await this.sendEmail({
        from: process.env.MAILEROO_FROM_EMAIL || 'appointments@yourdomain.com',
        to: [booking.customerEmail],
        subject: `✅ Appointment Confirmed with ${booking.providerName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: #28a745; color: white; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 36px;">
                ✅
              </div>
              <h1 style="color: #28a745; margin-bottom: 10px;">Appointment Confirmed!</h1>
              <p style="color: #666; font-size: 16px;">Your appointment has been successfully booked</p>
            </div>
            
            <div style="background: #d4edda; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #28a745;">
              <h2 style="margin-top: 0; color: #155724; font-size: 18px;">Hello ${booking.customerName}!</h2>
              <p style="color: #155724; margin-bottom: 0;">
                Your appointment with <strong>${booking.providerName}</strong> has been confirmed and added to their calendar.
              </p>
            </div>
            
            <div style="background: #fff; border: 2px solid #28a745; padding: 25px; border-radius: 10px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #333; font-size: 16px;">📋 Confirmed Appointment Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Date:</td>
                  <td style="padding: 8px 0; color: #333;">${appointmentDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Time:</td>
                  <td style="padding: 8px 0; color: #333;">${appointmentTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Duration:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.duration} minutes</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Service:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.serviceType}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Provider:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.providerName}</td>
                </tr>
                ${booking.location ? `
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Location:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.location}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <div style="background: #cce5ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #0066cc; margin: 0; font-size: 14px; text-align: center;">
                🎉 <strong>We look forward to seeing you at your appointment!</strong>
              </p>
            </div>
          </div>
        `,
      });

      // Send provider confirmation
      const providerResult = await this.sendEmail({
        from: process.env.MAILEROO_FROM_EMAIL || 'appointments@yourdomain.com',
        to: [booking.providerEmail],
        subject: `✅ Appointment Confirmed - ${booking.customerName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: #28a745; color: white; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 36px;">
                ✅
              </div>
              <h1 style="color: #28a745; margin-bottom: 10px;">Appointment Confirmed</h1>
              <p style="color: #666; font-size: 16px;">Added to your calendar</p>
            </div>
            
            <div style="background: #d4edda; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #28a745;">
              <h2 style="margin-top: 0; color: #155724; font-size: 18px;">Hello ${booking.providerName}!</h2>
              <p style="color: #155724; margin-bottom: 0;">
                The appointment with <strong>${booking.customerName}</strong> has been confirmed and automatically added to your calendar.
              </p>
            </div>
            
            <div style="background: #fff; border: 2px solid #28a745; padding: 25px; border-radius: 10px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #333; font-size: 16px;">📋 Confirmed Appointment Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Client:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Email:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.customerEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Date:</td>
                  <td style="padding: 8px 0; color: #333;">${appointmentDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Time:</td>
                  <td style="padding: 8px 0; color: #333;">${appointmentTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Duration:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.duration} minutes</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Service:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.serviceType}</td>
                </tr>
                ${booking.notes ? `
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Notes:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.notes}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <div style="background: #cce5ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #0066cc; margin: 0; font-size: 14px; text-align: center;">
                📅 <strong>The appointment has been automatically added to your default calendar.</strong>
              </p>
            </div>
          </div>
        `,
      });

      console.log('Confirmation emails sent:', { customer: customerResult.data?.id, provider: providerResult.data?.id });
      return true;
    } catch (error) {
      console.error('Failed to send booking confirmations:', error);
      return false;
    }
  }

  /**
   * Send password reset email to provider
   */
  async sendPasswordResetEmail(email: string, name: string, resetUrl: string): Promise<boolean> {
    try {
      const result = await this.sendEmail({
        from: process.env.MAILEROO_FROM_EMAIL || 'appointments@yourdomain.com',
        to: [email],
        subject: '🔐 Reset Your Provider Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: #007bff; color: white; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 36px;">
                
              </div>
              <h1 style="color: #333; margin-bottom: 10px;">Reset Your Password</h1>
              <p style="color: #666; font-size: 16px;">We received a request to reset your password</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #007bff;">
              <h2 style="margin-top: 0; color: #333; font-size: 18px;">Hello ${name}!</h2>
              <p style="color: #666; margin-bottom: 20px;">
                Click the button below to reset your password. This link will expire in <strong>1 hour</strong>.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Reset Password
              </a>
            </div>
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>Security Notice:</strong> If you did not request a password reset, please ignore this email. Your password will remain unchanged.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
              <p style="color: #666; font-size: 14px;">
                If the button doesn&apos;t work, copy and paste this link into your browser:
              </p>
              <p style="color: #007bff; font-size: 12px; word-break: break-all;">
                ${resetUrl}
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This email was sent regarding your provider account password reset request.
              </p>
            </div>
          </div>
        `,
      });

      console.log('Password reset email sent:', result.data?.id);
      return true;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  }
}
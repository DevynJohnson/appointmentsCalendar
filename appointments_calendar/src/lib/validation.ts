/**
 * Professional input validation using Zod
 * Zod is the industry standard for TypeScript-first schema validation
 */

import { z } from 'zod';

// Password validation schema with all security requirements
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be no more than 128 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/, 'Password must contain at least one special character')
  .refine((password) => {
    // Check for common weak passwords
    const commonPasswords = [
      'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
      'password1', 'admin', 'letmein', 'welcome', 'monkey', '1234567890'
    ];
    return !commonPasswords.includes(password.toLowerCase());
  }, 'Password is too common and easily guessable');

// Email validation schema
export const emailSchema = z
  .string()
  .email('Please provide a valid email address')
  .max(254, 'Email address is too long')
  .transform(email => email.toLowerCase().trim());

// Phone validation schema
export const phoneSchema = z
  .string()
  .refine((phone) => {
    // Allow empty string (will be handled as optional in schemas)
    if (!phone || phone.trim() === '') return true;
    // Remove all non-digits for validation
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 7 && digitsOnly.length <= 15;
  }, 'Phone number must be between 7-15 digits')
  .refine((phone) => {
    // Allow empty string
    if (!phone || phone.trim() === '') return true;
    // Check for valid characters
    return /^[\d\s\-\(\)\+\.]+$/.test(phone);
  }, 'Phone number contains invalid characters')
  .transform(phone => phone ? phone.replace(/\D/g, '') : ''); // Remove non-digits, return empty string if empty

// Text field validation (for names, company, etc.)
export const textFieldSchema = z
  .string()
  .min(1, 'This field is required')
  .max(255, 'Text is too long')
  .transform(text => text.trim())
  .refine(text => text.length > 0, 'Field cannot be empty after trimming');

// Bio/description validation
export const bioSchema = z
  .string()
  .max(1000, 'Bio must be no more than 1000 characters')
  .optional()
  .transform(bio => bio?.trim() || undefined);

// Provider registration validation schema
export const providerRegistrationSchema = z.object({
  name: textFieldSchema,
  email: emailSchema,
  phone: z.string().transform(val => val.trim() === '' ? undefined : val).pipe(phoneSchema.optional()),
  password: passwordSchema,
  confirmPassword: z.string().optional(), // Validated separately in frontend
  company: textFieldSchema.optional(),
  title: textFieldSchema.optional(),
  bio: bioSchema,
});

// Provider login validation schema
export const providerLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Calendar connection validation schema
export const calendarConnectionSchema = z.object({
  provider: z.enum(['google', 'outlook', 'teams', 'apple']),
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().optional(),
  expiresAt: z.date().optional(),
  calendarId: z.string().optional(),
  calendarName: z.string().optional(),
  isDefaultForBookings: z.boolean().default(false),
  syncEvents: z.boolean().default(true),
  allowBookings: z.boolean().default(true),
});

// Appointment booking validation schema
export const appointmentBookingSchema = z.object({
  clientName: textFieldSchema,
  clientEmail: emailSchema,
  clientPhone: phoneSchema.optional(),
  startTime: z.date(),
  endTime: z.date(),
  title: textFieldSchema,
  description: z.string().max(500, 'Description is too long').optional(),
  location: z.string().max(200, 'Location is too long').optional(),
}).refine(data => data.endTime > data.startTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

/**
 * Validate request body against schema
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; errors: string[] }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      );
      return { success: false, errors };
    }
  } catch {
    return { success: false, errors: ['Invalid JSON format'] };
  }
}

/**
 * Create validation error response
 */
export function createValidationErrorResponse(errors: string[]) {
  return new Response(
    JSON.stringify({
      error: 'Validation failed',
      details: errors
    }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Password strength meter for frontend
 */
export function getPasswordStrength(password: string) {
  const requirements = [
    { test: password.length >= 8, label: 'At least 8 characters' },
    { test: /[A-Z]/.test(password), label: 'One uppercase letter' },
    { test: /[a-z]/.test(password), label: 'One lowercase letter' },
    { test: /[0-9]/.test(password), label: 'One number' },
    { test: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password), label: 'One special character' },
  ];

  const score = requirements.filter(req => req.test).length;
  const percentage = (score / requirements.length) * 100;

  let color = 'bg-red-500';
  let label = 'Weak';
  
  if (percentage >= 80) {
    color = 'bg-green-500';
    label = 'Strong';
  } else if (percentage >= 60) {
    color = 'bg-yellow-500';
    label = 'Medium';
  }

  // Get validation errors
  const validation = passwordSchema.safeParse(password);
  const errors = validation.success ? [] : validation.error.issues.map(issue => issue.message);

  return {
    score,
    percentage,
    color,
    label,
    requirements,
    errors
  };
}

import { z } from 'zod';

// Phone numbers must look like +46701234567 (spaces and dashes are removed first)
export const phone = z
  .string()
  .transform((s) => s.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, 'Phone must look like +46701234567'));
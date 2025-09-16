import { z } from "zod";

// Define the form schema using zod
export const clientFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format").or(z.literal("")),
  phone: z
    .string()
    .regex(/^$|^[0-9+\-() ]{7,}$/, "Invalid phone number format")
    .optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(["lead", "customer", "previous"]),
  notes: z.string().optional(),
});

export // Form schema
const campaignFormSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be less than 100 characters"),
  subject: z
    .string()
    .min(3, "Subject must be at least 3 characters")
    .max(150, "Subject must be less than 150 characters"),
  fromName: z
    .string()
    .min(1, "From name is required"),
  fromEmail: z
    .string()
    .email("Invalid email format"),
  content: z
    .string()
    .min(10, "Content must be at least 10 characters"),
  templateId: z
    .string()
    .optional(),
  audienceType: z
    .enum(["all", "segment", "custom"]),
  segmentId: z
    .string()
    .optional()
    .nullable(),
  recipientIds: z
    .array(z.string())
    .optional()
    .nullable(),
  scheduling: z
    .enum(["send_now", "schedule"]),
  scheduledDate: z
    .date()
    .optional()
    .nullable(),
  trackOpens: z
    .boolean()
    .default(true),
  trackClicks: z
    .boolean()
    .default(true),
});


export const clientSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zipCode: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  status: z.enum(['LEAD', 'CUSTOMER', 'PREVIOUS']).default('LEAD'),
  notes: z.string().nullable().optional(),
  dealershipId: z.string(),
  // clientId: z.string(),
});

export type ClientFormData = z.infer<typeof clientSchema>;


export const vehicleFormSchema = z.object({
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  price: z.coerce.number().min(0),
  vin: z.string().min(1, "VIN is required"),
  stock: z.string().min(1, "Stock number is required"),
  mileage: z.coerce.number().min(0),
  trim: z.string().optional(),
  exteriorColor: z.string().optional(),
  interiorColor: z.string().optional(),
  transmission: z.string().optional(),
  fuelType: z.string().optional(),
  engine: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["available", "sold", "pending", "reserved"]),
  featured: z.boolean(),
  images: z.array(z.object({
    url: z.string().url(),
    isPrimary: z.boolean().optional(),
  })).optional(),
  features: z.string().optional(),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;
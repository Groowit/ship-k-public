import { z } from "zod";

const requiredText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const checkoutProductSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .transform((value) => value.toLowerCase())
  .refine((value) => /^[a-z0-9-]+$/.test(value), "Invalid product slug");

export const checkoutQuantitySchema = z.number().int().min(1).max(9);

export const checkoutShippingAddressSchema = z.object({
  name: requiredText(120),
  email: z
    .string()
    .trim()
    .max(254)
    .email()
    .transform((value) => value.toLowerCase()),
  phone: requiredText(32),
  address1: requiredText(180),
  address2: optionalText(180),
  city: requiredText(120),
  state: requiredText(80),
  postalCode: requiredText(20),
  country: requiredText(80),
  memo: optionalText(500)
});

export const checkoutOrderRequestSchema = z.object({
  productSlug: checkoutProductSlugSchema,
  quantity: checkoutQuantitySchema,
  shippingAddress: checkoutShippingAddressSchema
});

export const checkoutCaptureRequestSchema = checkoutOrderRequestSchema.extend({
  orderID: z.string().trim().min(1).max(128)
});

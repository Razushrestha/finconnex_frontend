import { z } from "zod";

export const loginSchema = z.object({
  rememberMe: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

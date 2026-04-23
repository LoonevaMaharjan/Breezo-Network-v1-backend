import { z } from "zod";

/**
 * SIGNUP VALIDATION
 */
export const signUpSchema = z.object({
    fullName: z
        .string()
        .min(2, "Full name must be at least 2 characters"),

    email: z
        .string()
        .email("Invalid email format"),

    password: z
        .string()
        .min(6, "Password must be at least 6 characters"),

    role: z.enum(["User", "Node", "Admin"]),
});

/**
 * LOGIN VALIDATION
 */
export const loginSchema = z.object({
    email: z.string().email("Invalid email format"),

    password: z.string().min(1, "Password is required"),
});

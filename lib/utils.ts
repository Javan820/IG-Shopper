import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Strip invisible characters (BOM / zero-width spaces) that sneak into
 * copy-pasted env vars. These have code points > 255 and crash HTTP header
 * serialization ("Cannot convert argument to a ByteString").
 */
export function cleanEnv(value: string | undefined): string {
  return (value ?? "").replace(/[\uFEFF\u200B-\u200D\u2060]/g, "").trim()
}

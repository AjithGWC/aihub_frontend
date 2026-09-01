import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge conditional class names, with later Tailwind utilities winning over
 * earlier conflicting ones. Used by every shadcn/ui component.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

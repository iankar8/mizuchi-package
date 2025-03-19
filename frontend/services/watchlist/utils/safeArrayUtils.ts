
/**
 * Utility functions to ensure consistent array handling
 */

/**
 * Ensures the provided value is always an array
 * @param value - The value to ensure is an array
 * @returns An array, either the original if it was already an array, or an empty array
 */
export const ensureArray = <T>(value: T[] | null | undefined): T[] => {
  return Array.isArray(value) ? value : [];
};

/**
 * Safely maps over an array, ensuring the array exists first
 * @param array - The array to map over
 * @param mapFn - The mapping function to apply to each element
 * @returns A new array with the mapping function applied, or an empty array if input was not an array
 */
export const safeMap = <T, R>(
  array: T[] | null | undefined, 
  mapFn: (item: T, index: number) => R
): R[] => {
  return ensureArray(array).map(mapFn);
};

/**
 * Safely filters an array, ensuring the array exists first
 * @param array - The array to filter
 * @param filterFn - The filter function to apply
 * @returns A filtered array, or an empty array if input was not an array
 */
export const safeFilter = <T>(
  array: T[] | null | undefined, 
  filterFn: (item: T, index: number) => boolean
): T[] => {
  return ensureArray(array).filter(filterFn);
};

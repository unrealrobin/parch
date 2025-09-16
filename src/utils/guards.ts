/**
 * Runtime guards and validation utilities to prevent common issues
 */

// Type guards
export const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

export const isFunction = (value: unknown): value is Function => {
  return typeof value === 'function';
};

export const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

// File content validation
export interface FileContentLike {
  id: string;
  name: string;
  content: string;
  path?: string;
}

export const isValidFileContent = (value: unknown): value is FileContentLike => {
  if (!isObject(value)) return false;
  
  const obj = value as Record<string, unknown>;
  return (
    isString(obj.id) &&
    isString(obj.name) &&
    isString(obj.content) &&
    (obj.path === undefined || isString(obj.path))
  );
};

// Function existence guards
export const assertFunctionExists = (fn: unknown, name: string): asserts fn is Function => {
  if (!isFunction(fn)) {
    throw new Error(`🚨 GUARD VIOLATION: Expected function '${name}' but got ${typeof fn}`);
  }
};

// Content validation
export const validateEditorContent = (content: unknown): string => {
  if (!isString(content)) {
    console.error('🚨 GUARD VIOLATION: Editor content must be string, got:', typeof content);
    return ''; // Return safe default
  }
  return content;
};

// State validation
export const validateFileManagerState = (state: unknown): boolean => {
  if (!isObject(state)) {
    console.error('🚨 GUARD VIOLATION: File manager state must be object');
    return false;
  }

  const stateObj = state as Record<string, unknown>;
  
  // Check required properties
  if (typeof stateObj.isLoading !== 'boolean') {
    console.error('🚨 GUARD VIOLATION: isLoading must be boolean');
    return false;
  }

  if (typeof stateObj.hasUnsavedChanges !== 'boolean') {
    console.error('🚨 GUARD VIOLATION: hasUnsavedChanges must be boolean');
    return false;
  }

  if (stateObj.currentFile !== null && !isValidFileContent(stateObj.currentFile)) {
    console.error('🚨 GUARD VIOLATION: currentFile is invalid');
    return false;
  }

  return true;
};

// Development mode assertions
export const DEV_ASSERT = (condition: boolean, message: string): void => {
  if (import.meta.env.DEV && !condition) {
    console.error('🚨 DEV ASSERTION FAILED:', message);
    console.trace(); // Show stack trace in development
  }
};

// Safe function caller
export const safeCall = <T extends unknown[], R>(
  fn: ((...args: T) => R) | undefined,
  args: T,
  fallback: R,
  context: string
): R => {
  try {
    if (!fn || !isFunction(fn)) {
      console.error(`🚨 GUARD: Function not available in ${context}`);
      return fallback;
    }
    return fn(...args);
  } catch (error) {
    console.error(`🚨 ERROR in ${context}:`, error);
    return fallback;
  }
};
import { useState, useEffect, useCallback, useMemo } from 'react';
import { mermaidParser } from '../lib/mermaid-parser';
import type { ParsedDiagram, SyntaxError, Position } from '../types/editor';

interface UseTextEditorOptions {
  initialContent?: string;
  validateOnChange?: boolean;
  debounceMs?: number;
}

interface UseTextEditorReturn {
  content: string;
  setContent: (content: string) => void;
  diagrams: ParsedDiagram[];
  errors: SyntaxError[];
  isValidating: boolean;
  cursorPosition: Position | null;
  setCursorPosition: (position: Position) => void;
  validateContent: () => void;
  clearErrors: () => void;
  getDiagramAtLine: (line: number) => ParsedDiagram | null;
  getErrorsForLine: (line: number) => SyntaxError[];
}

export const useTextEditor = (options: UseTextEditorOptions = {}): UseTextEditorReturn => {
  const {
    initialContent = '',
    validateOnChange = true,
    debounceMs = 500
  } = options;

  const [content, setContentState] = useState(initialContent);
  const [diagrams, setDiagrams] = useState<ParsedDiagram[]>([]);
  const [errors, setErrors] = useState<SyntaxError[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<Position | null>(null);

  // Debounced validation function
  const validateContent = useCallback(async () => {
    if (!content.trim()) {
      setDiagrams([]);
      setErrors([]);
      return;
    }

    setIsValidating(true);
    
    try {
      // Parse diagrams from content using async method (Rust backend)
      const parsedDiagrams = await mermaidParser.parseContentAsync(content);
      setDiagrams(parsedDiagrams);

      // Collect all validation errors
      const allErrors: SyntaxError[] = [];
      
      for (const diagram of parsedDiagrams) {
        if (diagram.hasError && diagram.errorMessage) {
          allErrors.push({
            line: diagram.startLine,
            column: 1,
            message: diagram.errorMessage,
            severity: 'error'
          });
        } else {
          // Validate each diagram individually
          const validation = mermaidParser.validateDiagram(diagram.content);
          if (!validation.isValid) {
            validation.errors.forEach(error => {
              allErrors.push({
                ...error,
                line: diagram.startLine + error.line - 1, // Adjust line number to document context
              });
            });
          }
        }
      }

      setErrors(allErrors);
    } catch (error) {
      console.error('Validation error:', error);
      setErrors([{
        line: 1,
        column: 1,
        message: error instanceof Error ? error.message : 'Unknown validation error',
        severity: 'error'
      }]);
    } finally {
      setIsValidating(false);
    }
  }, [content]);

  // Debounced content setter
  const setContent = useCallback((newContent: string) => {
    setContentState(newContent);
  }, []);

  // Auto-validate on content change
  useEffect(() => {
    if (!validateOnChange) return;

    const timeoutId = setTimeout(() => {
      validateContent();
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [content, validateOnChange, debounceMs, validateContent]);

  // Clear errors function
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // Get diagram at specific line
  const getDiagramAtLine = useCallback((line: number): ParsedDiagram | null => {
    return diagrams.find(diagram => 
      line >= diagram.startLine && line <= diagram.endLine
    ) || null;
  }, [diagrams]);

  // Get errors for specific line
  const getErrorsForLine = useCallback((line: number): SyntaxError[] => {
    return errors.filter(error => error.line === line);
  }, [errors]);

  // Memoized return value
  const returnValue = useMemo(() => ({
    content,
    setContent,
    diagrams,
    errors,
    isValidating,
    cursorPosition,
    setCursorPosition,
    validateContent,
    clearErrors,
    getDiagramAtLine,
    getErrorsForLine,
  }), [
    content,
    setContent,
    diagrams,
    errors,
    isValidating,
    cursorPosition,
    setCursorPosition,
    validateContent,
    clearErrors,
    getDiagramAtLine,
    getErrorsForLine,
  ]);

  return returnValue;
};
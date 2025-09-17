// Editor component types for Parch application

export interface Position {
  line: number;
  column: number;
}

export interface Range {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface SyntaxError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  isValid: boolean;
  errors: SyntaxError[];
}

export interface ParsedDiagram {
  id: string;
  type: string;
  content: string;
  startLine: number;
  endLine: number;
  hasError: boolean;
  errorMessage?: string;
  renderedSvg?: string;
}

export interface TextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onCursorChange?: (position: Position) => void;
  errors?: SyntaxError[];
  highlightRange?: Range;
  readOnly?: boolean;
  theme?: 'light' | 'dark';
  showTreeView?: boolean;
  customColors?: ThemeColors;
}

export interface ThemeColors {
  // Core Colors
  primaryBackground: string;
  secondaryBackground: string;
  tertiaryBackground: string;
  
  // Text Colors
  primaryText: string;
  secondaryText: string;
  accentText: string;
  
  // Interactive Colors
  accentColor: string;
  borderColor: string;
  hoverColor: string;
  
  // Status Colors
  successColor: string;
  errorColor: string;
  warningColor: string;
  
  // Editor Colors
  editorBackground: string;
  editorText: string;
}

export interface MermaidParserInterface {
  parseContent(content: string): ParsedDiagram[];
  validateDiagram(diagram: string): ValidationResult;
  renderDiagram(diagram: ParsedDiagram): Promise<string>;
}
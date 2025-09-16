import mermaid from 'mermaid';
import { TauriAPI } from './tauri-api';
import type { ParsedDiagram, ValidationResult, SyntaxError, MermaidParserInterface } from '../types/editor';

// Initialize Mermaid with configuration
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'monospace',
  fontSize: 14,
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
  },
  sequence: {
    useMaxWidth: true,
  },
  gantt: {
    useMaxWidth: true,
  },
});

export class MermaidParser implements MermaidParserInterface {
  private static instance: MermaidParser;
  private useRustParser = true;

  static getInstance(): MermaidParser {
    if (!MermaidParser.instance) {
      MermaidParser.instance = new MermaidParser();
    }
    return MermaidParser.instance;
  }

  /**
   * Parse content to extract Mermaid diagrams using Rust backend
   */
  async parseContentAsync(content: string): Promise<ParsedDiagram[]> {
    if (this.useRustParser) {
      try {
        const result = await TauriAPI.parseMermaidContent(content);
        return result.diagrams.map((diagram: any) => ({
          id: diagram.id,
          type: diagram.diagram_type,
          content: diagram.content,
          startLine: diagram.start_line,
          endLine: diagram.end_line,
          hasError: diagram.has_error,
          errorMessage: diagram.error_message,
        }));
      } catch (error) {
        console.warn('Rust parser failed, falling back to JavaScript parser:', error);
        this.useRustParser = false;
      }
    }
    
    // Fallback to JavaScript parser
    return this.parseContentSync(content);
  }

  /**
   * Synchronous parsing for backward compatibility
   */
  parseContent(content: string): ParsedDiagram[] {
    return this.parseContentSync(content);
  }

  /**
   * JavaScript-based parsing (fallback)
   */
  private parseContentSync(content: string): ParsedDiagram[] {
    const diagrams: ParsedDiagram[] = [];
    const lines = content.split('\n');
    let inCodeBlock = false;
    let currentDiagram: string[] = [];
    let startLine = -1;
    let diagramCounter = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for start of Mermaid code block
      if (line.startsWith('```mermaid') || line.startsWith('```mmd')) {
        inCodeBlock = true;
        startLine = i + 1; // Start after the opening ```
        currentDiagram = [];
        continue;
      }
      
      // Check for end of code block
      if (inCodeBlock && line === '```') {
        if (currentDiagram.length > 0) {
          const diagramContent = currentDiagram.join('\n').trim();
          const type = this.detectDiagramType(diagramContent);
          const validation = this.validateDiagram(diagramContent);
          
          diagrams.push({
            id: `diagram-${++diagramCounter}`,
            type,
            content: diagramContent,
            startLine,
            endLine: i - 1,
            hasError: !validation.isValid,
            errorMessage: validation.errors.length > 0 ? validation.errors[0].message : undefined,
          });
        }
        inCodeBlock = false;
        currentDiagram = [];
        startLine = -1;
        continue;
      }
      
      // Collect diagram content
      if (inCodeBlock) {
        currentDiagram.push(lines[i]); // Keep original indentation
      }
    }

    // Handle unclosed code block
    if (inCodeBlock && currentDiagram.length > 0) {
      const diagramContent = currentDiagram.join('\n').trim();
      const type = this.detectDiagramType(diagramContent);
      const validation = this.validateDiagram(diagramContent);
      
      diagrams.push({
        id: `diagram-${++diagramCounter}`,
        type,
        content: diagramContent,
        startLine,
        endLine: lines.length - 1,
        hasError: !validation.isValid,
        errorMessage: validation.errors.length > 0 ? validation.errors[0].message : undefined,
      });
    }

    return diagrams;
  }

  /**
   * Validate Mermaid diagram syntax
   */
  validateDiagram(diagram: string): ValidationResult {
    const errors: SyntaxError[] = [];
    
    if (!diagram.trim()) {
      errors.push({
        line: 1,
        column: 1,
        message: 'Empty diagram content',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    try {
      // Use Mermaid's parse function to validate syntax
      mermaid.parse(diagram);
      return { isValid: true, errors: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
      
      // Try to extract line number from error message
      const lineMatch = errorMessage.match(/line (\d+)/i);
      const line = lineMatch ? parseInt(lineMatch[1]) : 1;
      
      errors.push({
        line,
        column: 1,
        message: errorMessage,
        severity: 'error'
      });
      
      return { isValid: false, errors };
    }
  }

  /**
   * Render Mermaid diagram to SVG
   */
  async renderDiagram(diagram: ParsedDiagram): Promise<string> {
    try {
      const { svg } = await mermaid.render(`diagram-${diagram.id}`, diagram.content);
      return svg;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Rendering failed';
      throw new Error(`Failed to render diagram: ${errorMessage}`);
    }
  }

  /**
   * Detect diagram type from content
   */
  private detectDiagramType(content: string): string {
    const firstLine = content.split('\n')[0].trim().toLowerCase();
    
    if (firstLine.includes('graph') || firstLine.includes('flowchart')) {
      return 'flowchart';
    }
    if (firstLine.includes('sequencediagram') || firstLine.includes('sequence')) {
      return 'sequence';
    }
    if (firstLine.includes('classDiagram')) {
      return 'class';
    }
    if (firstLine.includes('stateDiagram')) {
      return 'state';
    }
    if (firstLine.includes('erDiagram')) {
      return 'er';
    }
    if (firstLine.includes('gantt')) {
      return 'gantt';
    }
    if (firstLine.includes('pie')) {
      return 'pie';
    }
    if (firstLine.includes('journey')) {
      return 'journey';
    }
    if (firstLine.includes('gitgraph')) {
      return 'gitgraph';
    }
    
    return 'unknown';
  }


}

// Export singleton instance
export const mermaidParser = MermaidParser.getInstance();
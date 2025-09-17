import React, { useEffect, useRef, useState } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import type { TextEditorProps } from '../types/editor';

const TextEditor: React.FC<TextEditorProps> = ({
  content,
  onChange,
  onCursorChange,
  errors = [],
  highlightRange,
  readOnly = false,
  theme = 'light',
  showTreeView = false,
  customColors
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const decorationsRef = useRef<string[]>([]);

  // Define custom themes function
  const defineThemes = (monacoInstance: Monaco) => {
    monacoInstance.editor.defineTheme('mermaid-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '0000ff', fontStyle: 'bold' },
        { token: 'keyword.control', foreground: '800080', fontStyle: 'bold' },
        { token: 'operator', foreground: 'ff0000' },
        { token: 'string', foreground: '008000' },
        { token: 'comment', foreground: '808080', fontStyle: 'italic' },
        { token: 'number', foreground: '0000ff' },
        { token: 'identifier', foreground: '000000' },
        { token: 'delimiter.bracket', foreground: '000000' }
      ],
      colors: {
        'editor.background': customColors?.editorBackground || '#f8f9fa',
        'editorWidget.background': customColors?.editorBackground || '#f8f9fa',
        'input.background': customColors?.editorBackground || '#f8f9fa',
        'dropdown.background': customColors?.editorBackground || '#f8f9fa',
        'quickInput.background': customColors?.editorBackground || '#f8f9fa'
      }
    });

    monacoInstance.editor.defineTheme('mermaid-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },
        { token: 'keyword.control', foreground: 'c586c0', fontStyle: 'bold' },
        { token: 'operator', foreground: 'd4d4d4' },
        { token: 'string', foreground: 'ce9178' },
        { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
        { token: 'number', foreground: 'b5cea8' },
        { token: 'identifier', foreground: 'd4d4d4' },
        { token: 'delimiter.bracket', foreground: 'ffd700' }
      ],
      colors: {
        'editor.background': customColors?.editorBackground || '#1a1f24',
        'editorWidget.background': customColors?.editorBackground || '#1a1f24',
        'input.background': customColors?.editorBackground || '#1a1f24',
        'dropdown.background': customColors?.editorBackground || '#1a1f24',
        'quickInput.background': customColors?.editorBackground || '#1a1f24'
      }
    });
  };

  // Handle editor mount
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;
    
    // Register Mermaid language
    registerMermaidLanguage(monacoInstance);
    
    // Set up cursor position change listener
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        onCursorChange({
          line: e.position.lineNumber,
          column: e.position.column
        });
      }
    });

    // Set up content change listener with debouncing
    let timeoutId: number;
    editor.onDidChangeModelContent(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const value = editor.getValue();
        onChange(value);
      }, 300); // 300ms debounce for performance
    });

    setIsEditorReady(true);
  };

  // Handle minimap changes dynamically
  useEffect(() => {
    if (editorRef.current && isEditorReady) {
      console.log('🔄 Updating minimap setting to:', showTreeView);
      editorRef.current.updateOptions({ 
        minimap: { 
          enabled: showTreeView 
        }
      });
    }
  }, [showTreeView, isEditorReady]);

  // Register Mermaid language with Monaco
  const registerMermaidLanguage = (monacoInstance: Monaco) => {
    // Register the language
    monacoInstance.languages.register({ id: 'mermaid' });

    // Set the language configuration
    monacoInstance.languages.setLanguageConfiguration('mermaid', {
      comments: {
        lineComment: '%%'
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ]
    });

    // Set the tokens provider for syntax highlighting
    monacoInstance.languages.setMonarchTokensProvider('mermaid', {
      tokenizer: {
        root: [
          [/\b(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitgraph)\b/, 'keyword'],
          [/\b(TD|TB|BT|RL|LR|TOP|BOTTOM|LEFT|RIGHT)\b/, 'keyword.control'],
          [/-->|---|-\.-|==>|==|-.->|<-->|<->|<-|->/, 'operator'],
          [/\[|\]|\(|\)|{|}|\[\[|\]\]|\(\(|\)\)/, 'delimiter.bracket'],
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/'/, 'string', '@string_single'],
          [/%%.*$/, 'comment'],
          [/\d+/, 'number'],
          [/[a-zA-Z_]\w*/, 'identifier'],
          [/[ \t\r\n]+/, 'white'],
        ],
        string: [
          [/[^\\"]+/, 'string'],
          [/\\./, 'string.escape'],
          [/"/, 'string', '@pop']
        ],
        string_single: [
          [/[^\\']+/, 'string'],
          [/\\./, 'string.escape'],
          [/'/, 'string', '@pop']
        ]
      }
    });

    // Define themes
    defineThemes(monacoInstance);
  };

  // Update error decorations
  useEffect(() => {
    if (!isEditorReady || !editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    // Clear previous decorations
    if (decorationsRef.current.length > 0) {
      editor.removeDecorations(decorationsRef.current);
    }

    // Create new decorations for errors
    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

    errors.forEach((error) => {
      // Map error severity for future use
      // const severity = error.severity === 'error' 
      //   ? monaco.MarkerSeverity.Error 
      //   : error.severity === 'warning' 
      //   ? monaco.MarkerSeverity.Warning 
      //   : monaco.MarkerSeverity.Info;

      // Add line decoration
      newDecorations.push({
        range: new monaco.Range(error.line, 1, error.line, 1),
        options: {
          isWholeLine: true,
          className: `editor-error-line-${error.severity}`,
          glyphMarginClassName: `editor-error-glyph-${error.severity}`,
          hoverMessage: { value: error.message },
          minimap: {
            color: error.severity === 'error' ? '#ff0000' : '#ffaa00',
            position: monaco.editor.MinimapPosition.Inline
          }
        }
      });

      // Add squiggly underline
      newDecorations.push({
        range: new monaco.Range(error.line, error.column, error.line, error.column + 10),
        options: {
          className: `editor-error-squiggly-${error.severity}`,
        }
      });
    });

    // Add highlight range decoration if provided
    if (highlightRange) {
      newDecorations.push({
        range: new monaco.Range(
          highlightRange.startLine,
          highlightRange.startColumn,
          highlightRange.endLine,
          highlightRange.endColumn
        ),
        options: {
          className: 'editor-highlight-range',
          isWholeLine: false
        }
      });
    }

    // Apply decorations
    decorationsRef.current = editor.deltaDecorations([], newDecorations);
  }, [errors, highlightRange, isEditorReady]);

  // Handle theme changes
  useEffect(() => {
    if (!isEditorReady || !monacoRef.current) return;
    
    // Redefine themes with current colors
    defineThemes(monacoRef.current);
    
    const themeId = theme === 'dark' ? 'mermaid-dark' : 'mermaid-light';
    monacoRef.current.editor.setTheme(themeId);
    
    // Force update background color using current theme colors
    if (editorRef.current) {
      const editorBackground = customColors?.editorBackground || (theme === 'dark' ? '#1a1f24' : '#f8f9fa');
      editorRef.current.updateOptions({
        backgroundColor: editorBackground
      });
    }
  }, [theme, isEditorReady, customColors]);

  return (
    <div className="text-editor-container">
      <Editor
        height="100%"
        language="mermaid"
        value={content}
        theme={theme === 'dark' ? 'mermaid-dark' : 'mermaid-light'}
        onMount={handleEditorDidMount}
        loading={<div className="editor-loading">Initializing editor...</div>}
        onChange={(value) => {
          if (value !== undefined) {
            onChange(value);
          }
        }}
        options={{
          readOnly,
          scrollBeyondLastLine: false,
          fontSize: 14,
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          lineNumbers: 'on',
          rulers: [],
          wordWrap: 'on',
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: false,
          folding: true,
          foldingStrategy: 'indentation',
          showFoldingControls: 'always',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true
          },
          suggest: {
            showKeywords: true,
            showSnippets: true
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false
          },
          parameterHints: { enabled: true },
          hover: { enabled: true },
          contextmenu: true,
          mouseWheelZoom: true,
          cursorBlinking: 'blink',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          scrollbar: {
            vertical: 'hidden',
            horizontal: 'hidden',
            useShadows: false,
            verticalHasArrows: false,
            horizontalHasArrows: false
          },
          // Remove line highlighting
          renderLineHighlight: 'none',
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          // Minimap settings (the zoomed-out overview on the side)
          minimap: { 
            enabled: showTreeView 
          }
        }}
      />
      
      {/* Error summary */}
      {errors.length > 0 && (
        <div className="editor-error-summary">
          <div className="error-count">
            {errors.filter(e => e.severity === 'error').length} errors, {' '}
            {errors.filter(e => e.severity === 'warning').length} warnings
          </div>
        </div>
      )}
    </div>
  );
};

export default TextEditor;
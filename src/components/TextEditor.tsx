import React, { useEffect, useRef, useState } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { getTheme, ThemeId } from '../lib/themes';
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
  const defineThemes = (monacoInstance: Monaco, themeId?: ThemeId) => {
    
    const githubLightTheme = getTheme('github-light');
    console.log('Defining GitHub Light theme with colors:', githubLightTheme.colors);
    monacoInstance.editor.defineTheme('github-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '0969da', fontStyle: 'bold' },
        { token: 'keyword.control', foreground: '8250df', fontStyle: 'bold' },
        { token: 'operator', foreground: 'cf222e' },
        { token: 'string', foreground: '0a3069' },
        { token: 'comment', foreground: '656d76', fontStyle: 'italic' },
        { token: 'number', foreground: '0969da' },
        { token: 'identifier', foreground: '24292f' },
        { token: 'delimiter.bracket', foreground: '24292f' }
      ],
      colors: {
        'editor.background': githubLightTheme.colors.editorBackground,
        'editor.foreground': githubLightTheme.colors.editorText,
        'editor.selectionBackground': githubLightTheme.colors.editorSelection + '40',
        'editor.lineHighlightBackground': githubLightTheme.colors.primaryBg,
        'editorLineNumber.foreground': githubLightTheme.colors.editorLineNumbers,
        'editorGutter.background': githubLightTheme.colors.editorBackground,
        'editorWidget.background': githubLightTheme.colors.editorBackground,
        'input.background': githubLightTheme.colors.editorBackground,
        'dropdown.background': githubLightTheme.colors.editorBackground,
        'quickInput.background': githubLightTheme.colors.editorBackground,
        'editorCursor.foreground': githubLightTheme.colors.editorCursor,
        'editorBracketMatch.background': githubLightTheme.colors.editorBackground,
        'editorBracketMatch.border': githubLightTheme.colors.borderColor
      }
    });

    const githubDarkTheme = getTheme('github-dark');
    monacoInstance.editor.defineTheme('github-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '2f81f7', fontStyle: 'bold' },
        { token: 'keyword.control', foreground: 'a5a5a5', fontStyle: 'bold' },
        { token: 'operator', foreground: 'f85149' },
        { token: 'string', foreground: 'a5a5a5' },
        { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
        { token: 'number', foreground: '79c0ff' },
        { token: 'identifier', foreground: 'e6edf3' },
        { token: 'delimiter.bracket', foreground: 'e6edf3' }
      ],
      colors: {
        'editor.background': githubDarkTheme.colors.editorBackground,
        'editor.foreground': githubDarkTheme.colors.editorText,
        'editor.selectionBackground': githubDarkTheme.colors.editorSelection + '40',
        'editor.lineHighlightBackground': githubDarkTheme.colors.primaryBg,
        'editorLineNumber.foreground': githubDarkTheme.colors.editorLineNumbers,
        'editorGutter.background': githubDarkTheme.colors.editorBackground,
        'editorWidget.background': githubDarkTheme.colors.editorBackground,
        'input.background': githubDarkTheme.colors.editorBackground,
        'dropdown.background': githubDarkTheme.colors.editorBackground,
        'quickInput.background': githubDarkTheme.colors.editorBackground,
        'editorCursor.foreground': githubDarkTheme.colors.editorCursor,
        'editorBracketMatch.background': githubDarkTheme.colors.editorBackground,
        'editorBracketMatch.border': githubDarkTheme.colors.borderColor
      }
    });

    const draculaTheme = getTheme('dracula');
    monacoInstance.editor.defineTheme('dracula', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'bd93f9', fontStyle: 'bold' },
        { token: 'keyword.control', foreground: 'ff79c6', fontStyle: 'bold' },
        { token: 'operator', foreground: 'ff79c6' },
        { token: 'string', foreground: 'f1fa8c' },
        { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
        { token: 'number', foreground: 'bd93f9' },
        { token: 'identifier', foreground: 'f8f8f2' },
        { token: 'delimiter.bracket', foreground: 'ff79c6' }
      ],
      colors: {
        'editor.background': draculaTheme.colors.editorBackground,
        'editor.foreground': draculaTheme.colors.editorText,
        'editor.selectionBackground': draculaTheme.colors.editorSelection + '40',
        'editor.lineHighlightBackground': draculaTheme.colors.primaryBg,
        'editorLineNumber.foreground': draculaTheme.colors.editorLineNumbers,
        'editorGutter.background': draculaTheme.colors.editorBackground,
        'editorWidget.background': draculaTheme.colors.editorBackground,
        'input.background': draculaTheme.colors.editorBackground,
        'dropdown.background': draculaTheme.colors.editorBackground,
        'quickInput.background': draculaTheme.colors.editorBackground,
        'editorCursor.foreground': draculaTheme.colors.editorCursor,
        'editorBracketMatch.background': draculaTheme.colors.editorBackground,
        'editorBracketMatch.border': draculaTheme.colors.borderColor
      }
    });

    const coffeeCreamTheme = getTheme('coffee-cream');
    monacoInstance.editor.defineTheme('coffee-cream', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '8b4513', fontStyle: 'bold' },
        { token: 'keyword.control', foreground: 'a0522d', fontStyle: 'bold' },
        { token: 'operator', foreground: '8b4513' },
        { token: 'string', foreground: '6b5b5b' },
        { token: 'comment', foreground: '8b7355', fontStyle: 'italic' },
        { token: 'number', foreground: '8b4513' },
        { token: 'identifier', foreground: '3c2f2f' },
        { token: 'delimiter.bracket', foreground: '3c2f2f' }
      ],
      colors: {
        'editor.background': coffeeCreamTheme.colors.editorBackground,
        'editor.foreground': coffeeCreamTheme.colors.editorText,
        'editor.selectionBackground': coffeeCreamTheme.colors.editorSelection + '40',
        'editor.lineHighlightBackground': coffeeCreamTheme.colors.primaryBg,
        'editorLineNumber.foreground': coffeeCreamTheme.colors.editorLineNumbers,
        'editorGutter.background': coffeeCreamTheme.colors.editorBackground,
        'editorWidget.background': coffeeCreamTheme.colors.editorBackground,
        'input.background': coffeeCreamTheme.colors.editorBackground,
        'dropdown.background': coffeeCreamTheme.colors.editorBackground,
        'quickInput.background': coffeeCreamTheme.colors.editorBackground,
        'editorCursor.foreground': coffeeCreamTheme.colors.editorCursor,
        'editorBracketMatch.background': coffeeCreamTheme.colors.editorBackground,
        'editorBracketMatch.border': coffeeCreamTheme.colors.borderColor
      }
    });
  };

  // Handle editor mount
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;
    
    // Register Mermaid language
    registerMermaidLanguage(monacoInstance);
    
    // Define themes and set initial theme
    defineThemes(monacoInstance, theme || 'github-light');
    const themeId = theme || 'github-light';
    monacoInstance.editor.setTheme(themeId);
    
    setIsEditorReady(true);
    
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
    if (!isEditorReady || !monacoRef.current || !editorRef.current) return;
    
    // Redefine themes with current colors
    defineThemes(monacoRef.current, theme || 'github-light');
    
    const themeId = theme || 'github-light';
    console.log('Setting Monaco theme to:', themeId);
    monacoRef.current.editor.setTheme(themeId);
    
    // Force editor to update its appearance
    const currentTheme = getTheme(themeId);
    editorRef.current.updateOptions({
      theme: themeId,
      backgroundColor: currentTheme.colors.editorBackground
    });
  }, [theme, isEditorReady]);

  return (
    <div className="text-editor-container">
      <Editor
        height="100%"
        language="mermaid"
        value={content}
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
export type ThemeId = 'github-light' | 'github-dark' | 'dracula' | 'coffee-cream';

export interface Theme {
  id: ThemeId;
  name: string;
  colors: {
    // App colors
    primaryBg: string;
    secondaryBg: string;
    primaryText: string;
    secondaryText: string;
    borderColor: string;
    accentColor: string;
    hoverColor: string;
    // Editor colors
    editorBackground: string;
    editorText: string;
    editorSelection: string;
    editorCursor: string;
    editorLineNumbers: string;
  };
}

export const themes: Record<ThemeId, Theme> = {
  'github-light': {
    id: 'github-light',
    name: 'GitHub Light',
    colors: {
      primaryBg: '#ffffff',
      secondaryBg: '#f6f8fa',
      primaryText: '#24292f',
      secondaryText: '#656d76',
      borderColor: '#d0d7de',
      accentColor: '#0969da',
      hoverColor: 'rgba(0, 0, 0, 0.05)',
      editorBackground: '#ffffff',
      editorText: '#24292f',
      editorSelection: '#0969da',
      editorCursor: '#0969da',
      editorLineNumbers: '#656d76'
    }
  },
  'github-dark': {
    id: 'github-dark',
    name: 'GitHub Dark',
    colors: {
      primaryBg: '#0d1117',
      secondaryBg: '#161b22',
      primaryText: '#e6edf3',
      secondaryText: '#8b949e',
      borderColor: '#30363d',
      accentColor: '#2f81f7',
      hoverColor: 'rgba(255, 255, 255, 0.1)',
      editorBackground: '#0d1117',
      editorText: '#e6edf3',
      editorSelection: '#2f81f7',
      editorCursor: '#2f81f7',
      editorLineNumbers: '#8b949e'
    }
  },
  'dracula': {
    id: 'dracula',
    name: 'Dracula',
    colors: {
      primaryBg: '#282a36',
      secondaryBg: '#44475a',
      primaryText: '#f8f8f2',
      secondaryText: '#6272a4',
      borderColor: '#6272a4',
      accentColor: '#bd93f9',
      hoverColor: 'rgba(189, 147, 249, 0.1)',
      editorBackground: '#282a36',
      editorText: '#f8f8f2',
      editorSelection: '#bd93f9',
      editorCursor: '#bd93f9',
      editorLineNumbers: '#6272a4'
    }
  },
  'coffee-cream': {
    id: 'coffee-cream',
    name: 'Coffee Cream',
    colors: {
      primaryBg: '#f5f1eb',
      secondaryBg: '#ebe6dc',
      primaryText: '#3c2f2f',
      secondaryText: '#6b5b5b',
      borderColor: '#c9b5a3',
      accentColor: '#8b4513',
      hoverColor: 'rgba(139, 69, 19, 0.1)',
      editorBackground: '#f5f1eb',
      editorText: '#3c2f2f',
      editorSelection: '#8b4513',
      editorCursor: '#8b4513',
      editorLineNumbers: '#8b7355'
    }
  }
};

export const defaultTheme: ThemeId = 'github-light';

export function getTheme(themeId: ThemeId): Theme {
  return themes[themeId] || themes[defaultTheme];
}

export function applyTheme(themeId: ThemeId) {
  const theme = getTheme(themeId);
  const root = document.documentElement;
  
  // Apply CSS custom properties
  root.style.setProperty('--primary-bg', theme.colors.primaryBg);
  root.style.setProperty('--secondary-bg', theme.colors.secondaryBg);
  root.style.setProperty('--primary-text', theme.colors.primaryText);
  root.style.setProperty('--secondary-text', theme.colors.secondaryText);
  root.style.setProperty('--border-color', theme.colors.borderColor);
  root.style.setProperty('--accent-color', theme.colors.accentColor);
  root.style.setProperty('--hover-color', theme.colors.hoverColor);
  root.style.setProperty('--editor-bg', theme.colors.editorBackground);
  root.style.setProperty('--editor-text', theme.colors.editorText);
  root.style.setProperty('--editor-selection', theme.colors.editorSelection);
  root.style.setProperty('--editor-cursor', theme.colors.editorCursor);
  root.style.setProperty('--editor-line-numbers', theme.colors.editorLineNumbers);
}

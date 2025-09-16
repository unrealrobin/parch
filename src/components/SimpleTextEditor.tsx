import React from 'react';

interface SimpleTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  theme?: 'light' | 'dark';
}

const SimpleTextEditor: React.FC<SimpleTextEditorProps> = ({
  content,
  onChange,
  theme = 'light'
}) => {
  console.log('=== SIMPLE TEXT EDITOR RENDER ===');
  console.log('Content:', content?.substring(0, 50) + '...');
  console.log('Content length:', content?.length);
  console.log('onChange type:', typeof onChange);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    console.log('=== TEXTAREA CHANGE ===');
    console.log('New content length:', newContent.length);
    console.log('New content preview:', newContent.substring(0, 50) + '...');
    onChange(newContent);
  };

  return (
    <div className="simple-text-editor" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <textarea
        value={content || ''}
        onChange={handleChange}
        placeholder="Type your Mermaid diagram here..."
        style={{
          flex: 1,
          width: '100%',
          border: 'none',
          outline: 'none',
          padding: '16px',
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          fontSize: '14px',
          lineHeight: '1.5',
          resize: 'none',
          backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
          color: theme === 'dark' ? '#d4d4d4' : '#24292f',
        }}
      />
    </div>
  );
};

export default SimpleTextEditor;
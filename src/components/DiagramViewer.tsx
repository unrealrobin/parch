import React, { useEffect, useRef, useState } from 'react';
import { mermaidParser } from '../lib/mermaid-parser';
import type { ParsedDiagram } from '../types/editor';

interface DiagramViewerProps {
  diagrams: ParsedDiagram[];
  activeIndex?: number;
  onDiagramClick?: (index: number) => void;
  onDiagramShare?: (diagram: ParsedDiagram) => void;
  onDiagramExport?: (diagram: ParsedDiagram) => void;
}

const DiagramViewer: React.FC<DiagramViewerProps> = ({
  diagrams,
  activeIndex = -1,
  onDiagramClick,
  onDiagramShare,
  onDiagramExport
}) => {
  const [renderedDiagrams, setRenderedDiagrams] = useState<Map<string, string>>(new Map());
  const [renderingErrors, setRenderingErrors] = useState<Map<string, string>>(new Map());
  const [isRendering, setIsRendering] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Render diagrams when they change
  useEffect(() => {
    const renderDiagrams = async () => {
      const newRendered = new Map(renderedDiagrams);
      const newErrors = new Map(renderingErrors);
      const newRendering = new Set<string>();

      for (const diagram of diagrams) {
        // Skip if already rendered or has syntax errors
        if (diagram.hasError || newRendered.has(diagram.id)) {
          continue;
        }

        newRendering.add(diagram.id);
        setIsRendering(prev => new Set([...prev, diagram.id]));

        try {
          const svg = await mermaidParser.renderDiagram(diagram);
          newRendered.set(diagram.id, svg);
          newErrors.delete(diagram.id);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Rendering failed';
          newErrors.set(diagram.id, errorMessage);
          newRendered.delete(diagram.id);
        }

        newRendering.delete(diagram.id);
      }

      setRenderedDiagrams(newRendered);
      setRenderingErrors(newErrors);
      setIsRendering(newRendering);
    };

    renderDiagrams();
  }, [diagrams]);

  const handleDiagramClick = (index: number) => {
    if (onDiagramClick) {
      onDiagramClick(index);
    }
  };

  const handleShare = (diagram: ParsedDiagram, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onDiagramShare) {
      onDiagramShare(diagram);
    }
  };

  const handleExport = (diagram: ParsedDiagram, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onDiagramExport) {
      onDiagramExport(diagram);
    }
  };

  if (diagrams.length === 0) {
    return (
      <div className="diagram-viewer-empty">
        <div className="empty-state">
          <h3>No diagrams found</h3>
          <p>Start typing Mermaid syntax in code blocks:</p>
          <pre className="example-code">
{`\`\`\`mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
\`\`\``}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="diagram-viewer" ref={containerRef}>
      <div className="diagrams-header">
        <h3>Diagrams ({diagrams.length})</h3>
        {isRendering.size > 0 && (
          <span className="rendering-indicator">
            Rendering {isRendering.size} diagram{isRendering.size !== 1 ? 's' : ''}...
          </span>
        )}
      </div>
      
      <div className="diagrams-container">
        {diagrams.map((diagram, index) => {
          const isActive = index === activeIndex;
          const isCurrentlyRendering = isRendering.has(diagram.id);
          const renderedSvg = renderedDiagrams.get(diagram.id);
          const renderError = renderingErrors.get(diagram.id);
          
          return (
            <div
              key={diagram.id}
              className={`diagram-item ${isActive ? 'active' : ''} ${diagram.hasError ? 'has-error' : 'valid'}`}
              onClick={() => handleDiagramClick(index)}
            >
              <div className="diagram-header">
                <div className="diagram-info">
                  <span className="diagram-type">{diagram.type}</span>
                  <span className="diagram-lines">
                    Lines {diagram.startLine}-{diagram.endLine}
                  </span>
                </div>
                
                <div className="diagram-actions">
                  {!diagram.hasError && renderedSvg && (
                    <>
                      <button
                        className="action-button share"
                        onClick={(e) => handleShare(diagram, e)}
                        title="Share diagram"
                        type="button"
                      >
                        🔗
                      </button>
                      <button
                        className="action-button export"
                        onClick={(e) => handleExport(diagram, e)}
                        title="Export diagram"
                        type="button"
                      >
                        💾
                      </button>
                    </>
                  )}
                  {diagram.hasError && (
                    <span className="error-indicator" title={diagram.errorMessage}>
                      ⚠️
                    </span>
                  )}
                </div>
              </div>

              {/* Error display */}
              {diagram.hasError && diagram.errorMessage && (
                <div className="diagram-error">
                  <strong>Syntax Error:</strong> {diagram.errorMessage}
                </div>
              )}

              {/* Rendering error display */}
              {renderError && (
                <div className="diagram-error">
                  <strong>Rendering Error:</strong> {renderError}
                </div>
              )}

              {/* Diagram content */}
              <div className="diagram-content">
                {isCurrentlyRendering ? (
                  <div className="diagram-loading">
                    <div className="loading-spinner"></div>
                    <span>Rendering diagram...</span>
                  </div>
                ) : diagram.hasError ? (
                  <div className="error-placeholder">
                    <span>Fix syntax errors to see diagram</span>
                  </div>
                ) : renderError ? (
                  <div className="error-placeholder">
                    <span>Failed to render diagram</span>
                  </div>
                ) : renderedSvg ? (
                  <div 
                    className="diagram-svg"
                    dangerouslySetInnerHTML={{ __html: renderedSvg }}
                  />
                ) : (
                  <div className="diagram-loading">
                    <span>Preparing to render...</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DiagramViewer;
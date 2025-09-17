use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedDiagram {
    pub id: String,
    pub diagram_type: String,
    pub content: String,
    pub start_line: usize,
    pub end_line: usize,
    pub has_error: bool,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyntaxError {
    pub line: usize,
    pub column: usize,
    pub message: String,
    pub severity: String, // "error", "warning", "info"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub errors: Vec<SyntaxError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseResult {
    pub diagrams: Vec<ParsedDiagram>,
    pub total_errors: usize,
    pub parsing_time_ms: u128,
}

pub struct MermaidParser {
    #[allow(dead_code)]
    code_block_regex: Regex,
    diagram_type_patterns: HashMap<String, Regex>,
}

impl MermaidParser {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let code_block_regex = Regex::new(r"```(?:mermaid|mmd)\s*\n([\s\S]*?)\n```")?;

        let mut diagram_type_patterns = HashMap::new();

        // Define patterns for different Mermaid diagram types
        diagram_type_patterns.insert(
            "flowchart".to_string(),
            Regex::new(r"^\s*(?:graph|flowchart)\s+(?:TD|TB|BT|RL|LR|TOP|BOTTOM|LEFT|RIGHT)")?,
        );
        diagram_type_patterns.insert("sequence".to_string(), Regex::new(r"^\s*sequenceDiagram")?);
        diagram_type_patterns.insert("class".to_string(), Regex::new(r"^\s*classDiagram")?);
        diagram_type_patterns.insert(
            "state".to_string(),
            Regex::new(r"^\s*stateDiagram(?:-v2)?")?,
        );
        diagram_type_patterns.insert("er".to_string(), Regex::new(r"^\s*erDiagram")?);
        diagram_type_patterns.insert("gantt".to_string(), Regex::new(r"^\s*gantt")?);
        diagram_type_patterns.insert("pie".to_string(), Regex::new(r"^\s*pie(?:\s+title)?")?);
        diagram_type_patterns.insert("journey".to_string(), Regex::new(r"^\s*journey")?);
        diagram_type_patterns.insert("gitgraph".to_string(), Regex::new(r"^\s*gitgraph")?);
        diagram_type_patterns.insert(
            "requirement".to_string(),
            Regex::new(r"^\s*requirementDiagram")?,
        );
        diagram_type_patterns.insert("c4context".to_string(), Regex::new(r"^\s*C4Context")?);
        diagram_type_patterns.insert("mindmap".to_string(), Regex::new(r"^\s*mindmap")?);
        diagram_type_patterns.insert("timeline".to_string(), Regex::new(r"^\s*timeline")?);

        Ok(MermaidParser {
            code_block_regex,
            diagram_type_patterns,
        })
    }

    /// Parse content to extract all Mermaid diagrams
    pub fn parse_content(&self, content: &str) -> ParseResult {
        let start_time = std::time::Instant::now();
        let mut diagrams = Vec::new();
        let mut total_errors = 0;

        let lines: Vec<&str> = content.lines().collect();
        let mut in_code_block = false;
        let mut current_diagram_lines = Vec::new();
        let mut start_line = 0;
        let mut _block_start_line = 0;

        for (line_idx, line) in lines.iter().enumerate() {
            let trimmed = line.trim();

            // Check for start of Mermaid code block
            if trimmed.starts_with("```mermaid") || trimmed.starts_with("```mmd") {
                in_code_block = true;
                _block_start_line = line_idx + 1; // 1-indexed
                start_line = line_idx + 2; // Start after the opening ```
                current_diagram_lines.clear();
                continue;
            }

            // Check for end of code block
            if in_code_block && trimmed == "```" {
                if !current_diagram_lines.is_empty() {
                    let diagram_content = current_diagram_lines.join("\n");
                    let diagram_type = self.detect_diagram_type(&diagram_content);
                    let validation = self.validate_diagram(&diagram_content, start_line);

                    if !validation.is_valid {
                        total_errors += validation.errors.len();
                    }

                    let diagram = ParsedDiagram {
                        id: Uuid::new_v4().to_string(),
                        diagram_type,
                        content: diagram_content,
                        start_line,
                        end_line: line_idx, // 1-indexed
                        has_error: !validation.is_valid,
                        error_message: validation.errors.first().map(|e| e.message.clone()),
                    };

                    diagrams.push(diagram);
                }

                in_code_block = false;
                current_diagram_lines.clear();
                continue;
            }

            // Collect diagram content
            if in_code_block {
                current_diagram_lines.push(*line);
            }
        }

        // Handle unclosed code block
        if in_code_block && !current_diagram_lines.is_empty() {
            let diagram_content = current_diagram_lines.join("\n");
            let diagram_type = self.detect_diagram_type(&diagram_content);
            let validation = self.validate_diagram(&diagram_content, start_line);

            if !validation.is_valid {
                total_errors += validation.errors.len();
            }

            let diagram = ParsedDiagram {
                id: Uuid::new_v4().to_string(),
                diagram_type,
                content: diagram_content,
                start_line,
                end_line: lines.len(),
                has_error: !validation.is_valid,
                error_message: validation.errors.first().map(|e| e.message.clone()),
            };

            diagrams.push(diagram);
        }

        let parsing_time_ms = start_time.elapsed().as_millis();

        ParseResult {
            diagrams,
            total_errors,
            parsing_time_ms,
        }
    }

    /// Detect the type of Mermaid diagram from content
    pub fn detect_diagram_type(&self, content: &str) -> String {
        let first_line = content.lines().next().unwrap_or("").trim();

        for (diagram_type, pattern) in &self.diagram_type_patterns {
            if pattern.is_match(first_line) {
                return diagram_type.clone();
            }
        }

        // Fallback detection for common patterns
        let first_line_lower = first_line.to_lowercase();
        if first_line_lower.contains("graph") || first_line_lower.contains("flowchart") {
            return "flowchart".to_string();
        }
        if first_line_lower.contains("sequencediagram") {
            return "sequence".to_string();
        }
        if first_line_lower.contains("classdiagram") {
            return "class".to_string();
        }
        if first_line_lower.contains("statediagram") {
            return "state".to_string();
        }
        if first_line_lower.contains("erdiagram") {
            return "er".to_string();
        }
        if first_line_lower.contains("gantt") {
            return "gantt".to_string();
        }
        if first_line_lower.contains("pie") {
            return "pie".to_string();
        }

        "unknown".to_string()
    }

    /// Validate Mermaid diagram syntax
    pub fn validate_diagram(&self, content: &str, start_line: usize) -> ValidationResult {
        let mut errors = Vec::new();

        if content.trim().is_empty() {
            errors.push(SyntaxError {
                line: start_line,
                column: 1,
                message: "Empty diagram content".to_string(),
                severity: "error".to_string(),
            });
            return ValidationResult {
                is_valid: false,
                errors,
            };
        }

        // Basic syntax validation
        let lines: Vec<&str> = content.lines().collect();

        // Check for valid diagram declaration
        if let Some(first_line) = lines.first() {
            let trimmed = first_line.trim();
            if !self.is_valid_diagram_declaration(trimmed) {
                errors.push(SyntaxError {
                    line: start_line,
                    column: 1,
                    message: format!("Invalid diagram declaration: '{}'", trimmed),
                    severity: "error".to_string(),
                });
            }
        }

        // Check for common syntax issues
        for (line_idx, line) in lines.iter().enumerate() {
            let line_number = start_line + line_idx;

            // Check for unmatched brackets
            if self.has_unmatched_brackets(line) {
                errors.push(SyntaxError {
                    line: line_number,
                    column: 1,
                    message: "Unmatched brackets detected".to_string(),
                    severity: "warning".to_string(),
                });
            }

            // Check for invalid characters in node IDs
            if self.has_invalid_node_id(line) {
                errors.push(SyntaxError {
                    line: line_number,
                    column: 1,
                    message: "Invalid characters in node ID".to_string(),
                    severity: "warning".to_string(),
                });
            }
        }

        ValidationResult {
            is_valid: errors.iter().all(|e| e.severity != "error"),
            errors,
        }
    }

    /// Check if the line contains a valid diagram declaration
    fn is_valid_diagram_declaration(&self, line: &str) -> bool {
        for pattern in self.diagram_type_patterns.values() {
            if pattern.is_match(line) {
                return true;
            }
        }

        // Additional checks for common variations
        let line_lower = line.to_lowercase();
        line_lower.starts_with("graph")
            || line_lower.starts_with("flowchart")
            || line_lower.starts_with("sequencediagram")
            || line_lower.starts_with("classdiagram")
            || line_lower.starts_with("statediagram")
            || line_lower.starts_with("erdiagram")
            || line_lower.starts_with("gantt")
            || line_lower.starts_with("pie")
            || line_lower.starts_with("journey")
            || line_lower.starts_with("gitgraph")
    }

    /// Check for unmatched brackets in a line
    fn has_unmatched_brackets(&self, line: &str) -> bool {
        let mut stack = Vec::new();
        let brackets = [('(', ')'), ('[', ']'), ('{', '}')];

        for ch in line.chars() {
            for (open, close) in &brackets {
                if ch == *open {
                    stack.push(*close);
                } else if ch == *close {
                    if stack.pop() != Some(*close) {
                        return true;
                    }
                }
            }
        }

        !stack.is_empty()
    }

    /// Check for invalid characters in node IDs
    fn has_invalid_node_id(&self, line: &str) -> bool {
        // This is a simplified check - in practice, Mermaid has complex rules
        // for node IDs depending on the diagram type
        let node_id_regex = Regex::new(r"\b([A-Za-z_][A-Za-z0-9_]*)\s*[\[\(]").unwrap();

        for captures in node_id_regex.captures_iter(line) {
            if let Some(node_id) = captures.get(1) {
                let id = node_id.as_str();
                // Check for reserved keywords or invalid patterns
                if id.len() > 50 || id.contains("--") || id.starts_with("__") {
                    return true;
                }
            }
        }

        false
    }

    /// Get statistics about the parsed content
    pub fn get_parsing_stats(&self, content: &str) -> HashMap<String, serde_json::Value> {
        let mut stats = HashMap::new();
        let parse_result = self.parse_content(content);

        stats.insert(
            "total_diagrams".to_string(),
            serde_json::Value::Number((parse_result.diagrams.len() as u64).into()),
        );
        stats.insert(
            "total_errors".to_string(),
            serde_json::Value::Number((parse_result.total_errors as u64).into()),
        );
        stats.insert(
            "parsing_time_ms".to_string(),
            serde_json::Value::Number((parse_result.parsing_time_ms as u64).into()),
        );

        // Count diagrams by type
        let mut type_counts = HashMap::new();
        for diagram in &parse_result.diagrams {
            *type_counts.entry(diagram.diagram_type.clone()).or_insert(0) += 1;
        }

        stats.insert(
            "diagram_types".to_string(),
            serde_json::to_value(type_counts).unwrap_or_default(),
        );

        stats
    }
}

impl Default for MermaidParser {
    fn default() -> Self {
        Self::new().expect("Failed to create MermaidParser")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_single_flowchart() {
        let parser = MermaidParser::new().unwrap();
        let content = r#"
```mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
```
"#;

        let result = parser.parse_content(content);
        assert_eq!(result.diagrams.len(), 1);
        assert_eq!(result.diagrams[0].diagram_type, "flowchart");
        assert!(!result.diagrams[0].has_error);
    }

    #[test]
    fn test_parse_multiple_diagrams() {
        let parser = MermaidParser::new().unwrap();
        let content = r#"
```mermaid
graph TD
    A --> B
```

Some text here

```mermaid
sequenceDiagram
    Alice->>Bob: Hello
```
"#;

        let result = parser.parse_content(content);
        assert_eq!(result.diagrams.len(), 2);
        assert_eq!(result.diagrams[0].diagram_type, "flowchart");
        assert_eq!(result.diagrams[1].diagram_type, "sequence");
    }

    #[test]
    fn test_detect_diagram_types() {
        let parser = MermaidParser::new().unwrap();

        assert_eq!(parser.detect_diagram_type("graph TD"), "flowchart");
        assert_eq!(parser.detect_diagram_type("flowchart LR"), "flowchart");
        assert_eq!(parser.detect_diagram_type("sequenceDiagram"), "sequence");
        assert_eq!(parser.detect_diagram_type("classDiagram"), "class");
        assert_eq!(parser.detect_diagram_type("stateDiagram-v2"), "state");
        assert_eq!(parser.detect_diagram_type("erDiagram"), "er");
        assert_eq!(parser.detect_diagram_type("gantt"), "gantt");
        assert_eq!(parser.detect_diagram_type("pie title My Pie"), "pie");
    }

    #[test]
    fn test_validation() {
        let parser = MermaidParser::new().unwrap();

        // Valid diagram
        let valid_result = parser.validate_diagram("graph TD\n    A --> B", 1);
        assert!(valid_result.is_valid);

        // Empty diagram
        let empty_result = parser.validate_diagram("", 1);
        assert!(!empty_result.is_valid);
        assert_eq!(empty_result.errors[0].message, "Empty diagram content");
    }
}

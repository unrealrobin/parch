# Test Mermaid Editor

This is a test document with multiple Mermaid diagrams to verify the text editor functionality.

## Flowchart Example

```mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process A]
    B -->|No| D[Process B]
    C --> E[End]
    D --> E
```

## Sequence Diagram Example

```mermaid
sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob, how are you?
    B-->>A: Great!
    A-)B: See you later!
```

## Invalid Diagram (should show error)

```mermaid
graph TD
    A[Start] --> B[
    // Missing closing bracket - should cause syntax error
```

## Class Diagram Example

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
    }
    Animal <|-- Dog
```
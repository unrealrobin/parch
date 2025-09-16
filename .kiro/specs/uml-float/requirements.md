# Requirements Document

## Introduction

Parch is a lightweight, cross-platform desktop application designed to help developers plan software using text-based UML with live diagram visualization. The application provides a floating window with a split-pane interface: a left pane for UML text editing and a right pane for real-time diagram rendering. Inspired by PureRef's minimal reference-board concept, Parch is designed to stay accessible alongside code editors, offering features like always-on-top display, opacity adjustment, and mouse input pass-through for seamless integration into development workflows.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to create and edit UML diagrams using Mermaid syntax, so that I can quickly design software architecture using a standardized, widely-supported diagramming language.

#### Acceptance Criteria

1. WHEN the user opens the application THEN the system SHALL display a split-pane interface with a text editor on the left
2. WHEN the user types Mermaid syntax in the text editor THEN the system SHALL parse and validate the syntax in real-time
3. WHEN the user enters valid Mermaid syntax THEN the system SHALL render the corresponding diagram in the right pane
4. WHEN the user makes changes to the Mermaid text THEN the system SHALL update the diagram visualization within 500ms

### Requirement 2

**User Story:** As a developer, I want the UML Float window to stay on top of other applications, so that I can reference my diagrams while working in my IDE.

#### Acceptance Criteria

1. WHEN the user enables "always on top" mode THEN the system SHALL keep the UML Float window above all other windows
2. WHEN the user disables "always on top" mode THEN the system SHALL allow other windows to appear in front of Parch
3. WHEN the system is in "always on top" mode THEN the window SHALL remain visible even when other applications are focused

### Requirement 3

**User Story:** As a developer, I want to adjust the window opacity, so that I can see through the UML Float window to view code underneath while still referencing the diagrams.

#### Acceptance Criteria

1. WHEN the user adjusts the opacity slider THEN the system SHALL change the window transparency from 10% to 100%
2. WHEN the opacity is set below 100% THEN the system SHALL maintain full functionality of all UI elements
3. WHEN the user sets a specific opacity level THEN the system SHALL remember this setting for future sessions

### Requirement 4

**User Story:** As a developer, I want mouse input to pass through the window when needed, so that I can interact with applications underneath without moving the UML Float window.

#### Acceptance Criteria

1. WHEN the user enables "click-through" mode THEN the system SHALL pass mouse clicks to applications underneath
2. WHEN "click-through" mode is enabled THEN the system SHALL still allow interaction with Parch through keyboard shortcuts
3. WHEN the user disables "click-through" mode THEN the system SHALL restore normal mouse interaction with the Parch window

### Requirement 5

**User Story:** As a developer, I want to create, save, and manage individual Mermaid diagram files, so that I can organize my architectural designs across different projects and easily access them later.

#### Acceptance Criteria

1. WHEN the user creates a new file THEN the system SHALL provide a blank text editor and clear the diagram pane
2. WHEN the user saves a file THEN the system SHALL store the Mermaid text content with a user-specified filename and location
3. WHEN the user opens an existing file THEN the system SHALL load the Mermaid text content and render the corresponding diagrams
4. WHEN the user edits an existing file THEN the system SHALL track changes and indicate unsaved modifications in the UI
5. WHEN the user attempts to create a new file or open another file with unsaved changes THEN the system SHALL prompt to save current changes
6. WHEN the user closes the application with unsaved changes THEN the system SHALL prompt for confirmation before closing
7. WHEN the user saves a file THEN the system SHALL support common file formats (.md, .mmd, .mermaid) for Mermaid content

### Requirement 6

**User Story:** As a developer, I want the application to work across different operating systems, so that I can use the same tool regardless of my development platform.

#### Acceptance Criteria

1. WHEN the application is installed on Windows THEN the system SHALL provide full functionality including window management features
2. WHEN the application is installed on macOS THEN the system SHALL provide full functionality including window management features
3. WHEN the application is installed on Linux THEN the system SHALL provide full functionality including window management features
4. WHEN the application runs on any supported platform THEN the system SHALL maintain consistent UI and behavior

### Requirement 7

**User Story:** As a developer, I want syntax highlighting and error indication in the text editor, so that I can quickly identify and fix issues in my Mermaid syntax.

#### Acceptance Criteria

1. WHEN the user types Mermaid syntax THEN the system SHALL highlight keywords, relationships, and entities with different colors
2. WHEN the user enters invalid Mermaid syntax THEN the system SHALL highlight the error location in the text editor
3. WHEN there are syntax errors THEN the system SHALL display helpful error messages
4. WHEN the syntax is corrected THEN the system SHALL remove error indicators and update the diagram

### Requirement 8

**User Story:** As a developer, I want to resize and reposition the floating window, so that I can optimize the layout for my specific workflow and screen setup.

#### Acceptance Criteria

1. WHEN the user drags the window THEN the system SHALL allow repositioning to any location on the screen
2. WHEN the user resizes the window THEN the system SHALL maintain the split-pane layout proportionally
3. WHEN the user adjusts the split-pane divider THEN the system SHALL allow customization of the text editor and diagram pane sizes
4. WHEN the application restarts THEN the system SHALL restore the last window position and size

### Requirement 9

**User Story:** As a developer, I want to authenticate using my Google or GitHub account, so that I can securely access my diagrams and sync them across devices.

#### Acceptance Criteria

1. WHEN the user launches the application for the first time THEN the system SHALL present authentication options for Google and GitHub
2. WHEN the user selects Google authentication THEN the system SHALL redirect to Google OAuth flow and handle the authentication response
3. WHEN the user selects GitHub authentication THEN the system SHALL redirect to GitHub OAuth flow and handle the authentication response
4. WHEN authentication is successful THEN the system SHALL store the user's authentication token securely
5. WHEN the user is authenticated THEN the system SHALL display the user's profile information in the application
6. WHEN the user logs out THEN the system SHALL clear all authentication data and return to the login screen

### Requirement 10

**User Story:** As a developer, I want my UML diagrams to be saved to my authenticated account, so that I can access them from different devices and ensure they're backed up.

#### Acceptance Criteria

1. WHEN the user saves a diagram while authenticated THEN the system SHALL store the diagram in the user's cloud account
2. WHEN the user opens the application on a different device THEN the system SHALL sync and display all saved diagrams from their account
3. WHEN the user is offline THEN the system SHALL cache diagrams locally and sync when connection is restored
4. WHEN there are sync conflicts THEN the system SHALL present options to resolve conflicts between local and cloud versions

### Requirement 11

**User Story:** As a developer, I want to create multiple Mermaid diagrams within a single document, so that I can organize related diagrams together and view them as a cohesive set.

#### Acceptance Criteria

1. WHEN the user creates multiple Mermaid code blocks in the text editor THEN the system SHALL render each diagram separately in the right pane
2. WHEN there are multiple diagrams THEN the system SHALL display them in a scrollable view with clear separation between diagrams
3. WHEN the user clicks on a specific diagram in the right pane THEN the system SHALL highlight the corresponding Mermaid code block in the text editor
4. WHEN the user positions the cursor in a specific Mermaid code block THEN the system SHALL highlight or focus the corresponding diagram in the right pane
5. WHEN there are syntax errors in one diagram THEN the system SHALL only affect that specific diagram while keeping others functional

### Requirement 12

**User Story:** As a developer, I want to share and export individual diagrams, so that I can collaborate with team members and include diagrams in documentation or presentations.

#### Acceptance Criteria

1. WHEN the user selects a diagram to share THEN the system SHALL generate a shareable URL that displays the diagram
2. WHEN the user exports a diagram THEN the system SHALL support multiple formats (PNG, SVG, PDF, JPEG) with customizable quality settings
3. WHEN the user shares a diagram THEN the system SHALL allow setting expiration times and privacy options
4. WHEN someone accesses a shared diagram URL THEN the system SHALL display the diagram with proper rendering and optional metadata
5. WHEN the user exports a diagram THEN the system SHALL maintain high quality and proper scaling for the selected format
6. WHEN the user views their sharing history THEN the system SHALL display all previously shared diagrams with their URLs and settings
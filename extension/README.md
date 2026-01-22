# Research Platform Extension

A browser extension for extracting and validating research data from news articles and documents. Supports multiple projects with dynamic field definitions.

## Features

- **Multi-Project Support**: Switch between different research projects
- **Dynamic Forms**: Form fields are loaded from project configuration
- **Quote Extraction**: Select text and link it to specific fields
- **Context Menu Integration**: Right-click on selected text to add quotes
- **Review Workflow**: Review and validate records through their lifecycle
- **API Key Authentication**: Secure access with API keys

## Installation (Development)

### Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `extension` folder from this project

### Firefox

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the sidebar
3. Click "Load Temporary Add-on"
4. Select any file in the `extension` folder

## Usage

### Basic Workflow

1. Open the sidebar: Click the extension icon or press `Alt+Shift+S`
2. **Select a Project**: Choose from the project dropdown (requires API key)
3. **Select a Record Type**: Choose the type of record you're documenting
4. Navigate to a news article or document
5. Fill in case information as you find it
6. Select text and right-click to link quotes to fields
7. Or click "Extract" to auto-extract article content
8. Review and verify each quote
9. Click "Save Record" to save to the database

### Context Menu Quotes

1. Select text on any webpage
2. Right-click to open context menu
3. Choose "Add Quote to Record" → Select a field category → Select a specific field
4. The quote is linked to that field and added to your record

### Review Workflow

1. Go to the "Cases" tab to see records pending review
2. Click on a record to review its details
3. Verify fields, add quotes, check sources
4. Submit verification when complete

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+Shift+S` | Open/close sidebar |
| `Alt+Q` | Add selected text as quote |
| `Alt+E` | Extract article content |

## Configuration

### API Key Setup

1. Go to Settings tab in the sidebar
2. Enter your API key (get one from your account page on the platform)
3. Projects will load automatically

### Project Selection

- Use the dropdowns at the top of the sidebar to select:
  - **Project**: The research project you're working on
  - **Record Type**: The type of record (e.g., incident, statement, etc.)

## Legacy ICE Project

For backward compatibility, the extension recognizes the legacy ICE Deaths project (slug: `ice-deaths` or `ice-documentation`) and uses the original hardcoded form for those projects. All other projects use dynamic forms loaded from the API.

## Requirements

- The Research Platform web app must be running (localhost or production)
- You need an API key for authenticated access
- Guest mode allows limited submissions without an API key

## Notes

- Icons are SVG placeholders - replace with proper PNG icons for production
- The extension connects to both localhost (development) and production API
- All data is stored in your PostgreSQL database via the platform API

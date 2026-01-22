# Research Platform Extension v2

A completely rewritten Chrome extension for the Research Platform - now fully generalized and project-agnostic.

## Features

- **Dynamic Forms**: Forms are generated from API field definitions, not hardcoded
- **Multi-Project Support**: Connect to any Research Platform instance and work with any project
- **Quote Management**: Capture and organize quotes, link them to specific fields
- **Source Tracking**: Track article/document sources with metadata
- **Page Extraction**: Extract content from news sites with site-specific parsers
- **Context Menus**: Right-click to add selected text to any field or as a quote
- **AI Analysis**: Configurable pattern detection based on project settings
- **Review Mode**: Review and approve/reject submissions
- **Draft Saving**: Auto-saves work in progress

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension-v2` folder

## Usage

### Initial Setup

1. Click the extension icon in the toolbar (opens side panel)
2. Enter your Research Platform URL (e.g., `https://your-project.vercel.app`)
3. Enter your API key (get from Platform Settings → API Keys)
4. Click "Connect"

### Working with Records

1. Select a project from the dropdown
2. Select a record type
3. Click "Start Working"
4. Fill in the form fields
5. Use "Extract" to pull content from the current page
6. Add quotes and sources as you research
7. Click "Submit Record" when done

### Keyboard Shortcuts

- Context menu: Right-click selected text for quick actions

## Architecture

```
extension-v2/
├── manifest.json       # Chrome extension manifest (MV3)
├── background.js       # Service worker (context menus, messaging)
├── content.js          # Page content extraction
├── sidepanel.html      # Main UI structure
├── sidepanel.js        # Main application logic
├── sidepanel.css       # Styles
├── lib/
│   ├── api.js          # API client
│   ├── storage.js      # State management
│   ├── utils.js        # Utilities
│   ├── forms.js        # Dynamic form generator
│   ├── quotes.js       # Quote management
│   ├── sources.js      # Source management
│   └── ai-analysis.js  # AI pattern analysis
└── icons/              # Extension icons
```

## API Integration

The extension uses these platform API endpoints:

- `GET /api/extension/projects` - List projects
- `GET /api/extension/projects/:id` - Get project details
- `GET /api/extension/projects/:id/record-types` - List record types
- `GET /api/extension/projects/:id/record-types/:id` - Get record type with fields
- `POST /api/extension/projects/:id/record-types/:id/records` - Create record
- `GET /api/extension/projects/:id/record-types/:id/records` - List records
- `PUT /api/extension/projects/:id/record-types/:id/records/:id` - Update record

## Project Configuration

### Analysis Patterns

Projects can configure AI analysis patterns in their settings:

```json
{
  "analysis_config": {
    "patterns": [
      {
        "id": "pattern_id",
        "name": "Pattern Name",
        "description": "What to look for",
        "keywords": ["word1", "word2", "/regex/i"],
        "weight": 1.5,
        "recommendations": ["Action to take"]
      }
    ],
    "prompts": {
      "system": "Custom system prompt",
      "analysis": "Custom analysis prompt"
    }
  }
}
```

## Development

The extension uses ES modules. All library files export their classes/functions and are imported by `sidepanel.js`.

To modify:
1. Edit the relevant file in `lib/` or the main files
2. Reload the extension in `chrome://extensions/`
3. Close and reopen the side panel

## Differences from v1

| Feature | v1 (Old) | v2 (New) |
|---------|----------|----------|
| Forms | Hardcoded for ICE Deaths | Dynamic from API |
| Projects | Single project | Multi-project |
| AI Analysis | Hardcoded constitutional patterns | Configurable per-project |
| Code | 16k+ lines, monolithic | Modular, ~2k lines total |
| Maintainability | Difficult | Easy |

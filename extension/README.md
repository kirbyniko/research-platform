# ICE Deaths Research Extension

A browser extension for extracting and validating case data from news articles and documents.

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

1. Navigate to a news article or document about an ICE death
2. Click the extension icon or press `Alt+Shift+S` to open the sidebar
3. Fill in case information as you find it
4. Select text and press `Alt+Q` to add as a quote
5. Or click "Extract" to auto-extract article sentences
6. Review and verify each quote
7. Click "Save Case" to save to the database

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+Shift+S` | Open/close sidebar |
| `Alt+Q` | Add selected text as quote |
| `Alt+E` | Extract article content |

## Requirements

- The ICE Deaths web app must be running on `localhost:3001`
- You must be logged in to the web app for API access

## Notes

- Icons are SVG placeholders - replace with proper PNG icons for production
- The extension only connects to localhost (no external servers)
- All data is stored in your local PostgreSQL database

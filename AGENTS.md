# AI Usage Limits GNOME Extension - Agent Guide

## Project Overview

This is a **GNOME Shell extension** that monitors AI service usage quotas directly from the GNOME panel. It supports multiple AI providers (Synthetic, Chutes.ai, Nano-GPT) and displays usage statistics as an interactive panel indicator.

- **Extension UUID**: `hello-world@gse-ai-usage-limits.local`
- **GNOME Shell Version**: 49
- **Settings Schema**: `org.gnome.shell.extensions.ai-usage-limits`
- **Gettext Domain**: `gse-ai-usage-limits`

## Essential Commands

### Allowed Commands (NPM only)

```bash
# Lint JavaScript files - REQUIRED after any JS changes
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format

# Generate settings schema
npm run generate-schema

# Validate settings schema
npm run validate-schema

# Compile translations
npm run compile-translations
```

### Prohibited Operations

**DO NOT install or test the extension** - Installation, testing, and any GNOME Shell manipulation is strictly prohibited.

- Do not run `install.sh` or `dev.sh`
- Do not copy files to extensions directory
- Do not restart GNOME Shell
- Do not enable/disable extensions
- Do not modify any system files or directories
- **Do not run `make` commands** - this project uses npm scripts, not make

The user will handle all installation and testing personally.

### Restart GNOME Shell

- **Wayland**: Log out and log back in
- **X11**: Press `Alt+F2`, type `r`, press Enter

## Code Organization

### Directory Structure

```
src/
├── extension.js              # Main extension entry point
├── prefs.js                  # Preferences dialog (GNOME Extensions app)
├── stylesheet.css            # Extension styles
├── metadata.json             # Extension metadata and version
├── locale.js                 # Internationalization utilities
├── providers/                # Provider definitions and config
│   └── ProviderConfig.js     # Centralized provider configurations
├── services/                 # Core business logic
│   ├── ApiService.js         # HTTP API client for providers
│   ├── ProviderStateManager.js  # Centralized state management
│   ├── QuotaProcessor.js     # Data processing and calculations
│   └── SettingsManager.js    # Settings abstraction layer
└── widgets/                  # UI Components
    ├── CircularProgress.js   # Custom circular progress widget
    ├── ContextMenu.js        # Right-click context menu
    ├── NoProvidersMsgBox.js  # Empty state widget
    ├── ProviderDropdown.js   # Provider selector dropdown
    ├── RefreshButton.js      # Manual refresh button
    └── StatusDetails.js      # Usage statistics display

scripts/                      # Build/development scripts
po/                           # Translation files
schemas/                      # GNOME settings schemas (compiled .gschema.xml)
```

### Key Architectural Patterns

1. **Provider Configuration Pattern**: All provider definitions centralized in `ProviderConfig.js`
   - Each provider has: id, name, API URL, parse function, schema definition
   - Example: `synthetic`, `chutes`, `nanogpt`

2. **State Management**: `ProviderStateManager` acts as single source of truth
   - Emits GObject signals: `provider-changed`, `providers-updated`, `current-provider-invalid`
   - Reactive programming model - components react to state changes

3. **Service Layer**: Separation between data fetching (`ApiService`), state (`ProviderStateManager`), and processing (`QuotaProcessor`)

4. **Pure Functions**: `QuotaProcessor` uses static pure functions for data transformations

## Code Conventions

### JavaScript Style

- **ES2022** modules with dynamic imports
- **Tab width**: 4 spaces (no tabs)
- **Semicolons**: Required
- **Quotes**: Single quotes
- **Line width**: 120 characters
- **Arrow functions**: Use `avoid` for arrow parens
- **Trailing commas**: None

### GNOME Shell Conventions

- **GObject classes**: Use `GObject.registerClass()` for custom widgets
- **Private fields**: Use JavaScript `#privateField` syntax
- **Underscore prefix (`_`)**: Common convention for private/internal methods and properties
  - Methods/properties prefixed with `_` are considered private and should not be accessed externally
  - Examples: `_init()`, `_signalId`, `_updateUI()`, `_cleanup()`
  - This convention is widely used throughout GNOME Shell extensions and indicates internal implementation details
  - Unlike `#privateField`, the `_` prefix is a naming convention rather than enforced privacy
  - Use `_` for internal helper methods, cached values, and signal handler IDs
- **Memory management**: Always disconnect signals and destroy objects in `disable()`
- **Error handling**: Use try/catch with user-friendly error messages
- **St widget styling**: Use `style_class` for CSS classes, `style` for inline styles

### Import Patterns

```javascript
// GI imports (GNOME libraries)
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import GLib from 'gi://GLib';

// Shell UI imports
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

// Extension imports
import ApiService from './services/ApiService.js';
```

### CSS Styling Conventions

- **Extension-specific prefix**: All CSS class names must use the `ai-usage-` prefix
- **Purpose**: Prevents style conflicts with other GNOME Shell extensions and core GNOME Shell styles
- **Pattern**: `.ai-usage-{descriptive-name}` (e.g., `.ai-usage-progress-label`, `.ai-usage-provider-button`)

#### Why CSS Namespacing Matters

GNOME Shell loads all extension stylesheets into the same global CSS context. Without a unique prefix, generic class names could unintentionally override styles from:
- Other extensions
- GNOME Shell's core styles
- User themes

#### Examples

```css
/* ✅ Correct - namespaced */
.ai-usage-progress-label { font-size: 16px; }
.ai-usage-provider-button { background-color: rgba(255, 255, 255, 0.08); }
.ai-usage-dropdown-box { border-radius: 6px; }

/* ❌ Incorrect - could conflict */
.progress-label { font-size: 16px; }
.button { background-color: transparent; }
```

#### Applying CSS Classes in JavaScript

```javascript
// Add the namespaced class to widgets
this.add_style_class_name('ai-usage-main-container');
this.add_style_class_name('ai-usage-progress-label');
```

#### Naming Guidelines

| Practice | Example | Purpose |
|----------|---------|---------|
| **Extension prefix** | `ai-usage-` | Unique namespace |
| **Descriptive suffix** | `-progress-label`, `-provider-button` | Clear purpose |
| **Consistent casing** | kebab-case throughout | Matches GNOME conventions |

The `ai-usage-` prefix is derived from the extension's purpose (AI Usage Limits) and is chosen for its brevity, descriptiveness, and low likelihood of conflicts with other extensions.

## Development Workflow

1. **Make code changes**
2. **Run linting**: `npm run lint` (REQUIRED for all JS changes)
3. **Fix any linting errors** before proceeding
4. **Stop** - Do not attempt to install, test, or run the extension

The user will handle installation and testing manually. Only provide the modified code.

### Viewing Logs

**Do not view logs** - Log monitoring and debugging is handled by the user.

## Common Gotchas

### Memory Leaks

- Always disconnect signals using the handler ID
- Destroy all St widgets in `disable()` method
- Clean up resources in `destroy()` methods
- ProviderStateManager manages its own cleanup

### Async Operations

- API calls are async - use try/catch for error handling
- Check if widgets still exist before manipulating them after async operations
- Use Clutter idle processing for UI updates

### Clutter/GTK Version Mismatches

- This extension targets GNOME Shell 49
- Some APIs may differ between versions
- Test changes on target GNOME version

### Settings Schema

- Changes to `gschema.xml` require recompilation: `npm run generate-schema`
- Schema must match keys defined in `ProviderConfig.js`
- Settings values are cached - changes may require extension restart

### Translation Support

- Use `Locale.gettext()` for translated strings
- Use `Locale.pgettext()` for context-specific translations
- Update `po/template.pot` when adding new translatable strings

## Widget Development

### Custom Widget Pattern

```javascript
const MyWidget = GObject.registerClass(
    class MyWidget extends St.Widget {
        _init(params) {
            super._init({
                style_class: 'my-widget',
                ...params
            });
            // Initialization
        }
    }
);
```

### Signal Connection Pattern

```javascript
// Connect
this._signalId = object.connect('signal-name', (obj, ...args) => {
    // Handler
});

// Disconnect (in disable/destroy)
if (this._signalId) {
    object.disconnect(this._signalId);
    this._signalId = null;
}
```

## ESLint Configuration

- Uses ESLint 9 with flat config (`eslint.config.js`)
- **Enforced rules**:
  - Prettier formatting (enforced)
  - Unused vars warning (allows `_` prefix)
  - Semicolons required
  - JSDoc type validation
- **Ignored**: `schemas/`, `*.sh`, CSS, JSON, compiled files
- **Globals**: GNOME Shell globals (`ARGV`, `print`, `log`, `imports`, etc.)

## Scripts Reference

- **compile-translations.js**: Compiles .po files to .mo format (run via npm)
- **generate-schema.js**: Auto-generates gschema.xml from ProviderConfig.js (run via npm)
- **validate-schema.js**: Validates schema format (run via npm)

**Note**: Do not execute shell scripts directly. Use npm commands instead.

## API Requests

The extension uses Soup 3 for HTTP:
- Simple GET requests with Bearer token auth
- Async operations with callbacks
- Error handling for network failures and HTTP errors
- Timeout handling via GLib.PRIORITY_DEFAULT

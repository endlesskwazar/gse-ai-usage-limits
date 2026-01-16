# AI Usage Limits GNOME Shell Extension

A GNOME Shell extension that monitors your AI service usage quotas directly from your panel.

## Features

- **Real-time Monitoring**: Track your API usage limits for supported AI services
- **Multi-provider Support**: Currently supports Synthetic and Chutes.ai APIs

## Supported Services

### Current Providers
1. **Synthetic** - API quota monitoring for Synthetic.ai
2. **Chutes.ai** - Usage tracking for Chutes.ai services

### Planned Providers
- Nano-GPT
- GLM Coding Plan
- Claude Code
- Custom

## Installation

### Manual Installation

1. Clone or download this repository:
   ```bash
   git clone https://github.com/endlesskwazar/gse-ai-usage-limits.git
   cd gse-ai-usage-limits
   ```

2. Run the install script:
   ```bash
   ./install.sh
   ```

3. Restart GNOME Shell:
   - **Wayland**: Log out and log back in
   - **X11**: Press Alt+F2, type 'r', and press Enter

4. Enable the extension:
   ```bash
   gnome-extensions enable hello-world@gse-ai-usage-limits.local
   ```

### Development Installation

For development and testing:

```bash
./dev.sh
```

This script installs the extension and launches a nested GNOME Shell session for testing.

## Configuration

### Setting API Keys

1. Open GNOME Extensions application
2. Find "AI Usage Limits Hello World" in your extensions list
3. Click the settings (gear) icon
4. Enter your API keys for each service:
   - **Synthetic**: Your Synthetic API key
   - **Chutes.ai**: Your Chutes.ai API key

### Getting API Keys

- **Synthetic**: Visit [synthetic.new](https://synthetic.new) and obtain your API key from the dashboard
- **Chutes.ai**: Visit [chutes.ai](https://chutes.ai) and get your API key from account settings

## Requirements

- GNOME Shell 49 or higher
- Internet connection for API calls
- Valid API keys for the services you want to monitor

## License

This project is licensed under the GPL-3.0 License - see the LICENSE file for details.

---

**Note**: This extension is not affiliated with any of the AI service providers it monitors. It simply provides a convenient interface to access publicly available API usage information.
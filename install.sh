#!/bin/bash

# UUID matches metadata.json
UUID="hello-world@gse-ai-usage-limits.local"
DEST="$HOME/.local/share/gnome-shell/extensions/$UUID"

echo "Installing extension to $DEST..."

# Remove old version if it exists to ensure clean install
if [ -d "$DEST" ]; then
    rm -rf "$DEST"
fi

mkdir -p "$DEST"
cp -r src/* "$DEST"

echo "Installation complete!"
echo "UUID: $UUID"
echo ""
echo "Next steps:"
echo "1. If you are on Wayland, you must log out and log back in."
echo "   If you are on X11, press Alt+F2, type 'r', and press Enter."
echo "2. Enable the extension:"
echo "   gnome-extensions enable $UUID"

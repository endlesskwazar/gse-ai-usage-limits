#!/bin/bash

# UUID matches metadata.json
UUID="hello-world@gse-ai-usage-limits.local"

# Regenerate schema from providers
echo "Regenerating schema from providers..."
npm run generate-schema

# Validate the generated schema
echo "Validating schema..."
npm run validate-schema

# Install the latest changes
./install.sh

# Run the nested GNOME Shell session
echo "Starting nested GNOME Shell..."
echo "Press Ctrl+C to exit."

# Start Shell in background inside the dbus session
dbus-run-session -- bash -c "gnome-shell --devkit & SHELL_PID=\$!
sleep 5
gnome-extensions enable $UUID
wait \$SHELL_PID"

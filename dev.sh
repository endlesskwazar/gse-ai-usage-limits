#!/bin/bash

# UUID matches metadata.json
UUID="hello-world@gse-ai-usage-limits.local"

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

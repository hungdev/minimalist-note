#!/bin/bash
# Script to initialize notes data directory on host

NOTES_DIR="/home/ubuntu/notes-data"

echo "Initializing notes directory at $NOTES_DIR..."

# Create directory if it doesn't exist
if [ ! -d "$NOTES_DIR" ]; then
    mkdir -p "$NOTES_DIR"
    echo "Created directory: $NOTES_DIR"
else
    echo "Directory already exists: $NOTES_DIR"
fi

# Set permissions
chmod 755 "$NOTES_DIR"
echo "Set permissions: 755"

echo "Notes directory is ready!"

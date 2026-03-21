#!/bin/bash
# Local development setup script for epub-migration-showcase
# This clones foliate-js for local testing (it's gitignored)

set -e

echo "Setting up local development environment..."

# Check if foliate-js directory already exists
if [ -d "foliate-js" ]; then
    echo "✓ foliate-js directory already exists"
    echo "  To update, run: cd foliate-js && git pull"
else
    echo "Cloning foliate-js..."
    git clone --depth 1 https://github.com/johnfactotum/foliate-js.git foliate-js
    echo "✓ foliate-js cloned successfully"
fi

echo ""
echo "Setup complete! You can now run:"
echo "  python3 -m http.server 8080"
echo ""
echo "Then open: http://localhost:8080"

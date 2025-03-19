#!/bin/bash

# Parse arguments
DEBUG_MODE=false
DIAGNOSTIC_MODE=false

for arg in "$@"
do
    case $arg in
        --debug)
        DEBUG_MODE=true
        shift
        ;;
        --diagnostic)
        DIAGNOSTIC_MODE=true
        shift
        ;;
    esac
done

# Create a build directory
mkdir -p build

# Copy files to the build directory
cp -r *.html *.css images README.md build/
cp manifest.json build/

# Handle special modes
if [ "$DIAGNOSTIC_MODE" = true ]; then
    echo "Building in DIAGNOSTIC MODE - using service-worker-tests.js as background.js"
    cp service-worker-tests.js build/background.js
    cp popup.js build/
    cp test-apis.js build/
else
    # Normal build
    cp background.js build/
    cp popup.js build/
    cp test-apis.js build/
fi

# Add debug information if in debug mode
if [ "$DEBUG_MODE" = true ]; then
    echo "Adding debug information to build..."
    echo "// Debug build created on $(date)" >> build/background.js
    echo "// Debug build created on $(date)" >> build/popup.js
fi

echo "Extension has been built in the 'build' directory"

if [ "$DIAGNOSTIC_MODE" = true ]; then
    echo "DIAGNOSTIC MODE ENABLED - Using test service worker"
fi

if [ "$DEBUG_MODE" = true ]; then
    echo "DEBUG MODE ENABLED - Extra logging included"
fi

echo ""
echo "To load the extension in Chrome:"
echo "1. Open Chrome and go to chrome://extensions"
echo "2. Enable Developer Mode (toggle in top-right)"
echo "3. Click 'Load unpacked' and select the 'build' directory"

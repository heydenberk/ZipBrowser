cat src/*.coffee | coffee -c -s > dist/zipbrowser.js; cp -rf dist/ "$1"
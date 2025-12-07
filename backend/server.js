// Compatibility shim so running `node server.js` works
// It simply delegates to the actual server entry point at `src/server.js`.
require('./src/server');

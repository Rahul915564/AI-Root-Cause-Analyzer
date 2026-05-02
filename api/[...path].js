// Vercel serverless function — handles all /api/* routes
// The Express app is pre-bundled by build.vercel.mjs before this runs
const { default: app } = require("../artifacts/api-server/dist/vercel-app.cjs");
module.exports = app;

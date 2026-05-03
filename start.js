const path = require('path');
process.env.NODE_ENV = 'production';

// Start Express server directly
const app = require('./artifacts/api-server/dist/vercel-app.cjs');

const PORT = process.env.PORT || 3000;
if (app && app.listen) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

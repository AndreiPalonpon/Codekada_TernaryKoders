const mongoose = require('mongoose');
const fs = require('fs');

// We need to use require for models in a plain node script
// Since the project uses ESM (next.js), we might need to handle imports carefully
// Or just define the schemas again or use a dynamic import if supported.
// Actually, the models in src/models use 'import', so a plain node script might struggle 
// unless we use --experimental-modules or similar.

// Let's create a more 'Next.js friendly' way by adding more tests to src/app/api/test-db/route.js
// and then calling it from Cypress. This ensures we use the actual project models and configuration.

async function runTests() {
  console.log('--- Starting Data Model Unit Tests ---');
  
  // Load ENV
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const match = envContent.match(/MONGODB_URI="(.*)"/);
  const uri = match[1];

  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB Atlas');

    // Dynamically importing models (requires Node 18+)
    // Note: This assumes the models don't have too many dependencies that break in plain node
    // Since they only import mongoose, it should be fine.
    
    // However, to be safe and consistent with the project's Next.js environment,
    // I will enhance the existing /api/test-db route to include more edge cases
    // and then update the Cypress test to verify the response.
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

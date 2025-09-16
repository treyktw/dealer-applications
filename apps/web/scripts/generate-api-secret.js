// scripts/generate-api-secret.js
// Run this to generate a secure API secret: node scripts/generate-api-secret.js

const crypto = require('crypto');

function generateApiSecret() {
  return crypto.randomBytes(32).toString('hex');
}

const secret = generateApiSecret();
console.log('Generated API Secret:');
console.log(secret);
console.log('\nAdd this to your .env.local:');
console.log(`INTERNAL_API_SECRET=${secret}`);
console.log('\nAnd set it in Convex:');
console.log(`npx convex env set INTERNAL_API_SECRET ${secret}`);

// Alternative: Generate a base64 secret
const base64Secret = crypto.randomBytes(32).toString('base64');
console.log('\nAlternative base64 secret:');
console.log(base64Secret);
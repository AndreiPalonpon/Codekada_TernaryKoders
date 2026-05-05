const fs = require('fs');
const mongoose = require('mongoose');

const envContent = fs.readFileSync('.env.local', 'utf8');
const match = envContent.match(/MONGODB_URI="(.*)"/);
const uri = match[1];

console.log('Connecting to', uri.split('@')[1] || uri); // Don't log password

mongoose.connect(uri)
  .then(() => {
    console.log('Successfully connected to MongoDB Atlas');
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection failed:', err.message);
    process.exit(1);
  });

const path = require('path');

const config = {
  // ... existing config ...
  output: {
    path: path.resolve(__dirname, '../dist'),
    publicPath: process.env.NODE_ENV === 'production' 
      ? '/your-repo-name/'  // Replace with your actual repo name
      : '/',
  },
  // ... rest of config ...
}; 
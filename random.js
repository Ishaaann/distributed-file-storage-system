const fs = require('fs');

// Initialize the stream to a destination file
const writeStream = fs.createWriteStream('output.txt');

// Write chunks of data
writeStream.write('Hello, this is the first line.\n');
writeStream.write('Writing more data efficiently...\n');

// Safely close the stream when done
writeStream.end();

// Handle completion and lifecycle events
writeStream.on('finish', () => {
  console.log('All data has been successfully written to disk.');
});

writeStream.on('error', (err) => {
  console.error('An error occurred during writing:', err.message);
});

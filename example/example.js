const Hapi = require('hapi');
const port = process.env.PORT || 8080;
const server = new Hapi.Server();
const fs = require('fs');
const path = require('path');

server.connection({ port });

server.register([
  {
    register: require('../'),
    options: {
      imagemagick: false,
      maxBytes: 30000,
    }
  }
], (err) => {
  if (err) {
    throw err;
  }
  const testImageBase = 'snoopy.jpg';
  const testImage = path.join(__dirname, testImageBase);
  const stream = fs.createReadStream(testImage);
  server.methods.uploadToS3(stream, {
    bucket: process.env.AWS_BUCKET,
    profile: process.env.AWS_PROFILE
  }, (uploadErr, response) => {
    if (uploadErr) {
      console.log(uploadErr);
    }
    console.log(response);
  });
});

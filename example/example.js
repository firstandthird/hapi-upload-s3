const Hapi = require('hapi');
const port = process.env.PORT || 8080;
const server = new Hapi.Server({ port });
const fs = require('fs');
const path = require('path');

const f = async() => {
  await server.register([
    {
      plugin: require('../'),
      options: {
        imagemagick: false,
        maxBytes: 30000,
      }
    }
  ]);
  const testImageBase = 'snoopy.jpg';
  const testImage = path.join(__dirname, testImageBase);
  const stream = fs.createReadStream(testImage);
  try {
    const response = await server.methods.uploadToS3(stream, {
      bucket: process.env.AWS_BUCKET,
      profile: process.env.AWS_PROFILE
    });
    console.log(response);
  } catch (err) {
    console.log(err);
  }
};

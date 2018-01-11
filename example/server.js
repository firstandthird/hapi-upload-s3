const Hapi = require('hapi');
const port = process.env.PORT || 8080;
const fs = require('fs');
const path = require('path');

const server = new Hapi.Server({ port });

const f = async () => {
  await server.register([
    {
      plugin: require('../'),
      options: {
        maxBytes: 30000,
        profile: process.env.AWS_PROFILE,
        bucket: process.env.AWS_BUCKET
      }
    }
  ]);
  server.route({
    path: '/',
    method: 'GET',
    handler: (request, h) => {
      return fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    }
  });
  await server.start();
  console.log('Hapi server started @', server.info.uri);
};

f();

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
      imagemagick: true,
      maxBytes: 30000
    }
  }
], (err) => {
  if (err) {
    throw err;
  }

  server.route([
    {
      path: '/',
      method: 'GET',
      handler: (request, reply) => {
        fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (fileErr, html) => {
          if (fileErr) {
            return reply(err);
          }
          reply(html);
        });
      }
    },
    {
      path: '/{param*}',
      method: 'GET',
      handler: {
        directory: {
          path: '.'
        }
      }
    }
  ]);
  server.start(() => {
    console.log('Hapi server started @', server.info.uri);
  });
});

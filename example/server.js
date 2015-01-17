var Hapi = require('hapi');
var port = process.env.PORT || 8080;
var server = new Hapi.Server();
var fs = require('fs');

server.connection({ port: port });

server.register([
  {
    register: require('../'),
    options: {
      s3AccessKey: '',
      s3SecretAccessKey: '',
      s3Region: 'us-east-1',
      s3Bucket: '',
      contentTypes: ['image/jpeg']
    }
  }
], function(err) {
  if (err) {
    throw err;
  }

  server.route([
    {
      path: '/',
      method: 'GET',
      handler: function(request, reply) {
        fs.readFile(__dirname + '/index.html', 'utf8', function(err, html) {
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
  server.start(function() {
    console.log('Hapi server started @', server.info.uri);
  });
});

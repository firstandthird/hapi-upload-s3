const Boom = require('boom');
const Joi = require('joi');
const slug = require('slug');
const s3put = require('s3put');

// Forces slug to use url encoding
slug.defaults.mode = 'rfc3986';

module.exports = (plugin, options, next) => {
  options = options || {};

  const endpoint = options.endpoint || '/upload';

  // one route with query params for resize/crop
  plugin.route({
    config: {
      payload: {
        output: 'stream',
        maxBytes: options.maxBytes || 1048576 // Hapi default (1MB)
      },
      validate: {
        payload: {
          file: Joi.any().required()
        },
        query: {
          quality: Joi.number(),
          x: Joi.number(),
          y: Joi.number(),
          height: Joi.number(),
          width: Joi.number()
        }
      },
    },
    path: endpoint,
    method: 'POST',
    handler: (request, reply) => {
      // make sure payload is palatable to s3put:
      const file = request.payload.file;
      if (!file.hapi.filename) {
        return reply(Boom.badData('must be a file'));
      }
      if (options.contentTypes.length && options.contentTypes.indexOf(file.hapi.headers['content-type']) === -1) {
        return reply(Boom.unsupportedMediaType('content-type not allowed'));
      }
      file.path = file.hapi.filename;
      // pass any crop/compress options:
      const query = request.query;
      options.quality = query.quality;
      if (query.width && query.height) {
        options.size = [query.width, query.height];
      }
      if (query.x && query.y) {
        options.position = [query.x, query.y];
      }
      options.gravity = query.gravity;
      // call s3put to handle the upload:
      s3put(file, options, (err, response) => {
        if (err) {
          plugin.log(err);
        }
        reply(response);
      });
    }
  });
  next();
};

module.exports.attributes = {
  name: 'hapi-upload-s3',
  pkg: require('../package.json')
};

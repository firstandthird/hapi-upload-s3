const Boom = require('boom');
const Joi = require('joi');
const Hoek = require('hoek');
const slug = require('slug');
const s3put = require('s3put');

// Forces slug to use url encoding
slug.defaults.mode = 'rfc3986';

module.exports = (plugin, options, next) => {

  options = options || {};

  const endpoint = options.endpoint || '/upload';
  //   bucketName: options.s3Bucket,

  const maxBytes = {
    payload: {
      maxBytes: options.maxBytes || 1048576 // Hapi default (1MB)
    }
  };

  // one route with query params for resize/crop
  plugin.route({
    config: {
      payload: {
        output: 'stream'
      },
      validate: {
        payload: {
          file: Joi.any().required()
        },
        query: {
          quality: Joi.number(),
          position: [Joi.number(), Joi.number()],
          size: [Joi.number(), Joi.number()]
        }
      },
    },
    path: endpoint,
    method: 'POST',
    // config: Hoek.applyToDefaults(handler.upload, maxBytes),
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
      Object.keys(request.query).forEach((paramName) => {
        // position and size should be comma-separated string containing the 2 values:
        if (['position', 'size'].indexOf(paramName) > -1) {
          options[paramName] = request.query[paramName].split(',');
        } else {
          options[paramName] = request.query[paramName];
        }
      });
      console.log('configured options is:');
      console.log(options);
      // call s3put to handle the upload:
      s3put(file, options, (err, response) => {
        console.log('replying now');
        reply(response);
      });
    }
  });
    // { path: endpoint, method: 'POST', config: Hoek.applyToDefaults(handler.upload, maxBytes) },
    // { path: endpoint + '/image/{type}/{width}/{height}', method: 'POST', config: Hoek.applyToDefaults(handler.image, maxBytes) }
  next();
};

module.exports.attributes = {
  name: 'hapi-upload-s3',
  pkg: require('../package.json')
};

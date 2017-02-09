const Boom = require('boom');
const Joi = require('joi');
const s3put = require('s3put');
const aug = require('aug');

const defaultOptions = {
  endpoint: '/upload', // endpoint where images should be POSTed
  contentTypes: [], // list of mime-types the endpoint accepts
  bucket: false,
  profile: false,
  quality: 100, // images aren't compressed by default
  maxUploadSize: 1 // in mb
};

module.exports = (server, options, next) => {
  options = aug({}, defaultOptions, options);

  if (!options.profile) {
    if (!options.access_key && !options.secret_key) {
      return next('You must specify either a profile or an access/secret key to use AWS.');
    }
  }
  if (!options.bucket) {
    return next('You must specify a bucket name that you want to upload to.');
  }

  // one route with query params for resize/crop
  server.route({
    config: {
      payload: {
        output: 'stream',
        maxBytes: options.maxUploadSize * (1024 * 1024) // convert to bytes for hapi
      },
      validate: {
        payload: {
          file: Joi.any().required()
        }
      },
    },
    path: options.endpoint,
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
      // call s3put to handle the upload:
      s3put(file, options, (err, response) => {
        if (err) {
          return reply(err);
        }
        reply(null, response);
      });
    }
  });
  // also expose a plugin method on hapi server:
  server.method('uploadToS3', (file, callback) => {
    s3put(file, options, callback);
  });
  next();
};

module.exports.attributes = {
  pkg: require('./package.json')
};

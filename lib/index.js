const Boom = require('boom');
const Joi = require('joi');
const slug = require('slug');
const s3put = require('s3put');
const defaults = require('lodash.defaults');
// Forces slug to use url encoding
slug.defaults.mode = 'rfc3986';

const defaultOptions = {
  endpoint: '/upload', // endpoint where images should be POSTed
  contentTypes: [], // list of mime-types the endpoint accepts
  bucket: process.env.AWS_BUCKET,
  profile: process.env.AWS_PROFILE,
  quality: 100, // images aren't compressed by default
  maxUploadSize: 1 // in mb
};

module.exports = (plugin, options, next) => {
  options = defaults(options, defaultOptions);
  if (!options.profile) {
    if (!options.access_key && !options.secret_key) {
      return next('You must specify either a profile or an access/secret key to use AWS.');
    }
  }
  if (!options.bucket) {
    return next('You must specify a bucket name that you want to upload to.');
  }

  // one route with query params for resize/crop
  plugin.route({
    config: {
      payload: {
        output: 'stream',
        maxBytes: options.maxUploadSize * (1024 * 1024) // convert to bytes for hapi
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
          width: Joi.number(),
          gravity: Joi.string()
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
      // pass any crop/compress options:
      const query = request.query;
      options.quality = query.quality ? query.quality : options.quality;
      if (query.width && query.height) {
        options.size = [query.width, query.height];
      }
      if (query.x && query.y) {
        options.position = [query.x, query.y];
      }
      options.gravity = query.gravity;
      if (query.acl) {
        options.acl = query.acl;
      }
      if (query.host) {
        options.host = query.host;
      }
      // call s3put to handle the upload:
      s3put(file, options, (err, response) => {
        if (err) {
          plugin.log(err);
        }
        reply(response);
      });
    }
  });
  // also expose a plugin method on hapi server:
  plugin.method('uploadToS3', (file, callback) => {
    s3put(file, options, callback);
  });
  next();
};

module.exports.attributes = {
  name: 'hapi-upload-s3',
  pkg: require('../package.json')
};

var handler = require('./handler');
var AWS = require('aws-sdk');
var datefmt = require('datefmt');

module.exports = function(plugin, options, next) {

  options = options || {};

  var endpoint = options.endpoint || '/upload';

  options.contentTypes = options.contentTypes || [];

  var s3 = new AWS.S3({
    accessKeyId: options.s3AccessKey,
    secretAccessKey: options.s3SecretAccessKey,
    region: options.s3Region
  });

  var getFileKey = function(filename) {
    var fileKey = datefmt('%Y-%m-%d', new Date()) + '/' + (+new Date) + '/' + filename;
    return fileKey;
  };

  var getS3Url = function(fileKey) {
    var s3UrlBase = 'https://'+options.s3Bucket+'.s3.amazonaws.com/';
    return s3UrlBase + fileKey;
  };

  plugin.bind({
    options: options,
    s3: s3,
    bucketName: options.s3Bucket,
    Hapi: plugin.hapi,
    getFileKey: options.getFileKey || getFileKey,
    getS3Url: options.getS3Url || getS3Url
  });

  plugin.route([
    { path: endpoint, method: 'POST', config: handler.upload },
    { path: endpoint + '/image/{type}/{width}/{height}', method: 'POST', config: handler.image }
  ]);
  next();
};

module.exports.attributes = {
  name: 'hapi-upload-s3',
  pkg: require('../package.json')
};

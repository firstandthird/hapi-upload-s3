var s3Stream = require('s3-upload-stream');
var Joi = require('joi');
var gm = require('gm');
var Boom = require('boom');

exports.upload = {
  payload: {
    output: 'stream'
  },
  validate: {
    payload: {
      file: Joi.any().required()
    }
  },
  handler: function(request, reply) {
    var self = this;
    var file = request.payload.file;
    
    if (!file.hapi.filename) {
      return reply(Boom.badData('must be a file'));
    }

    if (this.options.contentTypes.length && this.options.contentTypes.indexOf(file.hapi.headers['content-type']) === -1) {
      return reply(Boom.unsupportedMediaType('content-type not allowed'));
    }

    var fileKey = this.getFileKey(file.hapi.filename);

    var upload = s3Stream(this.s3).upload({
      'Bucket': self.bucketName,
      'Key': fileKey,
      'ContentType': file.hapi.headers['content-type']
    });

    upload.on('error', function(err) {
      reply(Boom.wrap(err, 500, 'put'));
    });

    upload.on('uploaded', function(data) {
      reply(self.getS3Url(fileKey));
    });

    file.pipe(upload);
  }
};

exports.image = {
  payload: {
    output: 'stream'
  },
  validate: {
    params: {
      type: Joi.valid('crop', 'extent'),
      width: Joi.number(),
      height: Joi.number()
    }
  },
  handler: function(request, reply) {
    var self = this;
    var file = request.payload.file;
    
    if (!file.hapi.filename) {
      return reply(Boom.badData('must be a file'));
    }

    if (this.options.contentTypes.length && this.options.contentTypes.indexOf(file.hapi.headers['content-type']) === -1) {
      return reply(Boom.unsupportedMediaType('content-type not allowed'));
    }

    var fileKey = this.getFileKey(file.hapi.filename);

    var w = request.params.width;
    var h = request.params.height;
    var type = request.params.type;

    gm(file)
      .resize(w, h, '^')
      .gravity('Center')
      [type](w, h)
      .quality(80)
      .stream(function(err, stdout, stderr) {
        if (err) {
          return reply(Boom.wrap(err, 500, 'gm'));
        }

        var buf = new Buffer(0);
        stdout.on('data', function(d) {
          buf = Buffer.concat([buf, d]);
        });
        stdout.on('end', function() {
          var data = {
            Bucket: self.bucketName,
            Key: fileKey,
            Body: buf,
            ContentType: file.hapi.headers['content-type']
          };
          self.s3.putObject(data, function(err, resp) {
            if (err) {
              return reply(Boom.wrap(err, 500, 'put'));
            }
            return reply(self.getS3Url(fileKey));
          });
        });

        /*
        new Uploader({
          accessKeyId: self.options.s3AccessKey,
          secretAccessKey: self.options.s3SecretAccessKey,
          region: self.options.s3Region
        }, {
            'Bucket': self.bucketName,
            'Key': fileKey,
            'ContentType': file.hapi.headers['content-type']
          }, function (err, uploadStream) {
            if(err) {
              return reply(self.Hapi.error.internal('upload to s3', err));
            }
            uploadStream.on('error', function() {
              console.log(arguments);
            });
            uploadStream.on('uploaded', function (data) {
              return reply(self.getS3Url(fileKey));
            });

            stdout.pipe(uploadStream);
            stdout.on('error', function() {
              console.log('error', arguments);
            });
            stdout.on('end', function() {
              console.log('end', arguments);
            });
          }
        );
        */
      });
  }
};

var Uploader = require('s3-upload-stream').Uploader;
var Joi = require('joi');
var gm = require('gm');

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
      return reply(this.Hapi.error.badRequest('must be a file'));
    }
    var fileKey = this.getFileKey(file.hapi.filename);

    new Uploader({
      s3Client: this.s3
    }, {
        'Bucket': self.bucketName,
        'Key': fileKey,
        'ContentType': file.hapi.headers['content-type']
      }, function (err, uploadStream) {
        if(err) {
          return reply(err);
        }
        uploadStream.on('uploaded', function (data) {
          return reply(self.getS3Url(fileKey));
        });

        file.pipe(uploadStream);
      }
    );

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
      return reply(this.Hapi.error.badRequest('must be a file'));
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
          return reply(self.Hapi.error.internal('gm', err));
        }

        var buf = new Buffer(0);
        stdout.on('data', function(d) {
          buf = Buffer.concat([buf, d]);
        });
        stdout.on('end', function() {
          var data = {
            Bucket: self.bucketName,
            Key: fileKey,
            Body: buf
          };
          self.s3.putObject(data, function(err, resp) {
            if (err) {
              return reply(self.Hapi.error.internal('put', err));
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

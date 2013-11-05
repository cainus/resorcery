var should = require('should');
var hottap = require('hottap').hottap;
var _ = require('underscore');
var route = require('../index').route;
var resource = require('../index').resource;
var http = require('http');
var hottap = require('hottap').hottap;
var request = require('request');
var server;


var testRequest = function(resourceObject, method, cb){
  var url = '/blah';
  server = http.createServer(
    route(url, resource(resourceObject))
  ).listen(8888, function(){
    request(
      {url:"http://localhost:8888/blah", method:method}, 
      function(err, res, body){
        return cb(err, res, body);
      });
  });
};



describe('resource', function(){
  afterEach(function(done){
    server.close(function(){
      done();
    }); 
  });

  describe('#OPTIONS', function(){
    it ('returns possible methods in the Allow header', function(done){
      testRequest(
        {
          GET : function(req, res){res.end('not here');}
        },
        'OPTIONS',
        function(err, res, body){
          res.headers.allow.should.equal('GET,HEAD,OPTIONS');
          body.should.equal('');
          done();
        }
      );
    });
    it ('can be overridden in the input', function(done){
      testRequest(
        {
            OPTIONS : function(req, res){
              res.setHeader('Content-Type', 'plain/text');
              res.writeHead(200);
              res.end('this feels so wrong');
            },
            GET : function(req, res){
              res.end('not here');
            }
        },
        'OPTIONS',
        function(err, res, body){
          res.statusCode.should.equal(200);
          res.headers['content-type'].should.equal('plain/text');
          body.should.equal('this feels so wrong');
          done();
        }
      );
    });
  });



  describe('#HEAD', function(){
    it ('can be overridden in the input', function(done){
      testRequest(
        {
          HEAD : function(req, res){
            res.setHeader('Content-Type', 'plain/text');
            res.writeHead(404);
            res.end('this feels so wrong');
          },
          GET : function(req, res){
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(200);
            res.end('some random GET');
          }
        },
        'HEAD',
        function(err, res, body){
          res.statusCode.should.equal(404);
          res.headers['content-type'].should.equal('plain/text');
          body.should.equal('');
          done();
        }
      );
    });
    it ('returns an empty body with the same headers as GET', function(done){
      testRequest(
        {
          GET : function(req, res){
            res.setHeader('Content-Type', 'plain/text');
            res.writeHead(200);
            res.write('test');
            res.end('not here');
          }
        },
        'HEAD',
        function(err, res, body){
          res.statusCode.should.equal(200);
          res.headers['content-type'].should.equal('plain/text');
          body.should.equal('');
          done();
        }
      );
    });
    it ("405s for HEAD if GET isn't implemented", function(done){
      testRequest(
        {
          POST : function(req, res){res.end('not here');}
        },
        'HEAD',
        function(err, res, body){
          res.statusCode.should.equal(405);
          res.headers.allow.should.equal('POST,OPTIONS');
          body.should.equal('');
          done();
        }
      );
    });
  });

  describe('fetch', function(){
    it ('fetches for OPTIONS', function(done){
      testRequest(
        {
          fetch : function(req, res, cb){
            return cb(true);
          },
          OPTIONS : function(req, res){
            res.writeHead(200);
            res.end();
          }
        },
        'OPTIONS',
        function(err, res, body){
          res.statusCode.should.equal(404);
          done();
        }
      );
    });

    it ('fetches for PUT', function(done){
      testRequest(
        {
          fetch : function(req, res, cb){
            return cb(true);
          },
          PUT : function(req, res){
            res.writeHead(200);
            res.end();
          }
        },
        'PUT',
        function(err, res, body){
          res.statusCode.should.equal(404);
          done();
        }
      );
    });

    it ('fetches for HEAD', function(done){
      testRequest(
        {
          fetch : function(req, res, cb){
            return cb(true);
          },
          GET : function(req, res){
            res.writeHead(200);
            res.end();
          }
        },
        'HEAD',
        function(err, res, body){
          res.statusCode.should.equal(404);
          done();
        }
      );
    });

    it ('fetches for overridden HEAD', function(done){
      testRequest(
        {
          fetch : function(req, res, cb){
            return cb(true);
          },
          GET : function(req, res){
            res.writeHead(200);
            res.end();
          },
          HEAD : function(req, res){
            res.writeHead(200);
            res.end('this is sooo wrong');
          }
        },
        'HEAD',
        function(err, res, body){
          res.statusCode.should.equal(404);
          done();
        }
      );
    });
    it ('fetches for POST', function(done){
      testRequest(
        {
          fetch : function(req, res, cb){
            return cb(true);
          },
          POST : function(req, res){
            res.writeHead(200);
            res.end();
          }
        },
        'POST',
        function(err, res, body){
          res.statusCode.should.equal(404);
          done();
        }
      );
    });

    it ('fetches for DELETE', function(done){
      testRequest(
        {
          fetch : function(req, res, cb){
            return cb(true);
          },
          DELETE : function(req, res){
            res.writeHead(200);
            res.end();
          }
        },
        'DELETE',
        function(err, res, body){
          res.statusCode.should.equal(404);
          done();
        }
      );
    });

    it ('when defined, creates req.resource.fetched', function(done){
      testRequest(
        {
          fetch : function(req, res, cb){
            return cb(null, {test : 'resource'});
          },
          GET : function(req, res){
            res.writeHead(200);
            res.end(JSON.stringify(req.fetched));
          }
        },
        'GET',
        function(err, res, body){
          res.statusCode.should.equal(200);
          body.should.equal('{"test":"resource"}');
          done();
        }
      );
    });

    it ('when defined and sends an error, the resource 404s', function(done){
      testRequest(
        {
          fetch : function(req, res, cb){
            return cb(true);
          },
          GET : function(req, res){
            res.writeHead(200);
            res.end(JSON.stringify(req.resource.fetched));
          }
        },
        'GET',
        function(err, res, body){
          res.statusCode.should.equal(404);
          done();
        }
      );
    });

  });
  describe('#POST', function(){
    it ("405s if POST isn't implemented", function(done){
      testRequest(
        {
        PUT : function(req, res){res.end('not here');}
        },
        'POST',
        function(err, res, body){
          res.statusCode.should.equal(405);
          res.headers.allow.should.equal('PUT,OPTIONS');
          body.should.equal('');
          done();
        }
      );
    });
  });

  describe('#GET', function(){
    it ("405s if GET isn't implemented", function(done){
      testRequest(
        {
        POST : function(req, res){res.end('not here');}
        },
        'GET',
        function(err, res, body){
          res.statusCode.should.equal(405);
          res.headers.allow.should.equal('POST,OPTIONS');
          body.should.equal('');
          done();
        }
      );
    });
  });
});

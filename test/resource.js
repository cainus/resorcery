var should = require('should');
var _ = require('underscore');
var detour = require('detour');
var resource = require('../index');
var http = require('http');
var request = require('request');
var server;


var testRequest = function(resourceObject, method, override, cb){
  if (arguments.length == 3){
    cb = override;
    override = {};
  }
  var url = '/blah';
  var router = detour();
  router.route(url, resource(resourceObject, override));
  server = http.createServer(function(req, res){
    router.middleware(req, res);
  }).listen(8888, function(){
    request(
      {
        url : "http://localhost:8888/blah",
        method : method
      },
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
  describe('execution order', function(){
    it ('runs fetch first', function(done){
      testRequest(
        {
          authenticate : function(req, res, cb){
            cb(true);
          },
          fetch : function(req, res, cb){
            cb(true);
          },
          forbid : function(req, res, cb){
            cb(true);
          },
          GET : function(req, res){
            done("should never get here");
          }
        },
        'GET',
        function(err, res, body){
          res.statusCode.should.equal(404);
          done();
        }
      );
    });
    it ('runs authenticate second', function(done){
      testRequest(
        {
          fetch : function(req, res, cb){
            cb(null, "worked!");
          },
          authenticate : function(req, res, cb){
            req.fetched.should.equal("worked!");
            cb(true);
          },
          forbid : function(req, res, cb){
            cb(true);
          },
          GET : function(req, res){
            done("should never get here");
          }
        },
        'GET',
        function(err, res, body){
          res.statusCode.should.equal(401);
          done();
        }
      );
    });
    it ('runs forbid third', function(done){
      testRequest(
        {
          fetch : function(req, res, cb){
            cb(null, "worked!");
          },
          authenticate : function(req, res, cb){
            req.fetched.should.equal("worked!");
            cb(null, "also worked!");
          },
          forbid : function(req, res, cb){
            req.fetched.should.equal("worked!");
            req.authenticated.should.equal("also worked!");
            cb(true);
          },
          GET : function(req, res){
            done("should never get here");
          }
        },
        'GET',
        function(err, res, body){
          res.statusCode.should.equal(403);
          done();
        }
      );
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
    it ('defaults to an empty body with the same headers as GET', function(done){
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
  describe('forbid', function(){
    it ('forbids for OPTIONS', function(done){
      testRequest(
        {
          forbid : function(req, res, cb){
            return cb(true);
          },
          OPTIONS : function(req, res){
            res.writeHead(200);
            res.end();
          }
        },
        'OPTIONS',
        function(err, res, body){
          res.statusCode.should.equal(403);
          done();
        }
      );
    });

    it ('forbids for PUT', function(done){
      testRequest(
        {
          forbid : function(req, res, cb){
            return cb(true);
          },
          PUT : function(req, res){
            res.writeHead(200);
            res.end();
          }
        },
        'PUT',
        function(err, res, body){
          res.statusCode.should.equal(403);
          done();
        }
      );
    });

    it ('forbids for HEAD', function(done){
      testRequest(
        {
          forbid : function(req, res, cb){
            return cb(true);
          },
          GET : function(req, res){
            res.writeHead(200);
            res.end();
          }
        },
        'HEAD',
        function(err, res, body){
          res.statusCode.should.equal(403);
          done();
        }
      );
    });

    it ('forbids for overridden HEAD', function(done){
      testRequest(
        {
          forbid : function(req, res, cb){
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
          res.statusCode.should.equal(403);
          done();
        }
      );
    });
    it ('forbids for POST', function(done){
      testRequest(
        {
          forbid : function(req, res, cb){
            return cb(true);
          },
          POST : function(req, res){
            res.writeHead(200);
            res.end();
          }
        },
        'POST',
        function(err, res, body){
          res.statusCode.should.equal(403);
          done();
        }
      );
    });

    it ('forbids for DELETE', function(done){
      testRequest(
        {
          forbid : function(req, res, cb){
            return cb(true);
          },
          DELETE : function(req, res){
            res.writeHead(200);
            res.end();
          }
        },
        'DELETE',
        function(err, res, body){
          res.statusCode.should.equal(403);
          done();
        }
      );
    });
    describe("when defined", function(){
      it ('403s when given a first param that is `true`', function(done){
        testRequest(
          {
            forbid : function(req, res, cb){
              return cb(true);
            },
            GET : function(req, res){
              done(new Error("should never get here"));
            }
          },
          'GET',
          function(err, res, body){
            res.statusCode.should.equal(403);
            done();
          }
        );
      });

      it ('does not 403 when second param is an array that does not contain the request method', function(done){
        testRequest(
          {
            forbid : function(req, res, cb){
              return cb(null, ['GET']);
            },
            GET : function(req, res){
              done(new Error("should never get here"));
            },
            POST : function(req, res){
              return res.end("worked!");
            }
          },
          'POST',
          function(err, res, body){
            res.statusCode.should.equal(200);
            body.should.equal("worked!");
            done();
          }
        );
      });
      it ('403s when second param is true', function(done){
        testRequest(
          {
            forbid : function(req, res, cb){
              return cb(null, true);
            },
            GET : function(req, res){
              done(new Error("should never get here"));
            }
          },
          'GET',
          function(err, res, body){
            res.statusCode.should.equal(403);
            done();
          }
        );
      });
      it ('403s when second param is an array containing the request method', function(done){
        testRequest(
          {
            forbid : function(req, res, cb){
              return cb(null, ['GET']);
            },
            GET : function(req, res){
              done(new Error("should never get here"));
            }
          },
          'GET',
          function(err, res, body){
            res.statusCode.should.equal(403);
            done();
          }
        );
      });
      it ('500s when given a first param that is a non-true object.', function(done){
        testRequest(
          {
            forbid : function(req, res, cb){
              return cb({some : 'error'});
            },
            GET : function(req, res){
              done(new Error("should never get here"));
            }
          },
          'GET',
          function(err, res, body){
            res.statusCode.should.equal(500);
            done();
          }
        );
      });
    });
  });
  describe('authenticate', function(){
    it ('authenticates for OPTIONS', function(done){
      testRequest(
        {
          authenticate : function(req, res, cb){
            return cb(true);
          },
          OPTIONS : function(req, res){
            res.writeHead(200);
            res.end();
          }
        },
        'OPTIONS',
        function(err, res, body){
          res.statusCode.should.equal(401);
          done();
        }
      );
    });

    it ('authenticates for PUT', function(done){
      testRequest(
        {
          authenticate : function(req, res, cb){
            return cb(true);
          },
          PUT : function(req, res){
            res.writeHead(200);
            res.end();
          }
        },
        'PUT',
        function(err, res, body){
          res.statusCode.should.equal(401);
          done();
        }
      );
    });

    it ('authenticates for HEAD', function(done){
      testRequest(
        {
          authenticate : function(req, res, cb){
            return cb(true);
          },
          GET : function(req, res){
            res.writeHead(200);
            res.end();
          }
        },
        'HEAD',
        function(err, res, body){
          res.statusCode.should.equal(401);
          done();
        }
      );
    });

    it ('authenticates for overridden HEAD', function(done){
      testRequest(
        {
          authenticate : function(req, res, cb){
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
          res.statusCode.should.equal(401);
          done();
        }
      );
    });
    it ('authenticates for POST', function(done){
      testRequest(
        {
          authenticate : function(req, res, cb){
            return cb(true);
          },
          POST : function(req, res){
            res.writeHead(200);
            res.end();
          }
        },
        'POST',
        function(err, res, body){
          res.statusCode.should.equal(401);
          done();
        }
      );
    });

    it ('authenticates for DELETE', function(done){
      testRequest(
        {
          authenticate : function(req, res, cb){
            return cb(true);
          },
          DELETE : function(req, res){
            res.writeHead(200);
            res.end();
          }
        },
        'DELETE',
        function(err, res, body){
          res.statusCode.should.equal(401);
          done();
        }
      );
    });
    describe("when defined", function(){
      it ('leaves req.resource.authenticated undefined when cb() is called with no params', function(done){
        testRequest(
          {
            authenticate : function(req, res, cb){
              return cb();
            },
            GET : function(req, res){
              res.writeHead(200);
              res.end((!!req.authenticated) ? "fail" : "success");
            }
          },
          'GET',
          function(err, res, body){
            res.statusCode.should.equal(200);
            body.should.equal('success');
            done();
          }
        );
      });
      it ('creates req.resource.authenticated when given an object', function(done){
        testRequest(
          {
            authenticate : function(req, res, cb){
              return cb(null, {test : 'user'});
            },
            GET : function(req, res){
              res.writeHead(200);
              res.end(JSON.stringify(req.authenticated));
            }
          },
          'GET',
          function(err, res, body){
            res.statusCode.should.equal(200);
            body.should.equal('{"test":"user"}');
            done();
          }
        );
      });

      it ('401s when given a first param that is `true`', function(done){
        testRequest(
          {
            authenticate : function(req, res, cb){
              return cb(true);
            },
            GET : function(req, res){
              res.writeHead(200);
              res.end(JSON.stringify(req.resource.authenticated));
            }
          },
          'GET',
          function(err, res, body){
            res.statusCode.should.equal(401);
            done();
          }
        );
      });

      it ('500s when given a first param that is a non-true object.', function(done){
        testRequest(
          {
            authenticate : function(req, res, cb){
              return cb({some : 'error'});
            },
            GET : function(req, res){
              res.writeHead(200);
              res.end(JSON.stringify(req.resource.authenticated));
            }
          },
          'GET',
          function(err, res, body){
            res.statusCode.should.equal(500);
            done();
          }
        );
      });
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
            return done(new Error("should never get here"));
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
            return done(new Error("should never get here"));
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
            return done(new Error("should never get here"));
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
            return done(new Error("should never get here"));
          },
          HEAD : function(req, res){
            return done(new Error("should never get here"));
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
            return done(new Error("should never get here"));
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
            return done(new Error("should never get here"));
          }
        },
        'DELETE',
        function(err, res, body){
          res.statusCode.should.equal(404);
          done();
        }
      );
    });
    describe("when defined", function(){
      it ('leaves req.resource.fetched undefined when cb() is called with no params', function(done){
        testRequest(
          {
            fetch : function(req, res, cb){
              return cb();
            },
            GET : function(req, res){
              res.writeHead(200);
              res.end((!!req.fetched) ? "fail" : "success");
            }
          },
          'GET',
          function(err, res, body){
            res.statusCode.should.equal(200);
            body.should.equal('success');
            done();
          }
        );
      });
      it ('creates req.resource.fetched when given an object', function(done){
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

      it ('404s when given a first param that is `true`', function(done){
        testRequest(
          {
            fetch : function(req, res, cb){
              return cb(true);
            },
            GET : function(req, res){
              return done(new Error("should never get here"));
            }
          },
          'GET',
          function(err, res, body){
            res.statusCode.should.equal(404);
            done();
          }
        );
      });

      it ('500s when given a first param that is a non-true object.', function(done){
        testRequest(
          {
            fetch : function(req, res, cb){
              return cb({some : 'error'});
            },
            GET : function(req, res){
              return done(new Error("should never get here"));
            }
          },
          'GET',
          function(err, res, body){
            res.statusCode.should.equal(500);
            done();
          }
        );
      });
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
  describe('overrides (the optional second argument)', function(){
    describe("optionsStrategy", function(){
      it ("overrides the default OPTIONS", function(done){
        testRequest(
          {
            POST : function(req, res){
              res.end('not here');
            }
          },
          'OPTIONS',
          {
            optionsStrategy : function(req, res, allowedMethods){
              return res.end(allowedMethods.join("|"));
            }
          },
          function(err, res, body){
            res.statusCode.should.equal(200);
            body.should.equal('POST|OPTIONS');
            done();
          }
        );
      });
    });
    describe("notFoundStrategy", function(){
      it ("overrides the default 404", function(done){
        testRequest(
          {
            fetch : function(req, res, cb){
              cb(true);
            },

            POST : function(req, res){
              res.end('not here');
            }
          },
          'POST',
          {
            notFoundStrategy : function(req, res){
              return res.end("didn't find");
            }
          },
          function(err, res, body){
            res.statusCode.should.equal(200);
            body.should.equal("didn't find");
            done();
          }
        );

      });
    });
    describe("notAuthenticatedStrategy", function(){
      it ("overrides the default 401", function(done){
        testRequest(
          {
            authenticate : function(req, res, cb){
              cb(true);
            },

            POST : function(req, res){
              res.end('not here');
            }
          },
          'POST',
          {
            notAuthenticatedStrategy : function(req, res){
              return res.end("not authenticated!");
            }
          },
          function(err, res, body){
            res.statusCode.should.equal(200);
            body.should.equal("not authenticated!");
            done();
          }
        );
      });
    });
    describe("forbiddenStrategy", function(){
      it ("overrides the default 403", function(done){
        testRequest(
          {
            forbid : function(req, res, cb){
              cb(true);
            },

            POST : function(req, res){
              res.end('not here');
            }
          },
          'POST',
          {
            forbiddenStrategy : function(req, res){
              return res.end("not allowed!");
            }
          },
          function(err, res, body){
            res.statusCode.should.equal(200);
            body.should.equal("not allowed!");
            done();
          }
        );

      });
    });
    describe("internalServerErrorStrategy", function(){
      it ("overrides the default 500", function(done){
        testRequest(
          {
            forbid : function(req, res, cb){
              cb(new Error("asdf"));
            },

            POST : function(req, res){
              res.end('not here');
            }
          },
          'POST',
          {
            internalServerErrorStrategy : function(req, res){
              return res.end("bad stuff happened");
            }
          },
          function(err, res, body){
            res.statusCode.should.equal(200);
            body.should.equal("bad stuff happened");
            done();
          }
        );

      });
    });
    describe("methodNotAllowedStrategy", function(){
      it ("overrides the default 405", function(done){
        testRequest(
          {
            GET : function(req, res){
              res.end('not here');
            }
          },
          'POST',
          {
            methodNotAllowedStrategy : function(req, res){
              return res.end("method not allowed happened");
            }
          },
          function(err, res, body){
            res.statusCode.should.equal(200);
            body.should.equal("method not allowed happened");
            done();
          }
        );
      });
    });
  });
});

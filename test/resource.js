var should = require('should');
var hottap = require('hottap').hottap;
var _ = require('underscore');
var resource = require('../index').resource;


// what abouts...
/*

authorization (403)
authentication (401)
create-via-put
acceptable media-types (produces)
available content-types (consumes)
conditional GET
redirects
cache control
create static file streaming resource
setting non-representation responses
logging / dtrace
throttling?
collection / member resources

*/

describe('resource', function(){

  var FakeRes = function(){
    this.body = '';
    this.written = '';
    this.headers = {};
    this.status = 0;
    this.end =function(data){ this.body = data || ''; }
    this.write =function(data){ this.written = data || ''; }
    this.writeHead = function(code){this.status = '' + code;}
    this.setHeader = function(name, value){this.headers[name] = value;}
    this.expectHeader = function(name, value){
      if (!this.headers[name]){
        should.fail("header " + name + " was not set.")
      }
      if (this.headers[name] != value){
        should.fail("header " + name + 
                    " was supposed to be " + value + 
                    " but was " + this.headers[name] + ".")
      }
    }
    this.expectStatus = function(status){
      this.status.should.equal(status);
    }
    this.expectWrite = function(str) { 
      if (str !== this.written){
        should.fail("Expected write(" + str + ") but got write(" +
                    this.written + ")")
      }
    }
    this.expectEnd = function(str) { 
      if (str !== this.body){
        should.fail("Expected end(" + str + ") but got end(" +
                    this.body + ")")
      }
    }
  }
  describe('#OPTIONS', function(){
    it ('returns possible methods in the Allow header', function(){
      var r = new resource({
        GET : function(req, res){res.end('not here')}
      });
      var req = {}
      var res = new FakeRes();
      r.OPTIONS(req, res);
      res.expectStatus('204')
      res.expectHeader('Allow', 'OPTIONS,HEAD,GET');
      res.expectEnd('')
    });
    it ('can be overridden in the input', function(){
      var r = new resource({
        OPTIONS : function(req, res){
          res.writeHead(200)
          res.setHeader('Content-Type', 'plain/text')
          res.end('this feels so wrong')
        }
      });
      var req = {}
      var res = new FakeRes();
      r.OPTIONS(req, res);
      res.expectStatus('200')
      res.expectHeader('Content-Type', 'plain/text');
      res.expectEnd('this feels so wrong')
    });
  });

  describe('#HEAD', function(){
    it ('can be overridden in the input', function(){
      var r = new resource({
        HEAD : function(req, res){
          res.writeHead(200)
          res.setHeader('Content-Type', 'plain/text')
          res.end('this feels so wrong')
        }
      });
      var req = {}
      var res = new FakeRes();
      r.HEAD(req, res);
      res.expectStatus('200')
      res.expectHeader('Content-Type', 'plain/text');
      res.expectEnd('this feels so wrong')
    });
    it ('returns an empty body with the same headers as GET', function(){
      var r = new resource({
        GET : function(req, res){
          res.writeHead(200)
          res.setHeader('Content-Type', 'plain/text')
          res.write('test');
          res.end('not here')
        }
      });
      var req = {}
      var res = new FakeRes();
      r.HEAD(req, res);
      res.expectStatus('200')
      res.expectHeader('Content-Type', 'plain/text');
      res.expectEnd('')
      res.expectWrite('')
    });
    it ("405s if GET isn't implemented", function(){
      var r = new resource({
        POST : function(req, res){res.end('not here')}
      });
      var req = {}
      var res = new FakeRes();
      r.HEAD(req, res);
      res.expectStatus('405')
      res.expectHeader('Allow', 'OPTIONS,POST');
      res.expectEnd('')
    });
  });

  describe('fetch', function(){
    it ('fetches for OPTIONS', function(){
      var r = new resource({
        fetch : function(res){
          return null;
        },
        OPTIONS : function(req, res){
          res.writeHead(200);
          res.end();
        }
      });
      var req = {}
      var res = new FakeRes();
      r.OPTIONS(req, res);
      res.expectStatus('404')
    });

    it ('fetches for PUT', function(){
      var r = new resource({
        fetch : function(res){
          return null;
        },
        PUT : function(req, res){
          res.writeHead(200);
          res.end();
        }
      });
      var req = {}
      var res = new FakeRes();
      r.PUT(req, res);
      res.expectStatus('404')
    });

    it ('fetches for HEAD', function(){
      var r = new resource({
        fetch : function(res){
          return null;
        },
        GET : function(req, res){
          res.writeHead(200);
          res.end();
        }
      });
      var req = {}
      var res = new FakeRes();
      r.HEAD(req, res);
      res.expectStatus('404')
    });

    it ('fetches for overriden HEAD', function(){
      var r = new resource({
        fetch : function(res){
          return null;
        },
        GET : function(req, res){
          res.writeHead(200);
          res.end();
        },
        HEAD : function(req, res){
          res.writeHead(200);
          res.end('this is sooo wrong');
        }

      });
      var req = {}
      var res = new FakeRes();
      r.HEAD(req, res);
      res.expectStatus('404')
    });
    it ('fetches for POST', function(){
      var r = new resource({
        fetch : function(res){
          return null;
        },
        POST : function(req, res){
          res.writeHead(200);
          res.end();
        }
      });
      var req = {}
      var res = new FakeRes();
      r.POST(req, res);
      res.expectStatus('404')
    });

    it ('fetches for DELETE', function(){
      var r = new resource({
        fetch : function(res){
          return null;
        },
        DELETE : function(req, res){
          res.writeHead(200);
          res.end();
        }
      });
      var req = {}
      var res = new FakeRes();
      r.DELETE(req, res);
      res.expectStatus('404')
    });

    it ('when defined, creates req.resource.fetched', function(){
      var r = new resource({
        fetch : function(res){
          return {test : 'resource'}
        },
        GET : function(req, res){
          res.writeHead(200);
          res.end(JSON.stringify(req.resource.fetched));
        }
      });
      var req = {}
      var res = new FakeRes();
      r.GET(req, res);
      res.expectStatus('200')
      res.expectEnd('{"test":"resource"}')
    })

    it ('when defined and returns null, the resource 404s', function(){
      var r = new resource({
        fetch : function(res){
          return null;
        },
        GET : function(req, res){
          res.writeHead(200);
          res.end(JSON.stringify(req.resource.fetched));
        }
      });
      var req = {}
      var res = new FakeRes();
      r.GET(req, res);
      res.expectStatus('404')
    });

    it ('when defined throws an exception, the resource 404s', function(){
      var r = new resource({
        fetch : function(res){
          throw 'not found';
        },
        GET : function(req, res){
          res.writeHead(200);
          res.end(JSON.stringify(req.resource.fetched));
        }
      });
      var req = {}
      var res = new FakeRes();
      r.GET(req, res);
      res.expectStatus('404')
    });

  });
  describe('#POST', function(){
    it ("405s if POST isn't implemented", function(){
      var r = new resource({
        PUT : function(req, res){res.end('not here')}
      });
      var req = {}
      var res = new FakeRes();
      r.POST(req, res);
      res.expectStatus('405')
      res.expectHeader('Allow', 'OPTIONS,PUT');
      res.expectEnd('')
    });
  });

  describe('#GET', function(){
    it ("405s if GET isn't implemented", function(){
      var r = new resource({
        POST : function(req, res){res.end('not here')}
      });
      var req = {}
      var res = new FakeRes();
      r.GET(req, res);
      res.expectStatus('405')
      res.expectHeader('Allow', 'OPTIONS,POST');
      res.expectEnd('')
    });
  });
});

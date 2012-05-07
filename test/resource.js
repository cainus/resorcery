var should = require('should');
var hottap = require('hottap').hottap;
var _ = require('underscore');
var resource = require('../index').resource;

describe('resource', function(){

  var FakeRes = function(){
    this.body = '';
    this.headers = {};
    this.status = 0;
    this.end =function(data){ this.body = data || ''; }
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
    this.expectEnd = function() { 
      var args = _.toArray(arguments);
      var diff = _.difference(this.sendArgs, args)
      if (diff.length != 0){ 
        should.fail("Expected send(" + 
                    args.join(", ") + 
                    ") but got send(" + 
                    this.sendArgs.join(", ") + ")")
      }
    }
  }
  describe('#OPTIONS', function(){
    // TODO
  });

  describe('#HEAD', function(){
    it ('returns an empty body with the same headers as GET', function(){
      // TODO 
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
    it ('when fetch is defined, creates req.resource.fetched', function(){
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
  });
});

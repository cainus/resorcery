var _ = require('underscore');
var collection = require('../index').collection;

describe('collection', function(){

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
  describe('#POST', function(){ 
    it ("405s if POST isn't implemented", function(){
      var r = new collection({
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
});


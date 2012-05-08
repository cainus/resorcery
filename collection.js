//var resource = require('./resource');
var _ = require('underscore');


var collection =  function(input){
  this.input = input
};

collection.prototype.POST = function(req, res){
  setResource(req);
  //checkMethodAllowed('POST', this, req, res)
  //if (this.done) return;

  try {
    this.input.POST(req, res);
  } catch (ex) {
    if (ex + '' === "TypeError: Object #<Object> has no method 'POST'"){
      return handle405(this, req, res);
    } else {
      console.log("*" + ex + "*");
      throw ex;
    }
  }
}

var setResource = function(req){
  req.resource = req.resource || {};
}

var handle405 = function(r, req, res){
  r.done = true;
  res.writeHead(405);
  setAllowHeader(r.input, req, res);
  res.end();
};

var setAllowHeader = function(obj, req, res){
  res.setHeader('Allow', allowHeader(obj));
};
var allowHeader = function(obj){
  var methods = getMethods(obj);
  var additionalMethods = ['OPTIONS']
  if (_.isFunction(obj.GET)){
    additionalMethods.push('HEAD');
  }
  methods = _.union(additionalMethods, methods);
  return methods.join(",");
};

var getMethods = function(handler){
  var moduleMethods = _.functions(handler);
  var retval = _.intersection(moduleMethods, serverSupportedMethods);
  return retval;
};

var serverSupportedMethods = ["GET", "POST", 
                              "PUT", "DELETE",
                              "HEAD", "OPTIONS"];



exports.collection = collection;

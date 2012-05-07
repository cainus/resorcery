var _ = require('underscore');

var resource = function(input){
  this.input = input;
}

resource.prototype.HEAD = function(req, res){
  if (!_.isFunction(this.input.GET)){
    return handle405(this.input, req, res);
  } else {

  }
  
}

resource.prototype.GET = function(req, res){
  if (_.isFunction(this.input.fetch)){
    if (!req.resource) { 
      req.resource = {};
    }
    req.resource.fetched = this.input.fetch(req);
  }
  if (!this.input.GET){
    return handle405(this.input, req, res);
  }
  this.input.GET(req, res);
}

exports.resource = resource

var handle405 = function(obj, req, res){
  res.writeHead(405);
  setAllowHeader(obj, req, res);
  res.end();
};

setAllowHeader = function(obj, req, res){
  res.setHeader('Allow', allowHeader(obj));
};

var allowHeader = function(obj){
  var methods = getMethods(obj);
  methods = _.union(["OPTIONS"], methods);
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

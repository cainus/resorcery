var _ = require('underscore');

var resource = function(input){
  this.input = input;
  this.done = false;
}

resource.prototype.HEAD = function(req, res){
  if (!_.isFunction(this.input.GET)){
    return handle405(this, req, res);
  } else {
    // don't allow write() to occur
    res.write = function(){};
    // don't allow end() to take params
    res.origEnd = res.end;
    res.end = function(){
      res.origEnd();
    };
    this.GET(req, res);  // note that we call our own GET
  }
}

resource.prototype.OPTIONS = function(req, res){
  setResource(req);

  setFetched(this, req, res);
  if (this.done) return;

  res.writeHead(204);
  setAllowHeader(this.input, req, res);
  res.end();
}

resource.prototype.GET = function(req, res){
  setResource(req);

  setFetched(this, req, res);
  if (this.done) return;

  checkMethodAllowed('GET', this, req, res)
  if (this.done) return;

  this.input.GET(req, res);
}

resource.prototype.PUT = function(req, res){
  setResource(req);

  setFetched(this, req, res);
  if (this.done) return;

  checkMethodAllowed('PUT', this, req, res)
  if (this.done) return;

  this.input.PUT(req, res);
}

resource.prototype.POST = function(req, res){
  setResource(req);

  setFetched(this, req, res);
  if (this.done) return;

  checkMethodAllowed('POST', this, req, res)
  if (this.done) return;

  this.input.POST(req, res);
}

resource.prototype.DELETE = function(req, res){
  setResource(req);

  setFetched(this, req, res);
  if (this.done) return;

  checkMethodAllowed('DELETE', this, req, res)
  if (this.done) return;

  this.input.DELETE(req, res);
}

exports.resource = resource

var setResource = function(req){
  req.resource = req.resource || {};
}

var checkMethodAllowed = function(method, r, req, res){
  if (!r.input[method]){
    handle405(r, req, res);
  }
}

var setFetched = function(r, req, res){
  if (_.isFunction(r.input.fetch)){
    try {
      req.resource.fetched = r.input.fetch(req);
    } catch (ex) {
      // interesting place to log?
      req.resource.fetched = null;
    }
    if (!req.resource.fetched){
      return handle404(r, req, res);
    }
  }
}

var handle405 = function(r, req, res){
  r.done = true;
  res.writeHead(405);
  setAllowHeader(r.input, req, res);
  res.end();
};
var handle404 = function(r, req, res){
  r.done = true;
  res.writeHead(404);
  res.end();
};

setAllowHeader = function(obj, req, res){
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

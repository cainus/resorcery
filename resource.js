var _ = require('underscore');

var resource = function(input){
  this.input = input;
};

resource.prototype.HEAD = function(req, res){
  var r = this;
  // 405 if GET isn't defined.
  checkMethodAllowed('GET', r, req, res);
  if (res.done) return;

  if (_.isFunction(r.input.HEAD)){
    setResource(req);
    fetch(r, req, res, function(err){
      if (!err){
        r.input.HEAD.apply(r, [req, res]);
      }
    });
  } else {
    // don't allow write() to occur
    res.write = function(){};
    // don't allow end() to take params
    res.origEnd = res.end;
    res.end = function(){
      res.origEnd();
    };
    r.GET(req, res);  // note that we call our own GET
  }
};

resource.prototype.OPTIONS = function(req, res){
  setResource(req);
  var r = this;
  fetch(r, req, res, function(err){
    if (!err){
      if (_.isFunction(r.input.OPTIONS)){
        return r.input.OPTIONS.apply(r, [req, res]);
      }
      setAllowHeader(r.input, req, res);
      res.writeHead(204);
      res.end();
    }
  });

};

var getMethodHandler = function(methodName){
  return function(req, res){
    setResource(req);
    var r = this; 
    fetch(r, req, res, function(err){
      if (!err){
        checkMethodAllowed(methodName, r, req, res);
        if (res.done) return;
        r.input[methodName].apply(r, [req, res]);
      }
    });
  };
};

var supportedMethods = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'COPY',
  'LOCK',
  'MKCOL',
  'MOVE',
  'PROPFIND',
  'PROPPATCH',
  'UNLOCK',
  'REPORT',
  'MKACTIVITY',
  'CHECKOUT',
  'MERGE',
  'M-SEARCH',
  'NOTIFY',
  'SUBSCRIBE',
  'UNSUBSCRIBE',
  'PATCH'
];

_.each(supportedMethods, function(method){
  resource.prototype[method] = getMethodHandler(method);
});

exports.resource = resource;

var setResource = function(req){
  req.resource = req.resource || {};
};


var checkMethodAllowed = function(method, r, req, res){
  if (!_.isFunction(r.input[method])){
    handle405(r, req, res);
  }
};

var fetch = function(r, req, res, onDone){
  if (_.isFunction(r.input.fetch)){
    var onFetch = function(err, val){
      if (err){
        handle404(r, req, res);
        onDone(true);
      } else {
        req.resource.fetched = val;
        onDone();
      }
    };
    r.input.fetch.apply(r, [req, onFetch]);
  } else {
    onDone();
  }
};

var handle405 = function(r, req, res){
  if (_.isFunction(r.handle405)){
    r.handle405(req, res);
  } else {
    setAllowHeader(r.input, req, res);
    res.writeHead(405);
    res.end();
  }
  res.done = true;
};
var handle404 = function(r, req, res){
  if (_.isFunction(r.handle404)){
    r.handle404(req, res);
  } else {
    res.writeHead(404);
    res.end();
  }
  res.done = true;
};

var setAllowHeader = function(obj, req, res){
  res.setHeader('Allow', allowHeader(obj));
};

var allowHeader = function(obj){
  var methods = getMethods(obj);
  var additionalMethods = ['OPTIONS'];
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

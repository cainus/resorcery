var _ = require('underscore');

module.exports = function(obj, options) {
  options = options || {};
  var optionsStrategy = options.optionsStrategy || defaultOptionsStrategy;
  var notFoundStrategy = options.notFoundStrategy || defaultNotFoundStrategy;
  var internalServerErrorStrategy = options.internalServerErrorStrategy || defaultInternalServerErrorStrategy;
  var methodNotAllowedStrategy = options.methodNotAllowedStrategy || defaultMethodNotAllowedStrategy;
  obj = defaultHEAD(obj);
  obj = defaultOPTIONS(obj, optionsStrategy);
  obj = applyFetch(obj, notFoundStrategy, internalServerErrorStrategy);
  obj = applyAuthenticate(obj);
  obj = add405s(obj, methodNotAllowedStrategy);
  return obj;
};

var supported = ["GET", "POST", "DELETE", "PUT", "PATCH", "HEAD", "OPTIONS"];

var add405s = function(obj, methodNotAllowedStrategy) {
  var allowedMethods, method, _i, _len;
  allowedMethods = implementedMethods(obj);
  var handlerFor405s = getHandlerFor405s(allowedMethods, methodNotAllowedStrategy);
  for (_i = 0, _len = supported.length; _i < _len; _i++) {
    method = supported[_i];
    if (!obj[method]) {
      obj[method] = handlerFor405s;
    }
  }
  return obj;
};

var getHandlerFor405s = function(allowedMethods, methodNotAllowedStrategy){
  return function(req, res) {
    return methodNotAllowedStrategy(req, res, allowedMethods);
  };
};

var applyAuthenticate = function(obj) {
  var f, methodName;
  if (obj.authenticate) {
    for (methodName in obj) {
      f = obj[methodName];
      if (_.contains(supported, methodName)) {
        obj[methodName] = wrapWithAuthenticate(obj[methodName], obj.authenticate);
      }
    }
    delete obj.authenticate;
  }
  return obj;
};

var wrapWithAuthenticate = function(f, authenticate) {
  return function(req, res) {
    return authenticate(req, res, function(err, authenticated) {
      if (err === true) {
        return res.statusOut.unauthenticated();
      }
      if (err) {
        return res.statusOut.internalServerError(err.message || err);
      }
      req.authenticated = authenticated;
      return f(req, res);
    });
  };
};

var applyFetch = function(obj, notFoundStrategy, internalServerErrorStrategy) {
  var f, methodName;
  if (obj.fetch) {
    for (methodName in obj) {
      f = obj[methodName];
      if (_.contains(supported, methodName)) {
        obj[methodName] = wrapWithFetch(obj[methodName],
                                        obj.fetch,
                                        notFoundStrategy,
                                        internalServerErrorStrategy);
      }
    }
    delete obj.fetch;
  }
  return obj;
};

var wrapWithFetch = function(f, fetch, notFoundStrategy, internalServerErrorStrategy) {
  return function(req, res) {
    return fetch(req, res, function(err, fetched) {
      if (err === true) {
        return notFoundStrategy(req, res);
      }
      if (err) {
        return internalServerErrorStrategy(req, res, err);
      }
      req.fetched = fetched;
      return f(req, res);
    });
  };
};

var defaultHEAD = function(obj) {
  if (!obj.HEAD && obj.GET) {
    obj.HEAD = function(req, res) {
      res.setHeader('content-length', 0);
      // stop write() and end() from
      // sending output
      res.write = function(){};
      var origEnd = res.end;
      res.end = function(){
        origEnd.apply(res, ['']);
      };
      return obj.GET(req, res);
      // the server will not send a body for HEAD requests
    };
  }
  return obj;
};

var implementedMethods = function(obj) {
  var method, methods;
  methods = [];
  for (method in obj) {
    methods.push(method);
  }
  return methods;
};

var defaultNotFoundStrategy = function(req, res){
  res.statusCode = 404;
  res.end();
};

var defaultInternalServerErrorStrategy = function(req, res, error){
  res.statusCode = 500;
  res.end(error.message || error);
};

var defaultOptionsStrategy = function(req, res, allowedMethods){
  res.setHeader('Allow', allowedMethods.join(","));
  res.end();
};

var defaultMethodNotAllowedStrategy = function(req, res, allowedMethods){
  res.statusCode = 405;
  res.setHeader('Allow', allowedMethods.join(","));
  res.end();
};

var defaultOPTIONS = function(obj, strategy) {
  var allowedMethods;
  if (!obj.OPTIONS) {
    allowedMethods = implementedMethods(obj);
    allowedMethods.push('OPTIONS');
    obj.OPTIONS = function(req, res) {
      return strategy(req, res, allowedMethods);
    };
  }
  return obj;
};



var _ = require('underscore');
var util = require('util');

module.exports = function(obj, options) {
  options = options || {};
  var optionsStrategy = options.optionsStrategy || defaultOptionsStrategy;
  var notFoundStrategy = options.notFoundStrategy || defaultNotFoundStrategy;
  var notAuthenticatedStrategy = options.notAuthenticatedStrategy || defaultNotAuthenticatedStrategy;
  var forbiddenStrategy = options.forbiddenStrategy || defaultForbiddenStrategy;
  var internalServerErrorStrategy = options.internalServerErrorStrategy || defaultInternalServerErrorStrategy;
  var methodNotAllowedStrategy = options.methodNotAllowedStrategy || defaultMethodNotAllowedStrategy;
  obj = defaultHEAD(obj);
  obj = defaultOPTIONS(obj, optionsStrategy);
  obj = applyForbid(obj, forbiddenStrategy, internalServerErrorStrategy);
  obj = applyAuthenticate(obj, notAuthenticatedStrategy, internalServerErrorStrategy);
  obj = applyFetch(obj, notFoundStrategy, internalServerErrorStrategy);
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

/*
  @obj : the original input object
  @helperMethodName : fetch, authenticate, forbid, etc
  @trueHandler : the function to call when the helper methods does a cb(true)
  @errorHandler : the function to call when the helper method does a cb(someError)
  @decorationName : the name of the property of req to attach the object in cb(null, object)

*/
var applier = function(obj, helperMethodName, trueHandler, errorHandler, decorationName){
  var f, methodName;
  if (obj[helperMethodName]) {
    for (methodName in obj) {
      f = obj[methodName];
      if (_.contains(supported, methodName)) {
        obj[methodName] = wrapper(obj[methodName],
                                        obj[helperMethodName],
                                        trueHandler,
                                        errorHandler,
                                        decorationName);
      }
    }
    delete obj[helperMethodName];
  }
  return obj;
};


var wrapper = function(f, helperMethod, trueHandler, errorHandler, decorationName) {
  return function(req, res) {
    return helperMethod(req, res, function(err, decoration) {
      if (err === true) {
        return trueHandler(req, res);
      }
      if (err) {
        return errorHandler(req, res, err);
      }
      if (decorationName){
        req[decorationName] = decoration;
      }
      return f(req, res);
    });
  };
};

var applyAuthenticate = function(obj, notAuthenticatedStrategy, internalServerErrorStrategy) {
  return applier(obj, 'authenticate', notAuthenticatedStrategy, internalServerErrorStrategy, 'authenticated');
};
var applyFetch = function(obj, notFoundStrategy, internalServerErrorStrategy){
  return applier(obj, 'fetch', notFoundStrategy, internalServerErrorStrategy, 'fetched');
};

var applyForbid = function(obj, forbiddenStrategy, internalServerErrorStrategy){
  return applier(obj, 'forbid', forbiddenStrategy, internalServerErrorStrategy);
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

var defaultNotAuthenticatedStrategy = function(req, res){
  res.statusCode = 401;
  res.end();
};

var defaultForbiddenStrategy = function(req, res){
  res.statusCode = 403;
  res.end();
};

var defaultInternalServerErrorStrategy = function(req, res, error){
  res.statusCode = 500;
  if (error.message){
    return res.end(util.inspect(error.message));
  }
  return res.end(util.inspect(error));
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


//TODO add basicAuthenticate
// what abouts...
/*

acceptable media-types (produces)
available content-types (consumes)
conditional GET
cache control
throttling?
collection / member resources
something json specific?

handler/wildcard collectors?

are things processed in order?

using this from connect/express?

*/

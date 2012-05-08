var _ = require('underscore');

var resource = function(input){
  this.input = input;
  this.done = false;
}

resource.prototype.HEAD = function(req, res){
  var r = this;
  // 405 if GET isn't defined.
  checkMethodAllowed('GET', r, req, res)
  if (r.done) return;

  if (_.isFunction(this.input.HEAD)){
    setResource(req);
    fetch(this, req, res, function(err){
      if (!err){
        r.input.HEAD(req, res);
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
    this.GET(req, res);  // note that we call our own GET
  }
}

resource.prototype.OPTIONS = function(req, res){
  setResource(req);
  var r = this;
  fetch(this, req, res, function(err){
    if (!err){
      checkMethodAllowed('OPTIONS', r, req, res)
      if (this.done) return;

      if (_.isFunction(r.input.OPTIONS)){
        return r.input.OPTIONS(req, res)
      }

      res.writeHead(204);
      setAllowHeader(r.input, req, res);
      res.end();
    }
  });

}

resource.prototype.GET = function(req, res){
  setResource(req);
  var r = this;
  fetch(this, req, res, function(err){
    if (!err){
      checkMethodAllowed('GET', r, req, res)
      if (r.done) return;

      r.input.GET(req, res);
    }
  });
}

resource.prototype.PUT = function(req, res){
  setResource(req);
  var r = this;
  fetch(this, req, res, function(err){
    if (!err){
      checkMethodAllowed('PUT', r, req, res)
      if (r.done) return;

      r.input.PUT(req, res);
    }
  });
}

resource.prototype.POST = function(req, res){
  setResource(req);

  var r = this;
  fetch(this, req, res, function(err){
    if (!err){
      checkMethodAllowed('POST', r, req, res)
      if (r.done) return;

      r.input.POST(req, res);
    }
  });
}

resource.prototype.DELETE = function(req, res){
  setResource(req);

  var r = this;
  fetch(this, req, res, function(err){
    if (!err){
      checkMethodAllowed('DELETE', r, req, res)
      if (r.done) return;

      r.input.DELETE(req, res);
    }
  });

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
    }
    r.input.fetch(req, onFetch);
  } else {
    onDone();
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

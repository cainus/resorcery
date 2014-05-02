# resorcery

[![Build Status](https://secure.travis-ci.org/cainus/resorcery.png?branch=master)](http://travis-ci.org/cainus/resorcery)
[![Coverage Status](https://coveralls.io/repos/cainus/resorcery/badge.png?branch=master)](https://coveralls.io/r/cainus/resorcery?branch=master)
[![NPM version](https://badge.fury.io/js/resorcery.png)](http://badge.fury.io/js/resorcery)

**resorcery** is a node.js library for use in http apis for dealing with a single url as a unified 'resource', rather than a collection of separate functions.  This is useful for a more consistent api, better code re-use, and simpler routing and error-handling.

It is meant primarily for use with the [detour](https://github.com/cainus/detour) router, which can be used with [express](http://expressjs.com/) and [connect](http://www.senchalabs.org/connect/) applications, but it's got a simple enough interface that other routers could add support for it easily.

## example usage:

## resource(handler, [options])
The `resource()` function takes a handler object for your resource and gives you the ability to specify common authentication, authorization, and data access strategies that can be used for all methods.   

### The `handler` argument:
In its most basic form, the `handler` argument should be a hash of all the HTTP methods you wish the resource to support and their implementations.  For example, if you want your resource to support GET and POST, your handler object might look like this:

```javascript
{
    GET : function(req, res){
        // implement this however you want, eg:
        res.end("get works!");
    }, 
    
    POST: function(req, res){
        // implement this however you want, eg:
        res.end("post works!");
    }
}
```

All of the methods available methods (GET, POST, DELETE, PUT, PATCH, HEAD, OPTIONS) are optional.  You can implement as many or as few as you wish, though logically you must implement at least one of GET, POST, DELETE, PUT, or PATCH, or there's nothing to route.

HEAD and OPTIONS methods will be implemented for you automatically (by default -- though you can implement like any other method, or override them with the `resource()`'s second optional `options` argument, discussed later).  You probably don't need or want to implement HEAD or OPTIONS yourself unless you really know what you're doing.

#### Extra Helpers:
These extra helpers are all optional, but can simplify and DRY up your code considerably in cases where you are implementing multiple HTTP methods for a single url.  The helper methods are `fetch()`, `authenticate()`, and `forbid()` and, if they are added to your resource, they will be run serially in that order, skipping any that aren't implemented, BEFORE the HTTP methods are executed.  

##### fetch(req, res, cb)
This is useful when you need to do some asynchronous work (like a database query) to determine if the url should 404 or not.

If implemented, this is always the first method called for any request of this resource.

###### Immediately responding with a 404
```javascript
return cb(true);
```
###### Immediately responding with a 500 
(meaning there was an internal server error): 
```javascript
return cb(someError);
```
eg:
```javascript
return cb(new Error("database is not responding!"));
```
###### When the resource at this url exists...
You can just `return cb()` to continue allowing their request, but if you've retrieved some data that represents this url in the process of determining if it exists, it might be even nicer to do this:

```javascript
return cb(null, someData);
```
If you do that then `req.fetched` will be set to `someData` in all your method handlers (GET, POST, PUT, DELETE, PATCH, HEAD), and request processing will continue.  This can come in handy anytime you might later need that data for the resource (often you need it for GET at least, and this can save a redundant database call).

###### Usage:
```javascript
{
    fetch : function(req, res, cb){
        getSomeDataForThisUrl(req.url, function(err, data){
            if (err){
                return cb(err);
            }
            if (!data){
                return cb(true);
            }
            return cb(null, data);
        });
    },
    
    GET : function(req, res){
        res.end(JSON.stringify(req.fetched));
    }

}
```
##### authenticate(req, res, cb)
This is useful when you want to do the authentication for all your methods in one place.  If you don't implement this, all users are authorized.

If implemented, this is always called after `fetch()` if `fetch()` is implemented, otherwise it's called first.

###### Immediately responding with a 401
(meaning the user isn't authenticated): 
```javascript
return cb(true);
```

###### Immediately responding with a 500 
(meaning there was an internal server error): 
```javascript
return cb(someError);
```
eg:
```javascript
return cb(new Error("database is not responding!"));
```

###### When the user is authenticated (ie logged in)...
You can just `return cb()` to continue allowing their request, but if you've got a user object, it might be even nicer to do this:

```javascript
return cb(null, userObject);
```

If you do that, then `req.authenticated` will be set to your `userObject` in all your method handlers (GET, POST, PUT, DELETE, PATCH, HEAD), and request processing will continue.  This can come in handy so you can access the user object as `req.authenticated`, and always know that the user is properly authenticated.

###### Usage:
```javascript
{
    authenticate : function(req, res, cb){
        getUserFromSession(req, function(err, user){
            if (err){
                return cb(err);
            }
            if (!user){
                return cb(true);
            }
            return cb(null, user);
        });
    },
    
    GET : function(req, res){
        res.end("you're logged in!");
    }

}
```

##### forbid(req, res, cb)
This is useful when you want to handle permissions for all your methods in one place.  If you don't implement this, all users are permitted.  Also: This probably only makes sense if the user is already authenticated, otherwise you probably don't have a criteria for deciding whether or not they're forbidden. 

If implemented, this is always called after `fetch()` and/or `authenticate()` if those methods are implemented, otherwise it's called first.

###### Immediately responding with a 403
(meaning the user doesn't have the necessary permissions)

###### To forbid all methods:
```javascript
return cb(null, true); 
```

###### To specify particular methods that are forbidden: 
```javascript
return cb(null, arrayOfHttpMethodNames);
```
eg: 
```javascript
return cb(null, ['PUT', 'DELETE']);
```

###### Immediately responding with a 500 
(meaning there was an internal server error): 
```javascript
return cb(someError);
```
###### When the user isn't forbidden at all...
```javascript
return cb();
```
###### Usage:
```javascript
{
    authenticated : myAuthenticationFunction,
    
    forbid : function(req, res, cb){
        switch(req.authenticated.type){
            case 'admin' : return cb();
            case 'writer' : return cb(null, ['DELETE']);
            case 'reader' : return cb(true);  // forbid all 'readers'!
        }
    },
    
    GET : function(req, res){
        res.end("you could be any type!");
    },

    DELETE : function(req, res){
        res.end("you're an admin");
    }

}
```

### The `options` object:
The `resource()` method automatically adds two things to your resource by default:

#### optionsStrategy(req, res, arrayOfImplementedMethods)
The default implementation of OPTIONS sets the `Allow` response header to notify clients of all the methods that your resource supports.  You can override that default by specifying an `optionsStrategy` though.  The third argument, `arrayOfImplementedMethods` is an array of all the HTTP methods that are implemented on the resource, and can be used for setting the 'Allow' header yourself, or sending the list of allowed methods in the response body.

#### notFoundStrategy(req, res)
This lets you change how 404s are handled by default in your resource.  Anytime `fetch()`'s callback is called with a first parameter that's `true`, a notFoundStrategy runs to handle it.  If you don't like the default one, you can override it here.

#### methodNotAllowedStrategy(req, res, arrayOfImplementedMethods)
By default, `resource()` makes your resource properly respond with 405 "Method not allowed" errors (including the proper 'Allow' header) when a method doesn't exist for your resource, but you can change the details of how that works with the `methodNotAllowedStrategy()`.   The third argument, `arrayOfImplementedMethods` is an array of all the HTTP methods that are implemented on the resource, and can be used for setting the 'Allow' header yourself, or sending the list of allowed methods in the response body.

#### internalServerErrorStrategy(req, res, error)
This lets you change how 500s ('Internal Server Error') are handled by default in your resource.  Anytime `fetch()`, `authenticate()`, or `forbid()`'s callback is called with a first parameter that's an error, an internalServerErrorStategy runs to handle it.  If you don't like the default one, you can override it here.  The third argument, `error` is the error object that got passed.  It can be used for logging or outputting via the response body.

// Platform: android

// commit cd29cf0f224ccf25e9d422a33fd02ef67d3a78f4

// File generated at :: Thu Apr 25 2013 14:53:10 GMT-0700 (PDT)

/*
 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at
 
     http://www.apache.org/licenses/LICENSE-2.0
 
 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
*/

;(function() {

// file: lib/scripts/require.js

var require,
    define;

(function () {
    var modules = {};
    // Stack of moduleIds currently being built.
    var requireStack = [];
    // Map of module ID -> index into requireStack of modules currently being built.
    var inProgressModules = {};

    function build(module) {
        var factory = module.factory;
        module.exports = {};
        delete module.factory;
        factory(require, module.exports, module);
        return module.exports;
    }

    require = function (id) {
        if (!modules[id]) {
            throw "module " + id + " not found";
        } else if (id in inProgressModules) {
            var cycle = requireStack.slice(inProgressModules[id]).join('->') + '->' + id;
            throw "Cycle in require graph: " + cycle;
        }
        if (modules[id].factory) {
            try {
                inProgressModules[id] = requireStack.length;
                requireStack.push(id);
                return build(modules[id]);
            } finally {
                delete inProgressModules[id];
                requireStack.pop();
            }
        }
        return modules[id].exports;
    };

    define = function (id, factory) {
        if (modules[id]) {
            throw "module " + id + " already defined";
        }

        modules[id] = {
            id: id,
            factory: factory
        };
    };

    define.remove = function (id) {
        delete modules[id];
    };

    define.moduleMap = modules;
})();

//Export for use in node
if (typeof module === "object" && typeof require === "function") {
    module.exports.require = require;
    module.exports.define = define;
}

// file: lib/cordova.js
define("cordova", function(require, exports, module) {


var channel = require('cordova/channel');

/**
 * Listen for DOMContentLoaded and notify our channel subscribers.
 */
document.addEventListener('DOMContentLoaded', function() {
    channel.onDOMContentLoaded.fire();
}, false);
if (document.readyState == 'complete' || document.readyState == 'interactive') {
    channel.onDOMContentLoaded.fire();
}

/**
 * Intercept calls to addEventListener + removeEventListener and handle deviceready,
 * resume, and pause events.
 */
var m_document_addEventListener = document.addEventListener;
var m_document_removeEventListener = document.removeEventListener;
var m_window_addEventListener = window.addEventListener;
var m_window_removeEventListener = window.removeEventListener;

/**
 * Houses custom event handlers to intercept on document + window event listeners.
 */
var documentEventHandlers = {},
    windowEventHandlers = {};

document.addEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();
    if (typeof documentEventHandlers[e] != 'undefined') {
        documentEventHandlers[e].subscribe(handler);
    } else {
        m_document_addEventListener.call(document, evt, handler, capture);
    }
};

window.addEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();
    if (typeof windowEventHandlers[e] != 'undefined') {
        windowEventHandlers[e].subscribe(handler);
    } else {
        m_window_addEventListener.call(window, evt, handler, capture);
    }
};

document.removeEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();
    // If unsubscribing from an event that is handled by a plugin
    if (typeof documentEventHandlers[e] != "undefined") {
        documentEventHandlers[e].unsubscribe(handler);
    } else {
        m_document_removeEventListener.call(document, evt, handler, capture);
    }
};

window.removeEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();
    // If unsubscribing from an event that is handled by a plugin
    if (typeof windowEventHandlers[e] != "undefined") {
        windowEventHandlers[e].unsubscribe(handler);
    } else {
        m_window_removeEventListener.call(window, evt, handler, capture);
    }
};

function createEvent(type, data) {
    var event = document.createEvent('Events');
    event.initEvent(type, false, false);
    if (data) {
        for (var i in data) {
            if (data.hasOwnProperty(i)) {
                event[i] = data[i];
            }
        }
    }
    return event;
}

if(typeof window.console === "undefined") {
    window.console = {
        log:function(){}
    };
}

var cordova = {
    define:define,
    require:require,
    /**
     * Methods to add/remove your own addEventListener hijacking on document + window.
     */
    addWindowEventHandler:function(event) {
        return (windowEventHandlers[event] = channel.create(event));
    },
    addStickyDocumentEventHandler:function(event) {
        return (documentEventHandlers[event] = channel.createSticky(event));
    },
    addDocumentEventHandler:function(event) {
        return (documentEventHandlers[event] = channel.create(event));
    },
    removeWindowEventHandler:function(event) {
        delete windowEventHandlers[event];
    },
    removeDocumentEventHandler:function(event) {
        delete documentEventHandlers[event];
    },
    /**
     * Retrieve original event handlers that were replaced by Cordova
     *
     * @return object
     */
    getOriginalHandlers: function() {
        return {'document': {'addEventListener': m_document_addEventListener, 'removeEventListener': m_document_removeEventListener},
        'window': {'addEventListener': m_window_addEventListener, 'removeEventListener': m_window_removeEventListener}};
    },
    /**
     * Method to fire event from native code
     * bNoDetach is required for events which cause an exception which needs to be caught in native code
     */
    fireDocumentEvent: function(type, data, bNoDetach) {
        var evt = createEvent(type, data);
        if (typeof documentEventHandlers[type] != 'undefined') {
            if( bNoDetach ) {
              documentEventHandlers[type].fire(evt);
            }
            else {
              setTimeout(function() {
                  // Fire deviceready on listeners that were registered before cordova.js was loaded.
                  if (type == 'deviceready') {
                      document.dispatchEvent(evt);
                  }
                  documentEventHandlers[type].fire(evt);
              }, 0);
            }
        } else {
            document.dispatchEvent(evt);
        }
    },
    fireWindowEvent: function(type, data) {
        var evt = createEvent(type,data);
        if (typeof windowEventHandlers[type] != 'undefined') {
            setTimeout(function() {
                windowEventHandlers[type].fire(evt);
            }, 0);
        } else {
            window.dispatchEvent(evt);
        }
    },

    /**
     * Plugin callback mechanism.
     */
    // Randomize the starting callbackId to avoid collisions after refreshing or navigating.
    // This way, it's very unlikely that any new callback would get the same callbackId as an old callback.
    callbackId: Math.floor(Math.random() * 2000000000),
    callbacks:  {},
    callbackStatus: {
        NO_RESULT: 0,
        OK: 1,
        CLASS_NOT_FOUND_EXCEPTION: 2,
        ILLEGAL_ACCESS_EXCEPTION: 3,
        INSTANTIATION_EXCEPTION: 4,
        MALFORMED_URL_EXCEPTION: 5,
        IO_EXCEPTION: 6,
        INVALID_ACTION: 7,
        JSON_EXCEPTION: 8,
        ERROR: 9
    },

    /**
     * Called by native code when returning successful result from an action.
     */
    callbackSuccess: function(callbackId, args) {
        try {
            cordova.callbackFromNative(callbackId, true, args.status, [args.message], args.keepCallback);
        } catch (e) {
            console.log("Error in error callback: " + callbackId + " = "+e);
        }
    },

    /**
     * Called by native code when returning error result from an action.
     */
    callbackError: function(callbackId, args) {
        // TODO: Deprecate callbackSuccess and callbackError in favour of callbackFromNative.
        // Derive success from status.
        try {
            cordova.callbackFromNative(callbackId, false, args.status, [args.message], args.keepCallback);
        } catch (e) {
            console.log("Error in error callback: " + callbackId + " = "+e);
        }
    },

    /**
     * Called by native code when returning the result from an action.
     */
    callbackFromNative: function(callbackId, success, status, args, keepCallback) {
        var callback = cordova.callbacks[callbackId];
        if (callback) {
            if (success && status == cordova.callbackStatus.OK) {
                callback.success && callback.success.apply(null, args);
            } else if (!success) {
                callback.fail && callback.fail.apply(null, args);
            }

            // Clear callback if not expecting any more results
            if (!keepCallback) {
                delete cordova.callbacks[callbackId];
            }
        }
    },
    addConstructor: function(func) {
        channel.onCordovaReady.subscribe(function() {
            try {
                func();
            } catch(e) {
                console.log("Failed to run constructor: " + e);
            }
        });
    }
};

// Register pause, resume and deviceready channels as events on document.
channel.onPause = cordova.addDocumentEventHandler('pause');
channel.onResume = cordova.addDocumentEventHandler('resume');
channel.onDeviceReady = cordova.addStickyDocumentEventHandler('deviceready');

module.exports = cordova;

});

// file: lib/common/argscheck.js
define("cordova/argscheck", function(require, exports, module) {

var exec = require('cordova/exec');
var utils = require('cordova/utils');

var moduleExports = module.exports;

var typeMap = {
    'A': 'Array',
    'D': 'Date',
    'N': 'Number',
    'S': 'String',
    'F': 'Function',
    'O': 'Object'
};

function extractParamName(callee, argIndex) {
  return (/.*?\((.*?)\)/).exec(callee)[1].split(', ')[argIndex];
}

function checkArgs(spec, functionName, args, opt_callee) {
    if (!moduleExports.enableChecks) {
        return;
    }
    var errMsg = null;
    var typeName;
    for (var i = 0; i < spec.length; ++i) {
        var c = spec.charAt(i),
            cUpper = c.toUpperCase(),
            arg = args[i];
        // Asterix means allow anything.
        if (c == '*') {
            continue;
        }
        typeName = utils.typeName(arg);
        if ((arg === null || arg === undefined) && c == cUpper) {
            continue;
        }
        if (typeName != typeMap[cUpper]) {
            errMsg = 'Expected ' + typeMap[cUpper];
            break;
        }
    }
    if (errMsg) {
        errMsg += ', but got ' + typeName + '.';
        errMsg = 'Wrong type for parameter "' + extractParamName(opt_callee || args.callee, i) + '" of ' + functionName + ': ' + errMsg;
        // Don't log when running jake test.
        if (typeof jasmine == 'undefined') {
            console.error(errMsg);
        }
        throw TypeError(errMsg);
    }
}

function getValue(value, defaultValue) {
    return value === undefined ? defaultValue : value;
}

moduleExports.checkArgs = checkArgs;
moduleExports.getValue = getValue;
moduleExports.enableChecks = true;


});

// file: lib/common/builder.js
define("cordova/builder", function(require, exports, module) {

var utils = require('cordova/utils');

function each(objects, func, context) {
    for (var prop in objects) {
        if (objects.hasOwnProperty(prop)) {
            func.apply(context, [objects[prop], prop]);
        }
    }
}

function clobber(obj, key, value) {
    exports.replaceHookForTesting(obj, key);
    obj[key] = value;
    // Getters can only be overridden by getters.
    if (obj[key] !== value) {
        utils.defineGetter(obj, key, function() {
            return value;
        });
    }
}

function assignOrWrapInDeprecateGetter(obj, key, value, message) {
    if (message) {
        utils.defineGetter(obj, key, function() {
            console.log(message);
            delete obj[key];
            clobber(obj, key, value);
            return value;
        });
    } else {
        clobber(obj, key, value);
    }
}

function include(parent, objects, clobber, merge) {
    each(objects, function (obj, key) {
        try {
          var result = obj.path ? require(obj.path) : {};

          if (clobber) {
              // Clobber if it doesn't exist.
              if (typeof parent[key] === 'undefined') {
                  assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
              } else if (typeof obj.path !== 'undefined') {
                  // If merging, merge properties onto parent, otherwise, clobber.
                  if (merge) {
                      recursiveMerge(parent[key], result);
                  } else {
                      assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
                  }
              }
              result = parent[key];
          } else {
            // Overwrite if not currently defined.
            if (typeof parent[key] == 'undefined') {
              assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
            } else {
              // Set result to what already exists, so we can build children into it if they exist.
              result = parent[key];
            }
          }

          if (obj.children) {
            include(result, obj.children, clobber, merge);
          }
        } catch(e) {
          utils.alert('Exception building cordova JS globals: ' + e + ' for key "' + key + '"');
        }
    });
}

/**
 * Merge properties from one object onto another recursively.  Properties from
 * the src object will overwrite existing target property.
 *
 * @param target Object to merge properties into.
 * @param src Object to merge properties from.
 */
function recursiveMerge(target, src) {
    for (var prop in src) {
        if (src.hasOwnProperty(prop)) {
            if (target.prototype && target.prototype.constructor === target) {
                // If the target object is a constructor override off prototype.
                clobber(target.prototype, prop, src[prop]);
            } else {
                if (typeof src[prop] === 'object' && typeof target[prop] === 'object') {
                    recursiveMerge(target[prop], src[prop]);
                } else {
                    clobber(target, prop, src[prop]);
                }
            }
        }
    }
}

exports.buildIntoButDoNotClobber = function(objects, target) {
    include(target, objects, false, false);
};
exports.buildIntoAndClobber = function(objects, target) {
    include(target, objects, true, false);
};
exports.buildIntoAndMerge = function(objects, target) {
    include(target, objects, true, true);
};
exports.recursiveMerge = recursiveMerge;
exports.assignOrWrapInDeprecateGetter = assignOrWrapInDeprecateGetter;
exports.replaceHookForTesting = function() {};

});

// file: lib/common/channel.js
define("cordova/channel", function(require, exports, module) {

var utils = require('cordova/utils'),
    nextGuid = 1;

/**
 * Custom pub-sub "channel" that can have functions subscribed to it
 * This object is used to define and control firing of events for
 * cordova initialization, as well as for custom events thereafter.
 *
 * The order of events during page load and Cordova startup is as follows:
 *
 * onDOMContentLoaded*         Internal event that is received when the web page is loaded and parsed.
 * onNativeReady*              Internal event that indicates the Cordova native side is ready.
 * onCordovaReady*             Internal event fired when all Cordova JavaScript objects have been created.
 * onCordovaInfoReady*         Internal event fired when device properties are available.
 * onCordovaConnectionReady*   Internal event fired when the connection property has been set.
 * onDeviceReady*              User event fired to indicate that Cordova is ready
 * onResume                    User event fired to indicate a start/resume lifecycle event
 * onPause                     User event fired to indicate a pause lifecycle event
 * onDestroy*                  Internal event fired when app is being destroyed (User should use window.onunload event, not this one).
 *
 * The events marked with an * are sticky. Once they have fired, they will stay in the fired state.
 * All listeners that subscribe after the event is fired will be executed right away.
 *
 * The only Cordova events that user code should register for are:
 *      deviceready           Cordova native code is initialized and Cordova APIs can be called from JavaScript
 *      pause                 App has moved to background
 *      resume                App has returned to foreground
 *
 * Listeners can be registered as:
 *      document.addEventListener("deviceready", myDeviceReadyListener, false);
 *      document.addEventListener("resume", myResumeListener, false);
 *      document.addEventListener("pause", myPauseListener, false);
 *
 * The DOM lifecycle events should be used for saving and restoring state
 *      window.onload
 *      window.onunload
 *
 */

/**
 * Channel
 * @constructor
 * @param type  String the channel name
 */
var Channel = function(type, sticky) {
    this.type = type;
    // Map of guid -> function.
    this.handlers = {};
    // 0 = Non-sticky, 1 = Sticky non-fired, 2 = Sticky fired.
    this.state = sticky ? 1 : 0;
    // Used in sticky mode to remember args passed to fire().
    this.fireArgs = null;
    // Used by onHasSubscribersChange to know if there are any listeners.
    this.numHandlers = 0;
    // Function that is called when the first listener is subscribed, or when
    // the last listener is unsubscribed.
    this.onHasSubscribersChange = null;
},
    channel = {
        /**
         * Calls the provided function only after all of the channels specified
         * have been fired. All channels must be sticky channels.
         */
        join: function(h, c) {
            var len = c.length,
                i = len,
                f = function() {
                    if (!(--i)) h();
                };
            for (var j=0; j<len; j++) {
                if (c[j].state === 0) {
                    throw Error('Can only use join with sticky channels.');
                }
                c[j].subscribe(f);
            }
            if (!len) h();
        },
        create: function(type) {
            return channel[type] = new Channel(type, false);
        },
        createSticky: function(type) {
            return channel[type] = new Channel(type, true);
        },

        /**
         * cordova Channels that must fire before "deviceready" is fired.
         */
        deviceReadyChannelsArray: [],
        deviceReadyChannelsMap: {},

        /**
         * Indicate that a feature needs to be initialized before it is ready to be used.
         * This holds up Cordova's "deviceready" event until the feature has been initialized
         * and Cordova.initComplete(feature) is called.
         *
         * @param feature {String}     The unique feature name
         */
        waitForInitialization: function(feature) {
            if (feature) {
                var c = channel[feature] || this.createSticky(feature);
                this.deviceReadyChannelsMap[feature] = c;
                this.deviceReadyChannelsArray.push(c);
            }
        },

        /**
         * Indicate that initialization code has completed and the feature is ready to be used.
         *
         * @param feature {String}     The unique feature name
         */
        initializationComplete: function(feature) {
            var c = this.deviceReadyChannelsMap[feature];
            if (c) {
                c.fire();
            }
        }
    };

function forceFunction(f) {
    if (typeof f != 'function') throw "Function required as first argument!";
}

/**
 * Subscribes the given function to the channel. Any time that
 * Channel.fire is called so too will the function.
 * Optionally specify an execution context for the function
 * and a guid that can be used to stop subscribing to the channel.
 * Returns the guid.
 */
Channel.prototype.subscribe = function(f, c) {
    // need a function to call
    forceFunction(f);
    if (this.state == 2) {
        f.apply(c || this, this.fireArgs);
        return;
    }

    var func = f,
        guid = f.observer_guid;
    if (typeof c == "object") { func = utils.close(c, f); }

    if (!guid) {
        // first time any channel has seen this subscriber
        guid = '' + nextGuid++;
    }
    func.observer_guid = guid;
    f.observer_guid = guid;

    // Don't add the same handler more than once.
    if (!this.handlers[guid]) {
        this.handlers[guid] = func;
        this.numHandlers++;
        if (this.numHandlers == 1) {
            this.onHasSubscribersChange && this.onHasSubscribersChange();
        }
    }
};

/**
 * Unsubscribes the function with the given guid from the channel.
 */
Channel.prototype.unsubscribe = function(f) {
    // need a function to unsubscribe
    forceFunction(f);

    var guid = f.observer_guid,
        handler = this.handlers[guid];
    if (handler) {
        delete this.handlers[guid];
        this.numHandlers--;
        if (this.numHandlers === 0) {
            this.onHasSubscribersChange && this.onHasSubscribersChange();
        }
    }
};

/**
 * Calls all functions subscribed to this channel.
 */
Channel.prototype.fire = function(e) {
    var fail = false,
        fireArgs = Array.prototype.slice.call(arguments);
    // Apply stickiness.
    if (this.state == 1) {
        this.state = 2;
        this.fireArgs = fireArgs;
    }
    if (this.numHandlers) {
        // Copy the values first so that it is safe to modify it from within
        // callbacks.
        var toCall = [];
        for (var item in this.handlers) {
            toCall.push(this.handlers[item]);
        }
        for (var i = 0; i < toCall.length; ++i) {
            toCall[i].apply(this, fireArgs);
        }
        if (this.state == 2 && this.numHandlers) {
            this.numHandlers = 0;
            this.handlers = {};
            this.onHasSubscribersChange && this.onHasSubscribersChange();
        }
    }
};


// defining them here so they are ready super fast!
// DOM event that is received when the web page is loaded and parsed.
channel.createSticky('onDOMContentLoaded');

// Event to indicate the Cordova native side is ready.
channel.createSticky('onNativeReady');

// Event to indicate that all Cordova JavaScript objects have been created
// and it's time to run plugin constructors.
channel.createSticky('onCordovaReady');

// Event to indicate that device properties are available
channel.createSticky('onCordovaInfoReady');

// Event to indicate that the connection property has been set.
channel.createSticky('onCordovaConnectionReady');

// Event to indicate that all automatically loaded JS plugins are loaded and ready.
channel.createSticky('onPluginsReady');

// Event to indicate that Cordova is ready
channel.createSticky('onDeviceReady');

// Event to indicate a resume lifecycle event
channel.create('onResume');

// Event to indicate a pause lifecycle event
channel.create('onPause');

// Event to indicate a destroy lifecycle event
channel.createSticky('onDestroy');

// Channels that must fire before "deviceready" is fired.
channel.waitForInitialization('onCordovaReady');
channel.waitForInitialization('onCordovaConnectionReady');
channel.waitForInitialization('onDOMContentLoaded');

module.exports = channel;

});

// file: lib/common/commandProxy.js
define("cordova/commandProxy", function(require, exports, module) {


// internal map of proxy function
var CommandProxyMap = {};

module.exports = {

    // example: cordova.commandProxy.add("Accelerometer",{getCurrentAcceleration: function(successCallback, errorCallback, options) {...},...);
    add:function(id,proxyObj) {
        console.log("adding proxy for " + id);
        CommandProxyMap[id] = proxyObj;
        return proxyObj;
    },

    // cordova.commandProxy.remove("Accelerometer");
    remove:function(id) {
        var proxy = CommandProxyMap[id];
        delete CommandProxyMap[id];
        CommandProxyMap[id] = null;
        return proxy;
    },

    get:function(service,action) {
        return ( CommandProxyMap[service] ? CommandProxyMap[service][action] : null );
    }
};
});

// file: lib/android/exec.js
define("cordova/exec", function(require, exports, module) {

/**
 * Execute a cordova command.  It is up to the native side whether this action
 * is synchronous or asynchronous.  The native side can return:
 *      Synchronous: PluginResult object as a JSON string
 *      Asynchronous: Empty string ""
 * If async, the native side will cordova.callbackSuccess or cordova.callbackError,
 * depending upon the result of the action.
 *
 * @param {Function} success    The success callback
 * @param {Function} fail       The fail callback
 * @param {String} service      The name of the service to use
 * @param {String} action       Action to be run in cordova
 * @param {String[]} [args]     Zero or more arguments to pass to the method
 */
var cordova = require('cordova'),
    nativeApiProvider = require('cordova/plugin/android/nativeapiprovider'),
    utils = require('cordova/utils'),
    jsToNativeModes = {
        PROMPT: 0,
        JS_OBJECT: 1,
        // This mode is currently for benchmarking purposes only. It must be enabled
        // on the native side through the ENABLE_LOCATION_CHANGE_EXEC_MODE
        // constant within CordovaWebViewClient.java before it will work.
        LOCATION_CHANGE: 2
    },
    nativeToJsModes = {
        // Polls for messages using the JS->Native bridge.
        POLLING: 0,
        // For LOAD_URL to be viable, it would need to have a work-around for
        // the bug where the soft-keyboard gets dismissed when a message is sent.
        LOAD_URL: 1,
        // For the ONLINE_EVENT to be viable, it would need to intercept all event
        // listeners (both through addEventListener and window.ononline) as well
        // as set the navigator property itself.
        ONLINE_EVENT: 2,
        // Uses reflection to access private APIs of the WebView that can send JS
        // to be executed.
        // Requires Android 3.2.4 or above.
        PRIVATE_API: 3
    },
    jsToNativeBridgeMode,  // Set lazily.
    nativeToJsBridgeMode = nativeToJsModes.ONLINE_EVENT,
    pollEnabled = false,
    messagesFromNative = [];

function androidExec(success, fail, service, action, args) {
    // Set default bridge modes if they have not already been set.
    // By default, we use the failsafe, since addJavascriptInterface breaks too often
    if (jsToNativeBridgeMode === undefined) {
        androidExec.setJsToNativeBridgeMode(jsToNativeModes.JS_OBJECT);
    }

    // Process any ArrayBuffers in the args into a string.
    for (var i = 0; i < args.length; i++) {
        if (utils.typeName(args[i]) == 'ArrayBuffer') {
            args[i] = window.btoa(String.fromCharCode.apply(null, new Uint8Array(args[i])));
        }
    }

    var callbackId = service + cordova.callbackId++,
        argsJson = JSON.stringify(args);

    if (success || fail) {
        cordova.callbacks[callbackId] = {success:success, fail:fail};
    }

    if (jsToNativeBridgeMode == jsToNativeModes.LOCATION_CHANGE) {
        window.location = 'http://cdv_exec/' + service + '#' + action + '#' + callbackId + '#' + argsJson;
    } else {
        var messages = nativeApiProvider.get().exec(service, action, callbackId, argsJson);
        // If argsJson was received by Java as null, try again with the PROMPT bridge mode.
        // This happens in rare circumstances, such as when certain Unicode characters are passed over the bridge on a Galaxy S2.  See CB-2666.
        if (jsToNativeBridgeMode == jsToNativeModes.JS_OBJECT && messages === "@Null arguments.") {
            androidExec.setJsToNativeBridgeMode(jsToNativeModes.PROMPT);
            androidExec(success, fail, service, action, args);
            androidExec.setJsToNativeBridgeMode(jsToNativeModes.JS_OBJECT);
            return;
        } else {
            androidExec.processMessages(messages);
        }
    }
}

function pollOnce() {
    var msg = nativeApiProvider.get().retrieveJsMessages();
    androidExec.processMessages(msg);
}

function pollingTimerFunc() {
    if (pollEnabled) {
        pollOnce();
        setTimeout(pollingTimerFunc, 50);
    }
}

function hookOnlineApis() {
    function proxyEvent(e) {
        cordova.fireWindowEvent(e.type);
    }
    // The network module takes care of firing online and offline events.
    // It currently fires them only on document though, so we bridge them
    // to window here (while first listening for exec()-releated online/offline
    // events).
    window.addEventListener('online', pollOnce, false);
    window.addEventListener('offline', pollOnce, false);
    cordova.addWindowEventHandler('online');
    cordova.addWindowEventHandler('offline');
    document.addEventListener('online', proxyEvent, false);
    document.addEventListener('offline', proxyEvent, false);
}

hookOnlineApis();

androidExec.jsToNativeModes = jsToNativeModes;
androidExec.nativeToJsModes = nativeToJsModes;

androidExec.setJsToNativeBridgeMode = function(mode) {
    if (mode == jsToNativeModes.JS_OBJECT && !window._cordovaNative) {
        console.log('Falling back on PROMPT mode since _cordovaNative is missing. Expected for Android 3.2 and lower only.');
        mode = jsToNativeModes.PROMPT;
    }
    nativeApiProvider.setPreferPrompt(mode == jsToNativeModes.PROMPT);
    jsToNativeBridgeMode = mode;
};

androidExec.setNativeToJsBridgeMode = function(mode) {
    if (mode == nativeToJsBridgeMode) {
        return;
    }
    if (nativeToJsBridgeMode == nativeToJsModes.POLLING) {
        pollEnabled = false;
    }

    nativeToJsBridgeMode = mode;
    // Tell the native side to switch modes.
    nativeApiProvider.get().setNativeToJsBridgeMode(mode);

    if (mode == nativeToJsModes.POLLING) {
        pollEnabled = true;
        setTimeout(pollingTimerFunc, 1);
    }
};

// Processes a single message, as encoded by NativeToJsMessageQueue.java.
function processMessage(message) {
    try {
        var firstChar = message.charAt(0);
        if (firstChar == 'J') {
            eval(message.slice(1));
        } else if (firstChar == 'S' || firstChar == 'F') {
            var success = firstChar == 'S';
            var keepCallback = message.charAt(1) == '1';
            var spaceIdx = message.indexOf(' ', 2);
            var status = +message.slice(2, spaceIdx);
            var nextSpaceIdx = message.indexOf(' ', spaceIdx + 1);
            var callbackId = message.slice(spaceIdx + 1, nextSpaceIdx);
            var payloadKind = message.charAt(nextSpaceIdx + 1);
            var payload;
            if (payloadKind == 's') {
                payload = message.slice(nextSpaceIdx + 2);
            } else if (payloadKind == 't') {
                payload = true;
            } else if (payloadKind == 'f') {
                payload = false;
            } else if (payloadKind == 'N') {
                payload = null;
            } else if (payloadKind == 'n') {
                payload = +message.slice(nextSpaceIdx + 2);
            } else if (payloadKind == 'A') {
                var data = message.slice(nextSpaceIdx + 2);
                var bytes = window.atob(data);
                var arraybuffer = new Uint8Array(bytes.length);
                for (var i = 0; i < bytes.length; i++) {
                    arraybuffer[i] = bytes.charCodeAt(i);
                }
                payload = arraybuffer.buffer;
            } else if (payloadKind == 'S') {
                payload = window.atob(message.slice(nextSpaceIdx + 2));
            } else {
                payload = JSON.parse(message.slice(nextSpaceIdx + 1));
            }
            cordova.callbackFromNative(callbackId, success, status, [payload], keepCallback);
        } else {
            console.log("processMessage failed: invalid message:" + message);
        }
    } catch (e) {
        console.log("processMessage failed: Message: " + message);
        console.log("processMessage failed: Error: " + e);
        console.log("processMessage failed: Stack: " + e.stack);
    }
}

// This is called from the NativeToJsMessageQueue.java.
androidExec.processMessages = function(messages) {
    if (messages) {
        messagesFromNative.push(messages);
        // Check for the reentrant case, and enqueue the message if that's the case.
        if (messagesFromNative.length > 1) {
            return;
        }
        while (messagesFromNative.length) {
            // Don't unshift until the end so that reentrancy can be detected.
            messages = messagesFromNative[0];
            // The Java side can send a * message to indicate that it
            // still has messages waiting to be retrieved.
            if (messages == '*') {
                messagesFromNative.shift();
                window.setTimeout(pollOnce, 0);
                return;
            }

            var spaceIdx = messages.indexOf(' ');
            var msgLen = +messages.slice(0, spaceIdx);
            var message = messages.substr(spaceIdx + 1, msgLen);
            messages = messages.slice(spaceIdx + msgLen + 1);
            processMessage(message);
            if (messages) {
                messagesFromNative[0] = messages;
            } else {
                messagesFromNative.shift();
            }
        }
    }
};

module.exports = androidExec;

});

// file: lib/common/modulemapper.js
define("cordova/modulemapper", function(require, exports, module) {

var builder = require('cordova/builder'),
    moduleMap = define.moduleMap,
    symbolList,
    deprecationMap;

exports.reset = function() {
    symbolList = [];
    deprecationMap = {};
};

function addEntry(strategy, moduleName, symbolPath, opt_deprecationMessage) {
    if (!(moduleName in moduleMap)) {
        throw new Error('Module ' + moduleName + ' does not exist.');
    }
    symbolList.push(strategy, moduleName, symbolPath);
    if (opt_deprecationMessage) {
        deprecationMap[symbolPath] = opt_deprecationMessage;
    }
}

// Note: Android 2.3 does have Function.bind().
exports.clobbers = function(moduleName, symbolPath, opt_deprecationMessage) {
    addEntry('c', moduleName, symbolPath, opt_deprecationMessage);
};

exports.merges = function(moduleName, symbolPath, opt_deprecationMessage) {
    addEntry('m', moduleName, symbolPath, opt_deprecationMessage);
};

exports.defaults = function(moduleName, symbolPath, opt_deprecationMessage) {
    addEntry('d', moduleName, symbolPath, opt_deprecationMessage);
};

function prepareNamespace(symbolPath, context) {
    if (!symbolPath) {
        return context;
    }
    var parts = symbolPath.split('.');
    var cur = context;
    for (var i = 0, part; part = parts[i]; ++i) {
        cur = cur[part] = cur[part] || {};
    }
    return cur;
}

exports.mapModules = function(context) {
    var origSymbols = {};
    context.CDV_origSymbols = origSymbols;
    for (var i = 0, len = symbolList.length; i < len; i += 3) {
        var strategy = symbolList[i];
        var moduleName = symbolList[i + 1];
        var symbolPath = symbolList[i + 2];
        var lastDot = symbolPath.lastIndexOf('.');
        var namespace = symbolPath.substr(0, lastDot);
        var lastName = symbolPath.substr(lastDot + 1);

        var module = require(moduleName);
        var deprecationMsg = symbolPath in deprecationMap ? 'Access made to deprecated symbol: ' + symbolPath + '. ' + deprecationMsg : null;
        var parentObj = prepareNamespace(namespace, context);
        var target = parentObj[lastName];

        if (strategy == 'm' && target) {
            builder.recursiveMerge(target, module);
        } else if ((strategy == 'd' && !target) || (strategy != 'd')) {
            if (!(symbolPath in origSymbols)) {
                origSymbols[symbolPath] = target;
            }
            builder.assignOrWrapInDeprecateGetter(parentObj, lastName, module, deprecationMsg);
        }
    }
};

exports.getOriginalSymbol = function(context, symbolPath) {
    var origSymbols = context.CDV_origSymbols;
    if (origSymbols && (symbolPath in origSymbols)) {
        return origSymbols[symbolPath];
    }
    var parts = symbolPath.split('.');
    var obj = context;
    for (var i = 0; i < parts.length; ++i) {
        obj = obj && obj[parts[i]];
    }
    return obj;
};

exports.loadMatchingModules = function(matchingRegExp) {
    for (var k in moduleMap) {
        if (matchingRegExp.exec(k)) {
            require(k);
        }
    }
};

exports.reset();


});

// file: lib/android/platform.js
define("cordova/platform", function(require, exports, module) {

module.exports = {
    id: "android",
    initialize:function() {
        var channel = require("cordova/channel"),
            cordova = require('cordova'),
            exec = require('cordova/exec'),
            modulemapper = require('cordova/modulemapper');

        modulemapper.loadMatchingModules(/cordova.*\/symbols$/);
        modulemapper.clobbers('cordova/plugin/android/app', 'navigator.app');

        modulemapper.mapModules(window);

        // Inject a listener for the backbutton on the document.
        var backButtonChannel = cordova.addDocumentEventHandler('backbutton');
        backButtonChannel.onHasSubscribersChange = function() {
            // If we just attached the first handler or detached the last handler,
            // let native know we need to override the back button.
            exec(null, null, "App", "overrideBackbutton", [this.numHandlers == 1]);
        };

        // Add hardware MENU and SEARCH button handlers
        cordova.addDocumentEventHandler('menubutton');
        cordova.addDocumentEventHandler('searchbutton');

        // Let native code know we are all done on the JS side.
        // Native code will then un-hide the WebView.
        channel.join(function() {
            exec(null, null, "App", "show", []);
        }, [channel.onCordovaReady]);
    }
};

});

// file: lib/common/plugin/Acceleration.js
define("cordova/plugin/Acceleration", function(require, exports, module) {

var Acceleration = function(x, y, z, timestamp) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.timestamp = timestamp || (new Date()).getTime();
};

module.exports = Acceleration;

});

// file: lib/common/plugin/Camera.js
define("cordova/plugin/Camera", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    Camera = require('cordova/plugin/CameraConstants'),
    CameraPopoverHandle = require('cordova/plugin/CameraPopoverHandle');

var cameraExport = {};

// Tack on the Camera Constants to the base camera plugin.
for (var key in Camera) {
    cameraExport[key] = Camera[key];
}

/**
 * Gets a picture from source defined by "options.sourceType", and returns the
 * image as defined by the "options.destinationType" option.

 * The defaults are sourceType=CAMERA and destinationType=FILE_URI.
 *
 * @param {Function} successCallback
 * @param {Function} errorCallback
 * @param {Object} options
 */
cameraExport.getPicture = function(successCallback, errorCallback, options) {
    argscheck.checkArgs('fFO', 'Camera.getPicture', arguments);
    options = options || {};
    var getValue = argscheck.getValue;

    var quality = getValue(options.quality, 50);
    var destinationType = getValue(options.destinationType, Camera.DestinationType.FILE_URI);
    var sourceType = getValue(options.sourceType, Camera.PictureSourceType.CAMERA);
    var targetWidth = getValue(options.targetWidth, -1);
    var targetHeight = getValue(options.targetHeight, -1);
    var encodingType = getValue(options.encodingType, Camera.EncodingType.JPEG);
    var mediaType = getValue(options.mediaType, Camera.MediaType.PICTURE);
    var allowEdit = !!options.allowEdit;
    var correctOrientation = !!options.correctOrientation;
    var saveToPhotoAlbum = !!options.saveToPhotoAlbum;
    var popoverOptions = getValue(options.popoverOptions, null);
    var cameraDirection = getValue(options.cameraDirection, Camera.Direction.BACK);

    var args = [quality, destinationType, sourceType, targetWidth, targetHeight, encodingType,
                mediaType, allowEdit, correctOrientation, saveToPhotoAlbum, popoverOptions, cameraDirection];

    exec(successCallback, errorCallback, "Camera", "takePicture", args);
    return new CameraPopoverHandle();
};

cameraExport.cleanup = function(successCallback, errorCallback) {
    exec(successCallback, errorCallback, "Camera", "cleanup", []);
};

module.exports = cameraExport;

});

// file: lib/common/plugin/CameraConstants.js
define("cordova/plugin/CameraConstants", function(require, exports, module) {

module.exports = {
  DestinationType:{
    DATA_URL: 0,         // Return base64 encoded string
    FILE_URI: 1,         // Return file uri (content://media/external/images/media/2 for Android)
    NATIVE_URI: 2        // Return native uri (eg. asset-library://... for iOS)
  },
  EncodingType:{
    JPEG: 0,             // Return JPEG encoded image
    PNG: 1               // Return PNG encoded image
  },
  MediaType:{
    PICTURE: 0,          // allow selection of still pictures only. DEFAULT. Will return format specified via DestinationType
    VIDEO: 1,            // allow selection of video only, ONLY RETURNS URL
    ALLMEDIA : 2         // allow selection from all media types
  },
  PictureSourceType:{
    PHOTOLIBRARY : 0,    // Choose image from picture library (same as SAVEDPHOTOALBUM for Android)
    CAMERA : 1,          // Take picture from camera
    SAVEDPHOTOALBUM : 2  // Choose image from picture library (same as PHOTOLIBRARY for Android)
  },
  PopoverArrowDirection:{
      ARROW_UP : 1,        // matches iOS UIPopoverArrowDirection constants to specify arrow location on popover
      ARROW_DOWN : 2,
      ARROW_LEFT : 4,
      ARROW_RIGHT : 8,
      ARROW_ANY : 15
  },
  Direction:{
      BACK: 0,
      FRONT: 1
  }
};

});

// file: lib/common/plugin/CameraPopoverHandle.js
define("cordova/plugin/CameraPopoverHandle", function(require, exports, module) {

var exec = require('cordova/exec');

/**
 * A handle to an image picker popover.
 */
var CameraPopoverHandle = function() {
    this.setPosition = function(popoverOptions) {
        console.log('CameraPopoverHandle.setPosition is only supported on iOS.');
    };
};

module.exports = CameraPopoverHandle;

});

// file: lib/common/plugin/CameraPopoverOptions.js
define("cordova/plugin/CameraPopoverOptions", function(require, exports, module) {

var Camera = require('cordova/plugin/CameraConstants');

/**
 * Encapsulates options for iOS Popover image picker
 */
var CameraPopoverOptions = function(x,y,width,height,arrowDir){
    // information of rectangle that popover should be anchored to
    this.x = x || 0;
    this.y = y || 32;
    this.width = width || 320;
    this.height = height || 480;
    // The direction of the popover arrow
    this.arrowDir = arrowDir || Camera.PopoverArrowDirection.ARROW_ANY;
};

module.exports = CameraPopoverOptions;

});

// file: lib/common/plugin/CaptureAudioOptions.js
define("cordova/plugin/CaptureAudioOptions", function(require, exports, module) {

/**
 * Encapsulates all audio capture operation configuration options.
 */
var CaptureAudioOptions = function(){
    // Upper limit of sound clips user can record. Value must be equal or greater than 1.
    this.limit = 1;
    // Maximum duration of a single sound clip in seconds.
    this.duration = 0;
    // The selected audio mode. Must match with one of the elements in supportedAudioModes array.
    this.mode = null;
};

module.exports = CaptureAudioOptions;

});

// file: lib/common/plugin/CaptureError.js
define("cordova/plugin/CaptureError", function(require, exports, module) {

/**
 * The CaptureError interface encapsulates all errors in the Capture API.
 */
var CaptureError = function(c) {
   this.code = c || null;
};

// Camera or microphone failed to capture image or sound.
CaptureError.CAPTURE_INTERNAL_ERR = 0;
// Camera application or audio capture application is currently serving other capture request.
CaptureError.CAPTURE_APPLICATION_BUSY = 1;
// Invalid use of the API (e.g. limit parameter has value less than one).
CaptureError.CAPTURE_INVALID_ARGUMENT = 2;
// User exited camera application or audio capture application before capturing anything.
CaptureError.CAPTURE_NO_MEDIA_FILES = 3;
// The requested capture operation is not supported.
CaptureError.CAPTURE_NOT_SUPPORTED = 20;

module.exports = CaptureError;

});

// file: lib/common/plugin/CaptureImageOptions.js
define("cordova/plugin/CaptureImageOptions", function(require, exports, module) {

/**
 * Encapsulates all image capture operation configuration options.
 */
var CaptureImageOptions = function(){
    // Upper limit of images user can take. Value must be equal or greater than 1.
    this.limit = 1;
    // The selected image mode. Must match with one of the elements in supportedImageModes array.
    this.mode = null;
};

module.exports = CaptureImageOptions;

});

// file: lib/common/plugin/CaptureVideoOptions.js
define("cordova/plugin/CaptureVideoOptions", function(require, exports, module) {

/**
 * Encapsulates all video capture operation configuration options.
 */
var CaptureVideoOptions = function(){
    // Upper limit of videos user can record. Value must be equal or greater than 1.
    this.limit = 1;
    // Maximum duration of a single video clip in seconds.
    this.duration = 0;
    // The selected video mode. Must match with one of the elements in supportedVideoModes array.
    this.mode = null;
};

module.exports = CaptureVideoOptions;

});

// file: lib/common/plugin/CompassError.js
define("cordova/plugin/CompassError", function(require, exports, module) {

/**
 *  CompassError.
 *  An error code assigned by an implementation when an error has occurred
 * @constructor
 */
var CompassError = function(err) {
    this.code = (err !== undefined ? err : null);
};

CompassError.COMPASS_INTERNAL_ERR = 0;
CompassError.COMPASS_NOT_SUPPORTED = 20;

module.exports = CompassError;

});

// file: lib/common/plugin/CompassHeading.js
define("cordova/plugin/CompassHeading", function(require, exports, module) {

var CompassHeading = function(magneticHeading, trueHeading, headingAccuracy, timestamp) {
  this.magneticHeading = magneticHeading;
  this.trueHeading = trueHeading;
  this.headingAccuracy = headingAccuracy;
  this.timestamp = timestamp || new Date().getTime();
};

module.exports = CompassHeading;

});

// file: lib/common/plugin/ConfigurationData.js
define("cordova/plugin/ConfigurationData", function(require, exports, module) {

/**
 * Encapsulates a set of parameters that the capture device supports.
 */
function ConfigurationData() {
    // The ASCII-encoded string in lower case representing the media type.
    this.type = null;
    // The height attribute represents height of the image or video in pixels.
    // In the case of a sound clip this attribute has value 0.
    this.height = 0;
    // The width attribute represents width of the image or video in pixels.
    // In the case of a sound clip this attribute has value 0
    this.width = 0;
}

module.exports = ConfigurationData;

});

// file: lib/common/plugin/Connection.js
define("cordova/plugin/Connection", function(require, exports, module) {

/**
 * Network status
 */
module.exports = {
        UNKNOWN: "unknown",
        ETHERNET: "ethernet",
        WIFI: "wifi",
        CELL_2G: "2g",
        CELL_3G: "3g",
        CELL_4G: "4g",
        CELL:"cellular",
        NONE: "none"
};

});

// file: lib/common/plugin/Contact.js
define("cordova/plugin/Contact", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    ContactError = require('cordova/plugin/ContactError'),
    utils = require('cordova/utils');

/**
* Converts primitives into Complex Object
* Currently only used for Date fields
*/
function convertIn(contact) {
    var value = contact.birthday;
    try {
      contact.birthday = new Date(parseFloat(value));
    } catch (exception){
      console.log("Cordova Contact convertIn error: exception creating date.");
    }
    return contact;
}

/**
* Converts Complex objects into primitives
* Only conversion at present is for Dates.
**/

function convertOut(contact) {
    var value = contact.birthday;
    if (value !== null) {
        // try to make it a Date object if it is not already
        if (!utils.isDate(value)){
            try {
                value = new Date(value);
            } catch(exception){
                value = null;
            }
        }
        if (utils.isDate(value)){
            value = value.valueOf(); // convert to milliseconds
        }
        contact.birthday = value;
    }
    return contact;
}

/**
* Contains information about a single contact.
* @constructor
* @param {DOMString} id unique identifier
* @param {DOMString} displayName
* @param {ContactName} name
* @param {DOMString} nickname
* @param {Array.<ContactField>} phoneNumbers array of phone numbers
* @param {Array.<ContactField>} emails array of email addresses
* @param {Array.<ContactAddress>} addresses array of addresses
* @param {Array.<ContactField>} ims instant messaging user ids
* @param {Array.<ContactOrganization>} organizations
* @param {DOMString} birthday contact's birthday
* @param {DOMString} note user notes about contact
* @param {Array.<ContactField>} photos
* @param {Array.<ContactField>} categories
* @param {Array.<ContactField>} urls contact's web sites
*/
var Contact = function (id, displayName, name, nickname, phoneNumbers, emails, addresses,
    ims, organizations, birthday, note, photos, categories, urls) {
    this.id = id || null;
    this.rawId = null;
    this.displayName = displayName || null;
    this.name = name || null; // ContactName
    this.nickname = nickname || null;
    this.phoneNumbers = phoneNumbers || null; // ContactField[]
    this.emails = emails || null; // ContactField[]
    this.addresses = addresses || null; // ContactAddress[]
    this.ims = ims || null; // ContactField[]
    this.organizations = organizations || null; // ContactOrganization[]
    this.birthday = birthday || null;
    this.note = note || null;
    this.photos = photos || null; // ContactField[]
    this.categories = categories || null; // ContactField[]
    this.urls = urls || null; // ContactField[]
};

/**
* Removes contact from device storage.
* @param successCB success callback
* @param errorCB error callback
*/
Contact.prototype.remove = function(successCB, errorCB) {
    argscheck.checkArgs('FF', 'Contact.remove', arguments);
    var fail = errorCB && function(code) {
        errorCB(new ContactError(code));
    };
    if (this.id === null) {
        fail(ContactError.UNKNOWN_ERROR);
    }
    else {
        exec(successCB, fail, "Contacts", "remove", [this.id]);
    }
};

/**
* Creates a deep copy of this Contact.
* With the contact ID set to null.
* @return copy of this Contact
*/
Contact.prototype.clone = function() {
    var clonedContact = utils.clone(this);
    clonedContact.id = null;
    clonedContact.rawId = null;

    function nullIds(arr) {
        if (arr) {
            for (var i = 0; i < arr.length; ++i) {
                arr[i].id = null;
            }
        }
    }

    // Loop through and clear out any id's in phones, emails, etc.
    nullIds(clonedContact.phoneNumbers);
    nullIds(clonedContact.emails);
    nullIds(clonedContact.addresses);
    nullIds(clonedContact.ims);
    nullIds(clonedContact.organizations);
    nullIds(clonedContact.categories);
    nullIds(clonedContact.photos);
    nullIds(clonedContact.urls);
    return clonedContact;
};

/**
* Persists contact to device storage.
* @param successCB success callback
* @param errorCB error callback
*/
Contact.prototype.save = function(successCB, errorCB) {
    argscheck.checkArgs('FFO', 'Contact.save', arguments);
    var fail = errorCB && function(code) {
        errorCB(new ContactError(code));
    };
    var success = function(result) {
        if (result) {
            if (successCB) {
                var fullContact = require('cordova/plugin/contacts').create(result);
                successCB(convertIn(fullContact));
            }
        }
        else {
            // no Entry object returned
            fail(ContactError.UNKNOWN_ERROR);
        }
    };
    var dupContact = convertOut(utils.clone(this));
    exec(success, fail, "Contacts", "save", [dupContact]);
};


module.exports = Contact;

});

// file: lib/common/plugin/ContactAddress.js
define("cordova/plugin/ContactAddress", function(require, exports, module) {

/**
* Contact address.
* @constructor
* @param {DOMString} id unique identifier, should only be set by native code
* @param formatted // NOTE: not a W3C standard
* @param streetAddress
* @param locality
* @param region
* @param postalCode
* @param country
*/

var ContactAddress = function(pref, type, formatted, streetAddress, locality, region, postalCode, country) {
    this.id = null;
    this.pref = (typeof pref != 'undefined' ? pref : false);
    this.type = type || null;
    this.formatted = formatted || null;
    this.streetAddress = streetAddress || null;
    this.locality = locality || null;
    this.region = region || null;
    this.postalCode = postalCode || null;
    this.country = country || null;
};

module.exports = ContactAddress;

});

// file: lib/common/plugin/ContactError.js
define("cordova/plugin/ContactError", function(require, exports, module) {

/**
 *  ContactError.
 *  An error code assigned by an implementation when an error has occurred
 * @constructor
 */
var ContactError = function(err) {
    this.code = (typeof err != 'undefined' ? err : null);
};

/**
 * Error codes
 */
ContactError.UNKNOWN_ERROR = 0;
ContactError.INVALID_ARGUMENT_ERROR = 1;
ContactError.TIMEOUT_ERROR = 2;
ContactError.PENDING_OPERATION_ERROR = 3;
ContactError.IO_ERROR = 4;
ContactError.NOT_SUPPORTED_ERROR = 5;
ContactError.PERMISSION_DENIED_ERROR = 20;

module.exports = ContactError;

});

// file: lib/common/plugin/ContactField.js
define("cordova/plugin/ContactField", function(require, exports, module) {

/**
* Generic contact field.
* @constructor
* @param {DOMString} id unique identifier, should only be set by native code // NOTE: not a W3C standard
* @param type
* @param value
* @param pref
*/
var ContactField = function(type, value, pref) {
    this.id = null;
    this.type = (type && type.toString()) || null;
    this.value = (value && value.toString()) || null;
    this.pref = (typeof pref != 'undefined' ? pref : false);
};

module.exports = ContactField;

});

// file: lib/common/plugin/ContactFindOptions.js
define("cordova/plugin/ContactFindOptions", function(require, exports, module) {

/**
 * ContactFindOptions.
 * @constructor
 * @param filter used to match contacts against
 * @param multiple boolean used to determine if more than one contact should be returned
 */

var ContactFindOptions = function(filter, multiple) {
    this.filter = filter || '';
    this.multiple = (typeof multiple != 'undefined' ? multiple : false);
};

module.exports = ContactFindOptions;

});

// file: lib/common/plugin/ContactName.js
define("cordova/plugin/ContactName", function(require, exports, module) {

/**
* Contact name.
* @constructor
* @param formatted // NOTE: not part of W3C standard
* @param familyName
* @param givenName
* @param middle
* @param prefix
* @param suffix
*/
var ContactName = function(formatted, familyName, givenName, middle, prefix, suffix) {
    this.formatted = formatted || null;
    this.familyName = familyName || null;
    this.givenName = givenName || null;
    this.middleName = middle || null;
    this.honorificPrefix = prefix || null;
    this.honorificSuffix = suffix || null;
};

module.exports = ContactName;

});

// file: lib/common/plugin/ContactOrganization.js
define("cordova/plugin/ContactOrganization", function(require, exports, module) {

/**
* Contact organization.
* @constructor
* @param {DOMString} id unique identifier, should only be set by native code // NOTE: not a W3C standard
* @param name
* @param dept
* @param title
* @param startDate
* @param endDate
* @param location
* @param desc
*/

var ContactOrganization = function(pref, type, name, dept, title) {
    this.id = null;
    this.pref = (typeof pref != 'undefined' ? pref : false);
    this.type = type || null;
    this.name = name || null;
    this.department = dept || null;
    this.title = title || null;
};

module.exports = ContactOrganization;

});

// file: lib/common/plugin/Coordinates.js
define("cordova/plugin/Coordinates", function(require, exports, module) {

/**
 * This class contains position information.
 * @param {Object} lat
 * @param {Object} lng
 * @param {Object} alt
 * @param {Object} acc
 * @param {Object} head
 * @param {Object} vel
 * @param {Object} altacc
 * @constructor
 */
var Coordinates = function(lat, lng, alt, acc, head, vel, altacc) {
    /**
     * The latitude of the position.
     */
    this.latitude = lat;
    /**
     * The longitude of the position,
     */
    this.longitude = lng;
    /**
     * The accuracy of the position.
     */
    this.accuracy = acc;
    /**
     * The altitude of the position.
     */
    this.altitude = (alt !== undefined ? alt : null);
    /**
     * The direction the device is moving at the position.
     */
    this.heading = (head !== undefined ? head : null);
    /**
     * The velocity with which the device is moving at the position.
     */
    this.speed = (vel !== undefined ? vel : null);

    if (this.speed === 0 || this.speed === null) {
        this.heading = NaN;
    }

    /**
     * The altitude accuracy of the position.
     */
    this.altitudeAccuracy = (altacc !== undefined) ? altacc : null;
};

module.exports = Coordinates;

});

// file: lib/common/plugin/DirectoryEntry.js
define("cordova/plugin/DirectoryEntry", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    Entry = require('cordova/plugin/Entry'),
    FileError = require('cordova/plugin/FileError'),
    DirectoryReader = require('cordova/plugin/DirectoryReader');

/**
 * An interface representing a directory on the file system.
 *
 * {boolean} isFile always false (readonly)
 * {boolean} isDirectory always true (readonly)
 * {DOMString} name of the directory, excluding the path leading to it (readonly)
 * {DOMString} fullPath the absolute full path to the directory (readonly)
 * TODO: implement this!!! {FileSystem} filesystem on which the directory resides (readonly)
 */
var DirectoryEntry = function(name, fullPath) {
     DirectoryEntry.__super__.constructor.call(this, false, true, name, fullPath);
};

utils.extend(DirectoryEntry, Entry);

/**
 * Creates a new DirectoryReader to read entries from this directory
 */
DirectoryEntry.prototype.createReader = function() {
    return new DirectoryReader(this.fullPath);
};

/**
 * Creates or looks up a directory
 *
 * @param {DOMString} path either a relative or absolute path from this directory in which to look up or create a directory
 * @param {Flags} options to create or exclusively create the directory
 * @param {Function} successCallback is called with the new entry
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.getDirectory = function(path, options, successCallback, errorCallback) {
    argscheck.checkArgs('sOFF', 'DirectoryEntry.getDirectory', arguments);
    var win = successCallback && function(result) {
        var entry = new DirectoryEntry(result.name, result.fullPath);
        successCallback(entry);
    };
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    exec(win, fail, "File", "getDirectory", [this.fullPath, path, options]);
};

/**
 * Deletes a directory and all of it's contents
 *
 * @param {Function} successCallback is called with no parameters
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.removeRecursively = function(successCallback, errorCallback) {
    argscheck.checkArgs('FF', 'DirectoryEntry.removeRecursively', arguments);
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    exec(successCallback, fail, "File", "removeRecursively", [this.fullPath]);
};

/**
 * Creates or looks up a file
 *
 * @param {DOMString} path either a relative or absolute path from this directory in which to look up or create a file
 * @param {Flags} options to create or exclusively create the file
 * @param {Function} successCallback is called with the new entry
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.getFile = function(path, options, successCallback, errorCallback) {
    argscheck.checkArgs('sOFF', 'DirectoryEntry.getFile', arguments);
    var win = successCallback && function(result) {
        var FileEntry = require('cordova/plugin/FileEntry');
        var entry = new FileEntry(result.name, result.fullPath);
        successCallback(entry);
    };
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    exec(win, fail, "File", "getFile", [this.fullPath, path, options]);
};

module.exports = DirectoryEntry;

});

// file: lib/common/plugin/DirectoryReader.js
define("cordova/plugin/DirectoryReader", function(require, exports, module) {

var exec = require('cordova/exec'),
    FileError = require('cordova/plugin/FileError') ;

/**
 * An interface that lists the files and directories in a directory.
 */
function DirectoryReader(path) {
    this.path = path || null;
}

/**
 * Returns a list of entries from a directory.
 *
 * @param {Function} successCallback is called with a list of entries
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryReader.prototype.readEntries = function(successCallback, errorCallback) {
    var win = typeof successCallback !== 'function' ? null : function(result) {
        var retVal = [];
        for (var i=0; i<result.length; i++) {
            var entry = null;
            if (result[i].isDirectory) {
                entry = new (require('cordova/plugin/DirectoryEntry'))();
            }
            else if (result[i].isFile) {
                entry = new (require('cordova/plugin/FileEntry'))();
            }
            entry.isDirectory = result[i].isDirectory;
            entry.isFile = result[i].isFile;
            entry.name = result[i].name;
            entry.fullPath = result[i].fullPath;
            retVal.push(entry);
        }
        successCallback(retVal);
    };
    var fail = typeof errorCallback !== 'function' ? null : function(code) {
        errorCallback(new FileError(code));
    };
    exec(win, fail, "File", "readEntries", [this.path]);
};

module.exports = DirectoryReader;

});

// file: lib/common/plugin/Entry.js
define("cordova/plugin/Entry", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    FileError = require('cordova/plugin/FileError'),
    Metadata = require('cordova/plugin/Metadata');

/**
 * Represents a file or directory on the local file system.
 *
 * @param isFile
 *            {boolean} true if Entry is a file (readonly)
 * @param isDirectory
 *            {boolean} true if Entry is a directory (readonly)
 * @param name
 *            {DOMString} name of the file or directory, excluding the path
 *            leading to it (readonly)
 * @param fullPath
 *            {DOMString} the absolute full path to the file or directory
 *            (readonly)
 */
function Entry(isFile, isDirectory, name, fullPath, fileSystem) {
    this.isFile = !!isFile;
    this.isDirectory = !!isDirectory;
    this.name = name || '';
    this.fullPath = fullPath || '';
    this.filesystem = fileSystem || null;
}

/**
 * Look up the metadata of the entry.
 *
 * @param successCallback
 *            {Function} is called with a Metadata object
 * @param errorCallback
 *            {Function} is called with a FileError
 */
Entry.prototype.getMetadata = function(successCallback, errorCallback) {
    argscheck.checkArgs('FF', 'Entry.getMetadata', arguments);
    var success = successCallback && function(lastModified) {
        var metadata = new Metadata(lastModified);
        successCallback(metadata);
    };
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };

    exec(success, fail, "File", "getMetadata", [this.fullPath]);
};

/**
 * Set the metadata of the entry.
 *
 * @param successCallback
 *            {Function} is called with a Metadata object
 * @param errorCallback
 *            {Function} is called with a FileError
 * @param metadataObject
 *            {Object} keys and values to set
 */
Entry.prototype.setMetadata = function(successCallback, errorCallback, metadataObject) {
    argscheck.checkArgs('FFO', 'Entry.setMetadata', arguments);
    exec(successCallback, errorCallback, "File", "setMetadata", [this.fullPath, metadataObject]);
};

/**
 * Move a file or directory to a new location.
 *
 * @param parent
 *            {DirectoryEntry} the directory to which to move this entry
 * @param newName
 *            {DOMString} new name of the entry, defaults to the current name
 * @param successCallback
 *            {Function} called with the new DirectoryEntry object
 * @param errorCallback
 *            {Function} called with a FileError
 */
Entry.prototype.moveTo = function(parent, newName, successCallback, errorCallback) {
    argscheck.checkArgs('oSFF', 'Entry.moveTo', arguments);
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    // source path
    var srcPath = this.fullPath,
        // entry name
        name = newName || this.name,
        success = function(entry) {
            if (entry) {
                if (successCallback) {
                    // create appropriate Entry object
                    var result = (entry.isDirectory) ? new (require('cordova/plugin/DirectoryEntry'))(entry.name, entry.fullPath) : new (require('cordova/plugin/FileEntry'))(entry.name, entry.fullPath);
                    successCallback(result);
                }
            }
            else {
                // no Entry object returned
                fail && fail(FileError.NOT_FOUND_ERR);
            }
        };

    // copy
    exec(success, fail, "File", "moveTo", [srcPath, parent.fullPath, name]);
};

/**
 * Copy a directory to a different location.
 *
 * @param parent
 *            {DirectoryEntry} the directory to which to copy the entry
 * @param newName
 *            {DOMString} new name of the entry, defaults to the current name
 * @param successCallback
 *            {Function} called with the new Entry object
 * @param errorCallback
 *            {Function} called with a FileError
 */
Entry.prototype.copyTo = function(parent, newName, successCallback, errorCallback) {
    argscheck.checkArgs('oSFF', 'Entry.copyTo', arguments);
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };

        // source path
    var srcPath = this.fullPath,
        // entry name
        name = newName || this.name,
        // success callback
        success = function(entry) {
            if (entry) {
                if (successCallback) {
                    // create appropriate Entry object
                    var result = (entry.isDirectory) ? new (require('cordova/plugin/DirectoryEntry'))(entry.name, entry.fullPath) : new (require('cordova/plugin/FileEntry'))(entry.name, entry.fullPath);
                    successCallback(result);
                }
            }
            else {
                // no Entry object returned
                fail && fail(FileError.NOT_FOUND_ERR);
            }
        };

    // copy
    exec(success, fail, "File", "copyTo", [srcPath, parent.fullPath, name]);
};

/**
 * Return a URL that can be used to identify this entry.
 */
Entry.prototype.toURL = function() {
    // fullPath attribute contains the full URL
    return this.fullPath;
};

/**
 * Returns a URI that can be used to identify this entry.
 *
 * @param {DOMString} mimeType for a FileEntry, the mime type to be used to interpret the file, when loaded through this URI.
 * @return uri
 */
Entry.prototype.toURI = function(mimeType) {
    console.log("DEPRECATED: Update your code to use 'toURL'");
    // fullPath attribute contains the full URI
    return this.toURL();
};

/**
 * Remove a file or directory. It is an error to attempt to delete a
 * directory that is not empty. It is an error to attempt to delete a
 * root directory of a file system.
 *
 * @param successCallback {Function} called with no parameters
 * @param errorCallback {Function} called with a FileError
 */
Entry.prototype.remove = function(successCallback, errorCallback) {
    argscheck.checkArgs('FF', 'Entry.remove', arguments);
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    exec(successCallback, fail, "File", "remove", [this.fullPath]);
};

/**
 * Look up the parent DirectoryEntry of this entry.
 *
 * @param successCallback {Function} called with the parent DirectoryEntry object
 * @param errorCallback {Function} called with a FileError
 */
Entry.prototype.getParent = function(successCallback, errorCallback) {
    argscheck.checkArgs('FF', 'Entry.getParent', arguments);
    var win = successCallback && function(result) {
        var DirectoryEntry = require('cordova/plugin/DirectoryEntry');
        var entry = new DirectoryEntry(result.name, result.fullPath);
        successCallback(entry);
    };
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    exec(win, fail, "File", "getParent", [this.fullPath]);
};

module.exports = Entry;

});

// file: lib/common/plugin/File.js
define("cordova/plugin/File", function(require, exports, module) {

/**
 * Constructor.
 * name {DOMString} name of the file, without path information
 * fullPath {DOMString} the full path of the file, including the name
 * type {DOMString} mime type
 * lastModifiedDate {Date} last modified date
 * size {Number} size of the file in bytes
 */

var File = function(name, fullPath, type, lastModifiedDate, size){
    this.name = name || '';
    this.fullPath = fullPath || null;
    this.type = type || null;
    this.lastModifiedDate = lastModifiedDate || null;
    this.size = size || 0;

    // These store the absolute start and end for slicing the file.
    this.start = 0;
    this.end = this.size;
};

/**
 * Returns a "slice" of the file. Since Cordova Files don't contain the actual
 * content, this really returns a File with adjusted start and end.
 * Slices of slices are supported.
 * start {Number} The index at which to start the slice (inclusive).
 * end {Number} The index at which to end the slice (exclusive).
 */
File.prototype.slice = function(start, end) {
    var size = this.end - this.start;
    var newStart = 0;
    var newEnd = size;
    if (arguments.length) {
        if (start < 0) {
            newStart = Math.max(size + start, 0);
        } else {
            newStart = Math.min(size, start);
        }
    }

    if (arguments.length >= 2) {
        if (end < 0) {
            newEnd = Math.max(size + end, 0);
        } else {
            newEnd = Math.min(end, size);
        }
    }

    var newFile = new File(this.name, this.fullPath, this.type, this.lastModifiedData, this.size);
    newFile.start = this.start + newStart;
    newFile.end = this.start + newEnd;
    return newFile;
};


module.exports = File;

});

// file: lib/common/plugin/FileEntry.js
define("cordova/plugin/FileEntry", function(require, exports, module) {

var utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    Entry = require('cordova/plugin/Entry'),
    FileWriter = require('cordova/plugin/FileWriter'),
    File = require('cordova/plugin/File'),
    FileError = require('cordova/plugin/FileError');

/**
 * An interface representing a file on the file system.
 *
 * {boolean} isFile always true (readonly)
 * {boolean} isDirectory always false (readonly)
 * {DOMString} name of the file, excluding the path leading to it (readonly)
 * {DOMString} fullPath the absolute full path to the file (readonly)
 * {FileSystem} filesystem on which the file resides (readonly)
 */
var FileEntry = function(name, fullPath) {
     FileEntry.__super__.constructor.apply(this, [true, false, name, fullPath]);
};

utils.extend(FileEntry, Entry);

/**
 * Creates a new FileWriter associated with the file that this FileEntry represents.
 *
 * @param {Function} successCallback is called with the new FileWriter
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.createWriter = function(successCallback, errorCallback) {
    this.file(function(filePointer) {
        var writer = new FileWriter(filePointer);

        if (writer.fileName === null || writer.fileName === "") {
            errorCallback && errorCallback(new FileError(FileError.INVALID_STATE_ERR));
        } else {
            successCallback && successCallback(writer);
        }
    }, errorCallback);
};

/**
 * Returns a File that represents the current state of the file that this FileEntry represents.
 *
 * @param {Function} successCallback is called with the new File object
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.file = function(successCallback, errorCallback) {
    var win = successCallback && function(f) {
        var file = new File(f.name, f.fullPath, f.type, f.lastModifiedDate, f.size);
        successCallback(file);
    };
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    exec(win, fail, "File", "getFileMetadata", [this.fullPath]);
};


module.exports = FileEntry;

});

// file: lib/common/plugin/FileError.js
define("cordova/plugin/FileError", function(require, exports, module) {

/**
 * FileError
 */
function FileError(error) {
  this.code = error || null;
}

// File error codes
// Found in DOMException
FileError.NOT_FOUND_ERR = 1;
FileError.SECURITY_ERR = 2;
FileError.ABORT_ERR = 3;

// Added by File API specification
FileError.NOT_READABLE_ERR = 4;
FileError.ENCODING_ERR = 5;
FileError.NO_MODIFICATION_ALLOWED_ERR = 6;
FileError.INVALID_STATE_ERR = 7;
FileError.SYNTAX_ERR = 8;
FileError.INVALID_MODIFICATION_ERR = 9;
FileError.QUOTA_EXCEEDED_ERR = 10;
FileError.TYPE_MISMATCH_ERR = 11;
FileError.PATH_EXISTS_ERR = 12;

module.exports = FileError;

});

// file: lib/common/plugin/FileReader.js
define("cordova/plugin/FileReader", function(require, exports, module) {

var exec = require('cordova/exec'),
    modulemapper = require('cordova/modulemapper'),
    utils = require('cordova/utils'),
    File = require('cordova/plugin/File'),
    FileError = require('cordova/plugin/FileError'),
    ProgressEvent = require('cordova/plugin/ProgressEvent'),
    origFileReader = modulemapper.getOriginalSymbol(this, 'FileReader');

/**
 * This class reads the mobile device file system.
 *
 * For Android:
 *      The root directory is the root of the file system.
 *      To read from the SD card, the file name is "sdcard/my_file.txt"
 * @constructor
 */
var FileReader = function() {
    this._readyState = 0;
    this._error = null;
    this._result = null;
    this._fileName = '';
    this._realReader = origFileReader ? new origFileReader() : {};
};

// States
FileReader.EMPTY = 0;
FileReader.LOADING = 1;
FileReader.DONE = 2;

utils.defineGetter(FileReader.prototype, 'readyState', function() {
    return this._fileName ? this._readyState : this._realReader.readyState;
});

utils.defineGetter(FileReader.prototype, 'error', function() {
    return this._fileName ? this._error: this._realReader.error;
});

utils.defineGetter(FileReader.prototype, 'result', function() {
    return this._fileName ? this._result: this._realReader.result;
});

function defineEvent(eventName) {
    utils.defineGetterSetter(FileReader.prototype, eventName, function() {
        return this._realReader[eventName] || null;
    }, function(value) {
        this._realReader[eventName] = value;
    });
}
defineEvent('onloadstart');    // When the read starts.
defineEvent('onprogress');     // While reading (and decoding) file or fileBlob data, and reporting partial file data (progress.loaded/progress.total)
defineEvent('onload');         // When the read has successfully completed.
defineEvent('onerror');        // When the read has failed (see errors).
defineEvent('onloadend');      // When the request has completed (either in success or failure).
defineEvent('onabort');        // When the read has been aborted. For instance, by invoking the abort() method.

function initRead(reader, file) {
    // Already loading something
    if (reader.readyState == FileReader.LOADING) {
      throw new FileError(FileError.INVALID_STATE_ERR);
    }

    reader._result = null;
    reader._error = null;
    reader._readyState = FileReader.LOADING;

    if (typeof file == 'string') {
        // Deprecated in Cordova 2.4.
        console.warn('Using a string argument with FileReader.readAs functions is deprecated.');
        reader._fileName = file;
    } else if (typeof file.fullPath == 'string') {
        reader._fileName = file.fullPath;
    } else {
        reader._fileName = '';
        return true;
    }

    reader.onloadstart && reader.onloadstart(new ProgressEvent("loadstart", {target:reader}));
}

/**
 * Abort reading file.
 */
FileReader.prototype.abort = function() {
    if (origFileReader && !this._fileName) {
        return this._realReader.abort();
    }
    this._result = null;

    if (this._readyState == FileReader.DONE || this._readyState == FileReader.EMPTY) {
      return;
    }

    this._readyState = FileReader.DONE;

    // If abort callback
    if (typeof this.onabort === 'function') {
        this.onabort(new ProgressEvent('abort', {target:this}));
    }
    // If load end callback
    if (typeof this.onloadend === 'function') {
        this.onloadend(new ProgressEvent('loadend', {target:this}));
    }
};

/**
 * Read text file.
 *
 * @param file          {File} File object containing file properties
 * @param encoding      [Optional] (see http://www.iana.org/assignments/character-sets)
 */
FileReader.prototype.readAsText = function(file, encoding) {
    if (initRead(this, file)) {
        return this._realReader.readAsText(file, encoding);
    }

    // Default encoding is UTF-8
    var enc = encoding ? encoding : "UTF-8";
    var me = this;
    var execArgs = [this._fileName, enc, file.start, file.end];

    // Read file
    exec(
        // Success callback
        function(r) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // Save result
            me._result = r;

            // If onload callback
            if (typeof me.onload === "function") {
                me.onload(new ProgressEvent("load", {target:me}));
            }

            // DONE state
            me._readyState = FileReader.DONE;

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        },
        // Error callback
        function(e) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            // null result
            me._result = null;

            // Save error
            me._error = new FileError(e);

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror(new ProgressEvent("error", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        }, "File", "readAsText", execArgs);
};


/**
 * Read file and return data as a base64 encoded data url.
 * A data url is of the form:
 *      data:[<mediatype>][;base64],<data>
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsDataURL = function(file) {
    if (initRead(this, file)) {
        return this._realReader.readAsDataURL(file);
    }

    var me = this;
    var execArgs = [this._fileName, file.start, file.end];

    // Read file
    exec(
        // Success callback
        function(r) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            // Save result
            me._result = r;

            // If onload callback
            if (typeof me.onload === "function") {
                me.onload(new ProgressEvent("load", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        },
        // Error callback
        function(e) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            me._result = null;

            // Save error
            me._error = new FileError(e);

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror(new ProgressEvent("error", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        }, "File", "readAsDataURL", execArgs);
};

/**
 * Read file and return data as a binary data.
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsBinaryString = function(file) {
    if (initRead(this, file)) {
        return this._realReader.readAsBinaryString(file);
    }

    var me = this;
    var execArgs = [this._fileName, file.start, file.end];

    // Read file
    exec(
        // Success callback
        function(r) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            me._result = r;

            // If onload callback
            if (typeof me.onload === "function") {
                me.onload(new ProgressEvent("load", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        },
        // Error callback
        function(e) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            me._result = null;

            // Save error
            me._error = new FileError(e);

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror(new ProgressEvent("error", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        }, "File", "readAsBinaryString", execArgs);
};

/**
 * Read file and return data as a binary data.
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsArrayBuffer = function(file) {
    if (initRead(this, file)) {
        return this._realReader.readAsArrayBuffer(file);
    }

    var me = this;
    var execArgs = [this._fileName, file.start, file.end];

    // Read file
    exec(
        // Success callback
        function(r) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            me._result = r;

            // If onload callback
            if (typeof me.onload === "function") {
                me.onload(new ProgressEvent("load", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        },
        // Error callback
        function(e) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            me._result = null;

            // Save error
            me._error = new FileError(e);

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror(new ProgressEvent("error", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        }, "File", "readAsArrayBuffer", execArgs);
};

module.exports = FileReader;

});

// file: lib/common/plugin/FileSystem.js
define("cordova/plugin/FileSystem", function(require, exports, module) {

var DirectoryEntry = require('cordova/plugin/DirectoryEntry');

/**
 * An interface representing a file system
 *
 * @constructor
 * {DOMString} name the unique name of the file system (readonly)
 * {DirectoryEntry} root directory of the file system (readonly)
 */
var FileSystem = function(name, root) {
    this.name = name || null;
    if (root) {
        this.root = new DirectoryEntry(root.name, root.fullPath);
    }
};

module.exports = FileSystem;

});

// file: lib/common/plugin/FileTransfer.js
define("cordova/plugin/FileTransfer", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    FileTransferError = require('cordova/plugin/FileTransferError'),
    ProgressEvent = require('cordova/plugin/ProgressEvent');

function newProgressEvent(result) {
    var pe = new ProgressEvent();
    pe.lengthComputable = result.lengthComputable;
    pe.loaded = result.loaded;
    pe.total = result.total;
    return pe;
}

function getBasicAuthHeader(urlString) {
    var header =  null;

    if (window.btoa) {
        // parse the url using the Location object
        var url = document.createElement('a');
        url.href = urlString;

        var credentials = null;
        var protocol = url.protocol + "//";
        var origin = protocol + url.host;

        // check whether there are the username:password credentials in the url
        if (url.href.indexOf(origin) !== 0) { // credentials found
            var atIndex = url.href.indexOf("@");
            credentials = url.href.substring(protocol.length, atIndex);
        }

        if (credentials) {
            var authHeader = "Authorization";
            var authHeaderValue = "Basic " + window.btoa(credentials);

            header = {
                name : authHeader,
                value : authHeaderValue
            };
        }
    }

    return header;
}

var idCounter = 0;

/**
 * FileTransfer uploads a file to a remote server.
 * @constructor
 */
var FileTransfer = function() {
    this._id = ++idCounter;
    this.onprogress = null; // optional callback
};

/**
* Given an absolute file path, uploads a file on the device to a remote server
* using a multipart HTTP request.
* @param filePath {String}           Full path of the file on the device
* @param server {String}             URL of the server to receive the file
* @param successCallback (Function}  Callback to be invoked when upload has completed
* @param errorCallback {Function}    Callback to be invoked upon error
* @param options {FileUploadOptions} Optional parameters such as file name and mimetype
* @param trustAllHosts {Boolean} Optional trust all hosts (e.g. for self-signed certs), defaults to false
*/
FileTransfer.prototype.upload = function(filePath, server, successCallback, errorCallback, options, trustAllHosts) {
    argscheck.checkArgs('ssFFO*', 'FileTransfer.upload', arguments);
    // check for options
    var fileKey = null;
    var fileName = null;
    var mimeType = null;
    var params = null;
    var chunkedMode = true;
    var headers = null;
    var httpMethod = null;
    var basicAuthHeader = getBasicAuthHeader(server);
    if (basicAuthHeader) {
        options = options || {};
        options.headers = options.headers || {};
        options.headers[basicAuthHeader.name] = basicAuthHeader.value;
    }

    if (options) {
        fileKey = options.fileKey;
        fileName = options.fileName;
        mimeType = options.mimeType;
        headers = options.headers;
        httpMethod = options.httpMethod || "POST";
        if (httpMethod.toUpperCase() == "PUT"){
            httpMethod = "PUT";
        } else {
            httpMethod = "POST";
        }
        if (options.chunkedMode !== null || typeof options.chunkedMode != "undefined") {
            chunkedMode = options.chunkedMode;
        }
        if (options.params) {
            params = options.params;
        }
        else {
            params = {};
        }
    }

    var fail = errorCallback && function(e) {
        var error = new FileTransferError(e.code, e.source, e.target, e.http_status, e.body);
        errorCallback(error);
    };

    var self = this;
    var win = function(result) {
        if (typeof result.lengthComputable != "undefined") {
            if (self.onprogress) {
                self.onprogress(newProgressEvent(result));
            }
        } else {
            successCallback && successCallback(result);
        }
    };
    exec(win, fail, 'FileTransfer', 'upload', [filePath, server, fileKey, fileName, mimeType, params, trustAllHosts, chunkedMode, headers, this._id, httpMethod]);
};

/**
 * Downloads a file form a given URL and saves it to the specified directory.
 * @param source {String}          URL of the server to receive the file
 * @param target {String}         Full path of the file on the device
 * @param successCallback (Function}  Callback to be invoked when upload has completed
 * @param errorCallback {Function}    Callback to be invoked upon error
 * @param trustAllHosts {Boolean} Optional trust all hosts (e.g. for self-signed certs), defaults to false
 * @param options {FileDownloadOptions} Optional parameters such as headers
 */
FileTransfer.prototype.download = function(source, target, successCallback, errorCallback, trustAllHosts, options) {
    argscheck.checkArgs('ssFF*', 'FileTransfer.download', arguments);
    var self = this;

    var basicAuthHeader = getBasicAuthHeader(source);
    if (basicAuthHeader) {
        options = options || {};
        options.headers = options.headers || {};
        options.headers[basicAuthHeader.name] = basicAuthHeader.value;
    }

    var headers = null;
    if (options) {
        headers = options.headers || null;
    }

    var win = function(result) {
        if (typeof result.lengthComputable != "undefined") {
            if (self.onprogress) {
                return self.onprogress(newProgressEvent(result));
            }
        } else if (successCallback) {
            var entry = null;
            if (result.isDirectory) {
                entry = new (require('cordova/plugin/DirectoryEntry'))();
            }
            else if (result.isFile) {
                entry = new (require('cordova/plugin/FileEntry'))();
            }
            entry.isDirectory = result.isDirectory;
            entry.isFile = result.isFile;
            entry.name = result.name;
            entry.fullPath = result.fullPath;
            successCallback(entry);
        }
    };

    var fail = errorCallback && function(e) {
        var error = new FileTransferError(e.code, e.source, e.target, e.http_status, e.body);
        errorCallback(error);
    };

    exec(win, fail, 'FileTransfer', 'download', [source, target, trustAllHosts, this._id, headers]);
};

/**
 * Aborts the ongoing file transfer on this object. The original error
 * callback for the file transfer will be called if necessary.
 */
FileTransfer.prototype.abort = function() {
    exec(null, null, 'FileTransfer', 'abort', [this._id]);
};

module.exports = FileTransfer;

});

// file: lib/common/plugin/FileTransferError.js
define("cordova/plugin/FileTransferError", function(require, exports, module) {

/**
 * FileTransferError
 * @constructor
 */
var FileTransferError = function(code, source, target, status, body) {
    this.code = code || null;
    this.source = source || null;
    this.target = target || null;
    this.http_status = status || null;
    this.body = body || null;
};

FileTransferError.FILE_NOT_FOUND_ERR = 1;
FileTransferError.INVALID_URL_ERR = 2;
FileTransferError.CONNECTION_ERR = 3;
FileTransferError.ABORT_ERR = 4;

module.exports = FileTransferError;

});

// file: lib/common/plugin/FileUploadOptions.js
define("cordova/plugin/FileUploadOptions", function(require, exports, module) {

/**
 * Options to customize the HTTP request used to upload files.
 * @constructor
 * @param fileKey {String}   Name of file request parameter.
 * @param fileName {String}  Filename to be used by the server. Defaults to image.jpg.
 * @param mimeType {String}  Mimetype of the uploaded file. Defaults to image/jpeg.
 * @param params {Object}    Object with key: value params to send to the server.
 * @param headers {Object}   Keys are header names, values are header values. Multiple
 *                           headers of the same name are not supported.
 */
var FileUploadOptions = function(fileKey, fileName, mimeType, params, headers, httpMethod) {
    this.fileKey = fileKey || null;
    this.fileName = fileName || null;
    this.mimeType = mimeType || null;
    this.params = params || null;
    this.headers = headers || null;
    this.httpMethod = httpMethod || null;
};

module.exports = FileUploadOptions;

});

// file: lib/common/plugin/FileUploadResult.js
define("cordova/plugin/FileUploadResult", function(require, exports, module) {

/**
 * FileUploadResult
 * @constructor
 */
var FileUploadResult = function() {
    this.bytesSent = 0;
    this.responseCode = null;
    this.response = null;
};

module.exports = FileUploadResult;

});

// file: lib/common/plugin/FileWriter.js
define("cordova/plugin/FileWriter", function(require, exports, module) {

var exec = require('cordova/exec'),
    FileError = require('cordova/plugin/FileError'),
    ProgressEvent = require('cordova/plugin/ProgressEvent');

/**
 * This class writes to the mobile device file system.
 *
 * For Android:
 *      The root directory is the root of the file system.
 *      To write to the SD card, the file name is "sdcard/my_file.txt"
 *
 * @constructor
 * @param file {File} File object containing file properties
 * @param append if true write to the end of the file, otherwise overwrite the file
 */
var FileWriter = function(file) {
    this.fileName = "";
    this.length = 0;
    if (file) {
        this.fileName = file.fullPath || file;
        this.length = file.size || 0;
    }
    // default is to write at the beginning of the file
    this.position = 0;

    this.readyState = 0; // EMPTY

    this.result = null;

    // Error
    this.error = null;

    // Event handlers
    this.onwritestart = null;   // When writing starts
    this.onprogress = null;     // While writing the file, and reporting partial file data
    this.onwrite = null;        // When the write has successfully completed.
    this.onwriteend = null;     // When the request has completed (either in success or failure).
    this.onabort = null;        // When the write has been aborted. For instance, by invoking the abort() method.
    this.onerror = null;        // When the write has failed (see errors).
};

// States
FileWriter.INIT = 0;
FileWriter.WRITING = 1;
FileWriter.DONE = 2;

/**
 * Abort writing file.
 */
FileWriter.prototype.abort = function() {
    // check for invalid state
    if (this.readyState === FileWriter.DONE || this.readyState === FileWriter.INIT) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    // set error
    this.error = new FileError(FileError.ABORT_ERR);

    this.readyState = FileWriter.DONE;

    // If abort callback
    if (typeof this.onabort === "function") {
        this.onabort(new ProgressEvent("abort", {"target":this}));
    }

    // If write end callback
    if (typeof this.onwriteend === "function") {
        this.onwriteend(new ProgressEvent("writeend", {"target":this}));
    }
};

/**
 * Writes data to the file
 *
 * @param text to be written
 */
FileWriter.prototype.write = function(text) {
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    // WRITING state
    this.readyState = FileWriter.WRITING;

    var me = this;

    // If onwritestart callback
    if (typeof me.onwritestart === "function") {
        me.onwritestart(new ProgressEvent("writestart", {"target":me}));
    }

    // Write file
    exec(
        // Success callback
        function(r) {
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileWriter.DONE) {
                return;
            }

            // position always increases by bytes written because file would be extended
            me.position += r;
            // The length of the file is now where we are done writing.

            me.length = me.position;

            // DONE state
            me.readyState = FileWriter.DONE;

            // If onwrite callback
            if (typeof me.onwrite === "function") {
                me.onwrite(new ProgressEvent("write", {"target":me}));
            }

            // If onwriteend callback
            if (typeof me.onwriteend === "function") {
                me.onwriteend(new ProgressEvent("writeend", {"target":me}));
            }
        },
        // Error callback
        function(e) {
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileWriter.DONE) {
                return;
            }

            // DONE state
            me.readyState = FileWriter.DONE;

            // Save error
            me.error = new FileError(e);

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror(new ProgressEvent("error", {"target":me}));
            }

            // If onwriteend callback
            if (typeof me.onwriteend === "function") {
                me.onwriteend(new ProgressEvent("writeend", {"target":me}));
            }
        }, "File", "write", [this.fileName, text, this.position]);
};

/**
 * Moves the file pointer to the location specified.
 *
 * If the offset is a negative number the position of the file
 * pointer is rewound.  If the offset is greater than the file
 * size the position is set to the end of the file.
 *
 * @param offset is the location to move the file pointer to.
 */
FileWriter.prototype.seek = function(offset) {
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    if (!offset && offset !== 0) {
        return;
    }

    // See back from end of file.
    if (offset < 0) {
        this.position = Math.max(offset + this.length, 0);
    }
    // Offset is bigger than file size so set position
    // to the end of the file.
    else if (offset > this.length) {
        this.position = this.length;
    }
    // Offset is between 0 and file size so set the position
    // to start writing.
    else {
        this.position = offset;
    }
};

/**
 * Truncates the file to the size specified.
 *
 * @param size to chop the file at.
 */
FileWriter.prototype.truncate = function(size) {
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    // WRITING state
    this.readyState = FileWriter.WRITING;

    var me = this;

    // If onwritestart callback
    if (typeof me.onwritestart === "function") {
        me.onwritestart(new ProgressEvent("writestart", {"target":this}));
    }

    // Write file
    exec(
        // Success callback
        function(r) {
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileWriter.DONE) {
                return;
            }

            // DONE state
            me.readyState = FileWriter.DONE;

            // Update the length of the file
            me.length = r;
            me.position = Math.min(me.position, r);

            // If onwrite callback
            if (typeof me.onwrite === "function") {
                me.onwrite(new ProgressEvent("write", {"target":me}));
            }

            // If onwriteend callback
            if (typeof me.onwriteend === "function") {
                me.onwriteend(new ProgressEvent("writeend", {"target":me}));
            }
        },
        // Error callback
        function(e) {
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileWriter.DONE) {
                return;
            }

            // DONE state
            me.readyState = FileWriter.DONE;

            // Save error
            me.error = new FileError(e);

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror(new ProgressEvent("error", {"target":me}));
            }

            // If onwriteend callback
            if (typeof me.onwriteend === "function") {
                me.onwriteend(new ProgressEvent("writeend", {"target":me}));
            }
        }, "File", "truncate", [this.fileName, size]);
};

module.exports = FileWriter;

});

// file: lib/common/plugin/Flags.js
define("cordova/plugin/Flags", function(require, exports, module) {

/**
 * Supplies arguments to methods that lookup or create files and directories.
 *
 * @param create
 *            {boolean} file or directory if it doesn't exist
 * @param exclusive
 *            {boolean} used with create; if true the command will fail if
 *            target path exists
 */
function Flags(create, exclusive) {
    this.create = create || false;
    this.exclusive = exclusive || false;
}

module.exports = Flags;

});

// file: lib/common/plugin/GlobalizationError.js
define("cordova/plugin/GlobalizationError", function(require, exports, module) {


/**
 * Globalization error object
 *
 * @constructor
 * @param code
 * @param message
 */
var GlobalizationError = function(code, message) {
    this.code = code || null;
    this.message = message || '';
};

// Globalization error codes
GlobalizationError.UNKNOWN_ERROR = 0;
GlobalizationError.FORMATTING_ERROR = 1;
GlobalizationError.PARSING_ERROR = 2;
GlobalizationError.PATTERN_ERROR = 3;

module.exports = GlobalizationError;

});

// file: lib/common/plugin/InAppBrowser.js
define("cordova/plugin/InAppBrowser", function(require, exports, module) {

var exec = require('cordova/exec');
var channel = require('cordova/channel');
var modulemapper = require('cordova/modulemapper');

function InAppBrowser() {
   this.channels = {
        'loadstart': channel.create('loadstart'),
        'loadstop' : channel.create('loadstop'),
        'loaderror' : channel.create('loaderror'),
        'exit' : channel.create('exit')
   };
}

InAppBrowser.prototype = {
    _eventHandler: function (event) {
        if (event.type in this.channels) {
            this.channels[event.type].fire(event);
        }
    },
    close: function (eventname) {
        exec(null, null, "InAppBrowser", "close", []);
    },
    addEventListener: function (eventname,f) {
        if (eventname in this.channels) {
            this.channels[eventname].subscribe(f);
        }
    },
    removeEventListener: function(eventname, f) {
        if (eventname in this.channels) {
            this.channels[eventname].unsubscribe(f);
        }
    },

    executeScript: function(injectDetails, cb) {
        if (injectDetails.code) {
            exec(cb, null, "InAppBrowser", "injectScriptCode", [injectDetails.code, !!cb]);
        } else if (injectDetails.file) {
            exec(cb, null, "InAppBrowser", "injectScriptFile", [injectDetails.file, !!cb]);
        } else {
            throw new Error('executeScript requires exactly one of code or file to be specified');
        }
    },

    insertCSS: function(injectDetails, cb) {
        if (injectDetails.code) {
            exec(cb, null, "InAppBrowser", "injectStyleCode", [injectDetails.code, !!cb]);
        } else if (injectDetails.file) {
            exec(cb, null, "InAppBrowser", "injectStyleFile", [injectDetails.file, !!cb]);
        } else {
            throw new Error('insertCSS requires exactly one of code or file to be specified');
        }
    }
};

module.exports = function(strUrl, strWindowName, strWindowFeatures) {
    var iab = new InAppBrowser();
    var cb = function(eventname) {
       iab._eventHandler(eventname);
    };

    // Don't catch calls that write to existing frames (e.g. named iframes).
    if (window.frames && window.frames[strWindowName]) {
        var origOpenFunc = modulemapper.getOriginalSymbol(window, 'open');
        return origOpenFunc.apply(window, arguments);
    }

    exec(cb, cb, "InAppBrowser", "open", [strUrl, strWindowName, strWindowFeatures]);
    return iab;
};


});

// file: lib/common/plugin/LocalFileSystem.js
define("cordova/plugin/LocalFileSystem", function(require, exports, module) {

var exec = require('cordova/exec');

/**
 * Represents a local file system.
 */
var LocalFileSystem = function() {

};

LocalFileSystem.TEMPORARY = 0; //temporary, with no guarantee of persistence
LocalFileSystem.PERSISTENT = 1; //persistent

module.exports = LocalFileSystem;

});

// file: lib/common/plugin/Media.js
define("cordova/plugin/Media", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec');

var mediaObjects = {};

/**
 * This class provides access to the device media, interfaces to both sound and video
 *
 * @constructor
 * @param src                   The file name or url to play
 * @param successCallback       The callback to be called when the file is done playing or recording.
 *                                  successCallback()
 * @param errorCallback         The callback to be called if there is an error.
 *                                  errorCallback(int errorCode) - OPTIONAL
 * @param statusCallback        The callback to be called when media status has changed.
 *                                  statusCallback(int statusCode) - OPTIONAL
 */
var Media = function(src, successCallback, errorCallback, statusCallback) {
    argscheck.checkArgs('SFFF', 'Media', arguments);
    this.id = utils.createUUID();
    mediaObjects[this.id] = this;
    this.src = src;
    this.successCallback = successCallback;
    this.errorCallback = errorCallback;
    this.statusCallback = statusCallback;
    this._duration = -1;
    this._position = -1;
    exec(null, this.errorCallback, "Media", "create", [this.id, this.src]);
};

// Media messages
Media.MEDIA_STATE = 1;
Media.MEDIA_DURATION = 2;
Media.MEDIA_POSITION = 3;
Media.MEDIA_ERROR = 9;

// Media states
Media.MEDIA_NONE = 0;
Media.MEDIA_STARTING = 1;
Media.MEDIA_RUNNING = 2;
Media.MEDIA_PAUSED = 3;
Media.MEDIA_STOPPED = 4;
Media.MEDIA_MSG = ["None", "Starting", "Running", "Paused", "Stopped"];

// "static" function to return existing objs.
Media.get = function(id) {
    return mediaObjects[id];
};

/**
 * Start or resume playing audio file.
 */
Media.prototype.play = function(options) {
    exec(null, null, "Media", "startPlayingAudio", [this.id, this.src, options]);
};

/**
 * Stop playing audio file.
 */
Media.prototype.stop = function() {
    var me = this;
    exec(function() {
        me._position = 0;
    }, this.errorCallback, "Media", "stopPlayingAudio", [this.id]);
};

/**
 * Seek or jump to a new time in the track..
 */
Media.prototype.seekTo = function(milliseconds) {
    var me = this;
    exec(function(p) {
        me._position = p;
    }, this.errorCallback, "Media", "seekToAudio", [this.id, milliseconds]);
};

/**
 * Pause playing audio file.
 */
Media.prototype.pause = function() {
    exec(null, this.errorCallback, "Media", "pausePlayingAudio", [this.id]);
};

/**
 * Get duration of an audio file.
 * The duration is only set for audio that is playing, paused or stopped.
 *
 * @return      duration or -1 if not known.
 */
Media.prototype.getDuration = function() {
    return this._duration;
};

/**
 * Get position of audio.
 */
Media.prototype.getCurrentPosition = function(success, fail) {
    var me = this;
    exec(function(p) {
        me._position = p;
        success(p);
    }, fail, "Media", "getCurrentPositionAudio", [this.id]);
};

/**
 * Start recording audio file.
 */
Media.prototype.startRecord = function() {
    exec(null, this.errorCallback, "Media", "startRecordingAudio", [this.id, this.src]);
};

/**
 * Stop recording audio file.
 */
Media.prototype.stopRecord = function() {
    exec(null, this.errorCallback, "Media", "stopRecordingAudio", [this.id]);
};

/**
 * Release the resources.
 */
Media.prototype.release = function() {
    exec(null, this.errorCallback, "Media", "release", [this.id]);
};

/**
 * Adjust the volume.
 */
Media.prototype.setVolume = function(volume) {
    exec(null, null, "Media", "setVolume", [this.id, volume]);
};

/**
 * Audio has status update.
 * PRIVATE
 *
 * @param id            The media object id (string)
 * @param msgType       The 'type' of update this is
 * @param value         Use of value is determined by the msgType
 */
Media.onStatus = function(id, msgType, value) {

    var media = mediaObjects[id];

    if(media) {
        switch(msgType) {
            case Media.MEDIA_STATE :
                media.statusCallback && media.statusCallback(value);
                if(value == Media.MEDIA_STOPPED) {
                    media.successCallback && media.successCallback();
                }
                break;
            case Media.MEDIA_DURATION :
                media._duration = value;
                break;
            case Media.MEDIA_ERROR :
                media.errorCallback && media.errorCallback(value);
                break;
            case Media.MEDIA_POSITION :
                media._position = Number(value);
                break;
            default :
                console.error && console.error("Unhandled Media.onStatus :: " + msgType);
                break;
        }
    }
    else {
         console.error && console.error("Received Media.onStatus callback for unknown media :: " + id);
    }

};

module.exports = Media;

});

// file: lib/common/plugin/MediaError.js
define("cordova/plugin/MediaError", function(require, exports, module) {

/**
 * This class contains information about any Media errors.
*/
/*
 According to :: http://dev.w3.org/html5/spec-author-view/video.html#mediaerror
 We should never be creating these objects, we should just implement the interface
 which has 1 property for an instance, 'code'

 instead of doing :
    errorCallbackFunction( new MediaError(3,'msg') );
we should simply use a literal :
    errorCallbackFunction( {'code':3} );
 */

 var _MediaError = window.MediaError;


if(!_MediaError) {
    window.MediaError = _MediaError = function(code, msg) {
        this.code = (typeof code != 'undefined') ? code : null;
        this.message = msg || ""; // message is NON-standard! do not use!
    };
}

_MediaError.MEDIA_ERR_NONE_ACTIVE    = _MediaError.MEDIA_ERR_NONE_ACTIVE    || 0;
_MediaError.MEDIA_ERR_ABORTED        = _MediaError.MEDIA_ERR_ABORTED        || 1;
_MediaError.MEDIA_ERR_NETWORK        = _MediaError.MEDIA_ERR_NETWORK        || 2;
_MediaError.MEDIA_ERR_DECODE         = _MediaError.MEDIA_ERR_DECODE         || 3;
_MediaError.MEDIA_ERR_NONE_SUPPORTED = _MediaError.MEDIA_ERR_NONE_SUPPORTED || 4;
// TODO: MediaError.MEDIA_ERR_NONE_SUPPORTED is legacy, the W3 spec now defines it as below.
// as defined by http://dev.w3.org/html5/spec-author-view/video.html#error-codes
_MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED = _MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || 4;

module.exports = _MediaError;

});

// file: lib/common/plugin/MediaFile.js
define("cordova/plugin/MediaFile", function(require, exports, module) {

var utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    File = require('cordova/plugin/File'),
    CaptureError = require('cordova/plugin/CaptureError');
/**
 * Represents a single file.
 *
 * name {DOMString} name of the file, without path information
 * fullPath {DOMString} the full path of the file, including the name
 * type {DOMString} mime type
 * lastModifiedDate {Date} last modified date
 * size {Number} size of the file in bytes
 */
var MediaFile = function(name, fullPath, type, lastModifiedDate, size){
    MediaFile.__super__.constructor.apply(this, arguments);
};

utils.extend(MediaFile, File);

/**
 * Request capture format data for a specific file and type
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 */
MediaFile.prototype.getFormatData = function(successCallback, errorCallback) {
    if (typeof this.fullPath === "undefined" || this.fullPath === null) {
        errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT));
    } else {
        exec(successCallback, errorCallback, "Capture", "getFormatData", [this.fullPath, this.type]);
    }
};

module.exports = MediaFile;

});

// file: lib/common/plugin/MediaFileData.js
define("cordova/plugin/MediaFileData", function(require, exports, module) {

/**
 * MediaFileData encapsulates format information of a media file.
 *
 * @param {DOMString} codecs
 * @param {long} bitrate
 * @param {long} height
 * @param {long} width
 * @param {float} duration
 */
var MediaFileData = function(codecs, bitrate, height, width, duration){
    this.codecs = codecs || null;
    this.bitrate = bitrate || 0;
    this.height = height || 0;
    this.width = width || 0;
    this.duration = duration || 0;
};

module.exports = MediaFileData;

});

// file: lib/common/plugin/Metadata.js
define("cordova/plugin/Metadata", function(require, exports, module) {

/**
 * Information about the state of the file or directory
 *
 * {Date} modificationTime (readonly)
 */
var Metadata = function(time) {
    this.modificationTime = (typeof time != 'undefined'?new Date(time):null);
};

module.exports = Metadata;

});

// file: lib/common/plugin/Position.js
define("cordova/plugin/Position", function(require, exports, module) {

var Coordinates = require('cordova/plugin/Coordinates');

var Position = function(coords, timestamp) {
    if (coords) {
        this.coords = new Coordinates(coords.latitude, coords.longitude, coords.altitude, coords.accuracy, coords.heading, coords.velocity, coords.altitudeAccuracy);
    } else {
        this.coords = new Coordinates();
    }
    this.timestamp = (timestamp !== undefined) ? timestamp : new Date();
};

module.exports = Position;

});

// file: lib/common/plugin/PositionError.js
define("cordova/plugin/PositionError", function(require, exports, module) {

/**
 * Position error object
 *
 * @constructor
 * @param code
 * @param message
 */
var PositionError = function(code, message) {
    this.code = code || null;
    this.message = message || '';
};

PositionError.PERMISSION_DENIED = 1;
PositionError.POSITION_UNAVAILABLE = 2;
PositionError.TIMEOUT = 3;

module.exports = PositionError;

});

// file: lib/common/plugin/ProgressEvent.js
define("cordova/plugin/ProgressEvent", function(require, exports, module) {

// If ProgressEvent exists in global context, use it already, otherwise use our own polyfill
// Feature test: See if we can instantiate a native ProgressEvent;
// if so, use that approach,
// otherwise fill-in with our own implementation.
//
// NOTE: right now we always fill in with our own. Down the road would be nice if we can use whatever is native in the webview.
var ProgressEvent = (function() {
    /*
    var createEvent = function(data) {
        var event = document.createEvent('Events');
        event.initEvent('ProgressEvent', false, false);
        if (data) {
            for (var i in data) {
                if (data.hasOwnProperty(i)) {
                    event[i] = data[i];
                }
            }
            if (data.target) {
                // TODO: cannot call <some_custom_object>.dispatchEvent
                // need to first figure out how to implement EventTarget
            }
        }
        return event;
    };
    try {
        var ev = createEvent({type:"abort",target:document});
        return function ProgressEvent(type, data) {
            data.type = type;
            return createEvent(data);
        };
    } catch(e){
    */
        return function ProgressEvent(type, dict) {
            this.type = type;
            this.bubbles = false;
            this.cancelBubble = false;
            this.cancelable = false;
            this.lengthComputable = false;
            this.loaded = dict && dict.loaded ? dict.loaded : 0;
            this.total = dict && dict.total ? dict.total : 0;
            this.target = dict && dict.target ? dict.target : null;
        };
    //}
})();

module.exports = ProgressEvent;

});

// file: lib/common/plugin/accelerometer.js
define("cordova/plugin/accelerometer", function(require, exports, module) {

/**
 * This class provides access to device accelerometer data.
 * @constructor
 */
var argscheck = require('cordova/argscheck'),
    utils = require("cordova/utils"),
    exec = require("cordova/exec"),
    Acceleration = require('cordova/plugin/Acceleration');

// Is the accel sensor running?
var running = false;

// Keeps reference to watchAcceleration calls.
var timers = {};

// Array of listeners; used to keep track of when we should call start and stop.
var listeners = [];

// Last returned acceleration object from native
var accel = null;

// Tells native to start.
function start() {
    exec(function(a) {
        var tempListeners = listeners.slice(0);
        accel = new Acceleration(a.x, a.y, a.z, a.timestamp);
        for (var i = 0, l = tempListeners.length; i < l; i++) {
            tempListeners[i].win(accel);
        }
    }, function(e) {
        var tempListeners = listeners.slice(0);
        for (var i = 0, l = tempListeners.length; i < l; i++) {
            tempListeners[i].fail(e);
        }
    }, "Accelerometer", "start", []);
    running = true;
}

// Tells native to stop.
function stop() {
    exec(null, null, "Accelerometer", "stop", []);
    running = false;
}

// Adds a callback pair to the listeners array
function createCallbackPair(win, fail) {
    return {win:win, fail:fail};
}

// Removes a win/fail listener pair from the listeners array
function removeListeners(l) {
    var idx = listeners.indexOf(l);
    if (idx > -1) {
        listeners.splice(idx, 1);
        if (listeners.length === 0) {
            stop();
        }
    }
}

var accelerometer = {
    /**
     * Asynchronously acquires the current acceleration.
     *
     * @param {Function} successCallback    The function to call when the acceleration data is available
     * @param {Function} errorCallback      The function to call when there is an error getting the acceleration data. (OPTIONAL)
     * @param {AccelerationOptions} options The options for getting the accelerometer data such as timeout. (OPTIONAL)
     */
    getCurrentAcceleration: function(successCallback, errorCallback, options) {
        argscheck.checkArgs('fFO', 'accelerometer.getCurrentAcceleration', arguments);

        var p;
        var win = function(a) {
            removeListeners(p);
            successCallback(a);
        };
        var fail = function(e) {
            removeListeners(p);
            errorCallback && errorCallback(e);
        };

        p = createCallbackPair(win, fail);
        listeners.push(p);

        if (!running) {
            start();
        }
    },

    /**
     * Asynchronously acquires the acceleration repeatedly at a given interval.
     *
     * @param {Function} successCallback    The function to call each time the acceleration data is available
     * @param {Function} errorCallback      The function to call when there is an error getting the acceleration data. (OPTIONAL)
     * @param {AccelerationOptions} options The options for getting the accelerometer data such as timeout. (OPTIONAL)
     * @return String                       The watch id that must be passed to #clearWatch to stop watching.
     */
    watchAcceleration: function(successCallback, errorCallback, options) {
        argscheck.checkArgs('fFO', 'accelerometer.watchAcceleration', arguments);
        // Default interval (10 sec)
        var frequency = (options && options.frequency && typeof options.frequency == 'number') ? options.frequency : 10000;

        // Keep reference to watch id, and report accel readings as often as defined in frequency
        var id = utils.createUUID();

        var p = createCallbackPair(function(){}, function(e) {
            removeListeners(p);
            errorCallback && errorCallback(e);
        });
        listeners.push(p);

        timers[id] = {
            timer:window.setInterval(function() {
                if (accel) {
                    successCallback(accel);
                }
            }, frequency),
            listeners:p
        };

        if (running) {
            // If we're already running then immediately invoke the success callback
            // but only if we have retrieved a value, sample code does not check for null ...
            if (accel) {
                successCallback(accel);
            }
        } else {
            start();
        }

        return id;
    },

    /**
     * Clears the specified accelerometer watch.
     *
     * @param {String} id       The id of the watch returned from #watchAcceleration.
     */
    clearWatch: function(id) {
        // Stop javascript timer & remove from timer list
        if (id && timers[id]) {
            window.clearInterval(timers[id].timer);
            removeListeners(timers[id].listeners);
            delete timers[id];
        }
    }
};

module.exports = accelerometer;

});

// file: lib/common/plugin/accelerometer/symbols.js
define("cordova/plugin/accelerometer/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.defaults('cordova/plugin/Acceleration', 'Acceleration');
modulemapper.defaults('cordova/plugin/accelerometer', 'navigator.accelerometer');

});

// file: lib/android/plugin/android/app.js
define("cordova/plugin/android/app", function(require, exports, module) {

var exec = require('cordova/exec');

module.exports = {
  /**
   * Clear the resource cache.
   */
  clearCache:function() {
    exec(null, null, "App", "clearCache", []);
  },

  /**
   * Load the url into the webview or into new browser instance.
   *
   * @param url           The URL to load
   * @param props         Properties that can be passed in to the activity:
   *      wait: int                           => wait msec before loading URL
   *      loadingDialog: "Title,Message"      => display a native loading dialog
   *      loadUrlTimeoutValue: int            => time in msec to wait before triggering a timeout error
   *      clearHistory: boolean              => clear webview history (default=false)
   *      openExternal: boolean              => open in a new browser (default=false)
   *
   * Example:
   *      navigator.app.loadUrl("http://server/myapp/index.html", {wait:2000, loadingDialog:"Wait,Loading App", loadUrlTimeoutValue: 60000});
   */
  loadUrl:function(url, props) {
    exec(null, null, "App", "loadUrl", [url, props]);
  },

  /**
   * Cancel loadUrl that is waiting to be loaded.
   */
  cancelLoadUrl:function() {
    exec(null, null, "App", "cancelLoadUrl", []);
  },

  /**
   * Clear web history in this web view.
   * Instead of BACK button loading the previous web page, it will exit the app.
   */
  clearHistory:function() {
    exec(null, null, "App", "clearHistory", []);
  },

  /**
   * Go to previous page displayed.
   * This is the same as pressing the backbutton on Android device.
   */
  backHistory:function() {
    exec(null, null, "App", "backHistory", []);
  },

  /**
   * Override the default behavior of the Android back button.
   * If overridden, when the back button is pressed, the "backKeyDown" JavaScript event will be fired.
   *
   * Note: The user should not have to call this method.  Instead, when the user
   *       registers for the "backbutton" event, this is automatically done.
   *
   * @param override        T=override, F=cancel override
   */
  overrideBackbutton:function(override) {
    exec(null, null, "App", "overrideBackbutton", [override]);
  },

  /**
   * Exit and terminate the application.
   */
  exitApp:function() {
    return exec(null, null, "App", "exitApp", []);
  }
};

});

// file: lib/android/plugin/android/device.js
define("cordova/plugin/android/device", function(require, exports, module) {

var channel = require('cordova/channel'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    app = require('cordova/plugin/android/app');

module.exports = {
    /*
     * DEPRECATED
     * This is only for Android.
     *
     * You must explicitly override the back button.
     */
    overrideBackButton:function() {
        console.log("Device.overrideBackButton() is deprecated.  Use App.overrideBackbutton(true).");
        app.overrideBackbutton(true);
    },

    /*
     * DEPRECATED
     * This is only for Android.
     *
     * This resets the back button to the default behavior
     */
    resetBackButton:function() {
        console.log("Device.resetBackButton() is deprecated.  Use App.overrideBackbutton(false).");
        app.overrideBackbutton(false);
    },

    /*
     * DEPRECATED
     * This is only for Android.
     *
     * This terminates the activity!
     */
    exitApp:function() {
        console.log("Device.exitApp() is deprecated.  Use App.exitApp().");
        app.exitApp();
    }
};

});

// file: lib/android/plugin/android/nativeapiprovider.js
define("cordova/plugin/android/nativeapiprovider", function(require, exports, module) {

var nativeApi = this._cordovaNative || require('cordova/plugin/android/promptbasednativeapi');
var currentApi = nativeApi;

module.exports = {
    get: function() { return currentApi; },
    setPreferPrompt: function(value) {
        currentApi = value ? require('cordova/plugin/android/promptbasednativeapi') : nativeApi;
    },
    // Used only by tests.
    set: function(value) {
        currentApi = value;
    }
};

});

// file: lib/android/plugin/android/notification.js
define("cordova/plugin/android/notification", function(require, exports, module) {

var exec = require('cordova/exec');

/**
 * Provides Android enhanced notification API.
 */
module.exports = {
    activityStart : function(title, message) {
        // If title and message not specified then mimic Android behavior of
        // using default strings.
        if (typeof title === "undefined" && typeof message == "undefined") {
            title = "Busy";
            message = 'Please wait...';
        }

        exec(null, null, 'Notification', 'activityStart', [ title, message ]);
    },

    /**
     * Close an activity dialog
     */
    activityStop : function() {
        exec(null, null, 'Notification', 'activityStop', []);
    },

    /**
     * Display a progress dialog with progress bar that goes from 0 to 100.
     *
     * @param {String}
     *            title Title of the progress dialog.
     * @param {String}
     *            message Message to display in the dialog.
     */
    progressStart : function(title, message) {
        exec(null, null, 'Notification', 'progressStart', [ title, message ]);
    },

    /**
     * Close the progress dialog.
     */
    progressStop : function() {
        exec(null, null, 'Notification', 'progressStop', []);
    },

    /**
     * Set the progress dialog value.
     *
     * @param {Number}
     *            value 0-100
     */
    progressValue : function(value) {
        exec(null, null, 'Notification', 'progressValue', [ value ]);
    }
};

});

// file: lib/android/plugin/android/promptbasednativeapi.js
define("cordova/plugin/android/promptbasednativeapi", function(require, exports, module) {

module.exports = {
    exec: function(service, action, callbackId, argsJson) {
        return prompt(argsJson, 'gap:'+JSON.stringify([service, action, callbackId]));
    },
    setNativeToJsBridgeMode: function(value) {
        prompt(value, 'gap_bridge_mode:');
    },
    retrieveJsMessages: function() {
        return prompt('', 'gap_poll:');
    }
};

});

// file: lib/android/plugin/android/storage.js
define("cordova/plugin/android/storage", function(require, exports, module) {

var utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    channel = require('cordova/channel');

var queryQueue = {};

/**
 * SQL result set object
 * PRIVATE METHOD
 * @constructor
 */
var DroidDB_Rows = function() {
    this.resultSet = [];    // results array
    this.length = 0;        // number of rows
};

/**
 * Get item from SQL result set
 *
 * @param row           The row number to return
 * @return              The row object
 */
DroidDB_Rows.prototype.item = function(row) {
    return this.resultSet[row];
};

/**
 * SQL result set that is returned to user.
 * PRIVATE METHOD
 * @constructor
 */
var DroidDB_Result = function() {
    this.rows = new DroidDB_Rows();
};

/**
 * Callback from native code when query is complete.
 * PRIVATE METHOD
 *
 * @param id   Query id
 */
function completeQuery(id, data) {
    var query = queryQueue[id];
    if (query) {
        try {
            delete queryQueue[id];

            // Get transaction
            var tx = query.tx;

            // If transaction hasn't failed
            // Note: We ignore all query results if previous query
            //       in the same transaction failed.
            if (tx && tx.queryList[id]) {

                // Save query results
                var r = new DroidDB_Result();
                r.rows.resultSet = data;
                r.rows.length = data.length;
                try {
                    if (typeof query.successCallback === 'function') {
                        query.successCallback(query.tx, r);
                    }
                } catch (ex) {
                    console.log("executeSql error calling user success callback: "+ex);
                }

                tx.queryComplete(id);
            }
        } catch (e) {
            console.log("executeSql error: "+e);
        }
    }
}

/**
 * Callback from native code when query fails
 * PRIVATE METHOD
 *
 * @param reason            Error message
 * @param id                Query id
 */
function failQuery(reason, id) {
    var query = queryQueue[id];
    if (query) {
        try {
            delete queryQueue[id];

            // Get transaction
            var tx = query.tx;

            // If transaction hasn't failed
            // Note: We ignore all query results if previous query
            //       in the same transaction failed.
            if (tx && tx.queryList[id]) {
                tx.queryList = {};

                try {
                    if (typeof query.errorCallback === 'function') {
                        query.errorCallback(query.tx, reason);
                    }
                } catch (ex) {
                    console.log("executeSql error calling user error callback: "+ex);
                }

                tx.queryFailed(id, reason);
            }

        } catch (e) {
            console.log("executeSql error: "+e);
        }
    }
}

/**
 * SQL query object
 * PRIVATE METHOD
 *
 * @constructor
 * @param tx                The transaction object that this query belongs to
 */
var DroidDB_Query = function(tx) {

    // Set the id of the query
    this.id = utils.createUUID();

    // Add this query to the queue
    queryQueue[this.id] = this;

    // Init result
    this.resultSet = [];

    // Set transaction that this query belongs to
    this.tx = tx;

    // Add this query to transaction list
    this.tx.queryList[this.id] = this;

    // Callbacks
    this.successCallback = null;
    this.errorCallback = null;

};

/**
 * Transaction object
 * PRIVATE METHOD
 * @constructor
 */
var DroidDB_Tx = function() {

    // Set the id of the transaction
    this.id = utils.createUUID();

    // Callbacks
    this.successCallback = null;
    this.errorCallback = null;

    // Query list
    this.queryList = {};
};

/**
 * Mark query in transaction as complete.
 * If all queries are complete, call the user's transaction success callback.
 *
 * @param id                Query id
 */
DroidDB_Tx.prototype.queryComplete = function(id) {
    delete this.queryList[id];

    // If no more outstanding queries, then fire transaction success
    if (this.successCallback) {
        var count = 0;
        var i;
        for (i in this.queryList) {
            if (this.queryList.hasOwnProperty(i)) {
                count++;
            }
        }
        if (count === 0) {
            try {
                this.successCallback();
            } catch(e) {
                console.log("Transaction error calling user success callback: " + e);
            }
        }
    }
};

/**
 * Mark query in transaction as failed.
 *
 * @param id                Query id
 * @param reason            Error message
 */
DroidDB_Tx.prototype.queryFailed = function(id, reason) {

    // The sql queries in this transaction have already been run, since
    // we really don't have a real transaction implemented in native code.
    // However, the user callbacks for the remaining sql queries in transaction
    // will not be called.
    this.queryList = {};

    if (this.errorCallback) {
        try {
            this.errorCallback(reason);
        } catch(e) {
            console.log("Transaction error calling user error callback: " + e);
        }
    }
};

/**
 * Execute SQL statement
 *
 * @param sql                   SQL statement to execute
 * @param params                Statement parameters
 * @param successCallback       Success callback
 * @param errorCallback         Error callback
 */
DroidDB_Tx.prototype.executeSql = function(sql, params, successCallback, errorCallback) {

    // Init params array
    if (typeof params === 'undefined') {
        params = [];
    }

    // Create query and add to queue
    var query = new DroidDB_Query(this);
    queryQueue[query.id] = query;

    // Save callbacks
    query.successCallback = successCallback;
    query.errorCallback = errorCallback;

    // Call native code
    exec(null, null, "Storage", "executeSql", [sql, params, query.id]);
};

var DatabaseShell = function() {
};

/**
 * Start a transaction.
 * Does not support rollback in event of failure.
 *
 * @param process {Function}            The transaction function
 * @param successCallback {Function}
 * @param errorCallback {Function}
 */
DatabaseShell.prototype.transaction = function(process, errorCallback, successCallback) {
    var tx = new DroidDB_Tx();
    tx.successCallback = successCallback;
    tx.errorCallback = errorCallback;
    try {
        process(tx);
    } catch (e) {
        console.log("Transaction error: "+e);
        if (tx.errorCallback) {
            try {
                tx.errorCallback(e);
            } catch (ex) {
                console.log("Transaction error calling user error callback: "+e);
            }
        }
    }
};

/**
 * Open database
 *
 * @param name              Database name
 * @param version           Database version
 * @param display_name      Database display name
 * @param size              Database size in bytes
 * @return                  Database object
 */
var DroidDB_openDatabase = function(name, version, display_name, size) {
    exec(null, null, "Storage", "openDatabase", [name, version, display_name, size]);
    var db = new DatabaseShell();
    return db;
};


module.exports = {
  openDatabase:DroidDB_openDatabase,
  failQuery:failQuery,
  completeQuery:completeQuery
};

});

// file: lib/android/plugin/android/storage/openDatabase.js
define("cordova/plugin/android/storage/openDatabase", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper'),
    storage = require('cordova/plugin/android/storage');

var originalOpenDatabase = modulemapper.getOriginalSymbol(window, 'openDatabase');

module.exports = function(name, version, desc, size) {
    // First patch WebSQL if necessary
    if (!originalOpenDatabase) {
        // Not defined, create an openDatabase function for all to use!
        return storage.openDatabase.apply(this, arguments);
    }

    // Defined, but some Android devices will throw a SECURITY_ERR -
    // so we wrap the whole thing in a try-catch and shim in our own
    // if the device has Android bug 16175.
    try {
        return originalOpenDatabase(name, version, desc, size);
    } catch (ex) {
        if (ex.code !== 18) {
            throw ex;
        }
    }
    return storage.openDatabase(name, version, desc, size);
};



});

// file: lib/android/plugin/android/storage/symbols.js
define("cordova/plugin/android/storage/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/android/storage/openDatabase', 'openDatabase');


});

// file: lib/common/plugin/battery.js
define("cordova/plugin/battery", function(require, exports, module) {

/**
 * This class contains information about the current battery status.
 * @constructor
 */
var cordova = require('cordova'),
    exec = require('cordova/exec');

function handlers() {
  return battery.channels.batterystatus.numHandlers +
         battery.channels.batterylow.numHandlers +
         battery.channels.batterycritical.numHandlers;
}

var Battery = function() {
    this._level = null;
    this._isPlugged = null;
    // Create new event handlers on the window (returns a channel instance)
    this.channels = {
      batterystatus:cordova.addWindowEventHandler("batterystatus"),
      batterylow:cordova.addWindowEventHandler("batterylow"),
      batterycritical:cordova.addWindowEventHandler("batterycritical")
    };
    for (var key in this.channels) {
        this.channels[key].onHasSubscribersChange = Battery.onHasSubscribersChange;
    }
};
/**
 * Event handlers for when callbacks get registered for the battery.
 * Keep track of how many handlers we have so we can start and stop the native battery listener
 * appropriately (and hopefully save on battery life!).
 */
Battery.onHasSubscribersChange = function() {
  // If we just registered the first handler, make sure native listener is started.
  if (this.numHandlers === 1 && handlers() === 1) {
      exec(battery._status, battery._error, "Battery", "start", []);
  } else if (handlers() === 0) {
      exec(null, null, "Battery", "stop", []);
  }
};

/**
 * Callback for battery status
 *
 * @param {Object} info            keys: level, isPlugged
 */
Battery.prototype._status = function(info) {
    if (info) {
        var me = battery;
    var level = info.level;
        if (me._level !== level || me._isPlugged !== info.isPlugged) {
            // Fire batterystatus event
            cordova.fireWindowEvent("batterystatus", info);

            // Fire low battery event
            if (level === 20 || level === 5) {
                if (level === 20) {
                    cordova.fireWindowEvent("batterylow", info);
                }
                else {
                    cordova.fireWindowEvent("batterycritical", info);
                }
            }
        }
        me._level = level;
        me._isPlugged = info.isPlugged;
    }
};

/**
 * Error callback for battery start
 */
Battery.prototype._error = function(e) {
    console.log("Error initializing Battery: " + e);
};

var battery = new Battery();

module.exports = battery;

});

// file: lib/common/plugin/battery/symbols.js
define("cordova/plugin/battery/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.defaults('cordova/plugin/battery', 'navigator.battery');

});

// file: lib/common/plugin/camera/symbols.js
define("cordova/plugin/camera/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.defaults('cordova/plugin/Camera', 'navigator.camera');
modulemapper.defaults('cordova/plugin/CameraConstants', 'Camera');
modulemapper.defaults('cordova/plugin/CameraPopoverOptions', 'CameraPopoverOptions');

});

// file: lib/common/plugin/capture.js
define("cordova/plugin/capture", function(require, exports, module) {

var exec = require('cordova/exec'),
    MediaFile = require('cordova/plugin/MediaFile');

/**
 * Launches a capture of different types.
 *
 * @param (DOMString} type
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureVideoOptions} options
 */
function _capture(type, successCallback, errorCallback, options) {
    var win = function(pluginResult) {
        var mediaFiles = [];
        var i;
        for (i = 0; i < pluginResult.length; i++) {
            var mediaFile = new MediaFile();
            mediaFile.name = pluginResult[i].name;
            mediaFile.fullPath = pluginResult[i].fullPath;
            mediaFile.type = pluginResult[i].type;
            mediaFile.lastModifiedDate = pluginResult[i].lastModifiedDate;
            mediaFile.size = pluginResult[i].size;
            mediaFiles.push(mediaFile);
        }
        successCallback(mediaFiles);
    };
    exec(win, errorCallback, "Capture", type, [options]);
}
/**
 * The Capture interface exposes an interface to the camera and microphone of the hosting device.
 */
function Capture() {
    this.supportedAudioModes = [];
    this.supportedImageModes = [];
    this.supportedVideoModes = [];
}

/**
 * Launch audio recorder application for recording audio clip(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureAudioOptions} options
 */
Capture.prototype.captureAudio = function(successCallback, errorCallback, options){
    _capture("captureAudio", successCallback, errorCallback, options);
};

/**
 * Launch camera application for taking image(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureImageOptions} options
 */
Capture.prototype.captureImage = function(successCallback, errorCallback, options){
    _capture("captureImage", successCallback, errorCallback, options);
};

/**
 * Launch device camera application for recording video(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureVideoOptions} options
 */
Capture.prototype.captureVideo = function(successCallback, errorCallback, options){
    _capture("captureVideo", successCallback, errorCallback, options);
};


module.exports = new Capture();

});

// file: lib/common/plugin/capture/symbols.js
define("cordova/plugin/capture/symbols", function(require, exports, module) {

var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/CaptureError', 'CaptureError');
modulemapper.clobbers('cordova/plugin/CaptureAudioOptions', 'CaptureAudioOptions');
modulemapper.clobbers('cordova/plugin/CaptureImageOptions', 'CaptureImageOptions');
modulemapper.clobbers('cordova/plugin/CaptureVideoOptions', 'CaptureVideoOptions');
modulemapper.clobbers('cordova/plugin/ConfigurationData', 'ConfigurationData');
modulemapper.clobbers('cordova/plugin/MediaFile', 'MediaFile');
modulemapper.clobbers('cordova/plugin/MediaFileData', 'MediaFileData');
modulemapper.clobbers('cordova/plugin/capture', 'navigator.device.capture');

});

// file: lib/common/plugin/compass.js
define("cordova/plugin/compass", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    utils = require('cordova/utils'),
    CompassHeading = require('cordova/plugin/CompassHeading'),
    CompassError = require('cordova/plugin/CompassError'),
    timers = {},
    compass = {
        /**
         * Asynchronously acquires the current heading.
         * @param {Function} successCallback The function to call when the heading
         * data is available
         * @param {Function} errorCallback The function to call when there is an error
         * getting the heading data.
         * @param {CompassOptions} options The options for getting the heading data (not used).
         */
        getCurrentHeading:function(successCallback, errorCallback, options) {
            argscheck.checkArgs('fFO', 'compass.getCurrentHeading', arguments);

            var win = function(result) {
                var ch = new CompassHeading(result.magneticHeading, result.trueHeading, result.headingAccuracy, result.timestamp);
                successCallback(ch);
            };
            var fail = errorCallback && function(code) {
                var ce = new CompassError(code);
                errorCallback(ce);
            };

            // Get heading
            exec(win, fail, "Compass", "getHeading", [options]);
        },

        /**
         * Asynchronously acquires the heading repeatedly at a given interval.
         * @param {Function} successCallback The function to call each time the heading
         * data is available
         * @param {Function} errorCallback The function to call when there is an error
         * getting the heading data.
         * @param {HeadingOptions} options The options for getting the heading data
         * such as timeout and the frequency of the watch. For iOS, filter parameter
         * specifies to watch via a distance filter rather than time.
         */
        watchHeading:function(successCallback, errorCallback, options) {
            argscheck.checkArgs('fFO', 'compass.watchHeading', arguments);
            // Default interval (100 msec)
            var frequency = (options !== undefined && options.frequency !== undefined) ? options.frequency : 100;
            var filter = (options !== undefined && options.filter !== undefined) ? options.filter : 0;

            var id = utils.createUUID();
            if (filter > 0) {
                // is an iOS request for watch by filter, no timer needed
                timers[id] = "iOS";
                compass.getCurrentHeading(successCallback, errorCallback, options);
            } else {
                // Start watch timer to get headings
                timers[id] = window.setInterval(function() {
                    compass.getCurrentHeading(successCallback, errorCallback);
                }, frequency);
            }

            return id;
        },

        /**
         * Clears the specified heading watch.
         * @param {String} watchId The ID of the watch returned from #watchHeading.
         */
        clearWatch:function(id) {
            // Stop javascript timer & remove from timer list
            if (id && timers[id]) {
                if (timers[id] != "iOS") {
                    clearInterval(timers[id]);
                } else {
                    // is iOS watch by filter so call into device to stop
                    exec(null, null, "Compass", "stopHeading", []);
                }
                delete timers[id];
            }
        }
    };

module.exports = compass;

});

// file: lib/common/plugin/compass/symbols.js
define("cordova/plugin/compass/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/CompassHeading', 'CompassHeading');
modulemapper.clobbers('cordova/plugin/CompassError', 'CompassError');
modulemapper.clobbers('cordova/plugin/compass', 'navigator.compass');

});

// file: lib/common/plugin/console-via-logger.js
define("cordova/plugin/console-via-logger", function(require, exports, module) {

//------------------------------------------------------------------------------

var logger = require("cordova/plugin/logger");
var utils  = require("cordova/utils");

//------------------------------------------------------------------------------
// object that we're exporting
//------------------------------------------------------------------------------
var console = module.exports;

//------------------------------------------------------------------------------
// copy of the original console object
//------------------------------------------------------------------------------
var WinConsole = window.console;

//------------------------------------------------------------------------------
// whether to use the logger
//------------------------------------------------------------------------------
var UseLogger = false;

//------------------------------------------------------------------------------
// Timers
//------------------------------------------------------------------------------
var Timers = {};

//------------------------------------------------------------------------------
// used for unimplemented methods
//------------------------------------------------------------------------------
function noop() {}

//------------------------------------------------------------------------------
// used for unimplemented methods
//------------------------------------------------------------------------------
console.useLogger = function (value) {
    if (arguments.length) UseLogger = !!value;

    if (UseLogger) {
        if (logger.useConsole()) {
            throw new Error("console and logger are too intertwingly");
        }
    }

    return UseLogger;
};

//------------------------------------------------------------------------------
console.log = function() {
    if (logger.useConsole()) return;
    logger.log.apply(logger, [].slice.call(arguments));
};

//------------------------------------------------------------------------------
console.error = function() {
    if (logger.useConsole()) return;
    logger.error.apply(logger, [].slice.call(arguments));
};

//------------------------------------------------------------------------------
console.warn = function() {
    if (logger.useConsole()) return;
    logger.warn.apply(logger, [].slice.call(arguments));
};

//------------------------------------------------------------------------------
console.info = function() {
    if (logger.useConsole()) return;
    logger.info.apply(logger, [].slice.call(arguments));
};

//------------------------------------------------------------------------------
console.debug = function() {
    if (logger.useConsole()) return;
    logger.debug.apply(logger, [].slice.call(arguments));
};

//------------------------------------------------------------------------------
console.assert = function(expression) {
    if (expression) return;

    var message = logger.format.apply(logger.format, [].slice.call(arguments, 1));
    console.log("ASSERT: " + message);
};

//------------------------------------------------------------------------------
console.clear = function() {};

//------------------------------------------------------------------------------
console.dir = function(object) {
    console.log("%o", object);
};

//------------------------------------------------------------------------------
console.dirxml = function(node) {
    console.log(node.innerHTML);
};

//------------------------------------------------------------------------------
console.trace = noop;

//------------------------------------------------------------------------------
console.group = console.log;

//------------------------------------------------------------------------------
console.groupCollapsed = console.log;

//------------------------------------------------------------------------------
console.groupEnd = noop;

//------------------------------------------------------------------------------
console.time = function(name) {
    Timers[name] = new Date().valueOf();
};

//------------------------------------------------------------------------------
console.timeEnd = function(name) {
    var timeStart = Timers[name];
    if (!timeStart) {
        console.warn("unknown timer: " + name);
        return;
    }

    var timeElapsed = new Date().valueOf() - timeStart;
    console.log(name + ": " + timeElapsed + "ms");
};

//------------------------------------------------------------------------------
console.timeStamp = noop;

//------------------------------------------------------------------------------
console.profile = noop;

//------------------------------------------------------------------------------
console.profileEnd = noop;

//------------------------------------------------------------------------------
console.count = noop;

//------------------------------------------------------------------------------
console.exception = console.log;

//------------------------------------------------------------------------------
console.table = function(data, columns) {
    console.log("%o", data);
};

//------------------------------------------------------------------------------
// return a new function that calls both functions passed as args
//------------------------------------------------------------------------------
function wrappedOrigCall(orgFunc, newFunc) {
    return function() {
        var args = [].slice.call(arguments);
        try { orgFunc.apply(WinConsole, args); } catch (e) {}
        try { newFunc.apply(console,    args); } catch (e) {}
    };
}

//------------------------------------------------------------------------------
// For every function that exists in the original console object, that
// also exists in the new console object, wrap the new console method
// with one that calls both
//------------------------------------------------------------------------------
for (var key in console) {
    if (typeof WinConsole[key] == "function") {
        console[key] = wrappedOrigCall(WinConsole[key], console[key]);
    }
}

});

// file: lib/common/plugin/contacts.js
define("cordova/plugin/contacts", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    ContactError = require('cordova/plugin/ContactError'),
    utils = require('cordova/utils'),
    Contact = require('cordova/plugin/Contact');

/**
* Represents a group of Contacts.
* @constructor
*/
var contacts = {
    /**
     * Returns an array of Contacts matching the search criteria.
     * @param fields that should be searched
     * @param successCB success callback
     * @param errorCB error callback
     * @param {ContactFindOptions} options that can be applied to contact searching
     * @return array of Contacts matching search criteria
     */
    find:function(fields, successCB, errorCB, options) {
        argscheck.checkArgs('afFO', 'contacts.find', arguments);
        if (!fields.length) {
            errorCB && errorCB(new ContactError(ContactError.INVALID_ARGUMENT_ERROR));
        } else {
            var win = function(result) {
                var cs = [];
                for (var i = 0, l = result.length; i < l; i++) {
                    cs.push(contacts.create(result[i]));
                }
                successCB(cs);
            };
            exec(win, errorCB, "Contacts", "search", [fields, options]);
        }
    },

    /**
     * This function creates a new contact, but it does not persist the contact
     * to device storage. To persist the contact to device storage, invoke
     * contact.save().
     * @param properties an object whose properties will be examined to create a new Contact
     * @returns new Contact object
     */
    create:function(properties) {
        argscheck.checkArgs('O', 'contacts.create', arguments);
        var contact = new Contact();
        for (var i in properties) {
            if (typeof contact[i] !== 'undefined' && properties.hasOwnProperty(i)) {
                contact[i] = properties[i];
            }
        }
        return contact;
    }
};

module.exports = contacts;

});

// file: lib/common/plugin/contacts/symbols.js
define("cordova/plugin/contacts/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/contacts', 'navigator.contacts');
modulemapper.clobbers('cordova/plugin/Contact', 'Contact');
modulemapper.clobbers('cordova/plugin/ContactAddress', 'ContactAddress');
modulemapper.clobbers('cordova/plugin/ContactError', 'ContactError');
modulemapper.clobbers('cordova/plugin/ContactField', 'ContactField');
modulemapper.clobbers('cordova/plugin/ContactFindOptions', 'ContactFindOptions');
modulemapper.clobbers('cordova/plugin/ContactName', 'ContactName');
modulemapper.clobbers('cordova/plugin/ContactOrganization', 'ContactOrganization');

});

// file: lib/common/plugin/device.js
define("cordova/plugin/device", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    channel = require('cordova/channel'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec');

// Tell cordova channel to wait on the CordovaInfoReady event
channel.waitForInitialization('onCordovaInfoReady');

/**
 * This represents the mobile device, and provides properties for inspecting the model, version, UUID of the
 * phone, etc.
 * @constructor
 */
function Device() {
    this.available = false;
    this.platform = null;
    this.version = null;
    this.name = null;
    this.uuid = null;
    this.cordova = null;
    this.model = null;

    var me = this;

    channel.onCordovaReady.subscribe(function() {
        me.getInfo(function(info) {
            me.available = true;
            me.platform = info.platform;
            me.version = info.version;
            me.name = info.name;
            me.uuid = info.uuid;
            me.cordova = info.cordova;
            me.model = info.model;
            channel.onCordovaInfoReady.fire();
        },function(e) {
            me.available = false;
            utils.alert("[ERROR] Error initializing Cordova: " + e);
        });
    });
}

/**
 * Get device info
 *
 * @param {Function} successCallback The function to call when the heading data is available
 * @param {Function} errorCallback The function to call when there is an error getting the heading data. (OPTIONAL)
 */
Device.prototype.getInfo = function(successCallback, errorCallback) {
    argscheck.checkArgs('fF', 'Device.getInfo', arguments);
    exec(successCallback, errorCallback, "Device", "getDeviceInfo", []);
};

module.exports = new Device();

});

// file: lib/android/plugin/device/symbols.js
define("cordova/plugin/device/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/device', 'device');
modulemapper.merges('cordova/plugin/android/device', 'device');

});

// file: lib/common/plugin/echo.js
define("cordova/plugin/echo", function(require, exports, module) {

var exec = require('cordova/exec'),
    utils = require('cordova/utils');

/**
 * Sends the given message through exec() to the Echo plugin, which sends it back to the successCallback.
 * @param successCallback  invoked with a FileSystem object
 * @param errorCallback  invoked if error occurs retrieving file system
 * @param message  The string to be echoed.
 * @param forceAsync  Whether to force an async return value (for testing native->js bridge).
 */
module.exports = function(successCallback, errorCallback, message, forceAsync) {
    var action = 'echo';
    var messageIsMultipart = (utils.typeName(message) == "Array");
    var args = messageIsMultipart ? message : [message];

    if (utils.typeName(message) == 'ArrayBuffer') {
        if (forceAsync) {
            console.warn('Cannot echo ArrayBuffer with forced async, falling back to sync.');
        }
        action += 'ArrayBuffer';
    } else if (messageIsMultipart) {
        if (forceAsync) {
            console.warn('Cannot echo MultiPart Array with forced async, falling back to sync.');
        }
        action += 'MultiPart';
    } else if (forceAsync) {
        action += 'Async';
    }

    exec(successCallback, errorCallback, "Echo", action, args);
};


});

// file: lib/android/plugin/file/symbols.js
define("cordova/plugin/file/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper'),
    symbolshelper = require('cordova/plugin/file/symbolshelper');

symbolshelper(modulemapper.clobbers);

});

// file: lib/common/plugin/file/symbolshelper.js
define("cordova/plugin/file/symbolshelper", function(require, exports, module) {

module.exports = function(exportFunc) {
    exportFunc('cordova/plugin/DirectoryEntry', 'DirectoryEntry');
    exportFunc('cordova/plugin/DirectoryReader', 'DirectoryReader');
    exportFunc('cordova/plugin/Entry', 'Entry');
    exportFunc('cordova/plugin/File', 'File');
    exportFunc('cordova/plugin/FileEntry', 'FileEntry');
    exportFunc('cordova/plugin/FileError', 'FileError');
    exportFunc('cordova/plugin/FileReader', 'FileReader');
    exportFunc('cordova/plugin/FileSystem', 'FileSystem');
    exportFunc('cordova/plugin/FileUploadOptions', 'FileUploadOptions');
    exportFunc('cordova/plugin/FileUploadResult', 'FileUploadResult');
    exportFunc('cordova/plugin/FileWriter', 'FileWriter');
    exportFunc('cordova/plugin/Flags', 'Flags');
    exportFunc('cordova/plugin/LocalFileSystem', 'LocalFileSystem');
    exportFunc('cordova/plugin/Metadata', 'Metadata');
    exportFunc('cordova/plugin/ProgressEvent', 'ProgressEvent');
    exportFunc('cordova/plugin/requestFileSystem', 'requestFileSystem');
    exportFunc('cordova/plugin/resolveLocalFileSystemURI', 'resolveLocalFileSystemURI');
};

});

// file: lib/common/plugin/filetransfer/symbols.js
define("cordova/plugin/filetransfer/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/FileTransfer', 'FileTransfer');
modulemapper.clobbers('cordova/plugin/FileTransferError', 'FileTransferError');

});

// file: lib/common/plugin/geolocation.js
define("cordova/plugin/geolocation", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    PositionError = require('cordova/plugin/PositionError'),
    Position = require('cordova/plugin/Position');

var timers = {};   // list of timers in use

// Returns default params, overrides if provided with values
function parseParameters(options) {
    var opt = {
        maximumAge: 0,
        enableHighAccuracy: false,
        timeout: Infinity
    };

    if (options) {
        if (options.maximumAge !== undefined && !isNaN(options.maximumAge) && options.maximumAge > 0) {
            opt.maximumAge = options.maximumAge;
        }
        if (options.enableHighAccuracy !== undefined) {
            opt.enableHighAccuracy = options.enableHighAccuracy;
        }
        if (options.timeout !== undefined && !isNaN(options.timeout)) {
            if (options.timeout < 0) {
                opt.timeout = 0;
            } else {
                opt.timeout = options.timeout;
            }
        }
    }

    return opt;
}

// Returns a timeout failure, closed over a specified timeout value and error callback.
function createTimeout(errorCallback, timeout) {
    var t = setTimeout(function() {
        clearTimeout(t);
        t = null;
        errorCallback({
            code:PositionError.TIMEOUT,
            message:"Position retrieval timed out."
        });
    }, timeout);
    return t;
}

var geolocation = {
    lastPosition:null, // reference to last known (cached) position returned
    /**
   * Asynchronously acquires the current position.
   *
   * @param {Function} successCallback    The function to call when the position data is available
   * @param {Function} errorCallback      The function to call when there is an error getting the heading position. (OPTIONAL)
   * @param {PositionOptions} options     The options for getting the position data. (OPTIONAL)
   */
    getCurrentPosition:function(successCallback, errorCallback, options) {
        argscheck.checkArgs('fFO', 'geolocation.getCurrentPosition', arguments);
        options = parseParameters(options);

        // Timer var that will fire an error callback if no position is retrieved from native
        // before the "timeout" param provided expires
        var timeoutTimer = {timer:null};

        var win = function(p) {
            clearTimeout(timeoutTimer.timer);
            if (!(timeoutTimer.timer)) {
                // Timeout already happened, or native fired error callback for
                // this geo request.
                // Don't continue with success callback.
                return;
            }
            var pos = new Position(
                {
                    latitude:p.latitude,
                    longitude:p.longitude,
                    altitude:p.altitude,
                    accuracy:p.accuracy,
                    heading:p.heading,
                    velocity:p.velocity,
                    altitudeAccuracy:p.altitudeAccuracy
                },
                (p.timestamp === undefined ? new Date() : ((p.timestamp instanceof Date) ? p.timestamp : new Date(p.timestamp)))
            );
            geolocation.lastPosition = pos;
            successCallback(pos);
        };
        var fail = function(e) {
            clearTimeout(timeoutTimer.timer);
            timeoutTimer.timer = null;
            var err = new PositionError(e.code, e.message);
            if (errorCallback) {
                errorCallback(err);
            }
        };

        // Check our cached position, if its timestamp difference with current time is less than the maximumAge, then just
        // fire the success callback with the cached position.
        if (geolocation.lastPosition && options.maximumAge && (((new Date()).getTime() - geolocation.lastPosition.timestamp.getTime()) <= options.maximumAge)) {
            successCallback(geolocation.lastPosition);
        // If the cached position check failed and the timeout was set to 0, error out with a TIMEOUT error object.
        } else if (options.timeout === 0) {
            fail({
                code:PositionError.TIMEOUT,
                message:"timeout value in PositionOptions set to 0 and no cached Position object available, or cached Position object's age exceeds provided PositionOptions' maximumAge parameter."
            });
        // Otherwise we have to call into native to retrieve a position.
        } else {
            if (options.timeout !== Infinity) {
                // If the timeout value was not set to Infinity (default), then
                // set up a timeout function that will fire the error callback
                // if no successful position was retrieved before timeout expired.
                timeoutTimer.timer = createTimeout(fail, options.timeout);
            } else {
                // This is here so the check in the win function doesn't mess stuff up
                // may seem weird but this guarantees timeoutTimer is
                // always truthy before we call into native
                timeoutTimer.timer = true;
            }
            exec(win, fail, "Geolocation", "getLocation", [options.enableHighAccuracy, options.maximumAge]);
        }
        return timeoutTimer;
    },
    /**
     * Asynchronously watches the geolocation for changes to geolocation.  When a change occurs,
     * the successCallback is called with the new location.
     *
     * @param {Function} successCallback    The function to call each time the location data is available
     * @param {Function} errorCallback      The function to call when there is an error getting the location data. (OPTIONAL)
     * @param {PositionOptions} options     The options for getting the location data such as frequency. (OPTIONAL)
     * @return String                       The watch id that must be passed to #clearWatch to stop watching.
     */
    watchPosition:function(successCallback, errorCallback, options) {
        argscheck.checkArgs('fFO', 'geolocation.getCurrentPosition', arguments);
        options = parseParameters(options);

        var id = utils.createUUID();

        // Tell device to get a position ASAP, and also retrieve a reference to the timeout timer generated in getCurrentPosition
        timers[id] = geolocation.getCurrentPosition(successCallback, errorCallback, options);

        var fail = function(e) {
            clearTimeout(timers[id].timer);
            var err = new PositionError(e.code, e.message);
            if (errorCallback) {
                errorCallback(err);
            }
        };

        var win = function(p) {
            clearTimeout(timers[id].timer);
            if (options.timeout !== Infinity) {
                timers[id].timer = createTimeout(fail, options.timeout);
            }
            var pos = new Position(
                {
                    latitude:p.latitude,
                    longitude:p.longitude,
                    altitude:p.altitude,
                    accuracy:p.accuracy,
                    heading:p.heading,
                    velocity:p.velocity,
                    altitudeAccuracy:p.altitudeAccuracy
                },
                (p.timestamp === undefined ? new Date() : ((p.timestamp instanceof Date) ? p.timestamp : new Date(p.timestamp)))
            );
            geolocation.lastPosition = pos;
            successCallback(pos);
        };

        exec(win, fail, "Geolocation", "addWatch", [id, options.enableHighAccuracy]);

        return id;
    },
    /**
     * Clears the specified heading watch.
     *
     * @param {String} id       The ID of the watch returned from #watchPosition
     */
    clearWatch:function(id) {
        if (id && timers[id] !== undefined) {
            clearTimeout(timers[id].timer);
            timers[id].timer = false;
            exec(null, null, "Geolocation", "clearWatch", [id]);
        }
    }
};

module.exports = geolocation;

});

// file: lib/common/plugin/geolocation/symbols.js
define("cordova/plugin/geolocation/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.defaults('cordova/plugin/geolocation', 'navigator.geolocation');
modulemapper.clobbers('cordova/plugin/PositionError', 'PositionError');
modulemapper.clobbers('cordova/plugin/Position', 'Position');
modulemapper.clobbers('cordova/plugin/Coordinates', 'Coordinates');

});

// file: lib/common/plugin/globalization.js
define("cordova/plugin/globalization", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    GlobalizationError = require('cordova/plugin/GlobalizationError');

var globalization = {

/**
* Returns the string identifier for the client's current language.
* It returns the language identifier string to the successCB callback with a
* properties object as a parameter. If there is an error getting the language,
* then the errorCB callback is invoked.
*
* @param {Function} successCB
* @param {Function} errorCB
*
* @return Object.value {String}: The language identifier
*
* @error GlobalizationError.UNKNOWN_ERROR
*
* Example
*    globalization.getPreferredLanguage(function (language) {alert('language:' + language.value + '\n');},
*                                function () {});
*/
getPreferredLanguage:function(successCB, failureCB) {
    argscheck.checkArgs('fF', 'Globalization.getPreferredLanguage', arguments);
    exec(successCB, failureCB, "Globalization","getPreferredLanguage", []);
},

/**
* Returns the string identifier for the client's current locale setting.
* It returns the locale identifier string to the successCB callback with a
* properties object as a parameter. If there is an error getting the locale,
* then the errorCB callback is invoked.
*
* @param {Function} successCB
* @param {Function} errorCB
*
* @return Object.value {String}: The locale identifier
*
* @error GlobalizationError.UNKNOWN_ERROR
*
* Example
*    globalization.getLocaleName(function (locale) {alert('locale:' + locale.value + '\n');},
*                                function () {});
*/
getLocaleName:function(successCB, failureCB) {
    argscheck.checkArgs('fF', 'Globalization.getLocaleName', arguments);
    exec(successCB, failureCB, "Globalization","getLocaleName", []);
},


/**
* Returns a date formatted as a string according to the client's user preferences and
* calendar using the time zone of the client. It returns the formatted date string to the
* successCB callback with a properties object as a parameter. If there is an error
* formatting the date, then the errorCB callback is invoked.
*
* The defaults are: formatLenght="short" and selector="date and time"
*
* @param {Date} date
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            formatLength {String}: 'short', 'medium', 'long', or 'full'
*            selector {String}: 'date', 'time', or 'date and time'
*
* @return Object.value {String}: The localized date string
*
* @error GlobalizationError.FORMATTING_ERROR
*
* Example
*    globalization.dateToString(new Date(),
*                function (date) {alert('date:' + date.value + '\n');},
*                function (errorCode) {alert(errorCode);},
*                {formatLength:'short'});
*/
dateToString:function(date, successCB, failureCB, options) {
    argscheck.checkArgs('dfFO', 'Globalization.dateToString', arguments);
    var dateValue = date.valueOf();
    exec(successCB, failureCB, "Globalization", "dateToString", [{"date": dateValue, "options": options}]);
},


/**
* Parses a date formatted as a string according to the client's user
* preferences and calendar using the time zone of the client and returns
* the corresponding date object. It returns the date to the successCB
* callback with a properties object as a parameter. If there is an error
* parsing the date string, then the errorCB callback is invoked.
*
* The defaults are: formatLength="short" and selector="date and time"
*
* @param {String} dateString
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            formatLength {String}: 'short', 'medium', 'long', or 'full'
*            selector {String}: 'date', 'time', or 'date and time'
*
* @return    Object.year {Number}: The four digit year
*            Object.month {Number}: The month from (0 - 11)
*            Object.day {Number}: The day from (1 - 31)
*            Object.hour {Number}: The hour from (0 - 23)
*            Object.minute {Number}: The minute from (0 - 59)
*            Object.second {Number}: The second from (0 - 59)
*            Object.millisecond {Number}: The milliseconds (from 0 - 999),
*                                        not available on all platforms
*
* @error GlobalizationError.PARSING_ERROR
*
* Example
*    globalization.stringToDate('4/11/2011',
*                function (date) { alert('Month:' + date.month + '\n' +
*                    'Day:' + date.day + '\n' +
*                    'Year:' + date.year + '\n');},
*                function (errorCode) {alert(errorCode);},
*                {selector:'date'});
*/
stringToDate:function(dateString, successCB, failureCB, options) {
    argscheck.checkArgs('sfFO', 'Globalization.stringToDate', arguments);
    exec(successCB, failureCB, "Globalization", "stringToDate", [{"dateString": dateString, "options": options}]);
},


/**
* Returns a pattern string for formatting and parsing dates according to the client's
* user preferences. It returns the pattern to the successCB callback with a
* properties object as a parameter. If there is an error obtaining the pattern,
* then the errorCB callback is invoked.
*
* The defaults are: formatLength="short" and selector="date and time"
*
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            formatLength {String}: 'short', 'medium', 'long', or 'full'
*            selector {String}: 'date', 'time', or 'date and time'
*
* @return    Object.pattern {String}: The date and time pattern for formatting and parsing dates.
*                                    The patterns follow Unicode Technical Standard #35
*                                    http://unicode.org/reports/tr35/tr35-4.html
*            Object.timezone {String}: The abbreviated name of the time zone on the client
*            Object.utc_offset {Number}: The current difference in seconds between the client's
*                                        time zone and coordinated universal time.
*            Object.dst_offset {Number}: The current daylight saving time offset in seconds
*                                        between the client's non-daylight saving's time zone
*                                        and the client's daylight saving's time zone.
*
* @error GlobalizationError.PATTERN_ERROR
*
* Example
*    globalization.getDatePattern(
*                function (date) {alert('pattern:' + date.pattern + '\n');},
*                function () {},
*                {formatLength:'short'});
*/
getDatePattern:function(successCB, failureCB, options) {
    argscheck.checkArgs('fFO', 'Globalization.getDatePattern', arguments);
    exec(successCB, failureCB, "Globalization", "getDatePattern", [{"options": options}]);
},


/**
* Returns an array of either the names of the months or days of the week
* according to the client's user preferences and calendar. It returns the array of names to the
* successCB callback with a properties object as a parameter. If there is an error obtaining the
* names, then the errorCB callback is invoked.
*
* The defaults are: type="wide" and item="months"
*
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            type {String}: 'narrow' or 'wide'
*            item {String}: 'months', or 'days'
*
* @return Object.value {Array{String}}: The array of names starting from either
*                                        the first month in the year or the
*                                        first day of the week.
* @error GlobalizationError.UNKNOWN_ERROR
*
* Example
*    globalization.getDateNames(function (names) {
*        for(var i = 0; i < names.value.length; i++) {
*            alert('Month:' + names.value[i] + '\n');}},
*        function () {});
*/
getDateNames:function(successCB, failureCB, options) {
    argscheck.checkArgs('fFO', 'Globalization.getDateNames', arguments);
    exec(successCB, failureCB, "Globalization", "getDateNames", [{"options": options}]);
},

/**
* Returns whether daylight savings time is in effect for a given date using the client's
* time zone and calendar. It returns whether or not daylight savings time is in effect
* to the successCB callback with a properties object as a parameter. If there is an error
* reading the date, then the errorCB callback is invoked.
*
* @param {Date} date
* @param {Function} successCB
* @param {Function} errorCB
*
* @return Object.dst {Boolean}: The value "true" indicates that daylight savings time is
*                                in effect for the given date and "false" indicate that it is not.
*
* @error GlobalizationError.UNKNOWN_ERROR
*
* Example
*    globalization.isDayLightSavingsTime(new Date(),
*                function (date) {alert('dst:' + date.dst + '\n');}
*                function () {});
*/
isDayLightSavingsTime:function(date, successCB, failureCB) {
    argscheck.checkArgs('dfF', 'Globalization.isDayLightSavingsTime', arguments);
    var dateValue = date.valueOf();
    exec(successCB, failureCB, "Globalization", "isDayLightSavingsTime", [{"date": dateValue}]);
},

/**
* Returns the first day of the week according to the client's user preferences and calendar.
* The days of the week are numbered starting from 1 where 1 is considered to be Sunday.
* It returns the day to the successCB callback with a properties object as a parameter.
* If there is an error obtaining the pattern, then the errorCB callback is invoked.
*
* @param {Function} successCB
* @param {Function} errorCB
*
* @return Object.value {Number}: The number of the first day of the week.
*
* @error GlobalizationError.UNKNOWN_ERROR
*
* Example
*    globalization.getFirstDayOfWeek(function (day)
*                { alert('Day:' + day.value + '\n');},
*                function () {});
*/
getFirstDayOfWeek:function(successCB, failureCB) {
    argscheck.checkArgs('fF', 'Globalization.getFirstDayOfWeek', arguments);
    exec(successCB, failureCB, "Globalization", "getFirstDayOfWeek", []);
},


/**
* Returns a number formatted as a string according to the client's user preferences.
* It returns the formatted number string to the successCB callback with a properties object as a
* parameter. If there is an error formatting the number, then the errorCB callback is invoked.
*
* The defaults are: type="decimal"
*
* @param {Number} number
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            type {String}: 'decimal', "percent", or 'currency'
*
* @return Object.value {String}: The formatted number string.
*
* @error GlobalizationError.FORMATTING_ERROR
*
* Example
*    globalization.numberToString(3.25,
*                function (number) {alert('number:' + number.value + '\n');},
*                function () {},
*                {type:'decimal'});
*/
numberToString:function(number, successCB, failureCB, options) {
    argscheck.checkArgs('nfFO', 'Globalization.numberToString', arguments);
    exec(successCB, failureCB, "Globalization", "numberToString", [{"number": number, "options": options}]);
},

/**
* Parses a number formatted as a string according to the client's user preferences and
* returns the corresponding number. It returns the number to the successCB callback with a
* properties object as a parameter. If there is an error parsing the number string, then
* the errorCB callback is invoked.
*
* The defaults are: type="decimal"
*
* @param {String} numberString
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            type {String}: 'decimal', "percent", or 'currency'
*
* @return Object.value {Number}: The parsed number.
*
* @error GlobalizationError.PARSING_ERROR
*
* Example
*    globalization.stringToNumber('1234.56',
*                function (number) {alert('Number:' + number.value + '\n');},
*                function () { alert('Error parsing number');});
*/
stringToNumber:function(numberString, successCB, failureCB, options) {
    argscheck.checkArgs('sfFO', 'Globalization.stringToNumber', arguments);
    exec(successCB, failureCB, "Globalization", "stringToNumber", [{"numberString": numberString, "options": options}]);
},

/**
* Returns a pattern string for formatting and parsing numbers according to the client's user
* preferences. It returns the pattern to the successCB callback with a properties object as a
* parameter. If there is an error obtaining the pattern, then the errorCB callback is invoked.
*
* The defaults are: type="decimal"
*
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            type {String}: 'decimal', "percent", or 'currency'
*
* @return    Object.pattern {String}: The number pattern for formatting and parsing numbers.
*                                    The patterns follow Unicode Technical Standard #35.
*                                    http://unicode.org/reports/tr35/tr35-4.html
*            Object.symbol {String}: The symbol to be used when formatting and parsing
*                                    e.g., percent or currency symbol.
*            Object.fraction {Number}: The number of fractional digits to use when parsing and
*                                    formatting numbers.
*            Object.rounding {Number}: The rounding increment to use when parsing and formatting.
*            Object.positive {String}: The symbol to use for positive numbers when parsing and formatting.
*            Object.negative: {String}: The symbol to use for negative numbers when parsing and formatting.
*            Object.decimal: {String}: The decimal symbol to use for parsing and formatting.
*            Object.grouping: {String}: The grouping symbol to use for parsing and formatting.
*
* @error GlobalizationError.PATTERN_ERROR
*
* Example
*    globalization.getNumberPattern(
*                function (pattern) {alert('Pattern:' + pattern.pattern + '\n');},
*                function () {});
*/
getNumberPattern:function(successCB, failureCB, options) {
    argscheck.checkArgs('fFO', 'Globalization.getNumberPattern', arguments);
    exec(successCB, failureCB, "Globalization", "getNumberPattern", [{"options": options}]);
},

/**
* Returns a pattern string for formatting and parsing currency values according to the client's
* user preferences and ISO 4217 currency code. It returns the pattern to the successCB callback with a
* properties object as a parameter. If there is an error obtaining the pattern, then the errorCB
* callback is invoked.
*
* @param {String} currencyCode
* @param {Function} successCB
* @param {Function} errorCB
*
* @return    Object.pattern {String}: The currency pattern for formatting and parsing currency values.
*                                    The patterns follow Unicode Technical Standard #35
*                                    http://unicode.org/reports/tr35/tr35-4.html
*            Object.code {String}: The ISO 4217 currency code for the pattern.
*            Object.fraction {Number}: The number of fractional digits to use when parsing and
*                                    formatting currency.
*            Object.rounding {Number}: The rounding increment to use when parsing and formatting.
*            Object.decimal: {String}: The decimal symbol to use for parsing and formatting.
*            Object.grouping: {String}: The grouping symbol to use for parsing and formatting.
*
* @error GlobalizationError.FORMATTING_ERROR
*
* Example
*    globalization.getCurrencyPattern('EUR',
*                function (currency) {alert('Pattern:' + currency.pattern + '\n');}
*                function () {});
*/
getCurrencyPattern:function(currencyCode, successCB, failureCB) {
    argscheck.checkArgs('sfF', 'Globalization.getCurrencyPattern', arguments);
    exec(successCB, failureCB, "Globalization", "getCurrencyPattern", [{"currencyCode": currencyCode}]);
}

};

module.exports = globalization;

});

// file: lib/common/plugin/globalization/symbols.js
define("cordova/plugin/globalization/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/globalization', 'navigator.globalization');
modulemapper.clobbers('cordova/plugin/GlobalizationError', 'GlobalizationError');

});

// file: lib/android/plugin/inappbrowser/symbols.js
define("cordova/plugin/inappbrowser/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/InAppBrowser', 'open');

});

// file: lib/common/plugin/logger.js
define("cordova/plugin/logger", function(require, exports, module) {

//------------------------------------------------------------------------------
// The logger module exports the following properties/functions:
//
// LOG                          - constant for the level LOG
// ERROR                        - constant for the level ERROR
// WARN                         - constant for the level WARN
// INFO                         - constant for the level INFO
// DEBUG                        - constant for the level DEBUG
// logLevel()                   - returns current log level
// logLevel(value)              - sets and returns a new log level
// useConsole()                 - returns whether logger is using console
// useConsole(value)            - sets and returns whether logger is using console
// log(message,...)             - logs a message at level LOG
// error(message,...)           - logs a message at level ERROR
// warn(message,...)            - logs a message at level WARN
// info(message,...)            - logs a message at level INFO
// debug(message,...)           - logs a message at level DEBUG
// logLevel(level,message,...)  - logs a message specified level
//
//------------------------------------------------------------------------------

var logger = exports;

var exec    = require('cordova/exec');
var utils   = require('cordova/utils');

var UseConsole   = true;
var Queued       = [];
var DeviceReady  = false;
var CurrentLevel;

/**
 * Logging levels
 */

var Levels = [
    "LOG",
    "ERROR",
    "WARN",
    "INFO",
    "DEBUG"
];

/*
 * add the logging levels to the logger object and
 * to a separate levelsMap object for testing
 */

var LevelsMap = {};
for (var i=0; i<Levels.length; i++) {
    var level = Levels[i];
    LevelsMap[level] = i;
    logger[level]    = level;
}

CurrentLevel = LevelsMap.WARN;

/**
 * Getter/Setter for the logging level
 *
 * Returns the current logging level.
 *
 * When a value is passed, sets the logging level to that value.
 * The values should be one of the following constants:
 *    logger.LOG
 *    logger.ERROR
 *    logger.WARN
 *    logger.INFO
 *    logger.DEBUG
 *
 * The value used determines which messages get printed.  The logging
 * values above are in order, and only messages logged at the logging
 * level or above will actually be displayed to the user.  E.g., the
 * default level is WARN, so only messages logged with LOG, ERROR, or
 * WARN will be displayed; INFO and DEBUG messages will be ignored.
 */
logger.level = function (value) {
    if (arguments.length) {
        if (LevelsMap[value] === null) {
            throw new Error("invalid logging level: " + value);
        }
        CurrentLevel = LevelsMap[value];
    }

    return Levels[CurrentLevel];
};

/**
 * Getter/Setter for the useConsole functionality
 *
 * When useConsole is true, the logger will log via the
 * browser 'console' object.  Otherwise, it will use the
 * native Logger plugin.
 */
logger.useConsole = function (value) {
    if (arguments.length) UseConsole = !!value;

    if (UseConsole) {
        if (typeof console == "undefined") {
            throw new Error("global console object is not defined");
        }

        if (typeof console.log != "function") {
            throw new Error("global console object does not have a log function");
        }

        if (typeof console.useLogger == "function") {
            if (console.useLogger()) {
                throw new Error("console and logger are too intertwingly");
            }
        }
    }

    return UseConsole;
};

/**
 * Logs a message at the LOG level.
 *
 * Parameters passed after message are used applied to
 * the message with utils.format()
 */
logger.log   = function(message) { logWithArgs("LOG",   arguments); };

/**
 * Logs a message at the ERROR level.
 *
 * Parameters passed after message are used applied to
 * the message with utils.format()
 */
logger.error = function(message) { logWithArgs("ERROR", arguments); };

/**
 * Logs a message at the WARN level.
 *
 * Parameters passed after message are used applied to
 * the message with utils.format()
 */
logger.warn  = function(message) { logWithArgs("WARN",  arguments); };

/**
 * Logs a message at the INFO level.
 *
 * Parameters passed after message are used applied to
 * the message with utils.format()
 */
logger.info  = function(message) { logWithArgs("INFO",  arguments); };

/**
 * Logs a message at the DEBUG level.
 *
 * Parameters passed after message are used applied to
 * the message with utils.format()
 */
logger.debug = function(message) { logWithArgs("DEBUG", arguments); };

// log at the specified level with args
function logWithArgs(level, args) {
    args = [level].concat([].slice.call(args));
    logger.logLevel.apply(logger, args);
}

/**
 * Logs a message at the specified level.
 *
 * Parameters passed after message are used applied to
 * the message with utils.format()
 */
logger.logLevel = function(level /* , ... */) {
    // format the message with the parameters
    var formatArgs = [].slice.call(arguments, 1);
    var message    = logger.format.apply(logger.format, formatArgs);

    if (LevelsMap[level] === null) {
        throw new Error("invalid logging level: " + level);
    }

    if (LevelsMap[level] > CurrentLevel) return;

    // queue the message if not yet at deviceready
    if (!DeviceReady && !UseConsole) {
        Queued.push([level, message]);
        return;
    }

    // if not using the console, use the native logger
    if (!UseConsole) {
        exec(null, null, "Logger", "logLevel", [level, message]);
        return;
    }

    // make sure console is not using logger
    if (console.__usingCordovaLogger) {
        throw new Error("console and logger are too intertwingly");
    }

    // log to the console
    switch (level) {
        case logger.LOG:   console.log(message); break;
        case logger.ERROR: console.log("ERROR: " + message); break;
        case logger.WARN:  console.log("WARN: "  + message); break;
        case logger.INFO:  console.log("INFO: "  + message); break;
        case logger.DEBUG: console.log("DEBUG: " + message); break;
    }
};


/**
 * Formats a string and arguments following it ala console.log()
 *
 * Any remaining arguments will be appended to the formatted string.
 *
 * for rationale, see FireBug's Console API:
 *    http://getfirebug.com/wiki/index.php/Console_API
 */
logger.format = function(formatString, args) {
    return __format(arguments[0], [].slice.call(arguments,1)).join(' ');
};


//------------------------------------------------------------------------------
/**
 * Formats a string and arguments following it ala vsprintf()
 *
 * format chars:
 *   %j - format arg as JSON
 *   %o - format arg as JSON
 *   %c - format arg as ''
 *   %% - replace with '%'
 * any other char following % will format it's
 * arg via toString().
 *
 * Returns an array containing the formatted string and any remaining
 * arguments.
 */
function __format(formatString, args) {
    if (formatString === null || formatString === undefined) return [""];
    if (arguments.length == 1) return [formatString.toString()];

    if (typeof formatString != "string")
        formatString = formatString.toString();

    var pattern = /(.*?)%(.)(.*)/;
    var rest    = formatString;
    var result  = [];

    while (args.length) {
        var match = pattern.exec(rest);
        if (!match) break;

        var arg   = args.shift();
        rest = match[3];
        result.push(match[1]);

        if (match[2] == '%') {
            result.push('%');
            args.unshift(arg);
            continue;
        }

        result.push(__formatted(arg, match[2]));
    }

    result.push(rest);

    var remainingArgs = [].slice.call(args);
    remainingArgs.unshift(result.join(''));
    return remainingArgs;
}

function __formatted(object, formatChar) {

    try {
        switch(formatChar) {
            case 'j':
            case 'o': return JSON.stringify(object);
            case 'c': return '';
        }
    }
    catch (e) {
        return "error JSON.stringify()ing argument: " + e;
    }

    if ((object === null) || (object === undefined)) {
        return Object.prototype.toString.call(object);
    }

    return object.toString();
}


//------------------------------------------------------------------------------
// when deviceready fires, log queued messages
logger.__onDeviceReady = function() {
    if (DeviceReady) return;

    DeviceReady = true;

    for (var i=0; i<Queued.length; i++) {
        var messageArgs = Queued[i];
        logger.logLevel(messageArgs[0], messageArgs[1]);
    }

    Queued = null;
};

// add a deviceready event to log queued messages
document.addEventListener("deviceready", logger.__onDeviceReady, false);

});

// file: lib/common/plugin/logger/symbols.js
define("cordova/plugin/logger/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/logger', 'cordova.logger');

});

// file: lib/android/plugin/media/symbols.js
define("cordova/plugin/media/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.defaults('cordova/plugin/Media', 'Media');
modulemapper.clobbers('cordova/plugin/MediaError', 'MediaError');

});

// file: lib/common/plugin/network.js
define("cordova/plugin/network", function(require, exports, module) {

var exec = require('cordova/exec'),
    cordova = require('cordova'),
    channel = require('cordova/channel'),
    utils = require('cordova/utils');

// Link the onLine property with the Cordova-supplied network info.
// This works because we clobber the naviagtor object with our own
// object in bootstrap.js.
if (typeof navigator != 'undefined') {
    utils.defineGetter(navigator, 'onLine', function() {
        return this.connection.type != 'none';
    });
}

function NetworkConnection() {
    this.type = 'unknown';
}

/**
 * Get connection info
 *
 * @param {Function} successCallback The function to call when the Connection data is available
 * @param {Function} errorCallback The function to call when there is an error getting the Connection data. (OPTIONAL)
 */
NetworkConnection.prototype.getInfo = function(successCallback, errorCallback) {
    exec(successCallback, errorCallback, "NetworkStatus", "getConnectionInfo", []);
};

var me = new NetworkConnection();
var timerId = null;
var timeout = 500;

channel.onCordovaReady.subscribe(function() {
    me.getInfo(function(info) {
        me.type = info;
        if (info === "none") {
            // set a timer if still offline at the end of timer send the offline event
            timerId = setTimeout(function(){
                cordova.fireDocumentEvent("offline");
                timerId = null;
            }, timeout);
        } else {
            // If there is a current offline event pending clear it
            if (timerId !== null) {
                clearTimeout(timerId);
                timerId = null;
            }
            cordova.fireDocumentEvent("online");
        }

        // should only fire this once
        if (channel.onCordovaConnectionReady.state !== 2) {
            channel.onCordovaConnectionReady.fire();
        }
    },
    function (e) {
        // If we can't get the network info we should still tell Cordova
        // to fire the deviceready event.
        if (channel.onCordovaConnectionReady.state !== 2) {
            channel.onCordovaConnectionReady.fire();
        }
        console.log("Error initializing Network Connection: " + e);
    });
});

module.exports = me;

});

// file: lib/common/plugin/networkstatus/symbols.js
define("cordova/plugin/networkstatus/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/network', 'navigator.network.connection', 'navigator.network.connection is deprecated. Use navigator.connection instead.');
modulemapper.clobbers('cordova/plugin/network', 'navigator.connection');
modulemapper.defaults('cordova/plugin/Connection', 'Connection');

});

// file: lib/common/plugin/notification.js
define("cordova/plugin/notification", function(require, exports, module) {

var exec = require('cordova/exec');
var platform = require('cordova/platform');

/**
 * Provides access to notifications on the device.
 */

module.exports = {

    /**
     * Open a native alert dialog, with a customizable title and button text.
     *
     * @param {String} message              Message to print in the body of the alert
     * @param {Function} completeCallback   The callback that is called when user clicks on a button.
     * @param {String} title                Title of the alert dialog (default: Alert)
     * @param {String} buttonLabel          Label of the close button (default: OK)
     */
    alert: function(message, completeCallback, title, buttonLabel) {
        var _title = (title || "Alert");
        var _buttonLabel = (buttonLabel || "OK");
        exec(completeCallback, null, "Notification", "alert", [message, _title, _buttonLabel]);
    },

    /**
     * Open a native confirm dialog, with a customizable title and button text.
     * The result that the user selects is returned to the result callback.
     *
     * @param {String} message              Message to print in the body of the alert
     * @param {Function} resultCallback     The callback that is called when user clicks on a button.
     * @param {String} title                Title of the alert dialog (default: Confirm)
     * @param {Array} buttonLabels          Array of the labels of the buttons (default: ['OK', 'Cancel'])
     */
    confirm: function(message, resultCallback, title, buttonLabels) {
        var _title = (title || "Confirm");
        var _buttonLabels = (buttonLabels || ["OK", "Cancel"]);

        // Strings are deprecated!
        if (typeof _buttonLabels === 'string') {
            console.log("Notification.confirm(string, function, string, string) is deprecated.  Use Notification.confirm(string, function, string, array).");
        }

        // Some platforms take an array of button label names.
        // Other platforms take a comma separated list.
        // For compatibility, we convert to the desired type based on the platform.
        if (platform.id == "android" || platform.id == "ios" || platform.id == "windowsphone") {
            if (typeof _buttonLabels === 'string') {
                var buttonLabelString = _buttonLabels;
                _buttonLabels = _buttonLabels.split(","); // not crazy about changing the var type here
            }
        } else {
            if (Array.isArray(_buttonLabels)) {
                var buttonLabelArray = _buttonLabels;
                _buttonLabels = buttonLabelArray.toString();
            }
        }
        exec(resultCallback, null, "Notification", "confirm", [message, _title, _buttonLabels]);
    },

    /**
     * Open a native prompt dialog, with a customizable title and button text.
     * The following results are returned to the result callback:
     *  buttonIndex     Index number of the button selected.
     *  input1          The text entered in the prompt dialog box.
     *
     * @param {String} message              Dialog message to display (default: "Prompt message")
     * @param {Function} resultCallback     The callback that is called when user clicks on a button.
     * @param {String} title                Title of the dialog (default: "Prompt")
     * @param {Array} buttonLabels          Array of strings for the button labels (default: ["OK","Cancel"])
     */
    prompt: function(message, resultCallback, title, buttonLabels) {
        var _message = (message || "Prompt message");
        var _title = (title || "Prompt");
        var _buttonLabels = (buttonLabels || ["OK","Cancel"]);
        exec(resultCallback, null, "Notification", "prompt", [_message, _title, _buttonLabels]);
    },

    /**
     * Causes the device to vibrate.
     *
     * @param {Integer} mills       The number of milliseconds to vibrate for.
     */
    vibrate: function(mills) {
        exec(null, null, "Notification", "vibrate", [mills]);
    },

    /**
     * Causes the device to beep.
     * On Android, the default notification ringtone is played "count" times.
     *
     * @param {Integer} count       The number of beeps.
     */
    beep: function(count) {
        exec(null, null, "Notification", "beep", [count]);
    }
};

});

// file: lib/android/plugin/notification/symbols.js
define("cordova/plugin/notification/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/notification', 'navigator.notification');
modulemapper.merges('cordova/plugin/android/notification', 'navigator.notification');

});

// file: lib/common/plugin/requestFileSystem.js
define("cordova/plugin/requestFileSystem", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    FileError = require('cordova/plugin/FileError'),
    FileSystem = require('cordova/plugin/FileSystem'),
    exec = require('cordova/exec');

/**
 * Request a file system in which to store application data.
 * @param type  local file system type
 * @param size  indicates how much storage space, in bytes, the application expects to need
 * @param successCallback  invoked with a FileSystem object
 * @param errorCallback  invoked if error occurs retrieving file system
 */
var requestFileSystem = function(type, size, successCallback, errorCallback) {
    argscheck.checkArgs('nnFF', 'requestFileSystem', arguments);
    var fail = function(code) {
        errorCallback && errorCallback(new FileError(code));
    };

    if (type < 0 || type > 3) {
        fail(FileError.SYNTAX_ERR);
    } else {
        // if successful, return a FileSystem object
        var success = function(file_system) {
            if (file_system) {
                if (successCallback) {
                    // grab the name and root from the file system object
                    var result = new FileSystem(file_system.name, file_system.root);
                    successCallback(result);
                }
            }
            else {
                // no FileSystem object returned
                fail(FileError.NOT_FOUND_ERR);
            }
        };
        exec(success, fail, "File", "requestFileSystem", [type, size]);
    }
};

module.exports = requestFileSystem;

});

// file: lib/common/plugin/resolveLocalFileSystemURI.js
define("cordova/plugin/resolveLocalFileSystemURI", function(require, exports, module) {

var argscheck = require('cordova/argscheck'),
    DirectoryEntry = require('cordova/plugin/DirectoryEntry'),
    FileEntry = require('cordova/plugin/FileEntry'),
    FileError = require('cordova/plugin/FileError'),
    exec = require('cordova/exec');

/**
 * Look up file system Entry referred to by local URI.
 * @param {DOMString} uri  URI referring to a local file or directory
 * @param successCallback  invoked with Entry object corresponding to URI
 * @param errorCallback    invoked if error occurs retrieving file system entry
 */
module.exports = function(uri, successCallback, errorCallback) {
    argscheck.checkArgs('sFF', 'resolveLocalFileSystemURI', arguments);
    // error callback
    var fail = function(error) {
        errorCallback && errorCallback(new FileError(error));
    };
    // sanity check for 'not:valid:filename'
    if(!uri || uri.split(":").length > 2) {
        setTimeout( function() {
            fail(FileError.ENCODING_ERR);
        },0);
        return;
    }
    // if successful, return either a file or directory entry
    var success = function(entry) {
        var result;
        if (entry) {
            if (successCallback) {
                // create appropriate Entry object
                result = (entry.isDirectory) ? new DirectoryEntry(entry.name, entry.fullPath) : new FileEntry(entry.name, entry.fullPath);
                successCallback(result);
            }
        }
        else {
            // no Entry object returned
            fail(FileError.NOT_FOUND_ERR);
        }
    };

    exec(success, fail, "File", "resolveLocalFileSystemURI", [uri]);
};

});

// file: lib/common/plugin/splashscreen.js
define("cordova/plugin/splashscreen", function(require, exports, module) {

var exec = require('cordova/exec');

var splashscreen = {
    show:function() {
        exec(null, null, "SplashScreen", "show", []);
    },
    hide:function() {
        exec(null, null, "SplashScreen", "hide", []);
    }
};

module.exports = splashscreen;

});

// file: lib/common/plugin/splashscreen/symbols.js
define("cordova/plugin/splashscreen/symbols", function(require, exports, module) {


var modulemapper = require('cordova/modulemapper');

modulemapper.clobbers('cordova/plugin/splashscreen', 'navigator.splashscreen');

});

// file: lib/common/symbols.js
define("cordova/symbols", function(require, exports, module) {

var modulemapper = require('cordova/modulemapper');

// Use merges here in case others symbols files depend on this running first,
// but fail to declare the dependency with a require().
modulemapper.merges('cordova', 'cordova');
modulemapper.clobbers('cordova/exec', 'cordova.exec');
modulemapper.clobbers('cordova/exec', 'Cordova.exec');

});

// file: lib/common/utils.js
define("cordova/utils", function(require, exports, module) {

var utils = exports;

/**
 * Defines a property getter / setter for obj[key].
 */
utils.defineGetterSetter = function(obj, key, getFunc, opt_setFunc) {
    if (Object.defineProperty) {
        var desc = {
            get: getFunc,
            configurable: true
        };
        if (opt_setFunc) {
            desc.set = opt_setFunc;
        }
        Object.defineProperty(obj, key, desc);
    } else {
        obj.__defineGetter__(key, getFunc);
        if (opt_setFunc) {
            obj.__defineSetter__(key, opt_setFunc);
        }
    }
};

/**
 * Defines a property getter for obj[key].
 */
utils.defineGetter = utils.defineGetterSetter;

utils.arrayIndexOf = function(a, item) {
    if (a.indexOf) {
        return a.indexOf(item);
    }
    var len = a.length;
    for (var i = 0; i < len; ++i) {
        if (a[i] == item) {
            return i;
        }
    }
    return -1;
};

/**
 * Returns whether the item was found in the array.
 */
utils.arrayRemove = function(a, item) {
    var index = utils.arrayIndexOf(a, item);
    if (index != -1) {
        a.splice(index, 1);
    }
    return index != -1;
};

utils.typeName = function(val) {
    return Object.prototype.toString.call(val).slice(8, -1);
};

/**
 * Returns an indication of whether the argument is an array or not
 */
utils.isArray = function(a) {
    return utils.typeName(a) == 'Array';
};

/**
 * Returns an indication of whether the argument is a Date or not
 */
utils.isDate = function(d) {
    return utils.typeName(d) == 'Date';
};

/**
 * Does a deep clone of the object.
 */
utils.clone = function(obj) {
    if(!obj || typeof obj == 'function' || utils.isDate(obj) || typeof obj != 'object') {
        return obj;
    }

    var retVal, i;

    if(utils.isArray(obj)){
        retVal = [];
        for(i = 0; i < obj.length; ++i){
            retVal.push(utils.clone(obj[i]));
        }
        return retVal;
    }

    retVal = {};
    for(i in obj){
        if(!(i in retVal) || retVal[i] != obj[i]) {
            retVal[i] = utils.clone(obj[i]);
        }
    }
    return retVal;
};

/**
 * Returns a wrapped version of the function
 */
utils.close = function(context, func, params) {
    if (typeof params == 'undefined') {
        return function() {
            return func.apply(context, arguments);
        };
    } else {
        return function() {
            return func.apply(context, params);
        };
    }
};

/**
 * Create a UUID
 */
utils.createUUID = function() {
    return UUIDcreatePart(4) + '-' +
        UUIDcreatePart(2) + '-' +
        UUIDcreatePart(2) + '-' +
        UUIDcreatePart(2) + '-' +
        UUIDcreatePart(6);
};

/**
 * Extends a child object from a parent object using classical inheritance
 * pattern.
 */
utils.extend = (function() {
    // proxy used to establish prototype chain
    var F = function() {};
    // extend Child from Parent
    return function(Child, Parent) {
        F.prototype = Parent.prototype;
        Child.prototype = new F();
        Child.__super__ = Parent.prototype;
        Child.prototype.constructor = Child;
    };
}());

/**
 * Alerts a message in any available way: alert or console.log.
 */
utils.alert = function(msg) {
    if (window.alert) {
        window.alert(msg);
    } else if (console && console.log) {
        console.log(msg);
    }
};


//------------------------------------------------------------------------------
function UUIDcreatePart(length) {
    var uuidpart = "";
    for (var i=0; i<length; i++) {
        var uuidchar = parseInt((Math.random() * 256), 10).toString(16);
        if (uuidchar.length == 1) {
            uuidchar = "0" + uuidchar;
        }
        uuidpart += uuidchar;
    }
    return uuidpart;
}


});


window.cordova = require('cordova');

// file: lib/scripts/bootstrap.js

(function (context) {
    var channel = require('cordova/channel');
    var platformInitChannelsArray = [channel.onNativeReady, channel.onPluginsReady];

    function logUnfiredChannels(arr) {
        for (var i = 0; i < arr.length; ++i) {
            if (arr[i].state != 2) {
                console.log('Channel not fired: ' + arr[i].type);
            }
        }
    }

    window.setTimeout(function() {
        if (channel.onDeviceReady.state != 2) {
            console.log('deviceready has not fired after 5 seconds.');
            logUnfiredChannels(platformInitChannelsArray);
            logUnfiredChannels(channel.deviceReadyChannelsArray);
        }
    }, 5000);

    // Replace navigator before any modules are required(), to ensure it happens as soon as possible.
    // We replace it so that properties that can't be clobbered can instead be overridden.
    function replaceNavigator(origNavigator) {
        var CordovaNavigator = function() {};
        CordovaNavigator.prototype = origNavigator;
        var newNavigator = new CordovaNavigator();
        // This work-around really only applies to new APIs that are newer than Function.bind.
        // Without it, APIs such as getGamepads() break.
        if (CordovaNavigator.bind) {
            for (var key in origNavigator) {
                if (typeof origNavigator[key] == 'function') {
                    newNavigator[key] = origNavigator[key].bind(origNavigator);
                }
            }
        }
        return newNavigator;
    }
    if (context.navigator) {
        context.navigator = replaceNavigator(context.navigator);
    }

    // _nativeReady is global variable that the native side can set
    // to signify that the native code is ready. It is a global since
    // it may be called before any cordova JS is ready.
    if (window._nativeReady) {
        channel.onNativeReady.fire();
    }

    /**
     * Create all cordova objects once native side is ready.
     */
    channel.join(function() {
        // Call the platform-specific initialization
        require('cordova/platform').initialize();

        // Fire event to notify that all objects are created
        channel.onCordovaReady.fire();

        // Fire onDeviceReady event once page has fully loaded, all
        // constructors have run and cordova info has been received from native
        // side.
        // This join call is deliberately made after platform.initialize() in
        // order that plugins may manipulate channel.deviceReadyChannelsArray
        // if necessary.
        channel.join(function() {
            require('cordova').fireDocumentEvent('deviceready');
        }, channel.deviceReadyChannelsArray);

    }, platformInitChannelsArray);

}(window));

// file: lib/scripts/bootstrap-android.js

require('cordova/channel').onNativeReady.fire();

// file: lib/scripts/plugin_loader.js

// Tries to load all plugins' js-modules.
// This is an async process, but onDeviceReady is blocked on onPluginsReady.
// onPluginsReady is fired when there are no plugins to load, or they are all done.
(function (context) {
    // To be populated with the handler by handlePluginsObject.
    var onScriptLoadingComplete;

    var scriptCounter = 0;
    function scriptLoadedCallback() {
        scriptCounter--;
        if (scriptCounter === 0) {
            onScriptLoadingComplete && onScriptLoadingComplete();
        }
    }

    // Helper function to inject a <script> tag.
    function injectScript(path) {
        scriptCounter++;
        var script = document.createElement("script");
        script.onload = scriptLoadedCallback;
        script.src = path;
        document.head.appendChild(script);
    }

    // Called when:
    // * There are plugins defined and all plugins are finished loading.
    // * There are no plugins to load.
    function finishPluginLoading() {
        context.cordova.require('cordova/channel').onPluginsReady.fire();
    }

    // Handler for the cordova_plugins.json content.
    // See plugman's plugin_loader.js for the details of this object.
    // This function is only called if the really is a plugins array that isn't empty.
    // Otherwise the XHR response handler will just call finishPluginLoading().
    function handlePluginsObject(modules) {
        // First create the callback for when all plugins are loaded.
        var mapper = context.cordova.require('cordova/modulemapper');
        onScriptLoadingComplete = function() {
            // Loop through all the plugins and then through their clobbers and merges.
            for (var i = 0; i < modules.length; i++) {
                var module = modules[i];
                if (!module) continue;

                if (module.clobbers && module.clobbers.length) {
                    for (var j = 0; j < module.clobbers.length; j++) {
                        mapper.clobbers(module.id, module.clobbers[j]);
                    }
                }

                if (module.merges && module.merges.length) {
                    for (var k = 0; k < module.merges.length; k++) {
                        mapper.merges(module.id, module.merges[k]);
                    }
                }

                // Finally, if runs is truthy we want to simply require() the module.
                // This can be skipped if it had any merges or clobbers, though,
                // since the mapper will already have required the module.
                if (module.runs && !(module.clobbers && module.clobbers.length) && !(module.merges && module.merges.length)) {
                    context.cordova.require(module.id);
                }
            }

            finishPluginLoading();
        };

        // Now inject the scripts.
        for (var i = 0; i < modules.length; i++) {
            injectScript(modules[i].file);
        }
    }


    // Try to XHR the cordova_plugins.json file asynchronously.
    try { // we commented we were going to try, so let us actually try and catch
        var xhr = new context.XMLHttpRequest();
        xhr.onload = function() {
            // If the response is a JSON string which composes an array, call handlePluginsObject.
            // If the request fails, or the response is not a JSON array, just call finishPluginLoading.
            var obj = this.responseText && JSON.parse(this.responseText);
            if (obj && obj instanceof Array && obj.length > 0) {
                handlePluginsObject(obj);
            } else {
                finishPluginLoading();
            }
        };
        xhr.onerror = function() {
            finishPluginLoading();
        };
        xhr.open('GET', 'cordova_plugins.json', true); // Async
        xhr.send();
    }
    catch(err){
        finishPluginLoading();
    }
}(window));



})();/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },

    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');

        alert("Device is ready");
    },

    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
    }
};

app.initialize();/*
 Intel
 @api private
*/
if(!window.jq||"function"!==typeof jq){var jq=function(c){function g(m,b,a){var d=t.createDocumentFragment();if(a){for(a=m.length-1;0<=a;a--)d.insertBefore(m[a],d.firstChild);b.insertBefore(d,b.firstChild)}else{for(a=0;a<m.length;a++)d.appendChild(m[a]);b.appendChild(d)}}function k(m){return m in E?E[m]:E[m]=RegExp("(^|\\s)"+m+"(\\s|$)")}function f(m){for(var b=0;b<m.length;b++)m.indexOf(m[b])!=b&&(m.splice(b,1),b--);return m}function h(m,b){var a=[];if(m==r)return a;for(;m;m=m.nextSibling)1==m.nodeType&&
m!==b&&a.push(m);return a}function q(m,b){try{return b.querySelectorAll(m)}catch(a){return[]}}function p(m,b){if(m){if(m.nodeType)return b[b.length++]=m;for(var a=0,d=m.length;a<d;a++)b[b.length++]=m[a]}}function a(){}function e(m,b){m.os={};m.os.webkit=b.match(/WebKit\/([\d.]+)/)?!0:!1;m.os.android=b.match(/(Android)\s+([\d.]+)/)||b.match(/Silk-Accelerated/)?!0:!1;m.os.androidICS=m.os.android&&b.match(/(Android)\s4/)?!0:!1;m.os.ipad=b.match(/(iPad).*OS\s([\d_]+)/)?!0:!1;m.os.iphone=!m.os.ipad&&b.match(/(iPhone\sOS)\s([\d_]+)/)?
!0:!1;m.os.webos=b.match(/(webOS|hpwOS)[\s\/]([\d.]+)/)?!0:!1;m.os.touchpad=m.os.webos&&b.match(/TouchPad/)?!0:!1;m.os.ios=m.os.ipad||m.os.iphone;m.os.playbook=b.match(/PlayBook/)?!0:!1;m.os.blackberry=m.os.playbook||b.match(/BlackBerry/)?!0:!1;m.os.blackberry10=m.os.blackberry&&b.match(/Safari\/536/)?!0:!1;m.os.chrome=b.match(/Chrome/)?!0:!1;m.os.opera=b.match(/Opera/)?!0:!1;m.os.fennec=b.match(/fennec/i)?!0:b.match(/Firefox/)?!0:!1;m.os.ie=b.match(/MSIE 10.0/i)?!0:!1;m.os.ieTouch=m.os.ie&&b.toLowerCase().match(/touch/i)?
!0:!1;m.os.supportsTouch=c.DocumentTouch&&t instanceof c.DocumentTouch||"ontouchstart"in c;m.feat={};var a=t.documentElement.getElementsByTagName("head")[0];m.feat.nativeTouchScroll="undefined"!==typeof a.style["-webkit-overflow-scrolling"]&&m.os.ios;m.feat.cssPrefix=m.os.webkit?"Webkit":m.os.fennec?"Moz":m.os.ie?"ms":m.os.opera?"O":"";m.feat.cssTransformStart=!m.os.opera?"3d(":"(";m.feat.cssTransformEnd=!m.os.opera?",0)":")";m.os.android&&!m.os.webkit&&(m.os.android=!1)}function d(m){return m._jqmid||
(m._jqmid=L++)}function n(m,b,a,c){b=u(b);if(b.ns)var e=RegExp("(?:^| )"+b.ns.replace(" "," .* ?")+"(?: |$)");return(v[d(m)]||[]).filter(function(m){return m&&(!b.e||m.e==b.e)&&(!b.ns||e.test(m.ns))&&(!a||m.fn==a||"function"===typeof m.fn&&"function"===typeof a&&""+m.fn===""+a)&&(!c||m.sel==c)})}function u(m){m=(""+m).split(".");return{e:m[0],ns:m.slice(1).sort().join(" ")}}function b(m,b,a){l.isObject(m)?l.each(m,a):m.split(/\s/).forEach(function(m){a(m,b)})}function s(m,a,c,e,s){var n=d(m),f=v[n]||
(v[n]=[]);b(a,c,function(b,a){var d=s&&s(a,b),c=d||a,G=function(b){var a=c.apply(m,[b].concat(b.data));!1===a&&b.preventDefault();return a},d=l.extend(u(b),{fn:a,proxy:G,sel:e,del:d,i:f.length});f.push(d);m.addEventListener(d.e,G,!1)})}function B(m,a,c,e){var s=d(m);b(a||"",c,function(b,a){n(m,b,a,e).forEach(function(b){delete v[s][b.i];m.removeEventListener(b.e,b.proxy,!1)})})}function D(m){var b=l.extend({originalEvent:m},m);l.each(M,function(a,d){b[a]=function(){this[d]=N;if("stopImmediatePropagation"==
a||"stopPropagation"==a)if(m.cancelBubble=!0,!m[a])return;return m[a].apply(m,arguments)};b[d]=O});return b}function y(b,a){if(a&&b.dispatchEvent){var c=l.Event("destroy",{bubbles:!1});b.dispatchEvent(c)}if((c=d(b))&&v[c]){for(var e in v[c])b.removeEventListener(v[c][e].e,v[c][e].proxy,!1);delete v[c]}}function C(b,a){if(b){var d=b.childNodes;if(d&&0<d.length)for(var c in d)C(d[c],a);y(b,a)}}var r,t=c.document,z=[],H=z.slice,E={},P=1,Q=/^\s*<(\w+)[^>]*>/,w={},A={},x=function(b,a){this.length=0;if(b){if(b instanceof
x&&a==r)return b;if(l.isFunction(b))return l(t).ready(b);if(l.isArray(b)&&b.length!=r){for(var d=0;d<b.length;d++)this[this.length++]=b[d];return this}if(l.isObject(b)&&l.isObject(a)){if(b.length==r)b.parentNode==a&&(this[this.length++]=b);else for(d=0;d<b.length;d++)b[d].parentNode==a&&(this[this.length++]=b[d]);return this}if(l.isObject(b)&&a==r)return this[this.length++]=b,this;if(a!==r){if(a instanceof x)return a.find(b)}else a=t}else return this;return this.selector(b,a)},l=function(b,a){return new x(b,
a)};l.is$=function(b){return b instanceof x};l.map=function(b,a){var d,c=[],e;if(l.isArray(b))for(e=0;e<b.length;e++)d=a(b[e],e),d!==r&&c.push(d);else if(l.isObject(b))for(e in b)b.hasOwnProperty(e)&&(d=a(b[e],e),d!==r&&c.push(d));return l([c])};l.each=function(b,a){var d;if(l.isArray(b))for(d=0;d<b.length&&!1!==a(d,b[d]);d++);else if(l.isObject(b))for(d in b)if(b.hasOwnProperty(d)&&!1===a(d,b[d]))break;return b};l.extend=function(b){b==r&&(b=this);if(1===arguments.length){for(var a in b)this[a]=
b[a];return this}H.call(arguments,1).forEach(function(a){for(var d in a)b[d]=a[d]});return b};l.isArray=function(b){return b instanceof Array&&b.push!=r};l.isFunction=function(b){return"function"===typeof b&&!(b instanceof RegExp)};l.isObject=function(b){return"object"===typeof b};l.fn=x.prototype={constructor:x,forEach:z.forEach,reduce:z.reduce,push:z.push,indexOf:z.indexOf,concat:z.concat,selector:function(b,a){b=b.trim();if("#"===b[0]&&-1==b.indexOf(".")&&-1===b.indexOf(" ")&&-1===b.indexOf(">"))a==
t?p(a.getElementById(b.replace("#","")),this):p(q(b,a),this);else if("<"===b[0]&&">"===b[b.length-1]){var d=t.createElement("div");d.innerHTML=b.trim();p(d.childNodes,this)}else p(q(b,a),this);return this},oldElement:r,slice:z.slice,setupOld:function(b){if(b==r)return l();b.oldElement=this;return b},map:function(b){var a,d=[],c;for(c=0;c<this.length;c++)a=b(c,this[c]),a!==r&&d.push(a);return l([d])},each:function(b){this.forEach(function(a,d){b.call(a,d,a)});return this},ready:function(b){"complete"===
t.readyState||"loaded"===t.readyState||!l.os.ie&&"interactive"===t.readyState?b():t.addEventListener("DOMContentLoaded",b,!1);return this},find:function(b){if(0===this.length)return this;for(var a=[],d,c=0;c<this.length;c++){d=l(b,this[c]);for(var e=0;e<d.length;e++)a.push(d[e])}return l(f(a))},html:function(b,a){if(0===this.length)return this;if(b===r)return this[0].innerHTML;for(var d=0;d<this.length;d++)!1!==a&&l.cleanUpContent(this[d],!1,!0),this[d].innerHTML=b;return this},text:function(b){if(0===
this.length)return this;if(b===r)return this[0].textContent;for(var a=0;a<this.length;a++)this[a].textContent=b;return this},css:function(b,a,d){d=d!=r?d:this[0];if(0===this.length)return this;if(a==r&&"string"===typeof b)return c.getComputedStyle(d),d.style[b]?d.style[b]:c.getComputedStyle(d)[b];for(d=0;d<this.length;d++)if(l.isObject(b))for(var e in b)this[d].style[e]=b[e];else this[d].style[b]=a;return this},vendorCss:function(b,a,d){return this.css(l.feat.cssPrefix+b,a,d)},empty:function(){for(var b=
0;b<this.length;b++)l.cleanUpContent(this[b],!1,!0),this[b].innerHTML="";return this},hide:function(){if(0===this.length)return this;for(var b=0;b<this.length;b++)"none"!=this.css("display",null,this[b])&&(this[b].setAttribute("jqmOldStyle",this.css("display",null,this[b])),this[b].style.display="none");return this},show:function(){if(0===this.length)return this;for(var b=0;b<this.length;b++)"none"==this.css("display",null,this[b])&&(this[b].style.display=this[b].getAttribute("jqmOldStyle")?this[b].getAttribute("jqmOldStyle"):
"block",this[b].removeAttribute("jqmOldStyle"));return this},toggle:function(b){for(var a=!0===b?!0:!1,d=0;d<this.length;d++)"none"!==c.getComputedStyle(this[d]).display||b!==r&&!1===a?(this[d].setAttribute("jqmOldStyle",this[d].style.display),this[d].style.display="none"):(this[d].style.display=this[d].getAttribute("jqmOldStyle")!=r?this[d].getAttribute("jqmOldStyle"):"block",this[d].removeAttribute("jqmOldStyle"));return this},val:function(b){if(0===this.length)return b===r?r:this;if(b==r)return this[0].value;
for(var a=0;a<this.length;a++)this[a].value=b;return this},attr:function(b,a){if(0===this.length)return a===r?r:this;if(a===r&&!l.isObject(b))return this[0].jqmCacheId&&w[this[0].jqmCacheId][b]?this[0].jqmCacheId&&w[this[0].jqmCacheId][b]:this[0].getAttribute(b);for(var d=0;d<this.length;d++)if(l.isObject(b))for(var c in b)l(this[d]).attr(c,b[c]);else l.isArray(a)||l.isObject(a)||l.isFunction(a)?(this[d].jqmCacheId||(this[d].jqmCacheId=l.uuid()),w[this[d].jqmCacheId]||(w[this[d].jqmCacheId]={}),w[this[d].jqmCacheId][b]=
a):null==a&&a!==r?(this[d].removeAttribute(b),this[d].jqmCacheId&&w[this[d].jqmCacheId][b]&&delete w[this[d].jqmCacheId][b]):this[d].setAttribute(b,a);return this},removeAttr:function(b){for(var a=this,d=0;d<this.length;d++)b.split(/\s+/g).forEach(function(c){a[d].removeAttribute(c);a[d].jqmCacheId&&w[a[d].jqmCacheId][b]&&delete w[a[d].jqmCacheId][b]});return this},prop:function(b,a){if(0===this.length)return a===r?r:this;if(a===r&&!l.isObject(b)){var d;return this[0].jqmCacheId&&A[this[0].jqmCacheId][b]?
this[0].jqmCacheId&&A[this[0].jqmCacheId][b]:!(d=this[0][b])&&b in this[0]?this[0][b]:d}for(d=0;d<this.length;d++)if(l.isObject(b))for(var c in b)l(this[d]).prop(c,b[c]);else l.isArray(a)||l.isObject(a)||l.isFunction(a)?(this[d].jqmCacheId||(this[d].jqmCacheId=l.uuid()),A[this[d].jqmCacheId]||(A[this[d].jqmCacheId]={}),A[this[d].jqmCacheId][b]=a):null==a&&a!==r?l(this[d]).removeProp(b):this[d][b]=a;return this},removeProp:function(b){for(var a=this,d=0;d<this.length;d++)b.split(/\s+/g).forEach(function(c){a[d][c]&&
delete a[d][c];a[d].jqmCacheId&&A[a[d].jqmCacheId][b]&&delete A[a[d].jqmCacheId][b]});return this},remove:function(b){b=l(this).filter(b);if(b==r)return this;for(var a=0;a<b.length;a++)l.cleanUpContent(b[a],!0,!0),b[a].parentNode.removeChild(b[a]);return this},addClass:function(b){for(var a=0;a<this.length;a++){var d=this[a].className,c=[],e=this;b.split(/\s+/g).forEach(function(b){e.hasClass(b,e[a])||c.push(b)});this[a].className+=(d?" ":"")+c.join(" ");this[a].className=this[a].className.trim()}return this},
removeClass:function(b){for(var a=0;a<this.length;a++){if(b==r){this[a].className="";break}var d=this[a].className;b.split(/\s+/g).forEach(function(b){d=d.replace(k(b)," ")});this[a].className=0<d.length?d.trim():""}return this},replaceClass:function(b,a){for(var d=0;d<this.length;d++)if(b==r)this[d].className=a;else{var c=this[d].className;b.split(/\s+/g).concat(a.split(/\s+/g)).forEach(function(b){c=c.replace(k(b)," ")});c=c.trim();this[d].className=0<c.length?(c+" "+a).trim():a}return this},hasClass:function(b,
a){if(0===this.length)return!1;a||(a=this[0]);return k(b).test(a.className)},append:function(b,a){if(b&&b.length!=r&&0===b.length)return this;if(l.isArray(b)||l.isObject(b))b=l(b);var d;for(d=0;d<this.length;d++)if(b.length&&"string"!=typeof b)b=l(b),g(b,this[d],a);else{var e=Q.test(b)?l(b):r;if(e==r||0==e.length)e=t.createTextNode(b);e.nodeName!=r&&"script"==e.nodeName.toLowerCase()&&(!e.type||"text/javascript"===e.type.toLowerCase())?c.eval(e.innerHTML):e instanceof x?g(e,this[d],a):a!=r?this[d].insertBefore(e,
this[d].firstChild):this[d].appendChild(e)}return this},appendTo:function(b,a){l(b).append(this);return this},prependTo:function(b){l(b).append(this,!0);return this},prepend:function(b){return this.append(b,1)},insertBefore:function(b,a){if(0==this.length)return this;b=l(b).get(0);if(!b)return this;for(var d=0;d<this.length;d++)a?b.parentNode.insertBefore(this[d],b.nextSibling):b.parentNode.insertBefore(this[d],b);return this},insertAfter:function(b){this.insertBefore(b,!0)},get:function(b){b=b==
r?0:b;0>b&&(b+=this.length);return this[b]?this[b]:r},offset:function(){if(0===this.length)return this;if(this[0]==c)return{left:0,top:0,right:0,bottom:0,width:c.innerWidth,height:c.innerHeight};var b=this[0].getBoundingClientRect();return{left:b.left+c.pageXOffset,top:b.top+c.pageYOffset,right:b.right+c.pageXOffset,bottom:b.bottom+c.pageYOffset,width:b.right-b.left,height:b.bottom-b.top}},height:function(b){return 0===this.length?this:b!=r?this.css("height",b):this[0]==this[0].window?c.innerHeight:
this[0].nodeType==this[0].DOCUMENT_NODE?this[0].documentElement.offsetheight:(b=this.css("height").replace("px",""))?b:this.offset().height},width:function(b){return 0===this.length?this:b!=r?this.css("width",b):this[0]==this[0].window?c.innerWidth:this[0].nodeType==this[0].DOCUMENT_NODE?this[0].documentElement.offsetwidth:(b=this.css("width").replace("px",""))?b:this.offset().width},parent:function(b,a){if(0==this.length)return this;for(var d=[],c=0;c<this.length;c++)for(var e=this[c];e.parentNode&&
e.parentNode!=t&&!(d.push(e.parentNode),e.parentNode&&(e=e.parentNode),!a););return this.setupOld(l(f(d)).filter(b))},parents:function(b){return this.parent(b,!0)},children:function(b){if(0==this.length)return this;for(var a=[],d=0;d<this.length;d++)a=a.concat(h(this[d].firstChild));return this.setupOld(l(a).filter(b))},siblings:function(b){if(0==this.length)return this;for(var a=[],d=0;d<this.length;d++)this[d].parentNode&&(a=a.concat(h(this[d].parentNode.firstChild,this[d])));return this.setupOld(l(a).filter(b))},
closest:function(b,a){if(0==this.length)return this;var d=this[0],c=l(b,a);if(0==c.length)return l();for(;d&&-1==c.indexOf(d);)d=d!==a&&d!==t&&d.parentNode;return l(d)},filter:function(b){if(0==this.length||b==r)return this;for(var a=[],d=0;d<this.length;d++){var c=this[d];c.parentNode&&0<=l(b,c.parentNode).indexOf(c)&&a.push(c)}return this.setupOld(l(f(a)))},not:function(b){if(0==this.length)return this;for(var a=[],d=0;d<this.length;d++){var c=this[d];c.parentNode&&-1==l(b,c.parentNode).indexOf(c)&&
a.push(c)}return this.setupOld(l(f(a)))},data:function(b,a){return this.attr("data-"+b,a)},end:function(){return this.oldElement!=r?this.oldElement:l()},clone:function(b){b=!1===b?!1:!0;if(0==this.length)return this;for(var a=[],d=0;d<this.length;d++)a.push(this[d].cloneNode(b));return l(a)},size:function(){return this.length},serialize:function(){if(0==this.length)return"";for(var b=[],a=0;a<this.length;a++)this.slice.call(this[a].elements).forEach(function(a){var d=a.getAttribute("type");if("fieldset"!=
a.nodeName.toLowerCase()&&(!a.disabled&&"submit"!=d&&"reset"!=d&&"button"!=d&&("radio"!=d&&"checkbox"!=d||a.checked))&&a.getAttribute("name"))if("select-multiple"==a.type)for(d=0;d<a.options.length;d++)a.options[d].selected&&b.push(a.getAttribute("name")+"="+encodeURIComponent(a.options[d].value));else b.push(a.getAttribute("name")+"="+encodeURIComponent(a.value))});return b.join("&")},eq:function(b){return l(this.get(b))},index:function(b){return b?this.indexOf(l(b)[0]):this.parent().children().indexOf(this[0])},
is:function(b){return!!b&&0<this.filter(b).length}};l.ajaxSettings={type:"GET",beforeSend:a,success:a,error:a,complete:a,context:r,timeout:0,crossDomain:null};l.jsonP=function(b){var a="jsonp_callback"+ ++P,d="",e=t.createElement("script");c[a]=function(s){clearTimeout(d);l(e).remove();delete c[a];b.success.call(void 0,s)};e.src=b.url.replace(/=\?/,"="+a);b.error&&(e.onerror=function(){clearTimeout(d);b.error.call(void 0,"","error")});l("head").append(e);0<b.timeout&&(d=setTimeout(function(){b.error.call(void 0,
"","timeout")},b.timeout));return{}};l.ajax=function(b){var d;try{var e=b||{},s;for(s in l.ajaxSettings)"undefined"==typeof e[s]&&(e[s]=l.ajaxSettings[s]);e.url||(e.url=c.location);e.contentType||(e.contentType="application/x-www-form-urlencoded");e.headers||(e.headers={});if(!("async"in e)||!1!==e.async)e.async=!0;if(e.dataType)switch(e.dataType){case "script":e.dataType="text/javascript, application/javascript";break;case "json":e.dataType="application/json";break;case "xml":e.dataType="application/xml, text/xml";
break;case "html":e.dataType="text/html";break;case "text":e.dataType="text/plain";break;default:e.dataType="text/html";break;case "jsonp":return l.jsonP(b)}else e.dataType="text/html";l.isObject(e.data)&&(e.data=l.param(e.data));"get"===e.type.toLowerCase()&&e.data&&(-1===e.url.indexOf("?")?e.url+="?"+e.data:e.url+="&"+e.data);if(/=\?/.test(e.url))return l.jsonP(e);null===e.crossDomain&&(e.crossDomain=/^([\w-]+:)?\/\/([^\/]+)/.test(e.url)&&RegExp.$2!=c.location.host);e.crossDomain||(e.headers=l.extend({"X-Requested-With":"XMLHttpRequest"},
e.headers));var n,f=e.context,h=/^([\w-]+:)\/\//.test(e.url)?RegExp.$1:c.location.protocol;d=new c.XMLHttpRequest;d.onreadystatechange=function(){var b=e.dataType;if(4===d.readyState){clearTimeout(n);var a,c=!1;if(200<=d.status&&300>d.status||0===d.status&&"file:"==h){if("application/json"===b&&!/^\s*$/.test(d.responseText))try{a=JSON.parse(d.responseText)}catch(s){c=s}else"application/xml, text/xml"===b?a=d.responseXML:"text/html"==b?(a=d.responseText,l.parseJS(a)):a=d.responseText;0===d.status&&
0===a.length&&(c=!0);c?e.error.call(f,d,"parsererror",c):e.success.call(f,a,"success",d)}else c=!0,e.error.call(f,d,"error");e.complete.call(f,d,c?"error":"success")}};d.open(e.type,e.url,e.async);e.withCredentials&&(d.withCredentials=!0);e.contentType&&(e.headers["Content-Type"]=e.contentType);for(var g in e.headers)d.setRequestHeader(g,e.headers[g]);if(!1===e.beforeSend.call(f,d,e))return d.abort(),!1;0<e.timeout&&(n=setTimeout(function(){d.onreadystatechange=a;d.abort();e.error.call(f,d,"timeout")},
e.timeout));d.send(e.data)}catch(k){console.log(k),e.error.call(f,d,"error",k)}return d};l.get=function(b,a){return this.ajax({url:b,success:a})};l.post=function(b,a,d,c){"function"===typeof a&&(d=a,a={});c===r&&(c="html");return this.ajax({url:b,type:"POST",data:a,dataType:c,success:d})};l.getJSON=function(b,a,d){"function"===typeof a&&(d=a,a={});return this.ajax({url:b,data:a,success:d,dataType:"json"})};l.param=function(b,a){var d=[];if(b instanceof x)b.each(function(){d.push((a?a+"[]":this.id)+
"="+encodeURIComponent(this.value))});else for(var c in b){var e=a?a+"["+c+"]":c,s=b[c];d.push(l.isObject(s)?l.param(s,e):e+"="+encodeURIComponent(s))}return d.join("&")};l.parseJSON=function(b){return JSON.parse(b)};l.parseXML=function(b){return(new DOMParser).parseFromString(b,"text/xml")};e(l,navigator.userAgent);l.__detectUA=e;"function"!==typeof String.prototype.trim&&(String.prototype.trim=function(){this.replace(/(\r\n|\n|\r)/gm,"").replace(/^\s+|\s+$/,"");return this});l.uuid=function(){var b=
function(){return(65536*(1+Math.random())|0).toString(16).substring(1)};return b()+b()+"-"+b()+"-"+b()+"-"+b()+"-"+b()+b()+b()};l.getCssMatrix=function(b){if(b==r)return c.WebKitCSSMatrix||c.MSCSSMatrix||{a:0,b:0,c:0,d:0,e:0,f:0};try{if(c.WebKitCSSMatrix)return new WebKitCSSMatrix(c.getComputedStyle(b).webkitTransform);if(c.MSCSSMatrix)return new MSCSSMatrix(c.getComputedStyle(b).transform);var a=c.getComputedStyle(b)[l.feat.cssPrefix+"Transform"].replace(/[^0-9\-.,]/g,"").split(",");return{a:+a[0],
b:+a[1],c:+a[2],d:+a[3],e:+a[4],f:+a[5]}}catch(d){return{a:0,b:0,c:0,d:0,e:0,f:0}}};var v={},L=1;l.event={add:s,remove:B};l.fn.bind=function(b,a){for(var d=0;d<this.length;d++)s(this[d],b,a);return this};l.fn.unbind=function(b,a){for(var d=0;d<this.length;d++)B(this[d],b,a);return this};l.fn.one=function(b,a){return this.each(function(d,c){s(this,b,a,null,function(b,a){return function(){var d=b.apply(c,arguments);B(c,a,b);return d}})})};var N=function(){return!0},O=function(){return!1},M={preventDefault:"isDefaultPrevented",
stopImmediatePropagation:"isImmediatePropagationStopped",stopPropagation:"isPropagationStopped"};l.fn.delegate=function(b,a,d){for(var c=0;c<this.length;c++){var e=this[c];s(e,a,d,b,function(a){return function(d){var c,s=l(d.target).closest(b,e).get(0);if(s)return c=l.extend(D(d),{currentTarget:s,liveFired:e}),a.apply(s,[c].concat([].slice.call(arguments,1)))}})}return this};l.fn.undelegate=function(b,a,d){for(var c=0;c<this.length;c++)B(this[c],a,d,b);return this};l.fn.on=function(b,a,d){return a===
r||l.isFunction(a)?this.bind(b,a):this.delegate(a,b,d)};l.fn.off=function(b,a,d){return a===r||l.isFunction(a)?this.unbind(b,a):this.undelegate(a,b,d)};l.fn.trigger=function(b,a,d){"string"==typeof b&&(b=l.Event(b,d));b.data=a;for(a=0;a<this.length;a++)this[a].dispatchEvent(b);return this};l.Event=function(b,a){var d=t.createEvent("Events"),c=!0;if(a)for(var e in a)"bubbles"==e?c=!!a[e]:d[e]=a[e];d.initEvent(b,c,!0,null,null,null,null,null,null,null,null,null,null,null,null);return d};l.bind=function(b,
a,d){b.__events||(b.__events={});l.isArray(a)||(a=[a]);for(var c=0;c<a.length;c++)b.__events[a[c]]||(b.__events[a[c]]=[]),b.__events[a[c]].push(d)};l.trigger=function(b,a,d){var c=!0;if(!b.__events)return c;l.isArray(a)||(a=[a]);l.isArray(d)||(d=[d]);for(var e=0;e<a.length;e++)if(b.__events[a[e]])for(var s=b.__events[a[e]],n=0;n<s.length;n++)l.isFunction(s[n])&&!1===s[n].apply(b,d)&&(c=!1);return c};l.unbind=function(b,a,d){if(b.__events){l.isArray(a)||(a=[a]);for(var c=0;c<a.length;c++)if(b.__events[a[c]])for(var e=
b.__events[a[c]],s=0;s<e.length;s++)if(d==r&&delete e[s],e[s]==d){e.splice(s,1);break}}};l.proxy=function(b,a,d){return function(){return d?b.apply(a,d):b.apply(a,arguments)}};var R=function(b,a){for(var d=0;d<b.length;d++)C(b[d],a)};l.cleanUpContent=function(b,a,d){if(b){var c=b.childNodes;c&&0<c.length&&l.asap(R,{},[H.apply(c,[0]),d]);a&&y(b,d)}};var F=[],I=[],J=[];l.asap=function(b,a,d){if(!l.isFunction(b))throw"$.asap - argument is not a valid function";F.push(b);I.push(a?a:{});J.push(d?d:[]);
c.postMessage("jqm-asap","*")};c.addEventListener("message",function(b){b.source==c&&"jqm-asap"==b.data&&(b.stopPropagation(),0<F.length&&F.shift().apply(I.shift(),J.shift()))},!0);var K={};l.parseJS=function(b){if(b){if("string"==typeof b){var a=t.createElement("div");a.innerHTML=b;b=a}b=b.getElementsByTagName("script");for(a=0;a<b.length;a++)if(0<b[a].src.length&&!K[b[a].src]){var d=t.createElement("script");d.type=b[a].type;d.src=b[a].src;t.getElementsByTagName("head")[0].appendChild(d);K[b[a].src]=
1}else c.eval(b[a].innerHTML)}};"click keydown keyup keypress submit load resize change select error".split(" ").forEach(function(b){l.fn[b]=function(a){return a?this.bind(b,a):this.trigger(b)}});return l}(window);"$"in window||(window.$=jq);window.numOnly||(window.numOnly=function(c){if(void 0===c||""===c)return 0;if(isNaN(parseFloat(c)))if(c.replace)c=c.replace(/[^0-9.-]/,"");else return 0;return parseFloat(c)})};/*
 Indiepath 2011 - Tim Fisher
 Modifications/enhancements by appMobi for jqMobi

 2011 Intel
 @author AppMobi
*/
(function(c){var g=[],k=function(a,e){var d,n;d="string"==typeof a||a instanceof String?document.getElementById(a):c.is$(a)?a[0]:a;d.jqmCSS3AnimateId||(d.jqmCSS3AnimateId=c.uuid());n=d.jqmCSS3AnimateId;g[n]?(g[n].animate(e),d=g[n]):(d=p(d,e),g[n]=d);return d};c.fn.css3Animate=function(a){!a.complete&&a.callback&&(a.complete=a.callback);var c=k(this[0],a);a.complete=null;a.sucess=null;a.failure=null;for(var d=1;d<this.length;d++)c.link(this[d],a);return c};c.css3AnimateQueue=function(){return new p.queue};
var f=c.feat.cssTransformStart,h=c.feat.cssTransformEnd,q=c.feat.cssPrefix.replace(/-/g,"")+"TransitionEnd",q=c.os.fennec||""==c.feat.cssPrefix||c.os.ie?"transitionend":q,q=q.replace(q.charAt(0),q.charAt(0).toLowerCase()),p=function(){var a=function(e,d){if(!(this instanceof a))return new a(e,d);this.callbacksStack=[];this.activeEvent=null;this.countStack=0;this.isActive=!1;this.el=e;this.linkFinishedProxy_=c.proxy(this.linkFinished,this);if(this.el){this.animate(d);var n=this;jq(this.el).bind("destroy",
function(){var a=n.el.jqmCSS3AnimateId;n.callbacksStack=[];g[a]&&delete g[a]})}};a.prototype={animate:function(a){this.isActive&&this.cancel();this.isActive=!0;if(a){var d=!!a.addClass;if(d)a.removeClass?jq(this.el).replaceClass(a.removeClass,a.addClass):jq(this.el).addClass(a.addClass);else{var n=numOnly(a.time);0==n&&(a.time=0);a.y||(a.y=0);a.x||(a.x=0);if(a.previous){var g=new c.getCssMatrix(this.el);a.y+=numOnly(g.f);a.x+=numOnly(g.e)}a.origin||(a.origin="0% 0%");a.scale||(a.scale="1");a.rotateY||
(a.rotateY="0");a.rotateX||(a.rotateX="0");a.skewY||(a.skewY="0");a.skewX||(a.skewX="0");a.timingFunction||(a.timingFunction="linear");if("number"==typeof a.x||-1==a.x.indexOf("%")&&-1==a.x.toLowerCase().indexOf("px")&&-1==a.x.toLowerCase().indexOf("deg"))a.x=parseInt(a.x)+"px";if("number"==typeof a.y||-1==a.y.indexOf("%")&&-1==a.y.toLowerCase().indexOf("px")&&-1==a.y.toLowerCase().indexOf("deg"))a.y=parseInt(a.y)+"px";g="translate"+f+a.x+","+a.y+h+" scale("+parseFloat(a.scale)+") rotate("+a.rotateX+
")";c.os.opera||(g+=" rotateY("+a.rotateY+")");g+=" skew("+a.skewX+","+a.skewY+")";this.el.style[c.feat.cssPrefix+"Transform"]=g;this.el.style[c.feat.cssPrefix+"BackfaceVisibility"]="hidden";void 0!==a.opacity&&(this.el.style.opacity=a.opacity);a.width&&(this.el.style.width=a.width);a.height&&(this.el.style.height=a.height);this.el.style[c.feat.cssPrefix+"TransitionProperty"]="all";if(-1===(""+a.time).indexOf("s"))var g="ms",b=a.time+g;else-1!==a.time.indexOf("ms")?(g="ms",b=a.time):(g="s",b=a.time+
g);this.el.style[c.feat.cssPrefix+"TransitionDuration"]=b;this.el.style[c.feat.cssPrefix+"TransitionTimingFunction"]=a.timingFunction;this.el.style[c.feat.cssPrefix+"TransformOrigin"]=a.origin}this.callbacksStack.push({complete:a.complete,success:a.success,failure:a.failure});this.countStack++;var s=this,b=window.getComputedStyle(this.el);d&&(d=b[c.feat.cssPrefix+"TransitionDuration"],n=numOnly(d),a.time=n,-1!==d.indexOf("ms")?g="ms":(a.time*=1E3,g="s"));0==n||"ms"==g&&5>n||"none"==b.display?c.asap(c.proxy(this.finishAnimation,
this,[!1])):(s=this,this.activeEvent=function(b){clearTimeout(s.timeout);s.finishAnimation(b);s.el.removeEventListener(q,s.activeEvent,!1)},s.timeout=setTimeout(this.activeEvent,numOnly(a.time)+50),this.el.addEventListener(q,this.activeEvent,!1))}else alert("Please provide configuration options for animation of "+this.el.id)},addCallbackHook:function(a){a&&this.callbacksStack.push(a);this.countStack++;return this.linkFinishedProxy_},linkFinished:function(a){a?this.cancel():this.finishAnimation()},
finishAnimation:function(a){a&&a.preventDefault();this.isActive&&(this.countStack--,0==this.countStack&&this.fireCallbacks(!1))},fireCallbacks:function(a){this.clearEvents();var d=this.callbacksStack;this.cleanup();for(var c=0;c<d.length;c++){var f=d[c].complete,b=d[c].success,s=d[c].failure;f&&"function"==typeof f&&f(a);a&&s&&"function"==typeof s?s():b&&"function"==typeof b&&b()}},cancel:function(){this.isActive&&this.fireCallbacks(!0)},cleanup:function(){this.callbacksStack=[];this.isActive=!1;
this.countStack=0},clearEvents:function(){this.activeEvent&&this.el.removeEventListener(q,this.activeEvent,!1);this.activeEvent=null},link:function(a,d){var c={complete:d.complete,success:d.success,failure:d.failure};d.complete=this.addCallbackHook(c);d.success=null;d.failure=null;k(a,d);d.complete=c.complete;d.success=c.success;d.failure=c.failure;return this}};return a}();p.queue=function(){return{elements:[],push:function(a){this.elements.push(a)},pop:function(){return this.elements.pop()},run:function(){var a=
this;if(0!=this.elements.length&&("function"==typeof this.elements[0]&&this.shift()(),0!=this.elements.length)){var c=this.shift();0<this.elements.length&&(c.complete=function(d){d||a.run()});p(document.getElementById(c.id),c)}},shift:function(){return this.elements.shift()}}}})(jq);
(function(c){function g(c){return!f[c].el?(delete f[c],!1):!0}function k(){if(jq.os.android&&!jq.os.chrome&&jq.os.webkit){var k=!1;c.bind(c.touchLayer,"pre-enter-edit",function(a){if(!k)for(el in k=!0,f)g(el)&&f[el].needsFormsFix(a)&&f[el].startFormsMode()});c.bind(c.touchLayer,["cancel-enter-edit","exit-edit"],function(a){if(k)for(el in k=!1,f)g(el)&&f[el].androidFormsMode&&f[el].stopFormsMode()})}h=!0}var f=[];c.fn.scroller=function(g){for(var a,e,d=0;d<this.length;d++)a=this[d],a.jqmScrollerId||
(a.jqmScrollerId=c.uuid()),e=a.jqmScrollerId,f[e]?a=f[e]:(g||(g={}),c.feat.nativeTouchScroll||(g.useJsScroll=!0),a=q(this[d],g),f[e]=a);return 1==this.length?a:this};var h=!1,q=function(){function g(b,a){var d=document.createElement("div");d.style.position="absolute";d.style.width=b+"px";d.style.height=a+"px";d.style[c.feat.cssPrefix+"BorderRadius"]="2px";d.style.borderRadius="2px";d.style.opacity=0;d.className="scrollBar";d.style.background="black";return d}var a=c.feat.cssTransformStart,e=c.feat.cssTransformEnd,
d,n,u=function(b,a){this.el=b;this.jqEl=c(this.el);for(j in a)this[j]=a[j]};u.prototype={refresh:!1,refreshContent:"Pull to Refresh",refreshHangTimeout:2E3,refreshHeight:60,refreshElement:null,refreshCancelCB:null,refreshRunning:!1,scrollTop:0,scrollLeft:0,preventHideRefresh:!0,verticalScroll:!0,horizontalScroll:!1,refreshTriggered:!1,moved:!1,eventsActive:!1,rememberEventsActive:!1,scrollingLocked:!1,autoEnable:!0,blockFormsFix:!1,loggedPcentY:0,loggedPcentX:0,infinite:!1,infiniteEndCheck:!1,infiniteTriggered:!1,
scrollSkip:!1,scrollTopInterval:null,scrollLeftInterval:null,_scrollTo:function(b,a){a=parseInt(a);if(0==a||isNaN(a))this.el.scrollTop=Math.abs(b.y),this.el.scrollLeft=Math.abs(b.x);else{var d=(this.el.scrollTop-b.y)/Math.ceil(a/10),c=(this.el.scrollLeft-b.x)/Math.ceil(a/10),e=this,n=Math.ceil(this.el.scrollTop-b.y)/d,f=Math.ceil(this.el.scrollLeft-b.x)/d,g=yRun=0;e.scrollTopInterval=window.setInterval(function(){e.el.scrollTop-=d;yRun++;yRun>=n&&(e.el.scrollTop=b.y,clearInterval(e.scrollTopInterval))},
10);e.scrollLeftInterval=window.setInterval(function(){e.el.scrollLeft-=c;g++;g>=f&&(e.el.scrollLeft=b.x,clearInterval(e.scrollLeftInterval))},10)}},enable:function(){},disable:function(){},hideScrollbars:function(){},addPullToRefresh:function(){},_scrollToTop:function(b){this._scrollTo({x:0,y:0},b)},_scrollToBottom:function(b){this._scrollTo({x:0,y:this.el.scrollHeight-this.el.offsetHeight},b)},scrollToBottom:function(b){return this._scrollToBottom(b)},scrollToTop:function(b){return this._scrollToTop(b)},
init:function(b,a){this.el=b;this.jqEl=c(this.el);this.defaultProperties();for(j in a)this[j]=a[j];var d=this,e=function(){d.eventsActive&&d.adjustScroll()};this.jqEl.bind("destroy",function(){d.disable(!0);var b=d.el.jqmScrollerId;f[b]&&delete f[b];c.unbind(c.touchLayer,"orientationchange-reshape",e)});c.bind(c.touchLayer,"orientationchange-reshape",e)},needsFormsFix:function(b){return this.useJsScroll&&this.isEnabled()&&"none"!=this.el.style.display&&0<c(b).closest(this.jqEl).size()},handleEvent:function(b){if(!this.scrollingLocked)switch(b.type){case "touchstart":clearInterval(this.scrollTopInterval);
this.preventHideRefresh=!this.refreshRunning;this.moved=!1;this.onTouchStart(b);break;case "touchmove":this.onTouchMove(b);break;case "touchend":this.onTouchEnd(b);break;case "scroll":this.onScroll(b)}},coreAddPullToRefresh:function(b){b&&(this.refreshElement=b);null==this.refreshElement?(b=document.getElementById(this.container.id+"_pulldown"),b=null!=b?jq(b):jq("<div id='"+this.container.id+"_pulldown' class='jqscroll_refresh' style='border-radius:.6em;border: 1px solid #2A2A2A;background-image: -webkit-gradient(linear,left top,left bottom,color-stop(0,#666666),color-stop(1,#222222));background:#222222;margin:0px;height:60px;position:relative;text-align:center;line-height:60px;color:white;width:100%;'>"+
this.refreshContent+"</div>")):b=jq(this.refreshElement);b=b.get();this.refreshContainer=jq('<div style="overflow:hidden;width:100%;height:0;margin:0;padding:0;padding-left:5px;padding-right:5px;display:none;"></div>');c(this.el).prepend(this.refreshContainer.append(b,"top"));this.refreshContainer=this.refreshContainer[0]},fireRefreshRelease:function(b,a){if(this.refresh&&b){var d=!1!==c.trigger(this,"refresh-release",[b]);this.preventHideRefresh=!1;this.refreshRunning=!0;if(d){var e=this;0<this.refreshHangTimeout&&
(this.refreshCancelCB=setTimeout(function(){e.hideRefresh()},this.refreshHangTimeout))}}},setRefreshContent:function(b){jq(this.container).find(".jqscroll_refresh").html(b)},lock:function(){this.scrollingLocked||(this.scrollingLocked=!0,(this.rememberEventsActive=this.eventsActive)||this.initEvents())},unlock:function(){this.scrollingLocked&&(this.scrollingLocked=!1,this.rememberEventsActive||this.removeEvents())},scrollToItem:function(b,a,d){c.is$(b)||(b=c(b));"bottom"==a?(b=b.offset(),b=b.top-this.jqEl.offset().bottom+
b.height,b+=4):(b=b.offset().top-document.body.scrollTop,a=this.jqEl.offset().top,document.body.scrollTop<a&&(b-=a),b-=4);this.scrollBy({y:b,x:0},d)},setPaddings:function(b,a){var d=c(this.el),e=numOnly(d.css("paddingTop"));d.css("paddingTop",b+"px").css("paddingBottom",a+"px");this.scrollBy({y:b-e,x:0})},divide:function(b,a){return 0!=a?b/a:0},isEnabled:function(){return this.eventsActive},addInfinite:function(){this.infinite=!0},clearInfinite:function(){this.infiniteTriggered=!1;this.scrollSkip=
!0}};d=function(b,a){this.init(b,a);this.container=this.el.parentNode;this.container.jqmScrollerId=b.jqmScrollerId;this.jqEl=c(this.container);"hidden"!=this.container.style.overflow&&(this.container.style.overflow="hidden");this.addPullToRefresh(null,!0);this.autoEnable&&this.enable(!0);if(this.verticalScroll&&!0==this.verticalScroll&&!0==this.scrollBars){var d=g(5,20);d.style.top="0px";this.vScrollCSS&&(d.className=this.vScrollCSS);d.style.opacity="0";this.container.appendChild(d);this.vscrollBar=
d}this.horizontalScroll&&(!0==this.horizontalScroll&&!0==this.scrollBars)&&(d=g(20,5),d.style.bottom="0px",this.hScrollCSS&&(d.className=this.hScrollCSS),d.style.opacity="0",this.container.appendChild(d),this.hscrollBar=d);this.horizontalScroll&&(this.el.style["float"]="left");this.el.hasScroller=!0};n=function(b,a){this.init(b,a);var d=c(b);if(!0!==a.noParent){var e=d.parent(),n=e.height(),n=n+(-1==n.indexOf("%")?"px":"");d.css("height",n);d.parent().parent().append(d);e.remove()}this.container=
this.el;d.css("-webkit-overflow-scrolling","touch")};n.prototype=new u;d.prototype=new u;n.prototype.defaultProperties=function(){this.refreshContainer=null;this.dY=this.cY=0;this.cancelPropagation=!1;this.loggedPcentX=this.loggedPcentY=0;var b=this;this.adjustScrollOverflowProxy_=function(){b.jqEl.css("overflow","auto")}};n.prototype.enable=function(b){this.eventsActive||(this.eventsActive=!0,this.el.style.overflow="auto",b||this.adjustScroll(),(this.refresh||this.infinite&&!jq.os.desktop)&&this.el.addEventListener("touchstart",
this,!1),this.el.addEventListener("scroll",this,!1))};n.prototype.disable=function(b){this.eventsActive&&(this.logPos(this.el.scrollLeft,this.el.scrollTop),b||(this.el.style.overflow="hidden"),this.el.removeEventListener("touchstart",this,!1),this.el.removeEventListener("touchmove",this,!1),this.el.removeEventListener("touchend",this,!1),this.el.removeEventListener("scroll",this,!1),this.eventsActive=!1)};n.prototype.addPullToRefresh=function(b,a){this.el.removeEventListener("touchstart",this,!1);
this.el.addEventListener("touchstart",this,!1);a||(this.refresh=!0);this.refresh&&!0==this.refresh&&(this.coreAddPullToRefresh(b),this.refreshContainer.style.position="absolute",this.refreshContainer.style.top="-60px",this.refreshContainer.style.height="60px",this.refreshContainer.style.display="block")};n.prototype.onTouchStart=function(b){0===this.el.scrollTop&&(this.el.scrollTop=1);this.el.scrollTop===this.el.scrollHeight-this.el.clientHeight&&(this.el.scrollTop-=1);this.refreshCancelCB&&clearTimeout(this.refreshCancelCB);
if(this.refresh||this.infinite)this.el.addEventListener("touchmove",this,!1),this.dY=b.touches[0].pageY,this.refresh&&0>this.dY&&this.showRefresh();c.trigger(this,"scrollstart",[this.el]);c.trigger(c.touchLayer,"scrollstart",[this.el])};n.prototype.onTouchMove=function(b){var a=b.touches[0].pageY-this.dY;this.moved||(this.el.addEventListener("touchend",this,!1),this.moved=!0);this.refresh&&0>this.el.scrollTop?this.showRefresh():this.refreshTriggered&&(this.refresh&&this.el.scrollTop>this.refreshHeight)&&
(this.refreshTriggered=!1,this.refreshCancelCB&&clearTimeout(this.refreshCancelCB),this.hideRefresh(!1),c.trigger(this,"refresh-cancel"));this.cY=a;b.stopPropagation()};n.prototype.showRefresh=function(){this.refreshTriggered||(this.refreshTriggered=!0,c.trigger(this,"refresh-trigger"))};n.prototype.onTouchEnd=function(b){b=this.el.scrollTop<=-this.refreshHeight;this.fireRefreshRelease(b,!0);b&&(this.refreshContainer.style.position="relative",this.refreshContainer.style.top="0px");this.dY=this.cY=
0;this.el.removeEventListener("touchmove",this,!1);this.el.removeEventListener("touchend",this,!1);this.infiniteEndCheck=!0;this.infinite&&(!this.infiniteTriggered&&Math.abs(this.el.scrollTop)>=this.el.scrollHeight-this.el.clientHeight)&&(this.infiniteTriggered=!0,c.trigger(this,"infinite-scroll"),this.infiniteEndCheck=!0);this.touchEndFired=!0;var a=this,d=this.el.scrollTop,e=this.el.scrollLeft,n=0;a.nativePolling=setInterval(function(){n++;if(200<=n)clearInterval(a.nativePolling);else if(a.el.scrollTop!=
d||a.el.scrollLeft!=e)clearInterval(a.nativePolling),c.trigger(c.touchLayer,"scrollend",[a.el]),c.trigger(a,"scrollend",[a.el])},20)};n.prototype.hideRefresh=function(b){if(!this.preventHideRefresh){var a=this,d=function(b){b||(a.el.style[c.feat.cssPrefix+"Transform"]="none",a.el.style[c.feat.cssPrefix+"TransitionProperty"]="none",a.el.scrollTop=0,a.logPos(a.el.scrollLeft,0));a.refreshContainer.style.top="-60px";a.refreshContainer.style.position="absolute";a.dY=a.cY=0;c.trigger(a,"refresh-finish")};
!1===b||!a.jqEl.css3Animate?d():a.jqEl.css3Animate({y:a.el.scrollTop-a.refreshHeight+"px",x:"0%",time:"75ms",complete:d});this.refreshTriggered=!1}};n.prototype.hideScrollbars=function(){};n.prototype.scrollTo=function(b,a){this.logPos(b.x,b.y);b.x*=-1;b.y*=-1;return this._scrollTo(b,a)};n.prototype.scrollBy=function(b,a){b.x+=this.el.scrollLeft;b.y+=this.el.scrollTop;this.logPos(this.el.scrollLeft,this.el.scrollTop);return this._scrollTo(b,a)};n.prototype.scrollToBottom=function(b){this._scrollToBottom(b);
this.logPos(this.el.scrollLeft,this.el.scrollTop)};n.prototype.onScroll=function(b){this.infinite&&this.touchEndFired?this.touchEndFired=!1:this.scrollSkip?this.scrollSkip=!1:(this.infinite&&(!this.infiniteTriggered&&Math.abs(this.el.scrollTop)>=this.el.scrollHeight-this.el.clientHeight)&&(this.infiniteTriggered=!0,c.trigger(this,"infinite-scroll"),this.infiniteEndCheck=!0),this.infinite&&(this.infiniteEndCheck&&this.infiniteTriggered)&&(this.infiniteEndCheck=!1,c.trigger(this,"infinite-scroll-end")))};
n.prototype.logPos=function(b,a){this.loggedPcentX=this.divide(b,this.el.scrollWidth);this.loggedPcentY=this.divide(a,this.el.scrollHeight);this.scrollLeft=b;this.scrollTop=a;isNaN(this.loggedPcentX)&&(this.loggedPcentX=0);isNaN(this.loggedPcentY)&&(this.loggedPcentY=0)};n.prototype.adjustScroll=function(){this.adjustScrollOverflowProxy_();this.el.scrollLeft=this.loggedPcentX*this.el.scrollWidth;this.el.scrollTop=this.loggedPcentY*this.el.scrollHeight;this.logPos(this.el.scrollLeft,this.el.scrollTop)};
d.prototype.defaultProperties=function(){this.boolScrollLock=!1;this.elementInfo=this.currentScrollingObject=null;this.verticalScroll=!0;this.horizontalScroll=!1;this.scrollBars=!0;this.hscrollBar=this.vscrollBar=null;this.vScrollCSS=this.hScrollCSS="scrollBar";this.firstEventInfo=null;this.moved=!1;this.preventPullToRefresh=!0;this.doScrollInterval=null;this.refreshRate=25;this.refreshSafeKeep=this.androidFormsMode=this.isScrolling=!1;this.lastScrollbar="";this.scrollingFinishCB=this.container=this.finishScrollingObject=
null;this.loggedPcentX=this.loggedPcentY=0};d.prototype.enable=function(b){this.eventsActive||(this.eventsActive=!0,b?this.scrollerMoveCSS({x:0,y:0},0):this.adjustScroll(),this.container.addEventListener("touchstart",this,!1),this.container.addEventListener("touchmove",this,!1),this.container.addEventListener("touchend",this,!1))};d.prototype.adjustScroll=function(){var b=this.getViewportSize();this.scrollerMoveCSS({x:Math.round(this.loggedPcentX*(this.el.clientWidth-b.w)),y:Math.round(this.loggedPcentY*
(this.el.clientHeight-b.h))},0)};d.prototype.disable=function(){if(this.eventsActive){var b=this.getCSSMatrix(this.el);this.logPos(numOnly(b.e)-numOnly(this.container.scrollLeft),numOnly(b.f)-numOnly(this.container.scrollTop));this.container.removeEventListener("touchstart",this,!1);this.container.removeEventListener("touchmove",this,!1);this.container.removeEventListener("touchend",this,!1);this.eventsActive=!1}};d.prototype.addPullToRefresh=function(b,a){a||(this.refresh=!0);this.refresh&&!0==this.refresh&&
(this.coreAddPullToRefresh(b),this.el.style.overflow="visible")};d.prototype.hideScrollbars=function(){this.hscrollBar&&(this.hscrollBar.style.opacity=0,this.hscrollBar.style[c.feat.cssPrefix+"TransitionDuration"]="0ms");this.vscrollBar&&(this.vscrollBar.style.opacity=0,this.vscrollBar.style[c.feat.cssPrefix+"TransitionDuration"]="0ms")};d.prototype.getViewportSize=function(){var b=window.getComputedStyle(this.container);isNaN(numOnly(b.paddingTop))&&alert(typeof b.paddingTop+"::"+b.paddingTop+":");
return{h:this.container.clientHeight>window.innerHeight?window.innerHeight:this.container.clientHeight-numOnly(b.paddingTop)-numOnly(b.paddingBottom),w:this.container.clientWidth>window.innerWidth?window.innerWidth:this.container.clientWidth-numOnly(b.paddingLeft)-numOnly(b.paddingRight)}};d.prototype.onTouchStart=function(b){this.moved=!1;this.currentScrollingObject=null;if(this.container&&(this.refreshCancelCB&&(clearTimeout(this.refreshCancelCB),this.refreshCancelCB=null),this.scrollingFinishCB&&
(clearTimeout(this.scrollingFinishCB),this.scrollingFinishCB=null),!(1!=b.touches.length||this.boolScrollLock))){if(b.touches[0].target&&void 0!=b.touches[0].target.type){var a=b.touches[0].target.tagName.toLowerCase();if("select"==a||"input"==a||"button"==a)return}a={top:0,left:0,speedY:0,speedX:0,absSpeedY:0,absSpeedX:0,deltaY:0,deltaX:0,absDeltaY:0,absDeltaX:0,y:0,x:0,duration:0};this.elementInfo={};var d=this.getViewportSize();this.elementInfo.bottomMargin=d.h;this.elementInfo.maxTop=this.el.clientHeight-
this.elementInfo.bottomMargin;0>this.elementInfo.maxTop&&(this.elementInfo.maxTop=0);this.elementInfo.divHeight=this.el.clientHeight;this.elementInfo.rightMargin=d.w;this.elementInfo.maxLeft=this.el.clientWidth-this.elementInfo.rightMargin;0>this.elementInfo.maxLeft&&(this.elementInfo.maxLeft=0);this.elementInfo.divWidth=this.el.clientWidth;this.elementInfo.hasVertScroll=this.verticalScroll||0<this.elementInfo.maxTop;this.elementInfo.hasHorScroll=0<this.elementInfo.maxLeft;this.elementInfo.requiresVScrollBar=
this.vscrollBar&&this.elementInfo.hasVertScroll;this.elementInfo.requiresHScrollBar=this.hscrollBar&&this.elementInfo.hasHorScroll;this.saveEventInfo(b);this.saveFirstEventInfo(b);b=this.getCSSMatrix(this.el);a.top=numOnly(b.f)-numOnly(this.container.scrollTop);a.left=numOnly(b.e)-numOnly(this.container.scrollLeft);this.container.scrollTop=this.container.scrollLeft=0;this.currentScrollingObject=this.el;this.refresh&&0==a.top?(this.refreshContainer.style.display="block",this.refreshHeight=this.refreshContainer.firstChild.clientHeight,
this.refreshContainer.firstChild.style.top=-this.refreshHeight+"px",this.refreshContainer.style.overflow="visible",this.preventPullToRefresh=!1):0>a.top&&(this.preventPullToRefresh=!0,this.refresh&&(this.refreshContainer.style.overflow="hidden"));a.x=a.left;a.y=a.top;this.setVScrollBar(a,0,0)&&(this.container.clientWidth>window.innerWidth?this.vscrollBar.style.left=window.innerWidth-3*numOnly(this.vscrollBar.style.width)+"px":this.vscrollBar.style.right="0px",this.vscrollBar.style[c.feat.cssPrefix+
"Transition"]="");this.setHScrollBar(a,0,0)&&(this.container.clientHeight>window.innerHeight?this.hscrollBar.style.top=window.innerHeight-numOnly(this.hscrollBar.style.height)+"px":this.hscrollBar.style.bottom=numOnly(this.hscrollBar.style.height),this.hscrollBar.style[c.feat.cssPrefix+"Transition"]="");this.lastScrollInfo=a;this.hasMoved=!0;this.scrollerMoveCSS(this.lastScrollInfo,0);c.trigger(this,"scrollstart")}};d.prototype.getCSSMatrix=function(b){if(this.androidFormsMode){var a=parseInt(b.style.marginTop);
b=parseInt(b.style.marginLeft);isNaN(a)&&(a=0);isNaN(b)&&(b=0);return{f:a,e:b}}return c.getCssMatrix(b)};d.prototype.saveEventInfo=function(b){this.lastEventInfo={pageX:b.touches[0].pageX,pageY:b.touches[0].pageY,time:b.timeStamp}};d.prototype.saveFirstEventInfo=function(b){this.firstEventInfo={pageX:b.touches[0].pageX,pageY:b.touches[0].pageY,time:b.timeStamp}};d.prototype.setVScrollBar=function(b,a,d){if(!this.elementInfo.requiresVScrollBar)return!1;var c=parseFloat(this.elementInfo.bottomMargin/
this.elementInfo.divHeight)*this.elementInfo.bottomMargin+"px";c!=this.vscrollBar.style.height&&(this.vscrollBar.style.height=c);b=this.elementInfo.bottomMargin-numOnly(this.vscrollBar.style.height)-(this.elementInfo.maxTop+b.y)/this.elementInfo.maxTop*(this.elementInfo.bottomMargin-numOnly(this.vscrollBar.style.height));b>this.elementInfo.bottomMargin&&(b=this.elementInfo.bottomMargin);0>b&&(b=0);this.scrollbarMoveCSS(this.vscrollBar,{x:0,y:b},a,d);return!0};d.prototype.setHScrollBar=function(b,
a,d){if(!this.elementInfo.requiresHScrollBar)return!1;var c=parseFloat(this.elementInfo.rightMargin/this.elementInfo.divWidth)*this.elementInfo.rightMargin+"px";c!=this.hscrollBar.style.width&&(this.hscrollBar.style.width=c);b=this.elementInfo.rightMargin-numOnly(this.hscrollBar.style.width)-(this.elementInfo.maxLeft+b.x)/this.elementInfo.maxLeft*(this.elementInfo.rightMargin-numOnly(this.hscrollBar.style.width));b>this.elementInfo.rightMargin&&(b=this.elementInfo.rightMargin);0>b&&(b=0);this.scrollbarMoveCSS(this.hscrollBar,
{x:b,y:0},a,d);return!0};d.prototype.onTouchMove=function(b){if(null!=this.currentScrollingObject){var a=this.calculateMovement(b);this.calculateTarget(a);this.lastScrollInfo=a;this.moved||(this.elementInfo.requiresVScrollBar&&(this.vscrollBar.style.opacity=1),this.elementInfo.requiresHScrollBar&&(this.hscrollBar.style.opacity=1));this.moved=!0;this.refresh&&0==a.top?(this.refreshContainer.style.display="block",this.refreshHeight=this.refreshContainer.firstChild.clientHeight,this.refreshContainer.firstChild.style.top=
-this.refreshHeight+"px",this.refreshContainer.style.overflow="visible",this.preventPullToRefresh=!1):0>a.top&&(this.preventPullToRefresh=!0,this.refresh&&(this.refreshContainer.style.overflow="hidden"));this.saveEventInfo(b);this.doScroll()}};d.prototype.doScroll=function(){if(!this.isScrolling&&this.lastScrollInfo.x!=this.lastScrollInfo.left||this.lastScrollInfo.y!=this.lastScrollInfo.top){this.isScrolling=!0;if(this.onScrollStart)this.onScrollStart();var b=this.getCSSMatrix(this.el);this.lastScrollInfo.top=
numOnly(b.f);this.lastScrollInfo.left=numOnly(b.e);this.recalculateDeltaY(this.lastScrollInfo);this.recalculateDeltaX(this.lastScrollInfo);this.checkYboundary(this.lastScrollInfo);this.elementInfo.hasHorScroll&&this.checkXboundary(this.lastScrollInfo);var b=0<this.lastScrollInfo.y&&0<this.lastScrollInfo.deltaY,a=this.lastScrollInfo.y<-this.elementInfo.maxTop&&0>this.lastScrollInfo.deltaY;if(b||a){var d=(this.container.clientHeight-(b?this.lastScrollInfo.y:-this.lastScrollInfo.y-this.elementInfo.maxTop))/
this.container.clientHeight;0.5>d&&(d=0.5);var e=0;b&&0<this.lastScrollInfo.top||a&&this.lastScrollInfo.top<-this.elementInfo.maxTop?e=this.lastScrollInfo.top:a&&(e=-this.elementInfo.maxTop);a=this.lastScrollInfo.deltaY*d;1>Math.abs(this.lastScrollInfo.deltaY*d)&&(a=b?1:-1);this.lastScrollInfo.y=e+a}this.scrollerMoveCSS(this.lastScrollInfo,0);this.setVScrollBar(this.lastScrollInfo,0,0);this.setHScrollBar(this.lastScrollInfo,0,0);this.refresh&&!this.preventPullToRefresh&&(!this.refreshTriggered&&this.lastScrollInfo.top>
this.refreshHeight?(this.refreshTriggered=!0,c.trigger(this,"refresh-trigger")):this.refreshTriggered&&this.lastScrollInfo.top<this.refreshHeight&&(this.refreshTriggered=!1,c.trigger(this,"refresh-cancel")));this.infinite&&!this.infiniteTriggered&&Math.abs(this.lastScrollInfo.top)>=this.el.clientHeight-this.container.clientHeight&&(this.infiniteTriggered=!0,c.trigger(this,"infinite-scroll"))}};d.prototype.calculateMovement=function(b,a){var d={top:0,left:0,speedY:0,speedX:0,absSpeedY:0,absSpeedX:0,
deltaY:0,deltaX:0,absDeltaY:0,absDeltaX:0,y:0,x:0,duration:0},c=a?this.firstEventInfo:this.lastEventInfo,e=a?b.pageX:b.touches[0].pageX,n=a?b.pageY:b.touches[0].pageY,f=a?b.time:b.timeStamp;d.deltaY=this.elementInfo.hasVertScroll?n-c.pageY:0;d.deltaX=this.elementInfo.hasHorScroll?e-c.pageX:0;d.time=f;d.duration=f-c.time;return d};d.prototype.calculateTarget=function(b){b.y=this.lastScrollInfo.y+b.deltaY;b.x=this.lastScrollInfo.x+b.deltaX};d.prototype.checkYboundary=function(b){var a=this.container.clientHeight/
2,d=this.elementInfo.maxTop+a;if(b.y>a)b.y=a;else if(-b.y>d)b.y=-d;else return;this.recalculateDeltaY(b)};d.prototype.checkXboundary=function(b){if(0<b.x)b.x=0;else if(-b.x>this.elementInfo.maxLeft)b.x=-this.elementInfo.maxLeft;else return;this.recalculateDeltaY(b)};d.prototype.recalculateDeltaY=function(b){var a=Math.abs(b.deltaY);b.deltaY=b.y-b.top;newAbsDeltaY=Math.abs(b.deltaY);b.duration=b.duration*newAbsDeltaY/a};d.prototype.recalculateDeltaX=function(b){var a=Math.abs(b.deltaX);b.deltaX=b.x-
b.left;newAbsDeltaX=Math.abs(b.deltaX);b.duration=b.duration*newAbsDeltaX/a};d.prototype.hideRefresh=function(a){var d=this;this.preventHideRefresh||(this.scrollerMoveCSS({x:0,y:0,complete:function(){c.trigger(d,"refresh-finish")}},75),this.refreshTriggered=!1)};d.prototype.setMomentum=function(a){a.speedY=this.divide(a.deltaY,a.duration);a.speedX=this.divide(a.deltaX,a.duration);a.absSpeedY=Math.abs(a.speedY);a.absSpeedX=Math.abs(a.speedX);a.absDeltaY=Math.abs(a.deltaY);a.absDeltaX=Math.abs(a.deltaX);
if(0<a.absDeltaY){if(a.deltaY=(0>a.deltaY?-1:1)*a.absSpeedY*a.absSpeedY/0.0024,a.absDeltaY=Math.abs(a.deltaY),a.duration=a.absSpeedY/0.0012,a.speedY=a.deltaY/a.duration,a.absSpeedY=Math.abs(a.speedY),0.12>a.absSpeedY||5>a.absDeltaY)a.deltaY=a.absDeltaY=a.duration=a.speedY=a.absSpeedY=0}else if(a.absDeltaX){if(a.deltaX=(0>a.deltaX?-1:1)*a.absSpeedX*a.absSpeedX/0.0024,a.absDeltaX=Math.abs(a.deltaX),a.duration=a.absSpeedX/0.0012,a.speedX=a.deltaX/a.duration,a.absSpeedX=Math.abs(a.speedX),0.12>a.absSpeedX||
5>a.absDeltaX)a.deltaX=a.absDeltaX=a.duration=a.speedX=a.absSpeedX=0}else a.duration=0};d.prototype.onTouchEnd=function(a){if(null!=this.currentScrollingObject&&this.moved){this.finishScrollingObject=this.currentScrollingObject;this.currentScrollingObject=null;a=this.calculateMovement(this.lastEventInfo,!0);this.androidFormsMode||this.setMomentum(a);this.calculateTarget(a);var d=this.getCSSMatrix(this.el);a.top=numOnly(d.f);a.left=numOnly(d.e);this.checkYboundary(a);this.elementInfo.hasHorScroll&&
this.checkXboundary(a);d=!this.preventPullToRefresh&&(a.top>this.refreshHeight||a.y>this.refreshHeight);this.fireRefreshRelease(d,0<a.top);if(this.refresh&&d)a.y=this.refreshHeight,a.duration=75;else if(0<=a.y)a.y=0,0<=a.top&&(a.duration=75);else if(-a.y>this.elementInfo.maxTop||0==this.elementInfo.maxTop)a.y=-this.elementInfo.maxTop,-a.top>this.elementInfo.maxTop&&(a.duration=75);this.androidFormsMode&&(a.duration=0);this.scrollerMoveCSS(a,a.duration,"cubic-bezier(0.33,0.66,0.66,1)");this.setVScrollBar(a,
a.duration,"cubic-bezier(0.33,0.66,0.66,1)");this.setHScrollBar(a,a.duration,"cubic-bezier(0.33,0.66,0.66,1)");this.setFinishCalback(a.duration);this.infinite&&!this.infiniteTriggered&&Math.abs(a.y)>=this.el.clientHeight-this.container.clientHeight&&(this.infiniteTriggered=!0,c.trigger(this,"infinite-scroll"))}};d.prototype.setFinishCalback=function(a){var d=this;this.scrollingFinishCB=setTimeout(function(){d.hideScrollbars();c.trigger(c.touchLayer,"scrollend",[d.el]);c.trigger(d,"scrollend",[d.el]);
d.isScrolling=!1;d.elementInfo=null;d.infinite&&c.trigger(d,"infinite-scroll-end")},a)};d.prototype.startFormsMode=function(){if(!this.blockFormsFix){var a=this.getCSSMatrix(this.el);this.refreshSafeKeep=this.refresh;this.refresh=!1;this.androidFormsMode=!0;this.el.style[c.feat.cssPrefix+"Transform"]="none";this.el.style[c.feat.cssPrefix+"Transition"]="none";this.el.style[c.feat.cssPrefix+"Perspective"]="none";this.scrollerMoveCSS({x:numOnly(a.e),y:numOnly(a.f)},0);this.container.style[c.feat.cssPrefix+
"Perspective"]="none";this.container.style[c.feat.cssPrefix+"BackfaceVisibility"]="visible";this.vscrollBar&&(this.vscrollBar.style[c.feat.cssPrefix+"Transform"]="none",this.vscrollBar.style[c.feat.cssPrefix+"Transition"]="none",this.vscrollBar.style[c.feat.cssPrefix+"Perspective"]="none",this.vscrollBar.style[c.feat.cssPrefix+"BackfaceVisibility"]="visible");this.hscrollBar&&(this.hscrollBar.style[c.feat.cssPrefix+"Transform"]="none",this.hscrollBar.style[c.feat.cssPrefix+"Transition"]="none",this.hscrollBar.style[c.feat.cssPrefix+
"Perspective"]="none",this.hscrollBar.style[c.feat.cssPrefix+"BackfaceVisibility"]="visible")}};d.prototype.stopFormsMode=function(){if(!this.blockFormsFix){var a=this.getCSSMatrix(this.el);this.refresh=this.refreshSafeKeep;this.androidFormsMode=!1;this.el.style[c.feat.cssPrefix+"Perspective"]=1E3;this.el.style.marginTop=0;this.el.style.marginLeft=0;this.el.style[c.feat.cssPrefix+"Transition"]="0ms linear";this.scrollerMoveCSS({x:numOnly(a.e),y:numOnly(a.f)},0);this.container.style[c.feat.cssPrefix+
"Perspective"]=1E3;this.container.style[c.feat.cssPrefix+"BackfaceVisibility"]="hidden";this.vscrollBar&&(this.vscrollBar.style[c.feat.cssPrefix+"Perspective"]=1E3,this.vscrollBar.style[c.feat.cssPrefix+"BackfaceVisibility"]="hidden");this.hscrollBar&&(this.hscrollBar.style[c.feat.cssPrefix+"Perspective"]=1E3,this.hscrollBar.style[c.feat.cssPrefix+"BackfaceVisibility"]="hidden")}};d.prototype.scrollerMoveCSS=function(b,d,n){d||(d=0);n||(n="linear");d=numOnly(d);this.el&&this.el.style&&(this.eventsActive&&
(this.androidFormsMode?(this.el.style.marginTop=Math.round(b.y)+"px",this.el.style.marginLeft=Math.round(b.x)+"px"):(this.el.style[c.feat.cssPrefix+"Transform"]="translate"+a+b.x+"px,"+b.y+"px"+e,this.el.style[c.feat.cssPrefix+"TransitionDuration"]=d+"ms",this.el.style[c.feat.cssPrefix+"TransitionTimingFunction"]=n)),this.logPos(b.x,b.y))};d.prototype.logPos=function(a,d){var c=this.elementInfo?{h:this.elementInfo.bottomMargin,w:this.elementInfo.rightMargin}:this.getViewportSize();this.loggedPcentX=
this.divide(a,this.el.clientWidth-c.w);this.loggedPcentY=this.divide(d,this.el.clientHeight-c.h);this.scrollTop=d;this.scrollLeft=a};d.prototype.scrollbarMoveCSS=function(b,d,n,f){n||(n=0);f||(f="linear");b&&b.style&&(this.androidFormsMode?(b.style.marginTop=Math.round(d.y)+"px",b.style.marginLeft=Math.round(d.x)+"px"):(b.style[c.feat.cssPrefix+"Transform"]="translate"+a+d.x+"px,"+d.y+"px"+e,b.style[c.feat.cssPrefix+"TransitionDuration"]=n+"ms",b.style[c.feat.cssPrefix+"TransitionTimingFunction"]=
f))};d.prototype.scrollTo=function(a,d){d||(d=0);this.scrollerMoveCSS(a,d)};d.prototype.scrollBy=function(a,d){var c=this.getCSSMatrix(this.el),e=numOnly(c.f),c=numOnly(c.e);this.scrollTo({y:e-a.y,x:c-a.x},d)};d.prototype.scrollToBottom=function(a){this.scrollTo({y:-1*(this.el.clientHeight-this.container.clientHeight),x:0},a)};d.prototype.scrollToTop=function(a){this.scrollTo({x:0,y:0},a)};return function(a,e){if(!h&&c.touchLayer&&c.isObject(c.touchLayer))k();else if(!c.touchLayer||!c.isObject(c.touchLayer))c.touchLayer=
{};var f="string"==typeof a||a instanceof String?document.getElementById(a):a;if(f)return jq.os.desktop?new u(f,e):e.useJsScroll?new d(f,e):new n(f,e);alert("Could not find element for scroller "+a)}}()})(jq);
(function(c){c.fn.popup=function(c){return new k(this[0],c)};var g=[],k=function(){var f=function(f,h){if(this.container="string"===typeof f||f instanceof String?document.getElementById(f):f)try{if("string"===typeof h||"number"===typeof h)h={message:h,cancelOnly:"true",cancelText:"OK"};this.id=id=h.id=h.id||c.uuid();this.title=h.suppressTitle?"":h.title||"Alert";this.message=h.message||"";this.cancelText=h.cancelText||"Cancel";this.cancelCallback=h.cancelCallback||function(){};this.cancelClass=h.cancelClass||
"button";this.doneText=h.doneText||"Done";this.doneCallback=h.doneCallback||function(a){};this.doneClass=h.doneClass||"button";this.cancelOnly=h.cancelOnly||!1;this.onShow=h.onShow||function(){};this.autoCloseDone=void 0!==h.autoCloseDone?h.autoCloseDone:!0;g.push(this);1==g.length&&this.show()}catch(a){console.log("error adding popup "+a)}else alert("Error finding container for popup "+f)};f.prototype={id:null,title:null,message:null,cancelText:null,cancelCallback:null,cancelClass:null,doneText:null,
doneCallback:null,doneClass:null,cancelOnly:!1,onShow:null,autoCloseDone:!0,supressTitle:!1,show:function(){var f=this,g='<div id="'+this.id+'" class="jqPopup hidden">\t        \t\t\t\t<header>'+this.title+'</header>\t        \t\t\t\t<div><div style="width:1px;height:1px;-webkit-transform:translate3d(0,0,0);float:right"></div>'+this.message+'</div>\t        \t\t\t\t<footer style="clear:both;">\t        \t\t\t\t\t<a href="javascript:;" class="'+this.cancelClass+'" id="cancel">'+this.cancelText+'</a>\t        \t\t\t\t\t<a href="javascript:;" class="'+
this.doneClass+'" id="action">'+this.doneText+"</a>\t        \t\t\t\t</footer>\t        \t\t\t</div></div>";c(this.container).append(c(g));g=c("#"+this.id);g.bind("close",function(){f.hide()});this.cancelOnly&&(g.find("A#action").hide(),g.find("A#cancel").addClass("center"));g.find("A").each(function(){var a=c(this);a.bind("click",function(c){"cancel"==a.attr("id")?(f.cancelCallback.call(f.cancelCallback,f),f.hide()):(f.doneCallback.call(f.doneCallback,f),f.autoCloseDone&&f.hide());c.preventDefault()})});
f.positionPopup();c.blockUI(0.5);g.removeClass("hidden");g.bind("orientationchange",function(){f.positionPopup()});g.find("header").show();g.find("footer").show();this.onShow(this)},hide:function(){var f=this;c("#"+f.id).addClass("hidden");c.unblockUI();setTimeout(function(){f.remove()},250)},remove:function(){var f=c("#"+this.id);f.unbind("close");f.find("BUTTON#action").unbind("click");f.find("BUTTON#cancel").unbind("click");f.unbind("orientationchange").remove();g.splice(0,1);0<g.length&&g[0].show()},
positionPopup:function(){var f=c("#"+this.id);f.css("top",window.innerHeight/2.5+window.pageYOffset-f[0].clientHeight/2+"px");f.css("left",window.innerWidth/2-f[0].clientWidth/2+"px")}};return f}(),f=!1;c.blockUI=function(g){f||(g=g?" style='opacity:"+g+";'":"",c("BODY").prepend(c("<div id='mask'"+g+"></div>")),c("BODY DIV#mask").bind("touchstart",function(c){c.preventDefault()}),c("BODY DIV#mask").bind("touchmove",function(c){c.preventDefault()}),f=!0)};c.unblockUI=function(){f=!1;c("BODY DIV#mask").unbind("touchstart");
c("BODY DIV#mask").unbind("touchmove");c("BODY DIV#mask").remove()};window.alert=function(f){if(null===f||void 0===f)f="null";0<c("#jQUi").length?c("#jQUi").popup(f.toString()):c(document.body).popup(f.toString())}})(jq);
(function(c){c.fn.actionsheet=function(c){for(var f,h=0;h<this.length;h++)f=new g(this[h],c);return 1==this.length?f:this};var g=function(){var g=function(f,h){if(this.el="string"==typeof f||f instanceof String?document.getElementById(f):f){if(this instanceof g){if("object"==typeof h)for(j in h)this[j]=h[j]}else return new g(f,h);try{var q=this,p;if("string"==typeof h)p=c('<div id="jq_actionsheet"><div style="width:100%">'+h+"<a href='javascript:;' class='cancel'>Cancel</a></div></div>");else if("object"==
typeof h){p=c('<div id="jq_actionsheet"><div style="width:100%"></div></div>');var a=c(p.children().get());h.push({text:"Cancel",cssClasses:"cancel"});for(var e=0;e<h.length;e++){var d=c('<a href="javascript:;" >'+(h[e].text||"TEXT NOT ENTERED")+"</a>");d[0].onclick=h[e].handler||function(){};h[e].cssClasses&&0<h[e].cssClasses.length&&d.addClass(h[e].cssClasses);a.append(d)}}c(f).find("#jq_actionsheet").remove();c(f).find("#jq_action_mask").remove();actionsheetEl=c(f).append(p);p.get().style[c.feat.cssPrefix+
"Transition"]="all 0ms";p.css(c.feat.cssPrefix+"Transform","translate"+c.feat.cssTransformStart+"0,0"+c.feat.cssTransformEnd);p.css("top",window.innerHeight+"px");this.el.style.overflow="hidden";p.on("click","a",function(){q.hideSheet()});this.activeSheet=p;c(f).append('<div id="jq_action_mask" style="position:absolute;top:0px;left:0px;right:0px;bottom:0px;z-index:9998;background:rgba(0,0,0,.4)"/>');setTimeout(function(){p.get().style[c.feat.cssPrefix+"Transition"]="all 300ms";p.css(c.feat.cssPrefix+
"Transform","translate"+c.feat.cssTransformStart+"0,"+-p.height()+"px"+c.feat.cssTransformEnd)},10)}catch(n){alert("error adding actionsheet"+n)}}else alert("Could not find element for actionsheet "+f)};g.prototype={activeSheet:null,hideSheet:function(){var f=this;this.activeSheet.off("click","a",function(){f.hideSheet()});c(this.el).find("#jq_action_mask").remove();this.activeSheet.get().style[c.feat.cssPrefix+"Transition"]="all 0ms";var g=this.activeSheet,k=this.el;setTimeout(function(){g.get().style[c.feat.cssPrefix+
"Transition"]="all 300ms";g.css(c.feat.cssPrefix+"Transform","translate"+c.feat.cssTransformStart+"0,0px"+c.feat.cssTransformEnd);setTimeout(function(){g.remove();g=null;k.style.overflow="none"},500)},10)}};return g}()})(jq);
(function(c){c.passwordBox=function(){return new g};var g=function(){this.oldPasswords={}};g.prototype={showPasswordPlainText:!1,getOldPasswords:function(g){var f=g&&document.getElementById(g)?document.getElementById(g):document;if(f){g=f.getElementsByTagName("input");for(f=0;f<g.length;f++)"password"==g[f].type&&c.os.webkit&&(g[f].type="text",g[f].style["-webkit-text-security"]="disc")}else alert("Could not find container element for passwordBox "+g)},changePasswordVisiblity:function(g,f){g=parseInt(g);
var h=document.getElementById(f);h.style[c.cssPrefix+"text-security"]=1==g?"none":"disc";c.os.webkit||(h.type=1==g?"text":"password")}}})(jq);
(function(c){c.selectBox={scroller:null,getOldSelects:function(g){if(c.os.android&&!c.os.androidICS)if(c.fn.scroller){var k=g&&document.getElementById(g)?document.getElementById(g):document;if(k){for(var f=k.getElementsByTagName("select"),h=this,q=0;q<f.length;q++)f[q].hasSelectBoxFix||function(g){var a=document.createElement("div"),e=window.getComputedStyle(g),d="intrinsic"==e.width?"100%":e.width,d=0<parseInt(d)?d:"100px",n=0<parseInt(g.style.height)?g.style.height:parseInt(e.height)?e.height:"20px";
a.style.width=d;a.style.height=n;a.style.margin=e.margin;a.style.position=e.position;a.style.left=e.left;a.style.top=e.top;a.style.lineHeight=e.lineHeight;a.style.zIndex="1";g.value&&(a.innerHTML=g.options[g.selectedIndex].text);a.style.background="url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAeCAIAAABFWWJ4AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyBpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBXaW5kb3dzIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkM1NjQxRUQxNUFEODExRTA5OUE3QjE3NjI3MzczNDAzIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkM1NjQxRUQyNUFEODExRTA5OUE3QjE3NjI3MzczNDAzIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6QzU2NDFFQ0Y1QUQ4MTFFMDk5QTdCMTc2MjczNzM0MDMiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6QzU2NDFFRDA1QUQ4MTFFMDk5QTdCMTc2MjczNzM0MDMiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6YWbdCAAAAlklEQVR42mIsKChgIBGwAHFPTw/xGkpKSlggrG/fvhGjgYuLC0gyMZAOoPb8//9/0Or59+8f8XrICQN66SEnDOgcp3AgKiqKqej169dY9Hz69AnCuHv3rrKyMrIKoAhcVlBQELt/gIqwstHD4B8quH37NlAQSKKJEwg3iLbBED8kpeshoGcwh5uuri5peoBFMEluAwgwAK+5aXfuRb4gAAAAAElFTkSuQmCC') right top no-repeat";
a.style.backgroundColor="white";a.style.lineHeight=n;a.style.backgroundSize="contain";a.className="jqmobiSelect_fakeInput "+g.className;a.id=g.id+"_jqmobiSelect";a.style.border="1px solid gray";a.style.color="black";a.linkId=g.id;a.onclick=function(a){h.initDropDown(this.linkId)};c(a).insertBefore(c(g));g.style.display="none";g.style.webkitAppearance="none";for(e=0;e<g.options.length;e++)g.options[e].selected&&(a.value=g.options[e].text),g.options[e].watch("selected",function(a,b,d){!0==d&&(g.getAttribute("multiple")||
h.updateMaskValue(this.parentNode.id,this.text,this.value),this.parentNode.value=this.value);return d});g.watch("selectedIndex",function(a,b,d){this.options[d]&&(g.getAttribute("multiple")||h.updateMaskValue(this.id,this.options[d].text,this.options[d].value),this.value=this.options[d].value);return d});imageMask=a=null;f[q].hasSelectBoxFix=!0}(f[q]);h.createHtml()}else alert("Could not find container element for jq.web.selectBox "+g)}else alert("This library requires jq.web.Scroller")},updateDropdown:function(c){if(c=
document.getElementById(c)){for(var k=0;k<c.options.length;k++)c.options[k].selected&&(fakeInput.value=c.options[k].text),c.options[k].watch("selected",function(c,g,k){!0==k&&(that.updateMaskValue(this.parentNode.id,this.text,this.value),this.parentNode.value=this.value);return k});c=null}},initDropDown:function(c){var k=this,f=document.getElementById(c);if(!f.disabled&&f&&f.options&&0!=f.options.length){var h="",h=f.attributes.title||f.name;"object"===typeof h&&(h=h.value);document.getElementById("jqmobiSelectBoxScroll").innerHTML=
"";document.getElementById("jqmobiSelectBoxHeaderTitle").innerHTML=0<h.length?h:c;for(h=0;h<f.options.length;h++){f.options[h].watch("selected",function(a,b,d){!0==d&&(k.updateMaskValue(this.parentNode.id,this.text,this.value),this.parentNode.value=this.value);return d});var q=f.options[h].selected?!0:!1,p=document.createElement("div"),a=document.createElement("a"),e=document.createElement("span"),d=document.createElement("button");p.className="jqmobiSelectRow";p.style.cssText="line-height:40px;font-size:14px;padding-left:10px;height:40px;width:100%;position:relative;width:100%;border-bottom:1px solid black;background:white;";
p.tmpValue=h;p.onclick=function(a){k.setDropDownValue(c,this.tmpValue,this)};a.style.cssText="text-decoration:none;color:black;";a.innerHTML=f.options[h].text;a.className="jqmobiSelectRowText";e.style.cssText="float:right;margin-right:20px;margin-top:-2px";q?(d.style.cssText="background: #000;padding: 0px 0px;border-radius:15px;border:3px solid black;",d.className="jqmobiSelectRowButtonFound"):(d.style.cssText="background: #ffffff;padding: 0px 0px;border-radius:15px;border:3px solid black;",d.className=
"jqmobiSelectRowButton");d.style.width="20px";d.style.height="20px";d.checked=q;e.appendChild(d);p.appendChild(a);p.appendChild(e);document.getElementById("jqmobiSelectBoxScroll").appendChild(p);a=d=e=null}try{document.getElementById("jqmobiSelectModal").style.display="block"}catch(n){console.log("Error showing div "+n)}try{if(p){var u=numOnly(p.style.height),b=numOnly(document.getElementById("jqmobiSelectBoxHeader").style.height),s=0*u+b>=numOnly(document.getElementById("jqmobiSelectBoxFix").clientHeight)-
b?0*-u+b:0;this.scroller.scrollTo({x:0,y:s})}}catch(B){console.log("error init dropdown"+B)}f=p=null}},updateMaskValue:function(c,k,f){var h=document.getElementById(c+"_jqmobiSelect");c=document.getElementById(c);h&&(h.innerHTML=k);if("function"==typeof c.onchange)c.onchange(f)},setDropDownValue:function(g,k,f){if(g=document.getElementById(g))g.getAttribute("multiple")?(k=c(g).find("option:nth-child("+(k+1)+")").get(0),k.selected?(k.selected=!1,c(f).find("button").css("background","#fff")):(k.selected=
!0,c(f).find("button").css("background","#000"))):(g.selectedIndex=k,c(g).find("option").forEach(function(c){c.selected=!1}),c(g).find("option:nth-child("+(k+1)+")").get(0).selected=!0,this.scroller.scrollTo({x:0,y:0}),this.hideDropDown()),c(g).trigger("change"),g=null},hideDropDown:function(){document.getElementById("jqmobiSelectModal").style.display="none";document.getElementById("jqmobiSelectBoxScroll").innerHTML=""},createHtml:function(){var g=this;if(!document.getElementById("jqmobiSelectBoxContainer")){var k=
document.createElement("div");k.style.cssText="position:absolute;top:0px;bottom:0px;left:0px;right:0px;background:rgba(0,0,0,.7);z-index:200000;display:none;";k.id="jqmobiSelectModal";var f=document.createElement("div");f.id="jqmobiSelectBoxContainer";f.style.cssText="position:absolute;top:8%;bottom:10%;display:block;width:90%;margin:auto;margin-left:5%;height:90%px;background:white;color:black;border:1px solid black;border-radius:6px;";f.innerHTML='<div id="jqmobiSelectBoxHeader" style="display:block;font-family:\'Eurostile-Bold\', Eurostile, Helvetica, Arial, sans-serif;color:#fff;font-weight:bold;font-size:18px;line-height:34px;height:34px; text-transform:uppercase; text-align:left; text-shadow:rgba(0,0,0,.9) 0px -1px 1px; padding: 0px 8px 0px 8px; border-top-left-radius:5px; border-top-right-radius:5px; -webkit-border-top-left-radius:5px; -webkit-border-top-right-radius:5px; background:#39424b; margin:1px;"><div style="float:left;" id="jqmobiSelectBoxHeaderTitle"></div><div style="float:right;width:60px;margin-top:-5px"><div id="jqmobiSelectClose" class="button" style="width:60px;height:32px;line-height:32px;">Close</div></div></div><div id="jqmobiSelectBoxFix" style="position:relative;height:90%;background:white;overflow:hidden;width:100%;"><div id="jqmobiSelectBoxScroll"></div></div>';
g=this;k.appendChild(f);c(document).ready(function(){jq("#jQUi")?jq("#jQUi").append(k):document.body.appendChild(k);c("#jqmobiSelectClose").get().onclick=function(){g.hideDropDown()};var h=c("<style>.jqselectscrollBarV{opacity:1 !important;}</style>").get();document.body.appendChild(h);try{g.scroller=c("#jqmobiSelectBoxScroll").scroller({scroller:!1,verticalScroll:!0,vScrollCSS:"jqselectscrollBarV"})}catch(q){console.log("Error creating select html "+q)}h=f=k=null})}}};HTMLElement.prototype.watch||
(HTMLElement.prototype.watch=function(c,k){var f=this[c],h=f,q=function(){return h},p=function(a){f=h;return h=k.call(this,c,f,a)};delete this[c]&&(HTMLElement.defineProperty?HTMLElement.defineProperty(this,c,{get:q,set:p,enumerable:!1,configurable:!0}):HTMLElement.prototype.__defineGetter__&&HTMLElement.prototype.__defineSetter__&&(HTMLElement.prototype.__defineGetter__.call(this,c,q),HTMLElement.prototype.__defineSetter__.call(this,c,p)))});HTMLElement.prototype.unwatch||(HTMLElement.prototype.unwatch=
function(c){var k=this[c];delete this[c];this[c]=k})})(jq);
(function(c){function g(a,c,d,f){var g=Math.abs(a-c),b=Math.abs(d-f);return g>=b?0<a-c?"Left":"Right":0<d-f?"Up":"Down"}function k(){f.last&&Date.now()-f.last>=q&&(f.el.trigger("longTap"),f={})}var f={},h,q=750,p;c(document).ready(function(){var a;c(document.body).bind("touchstart",function(e){if(e.touches&&0!=e.touches.length){var d=Date.now(),n=d-(f.last||d);e.touches&&0!=e.touches.length&&(f.el=c("tagName"in e.touches[0].target?e.touches[0].target:e.touches[0].target.parentNode),h&&clearTimeout(h),
f.x1=e.touches[0].pageX,f.y1=e.touches[0].pageY,f.x2=f.y2=0,0<n&&250>=n&&(f.isDoubleTap=!0),f.last=d,p=setTimeout(k,q),f.el.data("ignore-pressed")||f.el.addClass("selected"),a&&!a.data("ignore-pressed")&&a.removeClass("selected"),a=f.el)}}).bind("touchmove",function(a){f.x2=a.touches[0].pageX;f.y2=a.touches[0].pageY;clearTimeout(p)}).bind("touchend",function(a){f.el&&(f.el.data("ignore-pressed")||f.el.removeClass("selected"),f.isDoubleTap?(f.el.trigger("doubleTap"),f={}):0<f.x2||0<f.y2?((30<Math.abs(f.x1-
f.x2)||30<Math.abs(f.y1-f.y2))&&f.el.trigger("swipe")&&f.el.trigger("swipe"+g(f.x1,f.x2,f.y1,f.y2)),f.x1=f.x2=f.y1=f.y2=f.last=0):"last"in f&&(f.el.trigger("tap"),h=setTimeout(function(){h=null;f.el&&f.el.trigger("singleTap");f={}},250)))}).bind("touchcancel",function(){f.el&&!f.el.data("ignore-pressed")&&f.el.removeClass("selected");f={};clearTimeout(p)})});"swipe swipeLeft swipeRight swipeUp swipeDown doubleTap tap singleTap longTap".split(" ").forEach(function(a){c.fn[a]=function(c){return this.bind(a,
c)}})})(jq);
(function(c){c.touchLayer=function(a){c.touchLayer=new e(a);return c.touchLayer};var g=["input","select","textarea"],k=["button","radio","checkbox","range","date"],f=c.os.ios,h=c.os.blackberry,q=c.os.blackberry||c.os.android&&!c.os.chrome,p=c.os.ios,a=!1,e=function(a){this.clearTouchVars();a.addEventListener("touchstart",this,!1);a.addEventListener("touchmove",this,!1);a.addEventListener("touchend",this,!1);a.addEventListener("click",this,!1);a.addEventListener("focusin",this,!1);document.addEventListener("scroll",this,
!1);window.addEventListener("resize",this,!1);window.addEventListener("orientationchange",this,!1);this.layer=a;this.scrollEndedProxy_=c.proxy(this.scrollEnded,this);this.exitEditProxy_=c.proxy(this.exitExit,this,[]);this.launchFixUIProxy_=c.proxy(this.launchFixUI,this);var e=this;this.scrollTimeoutExpireProxy_=function(){e.scrollTimeout_=null;e.scrollTimeoutEl_.addEventListener("scroll",e.scrollEndedProxy_,!1)};this.retestAndFixUIProxy_=function(){jq.os.android&&(e.layer.style.height="100%");c.asap(e.testAndFixUI,
e,arguments)};document.addEventListener("click",function(a){void 0!==a.clientX&&null!=e.lastTouchStartX&&(2>Math.abs(e.lastTouchStartX-a.clientX)&&2>Math.abs(e.lastTouchStartY-a.clientY))&&(a.preventDefault(),a.stopPropagation())},!0);c.bind(this,"scrollstart",function(a){e.isScrolling=!0;e.scrollingEl_=a;e.fireEvent("UIEvents","scrollstart",a,!1,!1)});c.bind(this,"scrollend",function(a){e.isScrolling=!1;e.fireEvent("UIEvents","scrollend",a,!1,!1)});this.launchFixUI(5)};e.prototype={dX:0,dY:0,cX:0,
cY:0,touchStartX:null,touchStartY:null,layer:null,scrollingEl_:null,scrollTimeoutEl_:null,scrollTimeout_:null,reshapeTimeout_:null,scrollEndedProxy_:null,exitEditProxy_:null,launchFixUIProxy_:null,reHideAddressBarTimeout_:null,retestAndFixUIProxy_:null,panElementId:"header",blockClicks:!1,allowDocumentScroll_:!1,ignoreNextResize_:!1,blockPossibleClick_:!1,isScrolling:!1,isScrollingVertical_:!1,wasPanning_:!1,isPanning_:!1,isFocused_:!1,justBlurred_:!1,requiresNativeTap:!1,holdingReshapeType_:null,
handleEvent:function(a){switch(a.type){case "touchstart":this.onTouchStart(a);break;case "touchmove":this.onTouchMove(a);break;case "touchend":this.onTouchEnd(a);break;case "click":this.onClick(a);break;case "blur":this.onBlur(a);break;case "scroll":this.onScroll(a);break;case "orientationchange":this.onOrientationChange(a);break;case "resize":this.onResize(a);break;case "focusin":this.onFocusIn(a)}},launchFixUI:function(a){a||(a=2);if(null==this.reHideAddressBarTimeout_)return this.testAndFixUI(0,
a)},resetFixUI:function(){this.reHideAddressBarTimeout_&&clearTimeout(this.reHideAddressBarTimeout_);this.reHideAddressBarTimeout_=null},testAndFixUI:function(a,c){var e=this.getReferenceHeight(),b=this.getCurrentHeight();if(e!=b&&!(0.97*b<e&&0.97*e<b))return this.hideAddressBar(a,c),!0;jq.os.android&&this.resetFixUI();return!1},hideAddressBar:function(a,c){if(a>=c)this.resetFixUI();else if(jq.os.desktop||jq.os.chrome)this.layer.style.height="100%";else if(jq.os.android){window.scrollTo(1,1);this.layer.style.height=
this.isFocused_||window.innerHeight>window.outerHeight?window.innerHeight+"px":window.outerHeight/window.devicePixelRatio+"px";that=this;var e=a+1;this.reHideAddressBarTimeout_=setTimeout(this.retestAndFixUIProxy_,250*e,[e,c])}else this.isFocused_||(document.documentElement.style.height="5000px",window.scrollTo(0,0),document.documentElement.style.height=window.innerHeight+"px",this.layer.style.height=window.innerHeight+"px")},getReferenceHeight:function(){return jq.os.android?Math.ceil(window.outerHeight/
window.devicePixelRatio):window.innerHeight},getCurrentHeight:function(){return jq.os.android?window.innerHeight:numOnly(document.documentElement.style.height)},onOrientationChange:function(a){!this.holdingReshapeType_&&this.reshapeTimeout_?this.fireReshapeEvent("orientationchange"):this.previewReshapeEvent("orientationchange")},onResize:function(a){this.ignoreNextResize_?this.ignoreNextResize_=!1:this.launchFixUI()&&this.reshapeAction()},onClick:function(a){var e=a.target&&void 0!=a.target.tagName?
a.target.tagName.toLowerCase():"";if(-1!==g.indexOf(e)&&(!this.isFocused_||!a.target==this.focusedElement)){e=a.target&&void 0!=a.target.type?a.target.type.toLowerCase():"";if(-1===k.indexOf(e)){this.isFocused_&&this.focusedElement.removeEventListener("blur",this,!1);this.focusedElement=a.target;this.focusedElement.addEventListener("blur",this,!1);if(!this.isFocused_&&!this.justBlurred_)if(c.trigger(this,"enter-edit",[a.target]),c.os.ios){var h=this;setTimeout(function(){h.fireReshapeEvent("enter-edit")},
300)}else this.previewReshapeEvent("enter-edit");this.isFocused_=!0}else this.isFocused_=!1;this.justBlurred_=!1;this.allowDocumentScroll_=!0;f&&a.target.focus()}else c.os.blackberry10&&this.isFocused_&&this.focusedElement.blur()},previewReshapeEvent:function(a){that=this;this.reshapeTimeout_=setTimeout(function(){that.fireReshapeEvent(a);that.reshapeTimeout_=null;that.holdingReshapeType_=null},750);this.holdingReshapeType_=a},fireReshapeEvent:function(a){c.trigger(this,"reshape");c.trigger(this,
a?a+"-reshape":"unknown-reshape")},reshapeAction:function(){this.reshapeTimeout_?(clearTimeout(this.reshapeTimeout_),this.fireReshapeEvent(this.holdingReshapeType_),this.reshapeTimeout_=this.holdingReshapeType_=null):this.previewReshapeEvent()},onFocusIn:function(a){if(!this.isFocused_)this.onClick(a)},onBlur:function(a){jq.os.android&&a.target==window||(this.isFocused_=!1,this.focusedElement&&this.focusedElement.removeEventListener("blur",this,!1),this.focusedElement=null,this.justBlurred_=!0,c.asap(this.exitEditProxy_,
this,[a.target]))},exitExit:function(a){this.justBlurred_=!1;if(!this.isFocused_)if(c.trigger(this,"exit-edit",[a]),this.allowDocumentScroll_=!1,c.os.ios){var e=this;setTimeout(function(){e.fireReshapeEvent("exit-edit")},300)}else this.previewReshapeEvent("exit-edit")},onScroll:function(a){!this.allowDocumentScroll_&&(!this.isPanning_&&a.target==document)&&(this.allowDocumentScroll_=!0,this.wasPanning_?(this.wasPanning_=!1,setTimeout(this.launchFixUIProxy_,2E3,[2])):this.launchFixUI())},onTouchStart:function(a){this.dX=
a.touches[0].pageX;this.dY=a.touches[0].pageY;this.lastTimestamp=a.timeStamp;this.lastTouchStartX=this.lastTouchStartY=null;(p||c.feat.nativeTouchScroll)&&this.checkDOMTree(a.target,this.layer);this.isScrolling&&(null!=this.scrollTimeout_?(clearTimeout(this.scrollTimeout_),this.scrollTimeout_=null,this.scrollTimeoutEl_!=this.scrollingEl_?this.scrollEnded(!1):this.blockPossibleClick_=!0):this.scrollTimeoutEl_&&(this.scrollEnded(!0),this.blockPossibleClick_=!0));if(jq.os.android&&a&&a.target&&a.target.getAttribute&&
"ignore"==a.target.getAttribute("data-touchlayer")||this.isFocused_&&!c.os.blackberry10)this.allowDocumentScroll_=this.requiresNativeTap=!0;else if(q&&a.target&&void 0!=a.target.tagName){var e=a.target.tagName.toLowerCase();-1!==g.indexOf(e)&&("select"!=e&&c.trigger(this,"pre-enter-edit",[a.target]),this.requiresNativeTap=!0)}else a.target&&(void 0!==a.target.tagName&&"input"==a.target.tagName.toLowerCase()&&"range"==a.target.type)&&(this.requiresNativeTap=!0);!this.isPanning_&&!this.requiresNativeTap?
(this.isScrolling&&!c.feat.nativeTouchScroll||!this.isScrolling)&&a.preventDefault():this.isScrollingVertical_&&this.demandVerticalScroll()},demandVerticalScroll:function(){0>=this.scrollingEl_.scrollTop?this.scrollingEl_.scrollTop=1:this.scrollingEl_.scrollTop+this.scrollingEl_.clientHeight>=this.scrollingEl_.scrollHeight&&(this.scrollingEl_.scrollTop=this.scrollingEl_.scrollHeight-this.scrollingEl_.clientHeight-1)},ignoreScrolling:function(a){return void 0===a.scrollWidth||void 0===a.clientWidth||
void 0===a.scrollHeight||void 0===a.clientHeight?!0:!1},allowsVerticalScroll:function(a,c){var e=c.overflowY;return"scroll"==e||"auto"==e&&a.scrollHeight>a.clientHeight?!0:!1},allowsHorizontalScroll:function(a,c){var e=c.overflowX;return"scroll"==e||"auto"==e&&a.scrollWidth>a.clientWidth?!0:!1},checkDOMTree:function(a,e){if(p&&this.panElementId==a.id)this.isPanning_=!0;else{if(c.feat.nativeTouchScroll){if(this.ignoreScrolling(a))return;var f=window.getComputedStyle(a);if(this.allowsVerticalScroll(a,
f)){this.isScrollingVertical_=!0;this.scrollingEl_=a;this.isScrolling=!0;return}this.allowsHorizontalScroll(a,f)&&(this.isScrollingVertical_=!1,this.scrollingEl_=null,this.isScrolling=!0)}a!=e&&a.parentNode&&this.checkDOMTree(a.parentNode,e)}},scrollEnded:function(a){a&&this.scrollTimeoutEl_.removeEventListener("scroll",this.scrollEndedProxy_,!1);this.fireEvent("UIEvents","scrollend",this.scrollTimeoutEl_,!1,!1);this.scrollTimeoutEl_=null},onTouchMove:function(a){var e=this.moved;this.moved=!0;h&&
(this.cY=a.touches[0].pageY-this.dY,this.cX=a.touches[0].pageX-this.dX);this.isPanning_||(this.isScrolling&&(e||this.fireEvent("UIEvents","scrollstart",this.scrollingEl_,!1,!1),this.speedY=(this.lastY-a.touches[0].pageY)/(a.timeStamp-this.lastTimestamp),this.lastY=a.touches[0].pageY,this.lastX=a.touches[0].pageX,this.lastTimestamp=a.timeStamp),!c.os.blackberry10&&!this.requiresNativeTap&&(!this.isScrolling||!c.feat.nativeTouchScroll)&&a.preventDefault())},onTouchEnd:function(d){if(c.os.ios){if(a==
d.changedTouches[0].identifier)return d.preventDefault(),!1;a=d.changedTouches[0].identifier}var e=this.moved;h&&(e=e&&!(10>Math.abs(this.cX)&&10>Math.abs(this.cY)));if(!jq.os.ios||!this.requiresNativeTap)this.allowDocumentScroll_=!1;this.isPanning_&&e?this.wasPanning_=!0:!e&&!this.requiresNativeTap?(d.preventDefault(),!this.blockClicks&&!this.blockPossibleClick_&&(e=d.target,3==e.nodeType&&(e=e.parentNode),this.fireEvent("Event","click",e,!0,d.mouseToTouch,d.changedTouches[0]),this.lastTouchStartX=
this.dX,this.lastTouchStartY=this.dY)):e&&(this.isScrolling&&(this.scrollTimeoutEl_=this.scrollingEl_,0.01>Math.abs(this.speedY)?this.scrollEnded(!1):this.scrollTimeout_=setTimeout(this.scrollTimeoutExpireProxy_,30)),this.requiresNativeTap&&(this.isFocused_||c.trigger(this,"cancel-enter-edit",[d.target])));this.clearTouchVars()},clearTouchVars:function(){this.speedY=this.lastY=this.cY=this.cX=this.dX=this.dY=0;this.blockPossibleClick_=this.requiresNativeTap=this.isScrollingVertical_=this.isScrolling=
this.isPanning_=this.moved=!1},fireEvent:function(a,e,f,b,g,h){var k=document.createEvent(a);k.initEvent(e,b,!0);k.target=f;h&&c.each(h,function(a,b){k[a]=b});g&&(k.mouseToTouch=!0);f.dispatchEvent(k)}}})(jq);
(function(c){var g=window.location.pathname,k=window.location.hash,f=k,h=function(){var a=this;this.availableTransitions={};this.availableTransitions["default"]=this.availableTransitions.none=this.noTransition;jq(document).ready(function(){var a=document.getElementById("jQUi");if(null==a){a=document.createElement("div");a.id="jQUi";for(var d=document.body;d.firstChild;)a.appendChild(d.firstChild);jq(document.body).prepend(a)}jq.os.supportsTouch&&c.touchLayer(a)});window.AppMobi?document.addEventListener("appMobi.device.ready",
function(){a.autoBoot();this.removeEventListener("appMobi.device.ready",arguments.callee)},!1):"complete"==document.readyState||"loaded"==document.readyState?this.autoBoot():document.addEventListener("DOMContentLoaded",function(){a.autoBoot();this.removeEventListener("DOMContentLoaded",arguments.callee)},!1);window.AppMobi||(AppMobi={webRoot:""});window.addEventListener("popstate",function(){var e=c.ui.getPanelId(document.location.hash);""==e&&1===c.ui.history.length&&(e="#"+c.ui.firstDiv.id);""!=
e&&0!==document.querySelectorAll(e+".panel").length&&e!="#"+c.ui.activeDiv.id&&a.goBack()},!1)};h.prototype={showLoading:!0,loadContentQueue:[],isAppMobi:!1,titlebar:"",navbar:"",header:"",viewportContainer:"",backButton:"",remotePages:{},history:[],homeDiv:"",screenWidth:"",content:"",modalWindow:"",customFooter:!1,defaultFooter:"",defaultHeader:null,customMenu:!1,defaultMenu:"",_readyFunc:null,doingTransition:!1,passwordBox:jq.passwordBox?new jq.passwordBox:!1,selectBox:jq.selectBox?jq.selectBox:
!1,ajaxUrl:"",transitionType:"slide",scrollingDivs:[],firstDiv:"",hasLaunched:!1,launchCompleted:!1,activeDiv:"",customClickHandler:"",activeDiv:"",menuAnimation:null,togglingSideMenu:!1,autoBoot:function(){this.hasLaunched=!0;this.autoLaunch&&this.launch()},css3animate:function(a,c){a=jq(a);return a.css3Animate(c)},loadDefaultHash:!0,useAjaxCacheBuster:!1,actionsheet:function(a){return jq("#jQUi").actionsheet(a)},popup:function(a){return c("#jQUi").popup(a)},blockUI:function(a){c.blockUI(a)},unblockUI:function(){c.unblockUI()},
removeFooterMenu:function(){jq("#navbar").hide();jq("#content").css("bottom","0px");this.showNavMenu=!1},showNavMenu:!0,autoLaunch:!0,showBackbutton:!0,backButtonText:"",resetScrollers:!0,ready:function(a){this.launchCompleted?a():document.addEventListener("jq.ui.ready",function(c){a();this.removeEventListener("jq.ui.ready",arguments.callee)},!1)},setBackButtonStyle:function(a){jq("#backButton").get(0).className=a},goBack:function(){if(0<this.history.length){var a=this.history.pop();this.loadContent(a.target+
"",0,1,a.transition);this.transitionType=a.transition;this.updateHash(a.target)}},clearHistory:function(){this.history=[];this.setBackButtonVisibility(!1)},pushHistory:function(a,e,d,f){this.history.push({target:a,transition:d});try{window.history.pushState(e,e,g+"#"+e+f),c(window).trigger("hashchange",{newUrl:g+"#"+e+f,oldURL:g+a})}catch(h){}},updateHash:function(a){f=a=-1==a.indexOf("#")?"#"+a:a;var e=window.location.hash,d=this.getPanelId(a).substring(1);try{window.history.replaceState(d,d,g+a),
c(window).trigger("hashchange",{newUrl:g+a,oldUrl:g+e})}catch(n){}},getPanelId:function(a){var c=a.indexOf("/");return-1==c?a:a.substring(0,c)},updateBadge:function(a,c,d,f){void 0===d&&(d="");"#"!=a[0]&&(a="#"+a);var g=jq(a).find("span.jq-badge");0==g.length?("absolute"!=jq(a).css("position")&&jq(a).css("position","relative"),g=jq("<span class='jq-badge "+d+"'>"+c+"</span>"),jq(a).append(g)):g.html(c);jq.isObject(f)?g.css(f):f&&g.css("background",f);g.data("ignore-pressed","true")},removeBadge:function(a){jq(a).find("span.jq-badge").remove()},
toggleNavMenu:function(a){if(this.showNavMenu)if("none"!=jq("#navbar").css("display")&&(void 0!==a&&!0!==a||void 0===a))jq("#content").css("bottom","0px"),jq("#navbar").hide();else if(void 0===a||void 0!==a&&!0===a)jq("#navbar").show(),jq("#content").css("bottom",jq("#navbar").css("height"))},toggleHeaderMenu:function(a){if("none"!=jq("#header").css("display")&&(void 0!==a&&!0!==a||void 0===a))jq("#content").css("top","0px"),jq("#header").hide();else if(void 0===a||void 0!==a&&!0===a)jq("#header").show(),
a=numOnly(jq("#header").css("height")),jq("#content").css("top",a+"px")},toggleSideMenu:function(a,c){if(this.isSideMenuEnabled()&&!this.togglingSideMenu){this.togglingSideMenu=!0;var d=this,f=jq("#menu"),g=jq("#content, #menu, #header, #navbar");!f.hasClass("on")&&!f.hasClass("to-on")&&(void 0!==a&&!1!==a||void 0===a)?(f.show(),d.css3animate(g,{removeClass:"to-off off on",addClass:"to-on",complete:function(a){a?(d.togglingSideMenu=!1,c&&c(!0)):d.css3animate(g,{removeClass:"to-off off to-on",addClass:"on",
time:0,complete:function(){d.togglingSideMenu=!1;c&&c(!1)}})}})):(void 0===a||void 0!==a&&!1===a)&&d.css3animate(g,{removeClass:"on off to-on",addClass:"to-off",complete:function(a){a?(d.togglingSideMenu=!1,c&&c(!0)):d.css3animate(g,{removeClass:"to-off on to-on",addClass:"off",time:0,complete:function(){f.hide();d.togglingSideMenu=!1;c&&c(!1)}})}})}},disableSideMenu:function(){var a=jq("#content, #menu, #header, #navbar");this.isSideMenuOn()?this.toggleSideMenu(!1,function(c){c||a.removeClass("hasMenu")}):
a.removeClass("hasMenu")},enableSideMenu:function(){jq("#content, #menu, #header, #navbar").addClass("hasMenu")},isSideMenuEnabled:function(){return jq("#content").hasClass("hasMenu")},isSideMenuOn:function(){var a=jq("#menu");return this.isSideMenuEnabled()&&(a.hasClass("on")||a.hasClass("to-on"))},updateNavbarElements:function(a){var c=jq("#navbar");if(!(void 0===a||null==a)){if("string"==typeof a)return c.html(a,!0),null;c.html("");for(var d=0;d<a.length;d++){var f=a[d].cloneNode(!0);c.append(f)}a=
jq("#navbar a");0<a.length&&a.data("ignore-pressed","true").data("resetHistory","true")}},updateHeaderElements:function(a){var c=jq("#header");if(!(void 0===a||null==a)){if("string"==typeof a)return c.html(a,!0),null;c.html("");for(var d=0;d<a.length;d++){var f=a[d].cloneNode(!0);c.append(f)}}},updateSideMenu:function(a){var c=this,d=jq("#menu_scroller");if(!(void 0===a||null==a)){if("string"==typeof a)d.html(a,!0);else{d.html("");var f=document.createElement("a");f.className="closebutton jqMenuClose";
f.href="javascript:;";f.onclick=function(){c.toggleSideMenu(!1)};d.append(f);f=document.createElement("div");f.className="jqMenuHeader";f.innerHTML="Menu";d.append(f);for(f=0;f<a.length;f++){var g=a[f].cloneNode(!0);d.append(g)}}this.scrollingDivs.menu_scroller.hideScrollbars();this.scrollingDivs.menu_scroller.scrollToTop()}},setTitle:function(a){jq("#header #pageTitle").html(a)},setBackButtonText:function(a){0<this.backButtonText.length?jq("#header #backButton").html(this.backButtonText):jq("#header #backButton").html(a)},
setBackButtonVisibility:function(a){a?jq("#header #backButton").css("visibility","visible"):jq("#header #backButton").css("visibility","hidden")},showMask:function(a){a||(a="Loading Content");jq("#jQui_mask>h1").html(a);jq("#jQui_mask").show()},hideMask:function(){jq("#jQui_mask").hide()},showModal:function(a){a="#"+a.replace("#","");try{jq(a)&&(jq("#modalContainer").html(c.feat.nativeTouchScroll?jq(a).html():jq(a).get(0).childNodes[0].innerHTML+"",!0),jq("#modalContainer").append("<a href='javascript:;' onclick='$.ui.hideModal();' class='closebutton modalbutton'></a>"),
this.modalWindow.style.display="block",content=button=null,this.scrollingDivs.modal_container.enable(this.resetScrollers),this.scrollToTop("modal"),jq("#modalContainer").data("panel",a))}catch(e){console.log("Error with modal - "+e,this.modalWindow)}},hideModal:function(){c("#modalContainer").html("",!0);jq("#jQui_modal").hide();this.scrollingDivs.modal_container.disable();var a=c(c("#modalContainer").data("panel")),e=a.data("unload");if("string"==typeof e&&window[e])window[e](a.get(0));a.trigger("unloadpanel")},
updateContentDiv:function(a,e){a="#"+a.replace("#","");var d=jq(a).get(0);if(d){var f=document.createElement("div");f.innerHTML=e;c(f).children(".panel")&&0<c(f).children(".panel").length&&(f=c(f).children(".panel").get());d.getAttribute("js-scrolling")&&"yes"==d.getAttribute("js-scrolling").toLowerCase()?(c.cleanUpContent(d.childNodes[0],!1,!0),d.childNodes[0].innerHTML=e):(c.cleanUpContent(d,!1,!0),d.innerHTML=e);c(f).title&&(d.title=c(f).title)}},addContentDiv:function(a,e,d,f,g){a="string"!==
typeof a?a:-1==a.indexOf("#")?"#"+a:a;var b=jq(a).get(0);b||(b=document.createElement("div"),b.innerHTML=e,c(b).children(".panel")&&0<c(b).children(".panel").length&&(b=c(b).children(".panel").get()),!b.title&&d&&(b.title=d),e=b.id?b.id:a.replace("#",""),b.id=e,b.id!=a&&b.setAttribute("data-crc",a.replace("#","")));b.className="panel";e=b.id;this.addDivAndScroll(b,f,g);return e},addDivAndScroll:function(a,e,d,f){var g=!1,b=a.style.overflow,b="hidden"!=b&&"visible"!=b;f=f||this.content;!c.feat.nativeTouchScroll&&
b&&a.setAttribute("js-scrolling","yes");a.getAttribute("js-scrolling")&&"yes"==a.getAttribute("js-scrolling").toLowerCase()&&(b=g=!0);a.getAttribute("scrolling")&&"no"==a.getAttribute("scrolling")&&(g=b=!1,a.removeAttribute("js-scrolling"));if(g)h=a.cloneNode(!1),a.title=null,a.id=null,a.removeAttribute("data-footer"),a.removeAttribute("data-nav"),a.removeAttribute("data-header"),a.removeAttribute("selected"),a.removeAttribute("data-load"),a.removeAttribute("data-unload"),a.removeAttribute("data-tab"),
jq(a).replaceClass("panel","jqmScrollPanel"),h.appendChild(a),f.appendChild(h),!1!==this.selectBox&&this.selectBox.getOldSelects(h.id),!1!==this.passwordBox&&this.passwordBox.getOldPasswords(h.id);else{f.appendChild(a);var h=a;a.style["-webkit-overflow-scrolling"]="none"}b&&(this.scrollingDivs[h.id]=jq(a).scroller({scrollBars:!0,verticalScroll:!0,horizontalScroll:!1,vScrollCSS:"jqmScrollbar",refresh:e,useJsScroll:g,noParent:!g,autoEnable:!1}),d&&c.bind(this.scrollingDivs[h.id],"refresh-release",function(a){a&&
d()}));h=a=null},scrollToTop:function(a){this.scrollingDivs[a]&&this.scrollingDivs[a].scrollToTop("300ms")},scrollToBottom:function(a){this.scrollingDivs[a]&&this.scrollingDivs[a].scrollToBottom("300ms")},parsePanelFunctions:function(a,e){var d=a.getAttribute("data-footer"),f=a.getAttribute("data-header");d&&"none"==d.toLowerCase()?this.toggleNavMenu(!1):this.toggleNavMenu(!0);d&&this.customFooter!=d?(this.customFooter=d,this.updateNavbarElements(jq("#"+d).children())):d!=this.customFooter&&(this.customFooter&&
this.updateNavbarElements(this.defaultFooter),this.customFooter=!1);f&&"none"==f.toLowerCase()?this.toggleHeaderMenu(!1):this.toggleHeaderMenu(!0);f&&this.customHeader!=f?(this.customHeader=f,this.updateHeaderElements(jq("#"+f).children())):f!=this.customHeader&&(this.customHeader&&(this.updateHeaderElements(this.defaultHeader),this.setTitle(this.activeDiv.title)),this.customHeader=!1);a.getAttribute("data-tab")&&(jq("#navbar a").removeClass("selected"),jq("#"+a.getAttribute("data-tab")).addClass("selected"));
d=c(a).find("footer");0<d.length&&(this.customFooter=a.id,this.updateNavbarElements(d.children()));d=c(a).find("header");0<d.length&&(this.customHeader=a.id,this.updateHeaderElements(d.children()));a.getAttribute("data-tab")&&(jq("#navbar a").removeClass("selected"),jq("#navbar #"+a.getAttribute("data-tab")).addClass("selected"));(d=a.getAttribute("data-nav"))&&this.customMenu!=d?(this.customMenu=d,this.updateSideMenu(jq("#"+d).children())):d!=this.customMenu&&(this.customMenu&&this.updateSideMenu(this.defaultMenu),
this.customMenu=!1);if(e){d=e.getAttribute("data-unload");if("string"==typeof d&&window[d])window[d](e);c(e).trigger("unloadpanel")}d=a.getAttribute("data-load");if("string"==typeof d&&window[d])window[d](a);c(a).trigger("loadpanel");this.isSideMenuOn()&&this.toggleSideMenu(!1)},parseScriptTags:function(a){a&&c.parseJS(a)},loadContent:function(a,c,d,f,g){if(this.doingTransition)this.loadContentQueue.push([a,c,d,f,g]);else if(0!==a.length){what=null;var b=!0;g=g||document.createElement("a");if(-1==
a.indexOf("#")){var h="url"+p(a),k=jq("div.panel[data-crc='"+h+"']");0<jq("#"+a).length?b=!1:0<k.length?(b=!1,"true"===g.getAttribute("data-refresh-ajax")||g.refresh&&!0===g.refresh||this.isAjaxApp?b=!0:a="#"+k.get(0).id):0<jq("#"+h).length&&(b=!1,"true"===g.getAttribute("data-refresh-ajax")||g.refresh&&!0===g.refresh||this.isAjaxApp?b=!0:a="#"+h)}-1==a.indexOf("#")&&b?this.loadAjax(a,c,d,f,g):this.loadDiv(a,c,d,f)}},loadDiv:function(a,e,d,g){var h=this;what=a.replace("#","");var b=what.indexOf("/"),
k="";-1!=b&&(k=what.substr(b),what=what.substr(0,b));what=jq("#"+what).get(0);if(!what)return console.log("Target: "+a+" was not found");if(what==this.activeDiv&&!d)this.isSideMenuOn()&&this.toggleSideMenu(!1);else{this.transitionType=g;var q=this.activeDiv;a=what;if("true"==what.getAttribute("data-modal")||"true"==what.getAttribute("modal")){e=what.getAttribute("data-load");if("string"==typeof e&&window[e])window[e](what);c(what).trigger("loadpanel");return this.showModal(what.id)}q!=a&&(e?(this.clearHistory(),
this.pushHistory("#"+this.firstDiv.id,what.id,g,k)):d||this.pushHistory(f,what.id,g,k),f="#"+what.id+k,this.doingTransition=!0,q.style.display="block",a.style.display="block",this.runTransition(g,q,a,d),this.parsePanelFunctions(what,q),this.loadContentData(what,e,d,g),h=this,setTimeout(function(){h.scrollingDivs[q.id]&&h.scrollingDivs[q.id].disable()},200))}},loadContentData:function(a,c,d,f){d?0<this.history.length&&(d=this.history[this.history.length-1],f=d.target.indexOf("/"),d=-1!=f?d.target.substr(0,
f):d.target,(d=jq(d).get(0))?this.setBackButtonText(d.title):this.setBackButtonText("Back")):this.activeDiv.title?this.setBackButtonText(this.activeDiv.title):this.setBackButtonText("Back");a.title&&this.setTitle(a.title);c&&this.setBackButtonText(this.firstDiv.title);0==this.history.length?(this.setBackButtonVisibility(!1),this.history=[]):this.showBackbutton&&this.setBackButtonVisibility(!0);this.activeDiv=a;this.scrollingDivs[this.activeDiv.id]&&this.scrollingDivs[this.activeDiv.id].enable(this.resetScrollers)},
loadAjax:function(a,c,d,f,g){if(!("jQui_ajax"==this.activeDiv.id&&a==this.ajaxUrl)){var b="url"+p(a),h=this;-1==a.indexOf("http")&&(a=AppMobi.webRoot+a);var k=new XMLHttpRequest;k.onreadystatechange=function(){if(4==k.readyState&&200==k.status){var q=this.doingTransition=!1;if(0<jq("#"+b).length)h.updateContentDiv(b,k.responseText),jq("#"+b).get(0).title=g.title?g.title:a;else if(g.getAttribute("data-persist-ajax")||h.isAjaxApp){var p="true"===g.getAttribute("data-pull-scroller")?!0:!1;refreshFunction=
p?function(){g.refresh=!0;h.loadContent(a,c,d,f,g);g.refresh=!1}:null;b=h.addContentDiv(b,k.responseText,g.title?g.title:a,p,refreshFunction)}else h.updateContentDiv("jQui_ajax",k.responseText),jq("#jQui_ajax").get(0).title=g.title?g.title:a,h.loadContent("#jQui_ajax",c,d),q=!0;p=document.createElement("div");p.innerHTML=k.responseText;h.parseScriptTags(p);if(q)h.showLoading&&h.hideMask();else return h.loadContent("#"+b),h.showLoading&&h.hideMask(),null}};ajaxUrl=a;var q=this.useAjaxCacheBuster?a+
(a.split("?")[1]?"&":"?")+"cache="+1E16*Math.random():a;k.open("GET",q,!0);k.setRequestHeader("X-Requested-With","XMLHttpRequest");k.send();this.showLoading&&this.showMask()}},runTransition:function(a,c,d,f){this.availableTransitions[a]||(a="default");this.availableTransitions[a].call(this,c,d,f)},launch:function(){if(!1==this.hasLaunched||this.launchCompleted)this.hasLaunched=!0;else{var a=this;this.isAppMobi=window.AppMobi&&"object"==typeof AppMobi&&void 0!==AppMobi.app?!0:!1;this.viewportContainer=
jq("#jQUi");this.navbar=jq("#navbar").get(0);this.content=jq("#content").get(0);this.header=jq("#header").get(0);this.menu=jq("#menu").get(0);this.viewportContainer[0].addEventListener("click",function(a){q(a,a.target)},!1);var e=null;c.bind(c.touchLayer,"enter-edit",function(a){e=a});c.bind(c.touchLayer,"enter-edit-reshape",function(){var b=c(e),d=b.closest(a.activeDiv);if(d&&0<d.size())if(c.os.ios||c.os.chrome){var f;f=document.body.scrollTop?document.body.scrollTop-d.offset().top:0;b=d.offset().bottom-
b.offset().bottom;a.scrollingDivs[a.activeDiv.id].setPaddings(f,b)}else if(c.os.android||c.os.blackberry)f=b.offset(),d=d.offset(),f.bottom>d.bottom&&f.height<d.height&&a.scrollingDivs[a.activeDiv.id].scrollToItem(b,"bottom")});c.os.ios&&c.bind(c.touchLayer,"exit-edit-reshape",function(){a.scrollingDivs[a.activeDiv.id].setPaddings(0,0)});this.navbar||(this.navbar=document.createElement("div"),this.navbar.id="navbar",this.navbar.style.cssText="display:none",this.viewportContainer.append(this.navbar));
this.header||(this.header=document.createElement("div"),this.header.id="header",this.viewportContainer.prepend(this.header));this.menu||(this.menu=document.createElement("div"),this.menu.id="menu",this.menu.innerHTML='<div id="menu_scroller"></div>',this.viewportContainer.append(this.menu),this.menu.style.overflow="hidden",this.scrollingDivs.menu_scroller=jq("#menu_scroller").scroller({scrollBars:!0,verticalScroll:!0,vScrollCSS:"jqmScrollbar",useJsScroll:!c.feat.nativeTouchScroll,noParent:c.feat.nativeTouchScroll}),
c.feat.nativeTouchScroll&&c("#menu_scroller").css("height","100%"));this.content||(this.content=document.createElement("div"),this.content.id="content",this.viewportContainer.append(this.content));this.header.innerHTML='<a id="backButton"  href="javascript:;"></a> <h1 id="pageTitle"></h1>'+header.innerHTML;this.backButton=c("#header #backButton").get(0);this.backButton.className="button";jq(document).on("click","#header #backButton",function(b){b.preventDefault();a.goBack()});this.backButton.style.visibility=
"hidden";this.titleBar=c("#header #pageTitle").get(0);this.addContentDiv("jQui_ajax","");var d=document.createElement("div");d.id="jQui_mask";d.className="ui-loader";d.innerHTML="<span class='ui-icon ui-icon-loading spin'></span><h1>Loading Content</h1>";d.style.zIndex=2E4;d.style.display="none";document.body.appendChild(d);d=document.createElement("div");d.id="jQui_modal";this.viewportContainer.prepend(d);d.appendChild(jq("<div id='modalContainer'></div>").get());this.scrollingDivs.modal_container=
jq("#modalContainer").scroller({scrollBars:!0,vertical:!0,vScrollCSS:"jqmScrollbar",noParent:!0});this.modalWindow=d;for(var g={},d=this.viewportContainer.get().querySelectorAll(".panel"),h=0;h<d.length;h++){var b=d[h],s=b,p,D=b.previousSibling;b.parentNode&&"content"!=b.parentNode.id?(b.parentNode.removeChild(b),p=b.id,s.getAttribute("selected")&&(this.firstDiv=jq("#"+p).get(0)),this.addDivAndScroll(s),jq("#"+p).insertAfter(D)):b.parsedContent||(b.parsedContent=1,b.parentNode.removeChild(b),p=b.id,
s.getAttribute("selected")&&(this.firstDiv=jq("#"+p).get(0)),this.addDivAndScroll(s),jq("#"+p).insertAfter(D));b.getAttribute("data-defer")&&(g[p]=b.getAttribute("data-defer"));this.firstDiv||(this.firstDiv=c("#"+p).get(0));b=null}var d=null,y=!1,C=Object.keys(g).length;if(0<C){var y=!0,r=0,t;for(t in g)(function(b){jq.ajax({url:AppMobi.webRoot+g[b],success:function(d){0!=d.length&&(c.ui.updateContentDiv(b,d),a.parseScriptTags(jq(b).get()),r++,r>=C&&(c(document).trigger("defer:loaded"),y=!1))},error:function(a){console.log("Error with deferred load "+
AppMobi.webRoot+g[b]);r++;r>=C&&(c(document).trigger("defer:loaded"),y=!1)}})})(t)}if(this.firstDiv)if(a=this,this.activeDiv=this.firstDiv,this.scrollingDivs[this.activeDiv.id]&&this.scrollingDivs[this.activeDiv.id].enable(),p=function(){0<jq("#navbar a").length&&(jq("#navbar a").data("ignore-pressed","true").data("resetHistory","true"),a.defaultFooter=jq("#navbar").children().clone(),a.updateNavbarElements(a.defaultFooter));var b=jq("nav").get();b&&(a.defaultMenu=jq(b).children().clone(),a.updateSideMenu(a.defaultMenu));
a.defaultHeader=jq("#header").children().clone();jq("#navbar").on("click","a",function(a){jq("#navbar a").not(this).removeClass("selected");c(a.target).addClass("selected")});b=a.getPanelId(k);0<b.length&&a.loadDefaultHash&&b!="#"+a.firstDiv.id&&0<c(b).length?a.loadContent(k,!0,!1,"none"):(f="#"+a.firstDiv.id,a.parsePanelFunctions(a.firstDiv),a.loadContentData(a.firstDiv),a.firstDiv.style.display="block",c("#header #backButton").css("visibility","hidden"),("true"==a.firstDiv.getAttribute("data-modal")||
"true"==a.firstDiv.getAttribute("modal"))&&a.showModal(a.firstDiv.id));a.launchCompleted=!0;0<jq("nav").length&&(jq("#jQUi #header").addClass("hasMenu off"),jq("#jQUi #content").addClass("hasMenu off"),jq("#jQUi #navbar").addClass("hasMenu off"));jq(document).trigger("jq.ui.ready");jq("#splashscreen").remove()},y)c(document).one("defer:loaded",p);else p();a=this;c.bind(a,"content-loaded",function(){if(0<a.loadContentQueue.length){var b=a.loadContentQueue.splice(0,1)[0];a.loadContent(b[0],b[1],b[2],
b[3],b[4])}});window.navigator.standalone&&this.blockPageScroll();this.topClickScroll()}},topClickScroll:function(){document.getElementById("header").addEventListener("click",function(a){15>=a.clientY&&"h1"==a.target.nodeName.toLowerCase()&&c.ui.scrollingDivs[c.ui.activeDiv.id].scrollToTop("100")})},blockPageScroll:function(){jq("#jQUi #header").bind("touchmove",function(a){a.preventDefault()})},noTransition:function(a,c,d){c.style.display="block";a.style.display="block";this.clearAnimations(c);this.css3animate(a,
{x:"0%",y:0});this.finishTransition(a);c.style.zIndex=2;a.style.zIndex=1},finishTransition:function(a,e){a.style.display="none";this.doingTransition=!1;e&&this.clearAnimations(e);a&&this.clearAnimations(a);c.trigger(this,"content-loaded")},clearAnimations:function(a){a.style[c.feat.cssPrefix+"Transform"]="none";a.style[c.feat.cssPrefix+"Transition"]="none"}};var q=function(a,c){if(c!=jQUi){if("a"!=c.tagName.toLowerCase()&&c.parentNode)return q(a,c.parentNode);if("undefined"!==c.tagName&&"a"==c.tagName.toLowerCase()){if(!1!==
("function"==typeof jq.ui.customClickHandler?jq.ui.customClickHandler:!1)&&jq.ui.customClickHandler(c))return a.preventDefault();if(!(-1!==c.href.toLowerCase().indexOf("javascript:")||c.getAttribute("data-ignore"))){if(0===c.href.indexOf("tel:"))return!1;if(-1===c.hash.indexOf("#")&&0<c.target.length)0!=c.href.toLowerCase().indexOf("javascript:")&&(jq.ui.isAppMobi?(a.preventDefault(),AppMobi.device.launchExternal(c.href)):jq.os.desktop||(a.target.target="_blank"));else{var d=c.href,f=location.protocol+
"//"+location.hostname+":"+location.port;0===d.indexOf(f)&&(d=d.substring(f.length+1));if(!("#"==d||d.indexOf("#")===d.length-1||0==d.length&&0==c.hash.length)){a.preventDefault();var f=c.getAttribute("data-transition"),g=c.getAttribute("data-resetHistory"),g=g&&"true"==g.toLowerCase()?!0:!1,d=0<c.hash.length?c.hash:c.href;jq.ui.loadContent(d,g,0,f,c)}}}}}},p=function(a,c){void 0==c&&(c=0);var d=0,d=0;c^=-1;for(var f=0,g=a.length;f<g;f++)d=(c^a.charCodeAt(f))&255,d="0x"+"00000000 77073096 EE0E612C 990951BA 076DC419 706AF48F E963A535 9E6495A3 0EDB8832 79DCB8A4 E0D5E91E 97D2D988 09B64C2B 7EB17CBD E7B82D07 90BF1D91 1DB71064 6AB020F2 F3B97148 84BE41DE 1ADAD47D 6DDDE4EB F4D4B551 83D385C7 136C9856 646BA8C0 FD62F97A 8A65C9EC 14015C4F 63066CD9 FA0F3D63 8D080DF5 3B6E20C8 4C69105E D56041E4 A2677172 3C03E4D1 4B04D447 D20D85FD A50AB56B 35B5A8FA 42B2986C DBBBC9D6 ACBCF940 32D86CE3 45DF5C75 DCD60DCF ABD13D59 26D930AC 51DE003A C8D75180 BFD06116 21B4F4B5 56B3C423 CFBA9599 B8BDA50F 2802B89E 5F058808 C60CD9B2 B10BE924 2F6F7C87 58684C11 C1611DAB B6662D3D 76DC4190 01DB7106 98D220BC EFD5102A 71B18589 06B6B51F 9FBFE4A5 E8B8D433 7807C9A2 0F00F934 9609A88E E10E9818 7F6A0DBB 086D3D2D 91646C97 E6635C01 6B6B51F4 1C6C6162 856530D8 F262004E 6C0695ED 1B01A57B 8208F4C1 F50FC457 65B0D9C6 12B7E950 8BBEB8EA FCB9887C 62DD1DDF 15DA2D49 8CD37CF3 FBD44C65 4DB26158 3AB551CE A3BC0074 D4BB30E2 4ADFA541 3DD895D7 A4D1C46D D3D6F4FB 4369E96A 346ED9FC AD678846 DA60B8D0 44042D73 33031DE5 AA0A4C5F DD0D7CC9 5005713C 270241AA BE0B1010 C90C2086 5768B525 206F85B3 B966D409 CE61E49F 5EDEF90E 29D9C998 B0D09822 C7D7A8B4 59B33D17 2EB40D81 B7BD5C3B C0BA6CAD EDB88320 9ABFB3B6 03B6E20C 74B1D29A EAD54739 9DD277AF 04DB2615 73DC1683 E3630B12 94643B84 0D6D6A3E 7A6A5AA8 E40ECF0B 9309FF9D 0A00AE27 7D079EB1 F00F9344 8708A3D2 1E01F268 6906C2FE F762575D 806567CB 196C3671 6E6B06E7 FED41B76 89D32BE0 10DA7A5A 67DD4ACC F9B9DF6F 8EBEEFF9 17B7BE43 60B08ED5 D6D6A3E8 A1D1937E 38D8C2C4 4FDFF252 D1BB67F1 A6BC5767 3FB506DD 48B2364B D80D2BDA AF0A1B4C 36034AF6 41047A60 DF60EFC3 A867DF55 316E8EEF 4669BE79 CB61B38C BC66831A 256FD2A0 5268E236 CC0C7795 BB0B4703 220216B9 5505262F C5BA3BBE B2BD0B28 2BB45A92 5CB36A04 C2D7FFA7 B5D0CF31 2CD99E8B 5BDEAE1D 9B64C2B0 EC63F226 756AA39C 026D930A 9C0906A9 EB0E363F 72076785 05005713 95BF4A82 E2B87A14 7BB12BAE 0CB61B38 92D28E9B E5D5BE0D 7CDCEFB7 0BDBDF21 86D3D2D4 F1D4E242 68DDB3F8 1FDA836E 81BE16CD F6B9265B 6FB077E1 18B74777 88085AE6 FF0F6A70 66063BCA 11010B5C 8F659EFF F862AE69 616BFFD3 166CCF45 A00AE278 D70DD2EE 4E048354 3903B3C2 A7672661 D06016F7 4969474D 3E6E77DB AED16A4A D9D65ADC 40DF0B66 37D83BF0 A9BCAE53 DEBB9EC5 47B2CF7F 30B5FFE9 BDBDF21C CABAC28A 53B39330 24B4A3A6 BAD03605 CDD70693 54DE5729 23D967BF B3667A2E C4614AB8 5D681B02 2A6F2B94 B40BBE37 C30C8EA1 5A05DF1B 2D02EF8D".substr(9*
d,8),c=c>>>8^d;return c^-1};c.ui=new h})(jq);
(function(c){c(document).one("appMobi.device.ready",function(){setTimeout(function(){document.getElementById("jQUi").style.height="100%";document.body.style.height="100%";document.documentElement.style.minHeight=window.innerHeight},300);c.ui.ready(function(){c.ui.blockPageScroll()})});c.feat.nativeTouchScroll&&document.addEventListener("orientationchange",function(g){if(c.ui.scrollingDivs[c.ui.activeDiv.id]){var k=c.ui.scrollingDivs[c.ui.activeDiv.id];0==k.el.scrollTop&&(k.disable(),setTimeout(function(){k.enable()},
300))}})})(jq);
(function(c){c.availableTransitions.fade=function(c,k,f){c.style.display="block";k.style.display="block";var h=this;f?(k.style.zIndex=1,c.style.zIndex=2,h.clearAnimations(k),h.css3animate(c,{x:"0%",time:"150ms",opacity:0.1,complete:function(f){f?h.finishTransition(c,k):(h.css3animate(c,{x:"-100%",opacity:1,complete:function(){h.finishTransition(c)}}),k.style.zIndex=2,c.style.zIndex=1)}})):(c.style.zIndex=1,k.style.zIndex=2,k.style.opacity=0,h.css3animate(k,{x:"0%",opacity:0.1,complete:function(){h.css3animate(k,{x:"0%",
time:"150ms",opacity:1,complete:function(f){f?h.finishTransition(c,k):(h.clearAnimations(k),h.css3animate(c,{x:"-100%",y:0,complete:function(){h.finishTransition(c)}}))}})}}))}})(jq.ui);
(function(c){c.availableTransitions.flip=function(c,k,f){c.style.display="block";k.style.display="block";var h=this;f?(h.css3animate(k,{x:"100%",scale:0.8,rotateY:"180deg",complete:function(){h.css3animate(k,{x:"0%",scale:1,time:"150ms",rotateY:"0deg",complete:function(){h.clearAnimations(k)}})}}),h.css3animate(c,{x:"100%",time:"150ms",scale:0.8,rotateY:"180deg",complete:function(){h.css3animate(c,{x:"-100%",opacity:1,scale:1,rotateY:"0deg",complete:function(){h.finishTransition(c)}});k.style.zIndex=
2;c.style.zIndex=1}})):(c.style.zIndex=1,k.style.zIndex=2,h.css3animate(c,{x:"100%",time:"150ms",scale:0.8,rotateY:"180deg",complete:function(){h.css3animate(c,{x:"-100%",y:0,time:"1ms",scale:1,rotateY:"0deg",complete:function(){h.finishTransition(c)}})}}),h.css3animate(k,{x:"100%",time:"1ms",scale:0.8,rotateY:"180deg",complete:function(){h.css3animate(k,{x:"0%",time:"150ms",scale:1,rotateY:"0deg",complete:function(){h.clearAnimations(k)}})}}))}})(jq.ui);
(function(c){c.availableTransitions.pop=function(c,k,f){c.style.display="block";k.style.display="block";var h=this;f?(k.style.zIndex=1,c.style.zIndex=2,h.clearAnimations(k),h.css3animate(c,{x:"0%",time:"150ms",opacity:0.1,scale:0.2,origin:"-50% 50%",complete:function(f){f?h.finishTransition(c):(h.css3animate(c,{x:"-100%",complete:function(){h.finishTransition(c)}}),k.style.zIndex=2,c.style.zIndex=1)}})):(c.style.zIndex=1,k.style.zIndex=2,h.css3animate(k,{x:"0%",y:"0%",scale:0.2,origin:"-50% 50%",
opacity:0.1,complete:function(){h.css3animate(k,{x:"0%",time:"150ms",scale:1,opacity:1,origin:"0% 0%",complete:function(f){f?h.finishTransition(c,k):(h.clearAnimations(k),h.css3animate(c,{x:"100%",y:0,complete:function(){h.finishTransition(c)}}))}})}}))}})(jq.ui);
(function(c){function g(c,f,g){c.style.display="block";f.style.display="block";var q=this;g?q.css3animate(c,{x:"0%",y:"0%",complete:function(){q.css3animate(c,{x:"100%",time:"150ms",complete:function(){q.finishTransition(c,f)}}).link(f,{x:"0%",time:"150ms"})}}).link(f,{x:"-100%",y:"0%"}):q.css3animate(c,{x:"0%",y:"0%",complete:function(){q.css3animate(c,{x:"-100%",time:"150ms",complete:function(){q.finishTransition(c,f)}}).link(f,{x:"0%",time:"150ms"})}}).link(f,{x:"100%",y:"0%"})}c.availableTransitions.slide=
g;c.availableTransitions["default"]=g})(jq.ui);
(function(c){c.availableTransitions.down=function(c,k,f){c.style.display="block";k.style.display="block";var h=this;f?(k.style.zIndex=1,c.style.zIndex=2,h.clearAnimations(k),h.css3animate(c,{y:"-100%",x:"0%",time:"150ms",complete:function(f){f?h.finishTransition(c,k):(h.css3animate(c,{x:"-100%",y:0,complete:function(){h.finishTransition(c)}}),k.style.zIndex=2,c.style.zIndex=1)}})):(c.style.zIndex=1,k.style.zIndex=2,h.css3animate(k,{y:"-100%",x:"0%",complete:function(){h.css3animate(k,{y:"0%",x:"0%",
time:"150ms",complete:function(f){f?h.finishTransition(c,k):(h.clearAnimations(k),h.css3animate(c,{x:"-100%",y:0,complete:function(){h.finishTransition(c)}}))}})}}))}})(jq.ui);
(function(c){c.availableTransitions.up=function(c,k,f){c.style.display="block";k.style.display="block";var h=this;f?(k.style.zIndex=1,c.style.zIndex=2,h.clearAnimations(k),h.css3animate(c,{y:"100%",x:"0%",time:"150ms",complete:function(){h.finishTransition(c);k.style.zIndex=2;c.style.zIndex=1}})):(k.style.zIndex=2,c.style.zIndex=1,h.css3animate(k,{y:"100%",x:"0%",complete:function(){h.css3animate(k,{y:"0%",x:"0%",time:"150ms",complete:function(f){f?h.finishTransition(c,k):(h.clearAnimations(k),h.css3animate(c,
{x:"-100%",y:0,complete:function(){h.finishTransition(c)}}))}})}}))}})(jq.ui);

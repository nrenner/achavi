/**
 * class Loader
 */
function Loader(map, layers, status) {
    this.map = map;
    this.layers = layers;
    this.status = status;

    // Maximum length of XHR responseText. Larger responses are likely to crash the browser, 
    // either immediately or on subsequent requests with the same size. 
    // Approximate limit determined by trial and error. 
    this.responseSizeLimit = 50000000;

    var formatOptions = {
        internalProjection : map.getProjectionObject()
    };
    this.formatRegistry = new FormatRegistry(formatOptions);

    // register global events to get handlers called with options parameter,
    // containing config and requestUrl instead of just request
    /*
    OpenLayers.Request.events.on({
        success : success,
        failure : failure
    });
    */

    // Reuse XHR instance, seems to reduce memory overhead for subsequent, large requests.
    // Can handle only one request at a time. For now, reuse one instance only and
    // create new one when needed (see GET), later include library with instance pool.
    this.xhr = new XMLHttpRequest();
}

Loader.prototype.handleLoad = function(doc, fileNameOrUrl, options) {

    if (typeof doc == "string") {
        doc = OpenLayers.Format.XML.prototype.read.apply(this, [ doc ]);
    }

    var desc = this.formatRegistry.getFormat(doc);
    var format = desc.format;
    var oscFeatures = [];
    var osmFeatures = [];
    console.timeEnd("xml");
    if (format) {
        if (desc.type === 'osmChangeset') {
            this.layers.changesets.addFeatures(format.read(doc));
            // TODO read corresponding diff
            this.map.zoomToExtent(changesets.getDataExtent());
        } else {
            console.time("read");
            if (desc.type === 'osm') {
                osmFeatures = format.read(doc);

                // TODO sync separate file loading
                // oscFeatures = oscFormat.read(oscResponse, osmXml);
            } else if (desc.type === 'osmAugmentedDiff_IDSorted') {
                var obj = format.readAugmenting(doc);
                osmFeatures = obj.old;
                oscFeatures = obj.change;
                // YYYY-MM-DDTHH\:mm\:ssZ
                this.status.timestamp = null;
                if (obj.timestamp) {
                    this.status.timestamp = moment(obj.timestamp, 'YYYY-MM-DDTHH[\\]:mm[\\]:ssZ').valueOf();
                } 
                console.log(obj.timestamp);
            } else {
                console.warn('deprecated diff format returned');
                if (format.isAugmented(doc)) {
                    osmFeatures = format.readAugmenting(doc);
                }
                oscFeatures = format.read(doc);
            }
            console.timeEnd("read");

            console.time("setActions");
            oscviewer.setActions(oscFeatures, osmFeatures);
            console.timeEnd("setActions");

            console.time("addFeatures");
            this.layers.old.addFeatures(osmFeatures);
            this.layers.changes.addFeatures(oscFeatures);
            console.timeEnd("addFeatures");

            this.status.addChanges(oscFeatures.length);
            console.log('features added: changes = ' + oscFeatures.length + ', old = ' + osmFeatures.length
                    + ' - total: changes = ' + this.layers.changes.features.length + ', old = ' + this.layers.old.features.length);

            // Chrome memory debugging, requires "--enable-memory-info" command-line argument
            if (performance && performance.memory) {
                var m = performance.memory;
                console.log('memory: used=' + m.usedJSHeapSize + ', total=' + m.totalJSHeapSize + ', limit=' + m.jsHeapSizeLimit);
            }

            if (!(options && options.zoomToExtent === false)) {
                this.map.zoomToExtent(this.layers.changes.getDataExtent());
            }
        }
    }
};

// options - {Object} Hash containing request, config and requestUrl keys
Loader.prototype.success = function(options) {
    var response;
    // only handle when no success handler defined for this request
    if (!options.config.success) {
        console.timeEnd("request");
        console.time("xml");
        var request = options.request;
        var requestUrl = options.requestUrl;
        // console.log('headers: ' request.getAllResponseHeaders());
        var len = request.responseText.length;
        if (len > 302) {
            console.log('size: ' + len);
        }
        response = request.responseXML || request.responseText;
        if (response) {
            this.handleLoad(response, requestUrl, options.config);
        } else {
            console.error('empty response for "' + requestUrl + '" (' + request.status + ' ' + request.statusText
                    + ')');
        }
    }
};

// options - {Object} Hash containing request, config and requestUrl keys
Loader.prototype.failure = function(options) {
    // only handle when no failure handler defined for this request
    if (!options.config.failure) {
        var request = options.request;
        var requestUrl = options.requestUrl;
        console.error('error loading "' + requestUrl + '" (' + request.status + ' ' + request.statusText + ')');
        this.status.errors++;
    }
};

//options - {Object} Hash containing request, config and requestUrl keys
Loader.prototype.postLoad = function(options) {
    if (options.config.postLoadCallback) {
        options.config.postLoadCallback();
    }
};

Loader.prototype.GET = function(config) {
    console.log("requesting " + config.url);
    console.time("request");

    //OpenLayers.Util.applyDefaults(config, {success: success, failure: failure});
    //OpenLayers.Request.GET(config);

    var url = config.url;

    /*
    //xhr.onprogress = (function () {
    xhr.onreadystatechange = (function () {
        var xhrDebug = new XHRDebug();
        return function(evt) {
            xhrDebug.log(this);
        };
    })();
    */

    var xhr = this.xhr;
    
    // If request instance is active (state not UNSENT or DONE)
    if (xhr.readyState != 0 && xhr.readyState != 4) {
        // create an additional temp. instance (reusing active instance would abort running request).
        // Needed when both live and forward/backward controls are active.
        xhr = new XMLHttpRequest();
    }
    
    xhr.open('GET', url);

    var self = this;
    xhr.onload = function(evt) {
        self.success({request: evt.target, config: config, requestUrl: config.url});
    };
    xhr.onprogress = function(evt) {
        if (this.readyState == 3) {
            // Abort loading of Request response when length of responseText > limit, in order
            // to avoid Browser crash. evt.total not set in our case (Overpass API).
            if (evt.loaded > self.responseSizeLimit) {
                console.error('abort response loading, size limit exceeded (' + self.responseSizeLimit + '), url = ' + config.url);
                self.status.errors++;
                this.abort();
            }
        }
    };
    xhr.onerror = function(evt) {
        self.failure({request: evt.target, config: config, requestUrl: config.url});
    };
    xhr.onloadend = function(evt) {
        self.postLoad({request: evt.target, config: config, requestUrl: config.url});
    };

    // text only, XML parsing done later for better control over memory issues
    xhr.overrideMimeType("text/plain");
    xhr.send();
};

/**
 * class Loader
 */
function Loader(map, layers, status) {
    this.map = map;
    this.layers = layers;
    this.status = status;

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
                this.status.timestamp = obj.timestamp;
            } else {
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
        response = request.responseXML || request.responseText;
        if (response) {
            this.handleLoad(response, requestUrl, options.config);
        } else {
            console.error('empty response for "' + requestUrl + '" (' + request.status + ' ' + request.statusText
                    + ')');
        }

        if (options.config.postLoadCallback) {
            options.config.postLoadCallback();
        }
        if (this.postLoadCallback) {
            this.postLoadCallback();
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

        if (options.config.postLoadCallback) {
            options.config.postLoadCallback();
        }
    }
};

Loader.prototype.GET = function(config) {
    console.log("requesting " + config.url);
    console.time("request");

    //OpenLayers.Util.applyDefaults(config, {success: success, failure: failure});
    //OpenLayers.Request.GET(config);

    var url = config.url;
    var xhr = new XMLHttpRequest();

    /*
    //xhr.onprogress = (function () {
    xhr.onreadystatechange = (function () {
        var xhrDebug = new XHRDebug();
        return function(evt) {
            xhrDebug.log(this);
        };
    })();
    */

    var self = this;
    xhr.onload = function(evt) {
        self.success({request: evt.target, config: config, requestUrl: config.url});
    };

    xhr.onerror = function(evt) {
        self.failure({request: evt.target, config: config, requestUrl: config.url});
    };

    xhr.open('GET', url);
    xhr.send();
};

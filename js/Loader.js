/**
 * class Loader
 */
function Loader(loadHandler) {

    // options - {Object} Hash containing request, config and requestUrl keys
    var success = function(options) {
        // only handle when no success handler defined for this request
        if (!options.config.success) {
            var request = options.request;
            var requestUrl = options.requestUrl;
            // console.log('headers: ' request.getAllResponseHeaders());
            var response = request.responseXML || request.responseText;
            if (response) {
                loadHandler(response, requestUrl, options.config);
            } else {
                console.error('empty response for "' + requestUrl + '" (' + request.status + ' ' + request.statusText
                        + ')');
            }
        }
    };

    // options - {Object} Hash containing request, config and requestUrl keys
    var failure = function(options) {
        // only handle when no failure handler defined for this request
        if (!options.config.failure) {
            var request = options.request;
            var requestUrl = options.requestUrl;
            console.error('error loading "' + requestUrl + '" (' + request.status + ' ' + request.statusText + ')');
        }
    };

    // register global events to get handlers called with options parameter,
    // containing config and requestUrl instead of just request
    OpenLayers.Request.events.on({
        success : success,
        failure : failure
    });
}

Loader.prototype.GET = function(config) {
    console.log("requesting " + config.url);
    console.time("request");

    //OpenLayers.Util.applyDefaults(config, {success: success, failure: failure});

    OpenLayers.Request.GET(config);
};

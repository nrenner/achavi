/**
 * class OverpassAPI
 */
function OverpassAPI(loader, bboxControl) {
    this.loader = loader;
    this.bboxControl = bboxControl;
    this.bbox = null;
    
    // http://www.overpass-api.de/augmented_diffs/000/008/066.osc.gz
    // http://www.overpass-api.de/augmented_diffs/id_sorted/000/028/706.osc.gz
    this.sequenceUrlRegex = /.*overpass-api\.de\/augmented_diffs(?:\/id_sorted|)\/([0-9]{3})\/([0-9]{3})\/([0-9]{3}).osc.gz/;
}

OverpassAPI.prototype.getSequenceUrl = function(sequence) {
    var s = sequence.toString();
    s = "000000000".substring(0, 9 - s.length) + s;
    var path = {
        a : s.substring(0, 3),
        b : s.substring(3, 6),
        c : s.substring(6, 9)
    };
    //var urlFormat = 'http://overpass-api.de/augmented_diffs/${a}/${b}/${c}.osc.gz';
    var urlFormat = 'http://overpass-api.de/augmented_diffs/id_sorted/${a}/${b}/${c}.osc.gz';
   
    var url = OpenLayers.String.format(urlFormat, path);
    return url;
};

OverpassAPI.prototype.parseSequence = function (request, url) {
    var sequence = -1;
    var response = request.responseText;
    if (response) {
        sequence = parseInt(response);
    } else {
        console.error('empty response for "' + url + '" (' + request.status + ' '
                + request.statusText + ')');
    }
    return sequence;
};

OverpassAPI.prototype.getCurrentSequence = function () {
    var sequence = -1;
    var url = "http://overpass-api.de/augmented_diffs/state.txt";

    OpenLayers.Request.GET({
        url: url,
        async: false, 
        // do not send X-Requested-With header (option added by olex.Request-patch)
        disableXRequestedWith: true,
        success: _.bind(function(request) {
            sequence = this.parseSequence(request, url);
        }, this)
    });        
    return sequence;
};

OverpassAPI.prototype.getSequenceByTime = function (timestamp, callback) {
    var osmBase = moment.utc(timestamp).format('YYYY-MM-DDTHH[\\]:mm[\\]:ss\\Z');
    console.log('load time: ' + osmBase);
    var url = 'http://overpass-api.de/api/augmented_state_by_date?osm_base=' + osmBase;
    console.log('requesting state ' + url);
    OpenLayers.Request.GET({
        url: url,
        async: true, 
        disableXRequestedWith: true,
        success: _.bind(function(request) {
            var sequence = this.parseSequence(request, url);
            callback(sequence);
        }, this)
    });        
};

OverpassAPI.prototype.getSequenceFromUrl = function (url) {
    return parseFloat(url.replace(this.sequenceUrlRegex, "$1$2$3"));
};

OverpassAPI.prototype.loadByUrl = function(url) {
    var sequence = this.getSequenceFromUrl(url);
    this.load(sequence);
};

OverpassAPI.prototype.load = function(sequence, postLoadCallback) {
    var bboxParam;
    if (sequence && sequence >= 0) {
        var url = "http://overpass-api.de/api/augmented_diff?id=" + sequence + "&info=no";
        //var url = getSequenceUrl(sequence);
        if (!this.bbox) {
            this.bbox = this.bboxControl.addBBoxFromViewPort();
        }
        bboxParam = OpenLayers.String.format('&bbox=${left},${bottom},${right},${top}', this.bbox);
        //console.log("box = " + bboxParam);
        url += bboxParam;
        this.loader.GET({
            url: url,
            // do not zoom to data extent after load; option forwarded to load handler
            // (option only forwarded when using success event instead of callback)
            zoomToExtent: false,
            // do not send X-Requested-With header (option added by olex.Request-patch)
            disableXRequestedWith: true,
            postLoadCallback: postLoadCallback
        });
    } else {
        console.log('invalid sequence: "' + sequence + '"');
    }
};

OverpassAPI.prototype.loadDiff = function(from, to, postLoadCallback) {
    var mindate = moment.utc(from).format('YYYY-MM-DDTHH:mm:ss\\Z'),
        maxdate = to ? moment.utc(to).format('YYYY-MM-DDTHH:mm:ss\\Z') : '',
        bboxParam,
        url,
        xhr;

    if (maxdate) {
        maxdate = ',"' + maxdate + '"';
    }

    var data_url = 'http://overpass-api.de/api_0750/interpreter';
    url = data_url + '?data=[adiff:"' + mindate + '"' + maxdate
        + '];(node(bbox);way(bbox);relation(bbox););out meta geom(bbox);'

    if (!this.bbox) {
      this.bbox = this.bboxControl.addBBoxFromViewPort();
    }
    bboxParam = OpenLayers.String.format('&bbox=${left},${bottom},${right},${top}', this.bbox);
    url += bboxParam;

    xhr = this.loader.GET({
        url: url,
        // do not zoom to data extent after load; option forwarded to load handler
        // (option only forwarded when using success event instead of callback)
        zoomToExtent: false,
        // do not send X-Requested-With header (option added by olex.Request-patch)
        disableXRequestedWith: true,
        postLoadCallback: postLoadCallback
    });
    return xhr;
};

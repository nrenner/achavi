(function() {

	var displayProjection = "EPSG:4326";

    var oldUrl = null;
    var changesUrl = null;

	var bboxParam = null;

    var hover;
    var renderers = [ "SVG" ]; // Canvas
    var formatRegistry = null;
    var oldSequence = -1;
    liveInterval = null;

    function addBaseLayers(map) {

        //OpenLayers.Layer.OSM.wrapDateLine = false;

        // reuse Bing resolutions 0-21 as client layer resolutions
        var resolutions = OpenLayers.Layer.Bing.prototype.serverResolutions;
        // OSM zoom levels: 0-18
        var serverResolutions = resolutions.slice(0, 19);

        map.addLayer(new OpenLayers.Layer.OSM("MapBox Graphite cust.", [
                "http://a.tiles.mapbox.com/v3/nrenner.map-ydf0cnp6/${z}/${x}/${y}.png",
                "http://b.tiles.mapbox.com/v3/nrenner.map-ydf0cnp6/${z}/${x}/${y}.png",
                "http://c.tiles.mapbox.com/v3/nrenner.map-ydf0cnp6/${z}/${x}/${y}.png",
                "http://d.tiles.mapbox.com/v3/nrenner.map-ydf0cnp6/${z}/${x}/${y}.png" ], {
            wrapDateLine: false,
            resolutions : resolutions,
            serverResolutions : resolutions.slice(0, 18),
            attribution : "<a href='http://mapbox.com/about/maps' target='_blank'>Terms & Feedback (MapBox)</a>"
        }));

        map.addLayer(new OpenLayers.Layer.OSM(null, null, {
            wrapDateLine: false,
            opacity : 0.3,
            resolutions : resolutions,
            serverResolutions : serverResolutions
        }));

        // empty layer (~ no base layer)
        map.addLayer(new OpenLayers.Layer("blank", {
            isBaseLayer : true
        }));
    }

    // options - {Object} Hash containing request, config and requestUrl keys
    var success = function(options) {
        // only handle when no success handler defined for this request
        if (!options.config.success) {
            var request = options.request;
            var requestUrl = options.requestUrl;
            // console.log('headers: ' request.getAllResponseHeaders());
            var response = request.responseXML || request.responseText;
            if (response) {
                handleLoad(response, requestUrl, options.config);
            } else {
                console.error('empty response for "' + requestUrl + '" (' + request.status + ' '
                        + request.statusText + ')');
            }
        }
    };
    // options - {Object} Hash containing request, config and requestUrl keys
    var failure = function(options) {
        // only handle when no failure handler defined for this request
        if (!options.config.failure) {
            var request = options.request;
            var requestUrl = options.requestUrl;
            console.error('error loading "' + requestUrl + '" (' + request.status + ' ' + request.statusText
                    + ')');
        }
    };

    // register global events to get handlers called with options parameter with config and requestUrl
    // instead of just request
    // note: events are triggered for *all* Requests 
    OpenLayers.Request.events.on({
        success: success,
        failure: failure
    });

    function GET(config) {
        console.log("requesting " + config.url);
        console.time("request");

        //OpenLayers.Util.applyDefaults(config, {success: success, failure: failure});
        
        OpenLayers.Request.GET(config);
    }
    
    function init() {
        OpenLayers.ImgPath = "lib/openlayers/img/";

        var styleMaps;
        var options = {
            div : "map_div",
            // disable theme CSS auto-loading, causes error with OpenLayers.js.gz
            // (requires exact name match of OpenLayers.js script URL)
            theme : null,
            projection : "EPSG:900913",
            displayProjection : displayProjection,
            controls : []
        };

        map = new OpenLayers.Map(options);

        map.addControl(new OpenLayers.Control.Attribution());
        // map.addControl(new OpenLayers.Control.LayerSwitcher());
        map.addControl(new OpenLayers.Control.LayerSwitcherBorder());
        map.addControl(new OpenLayers.Control.Navigation());
        map.addControl(new OpenLayers.Control.Zoom());
        // map.addControl(new OpenLayers.Control.PanZoomBar());
        map.addControl(new OpenLayers.Control.Permalink());
        map.addControl(new OpenLayers.Control.MousePosition());

        addBaseLayers(map);

        var styler = new OSMChangeStyle(map);
        styleMaps = styler.getStyleMaps();

        /*
        changesets = new OpenLayers.Layer.Vector("changesets", {
            projection : map.displayProjection,
            visibility : true,
            // styleMap : styleMaps.old,
            renderers : renderers
        });
        map.addLayer(changesets);
        */

        old = new OpenLayers.Layer.Vector("old", {
            projection : map.displayProjection,
            visibility : true,
            styleMap : styleMaps.old,
            renderers : renderers,
            rendererOptions: { zIndexing: true }
        });

        changes = new OpenLayers.Layer.Vector("changes", {
            projection : map.displayProjection,
            visibility : true,
            styleMap : styleMaps.changes,
            renderers : renderers,
            rendererOptions: { zIndexing: true }
        });

        // OSM file (old)
        var osmXml = null;
        if (oldUrl) {
            var request = OpenLayers.Request.GET({
                url : oldUrl,
                async : false
            });
            osmXml = request.responseXML || request.responseText;
        }

        // OSC file (changes/new)
        var oscResponse = null;
		var parameters = OpenLayers.Control.ArgParser.prototype.getParameters();
		if (parameters.url)  {
			changesUrl = parameters.url;
		}
        if (changesUrl) {
            GET({url: changesUrl, zoomToExtent: !map.getCenter()});
        }

        var formatOptions = {
            internalProjection : map.getProjectionObject()
        };

        formatRegistry = new FormatRegistry(formatOptions);

        var fileReaderControl = new FileReaderControl(handleLoad);
        fileReaderControl.activate();

        var osmFormat = new OpenLayers.Format.OSMExt(formatOptions);
        var oscFormat = new OpenLayers.Format.OSC(formatOptions);
        var augmentedOscFormat = new OpenLayers.Format.OSCAugmented(formatOptions);

        var oscFeatures;
        if (oscResponse) {
            // TODO move to handleLoad
            if (osmXml) {
                var features = osmFormat.read(osmXml);
                old.addFeatures(features);

                oscFeatures = augmentedOscFormat.read(oscResponse, osmXml);
            } else if (augmentedOscFormat.isAugmented(oscResponse)) {
                var augmentingFeatures = augmentedOscFormat.readAugmenting(oscResponse);
                old.addFeatures(augmentingFeatures);

                oscFeatures = augmentedOscFormat.read(oscResponse);
            } else {
                oscFeatures = oscFormat.read(oscResponse);
            }
            changes.addFeatures(oscFeatures);

            oscviewer.setActions(changes, old);
        }

		
        map.addLayer(old);
        map.addLayer(changes);

        // hover + select
        var handler = new PopupHandler(map, old, changes);
        var options = {
            onSelect : function(feature) {
                // also pass mouse position of the event
                // (note: OpenLayers.Handler.evt is not an API property)
                // see http://trac.osgeo.org/openlayers/ticket/2089
                handler.onFeatureSelect(feature, this.handlers.feature.evt.xy, this.hover);
            },
            onUnselect : handler.onFeatureUnselect
        };
        //var vectorLayers = [ old, changes, changesets ];
        var vectorLayers = [ old, changes ];
        hover = new OpenLayers.Control.HoverAndSelectFeature(vectorLayers, options);
        map.addControl(hover);
        hover.activate();

		addControls(map, vectorLayers);

        if (!map.getCenter()) {
            if (old.features.length > 0) {
                map.zoomToExtent(old.getDataExtent());
            } else if (changes.features.length > 0) {
                map.zoomToExtent(changes.getDataExtent());
            } else {
                //map.zoomToMaxExtent();
                map.setCenter(new OpenLayers.LonLat(0,0), 2);
            }

            // map.setCenter(new OpenLayers.LonLat(lon,
            // lat).transform("EPSG:4326", map.getProjectionObject()), zoom);
        }
		
        /*
		var parameters = OpenLayers.Control.ArgParser.prototype.getParameters();
		if (parameters.live)  {
			console.log("live");
			live();
		}
		*/
    }
    
    function addBottomControls() {
        var minimize = function(e) {
            this.className = 'hidden';
            var prefix = this.id.substring(0, this.id.indexOf('_')) + '_';
            document.getElementById(prefix + 'content').className = 'hidden';
            //document.getElementById('about_minimize').className = 'hidden';
            document.getElementById(prefix + 'button').className = 'button';
        };
        var maximize = function(e) {
            this.className = 'hidden';
            var prefix = this.id.substring(0, this.id.indexOf('_')) + '_';
            document.getElementById(prefix + 'content').className = '';
            document.getElementById(prefix + 'minimize').className = 'minimize';
            //document.getElementById('about_button').className = 'hidden';
        };
        document.getElementById('about_minimize').onclick = minimize;
        document.getElementById('about_button').onclick = maximize;
        document.getElementById('legend_minimize').onclick = minimize;
        document.getElementById('legend_button').onclick = maximize;
    }

	function addBBoxControl(map) {
		// bbox vector layer for drawing
        var bboxLayer = new OpenLayers.Layer.Vector("box", {
            styleMap : bbox.createStyleMap(),
			// for now, hide layer by default, because bbox select control disables/interferes with main select control
			visibility: false
        });
        map.addLayer(bboxLayer);

		// bbox control
		var updateInfo = function(feature) {
			var bounds = feature.geometry.getBounds().clone();
            bounds = bounds.transform(map.getProjectionObject(), displayProjection);
			
	        var decimals = Math.floor(map.getZoom() / 3);
			var multiplier = Math.pow(10, decimals);

			// custom float.toFixed function that rounds to integer when .0
			// see OpenLayers.Bounds.toBBOX
			var toFixed = function(num) {
				return Math.round(num * multiplier) / multiplier;
			};
			
			var box = {
                left : toFixed(bounds.left),
                bottom : toFixed(bounds.bottom),
                right : toFixed(bounds.right),
                top : toFixed(bounds.top)
            };
			//bbox=9.3,47.5,9.8,47.8
			bboxParam = OpenLayers.String.format('&bbox=${left},${bottom},${right},${top}', box);
			console.log("box = " + bboxParam);
		};
        bbox.addControls(map, bboxLayer, {
            update : updateInfo,
            activate : function() {},
            deactivate : function() {}
        });
        
        return bbox;
	}

    function addControls(map, layers) {
        addBottomControls();
        var bbox = addBBoxControl(map);

        var onBBoxClick = function(e) {
            bbox.switchActive();
        };
        document.getElementById('bbox_button').onclick = onBBoxClick;

        var onLiveClick = function(e) {
            //live = !live;
            var ele = document.getElementById('live_button');
            if (!liveInterval) {
                liveLoop();
                liveInterval = window.setInterval(liveLoop, 60000);
                ele.className += ' button_active';
            } else {
                window.clearInterval(liveInterval);
                liveInterval = null;
                ele.className = ele.className.replace(' button_active', '');;
                console.log('live stopped');
            }
        };
        document.getElementById('live_button').onclick = onLiveClick;

        var onClearClick = function(e) {
            for (var i = 0; i < layers.length; i++) {
                layers[i].removeAllFeatures();
            }
        };
        document.getElementById('clear_button').onclick = onClearClick;
	}

    function handleLoad(doc, fileNameOrUrl, options) {
        console.timeEnd("request");

        if (typeof doc == "string") {
            doc = OpenLayers.Format.XML.prototype.read.apply(this, [ doc ]);
        }

        var desc = formatRegistry.getFormat(doc);
        var format = desc.format;
        var oscFeatures = [];
        var osmFeatures = [];
        if (format) {
            if (desc.type === 'osmChangeset') {
                changesets.addFeatures(format.read(doc));
                // TODO read corresponding diff
                map.zoomToExtent(changesets.getDataExtent());
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
                old.addFeatures(osmFeatures);
                changes.addFeatures(oscFeatures);
                console.timeEnd("addFeatures");

                console.log('features added: changes = ' + oscFeatures.length + ', old = ' + osmFeatures.length
                        + ' - total: changes = ' + changes.features.length + ', old = ' + old.features.length);

                if (!(options && options.zoomToExtent === false)) {
                    map.zoomToExtent(changes.getDataExtent());
                }
            }
        }
    }

    function getCurrentSequence() {
        var sequence = -1;
        var url = "http://overpass-api.de/augmented_diffs/state.txt";
        //console.log("requesting " + url);

        OpenLayers.Request.GET({
            url: url,
            async: false, 
            disableXRequestedWith: true,
            success: function(request) {
                var response = request.responseText;
                if (response) {
                    sequence = parseInt(response);
                } else {
                    console.error('empty response for "' + url + '" (' + request.status + ' '
                            + request.statusText + ')');
                }
            }
        });        
        return sequence;
    }

    function getCurrentSequenceEstimate(sequenceReference) {
        // lag in milliseconds between osmBase and diff availability (guess)
        var adjustment = 100000; 
        var currentTimestamp = new Date().getTime();
        var minuteDiff = Math.floor(((currentTimestamp - sequenceReference.timestamp) - adjustment) / 60000);
        var currentSequence = sequenceReference.number + minuteDiff;
        return {
            number : currentSequence,
            timestamp : currentTimestamp
        };
    }

    function getSequenceUrl(sequence) {
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
    }

    function liveLoop() {
        var sequence = getCurrentSequence();
        if (sequence && sequence >= 0 && sequence != oldSequence) {
            oldSequence = sequence;
            // getting empty response for current diff, so for now use previous instead (- 1)
            var url = "http://overpass-api.de/api/augmented_diff?id=" + (sequence - 1);
            //var url = getSequenceUrl(sequence);
    		if (bboxParam) {
    			url += bboxParam;
    		}
            GET({url: url, zoomToExtent: false, disableXRequestedWith: true});
        } else {
            console.log('skip refresh: sequence = ' + sequence + ', old sequence = ' + oldSequence);
        }
    }

    init();
})();
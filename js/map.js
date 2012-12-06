(function() {

	var displayProjection = "EPSG:4326";

    var oldUrl = null;
    var changesUrl = null;

    var hover;
    var renderers = [ "SVG" ]; // Canvas
    
    var status;

    function addBaseLayers(map) {

        //OpenLayers.Layer.OSM.wrapDateLine = false;

        // reuse Bing resolutions 0-21 as client layer resolutions
        var resolutions = OpenLayers.Layer.Bing.prototype.serverResolutions;
        // OSM zoom levels: 0-18
        var serverResolutions = resolutions.slice(0, 19);

        map.addLayer(new OpenLayers.Layer.OSM(null, null, {
            wrapDateLine: false,
            opacity : 0.2,
            resolutions : resolutions,
            serverResolutions : serverResolutions
        }));

        // empty layer (~ no base layer)
        map.addLayer(new OpenLayers.Layer("blank", {
            isBaseLayer : true
        }));
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

        status = new Status();
        var loader = new Loader(map, { changes: changes, old: old }, status);
        
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
            loader.GET({url: changesUrl, zoomToExtent: !map.getCenter()});
        }

        var fileReaderControl = new FileReaderControl(loader.handleLoad);
        fileReaderControl.activate();

        var formatOptions = {
            internalProjection : map.getProjectionObject()
        };
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

		addControls(map, vectorLayers, loader);

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
        var toggle = function(e) {
            var prefix = this.id.substring(0, this.id.indexOf('_')) + '_';
            document.getElementById(prefix + 'content').classList.toggle('hidden');
            document.getElementById(prefix + 'button').classList.toggle('hidden');
        };
        document.getElementById('about_minimize').onclick = toggle;
        document.getElementById('about_button').onclick = toggle;
        document.getElementById('legend_minimize').onclick = toggle;
        document.getElementById('legend_button').onclick = toggle;
    }

	function addBBoxControl(map, bboxChangeCallback) {
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
			
			bboxChangeCallback(box);
		};
        bbox.addControls(map, bboxLayer, {
            update : updateInfo,
            activate : function() {},
            deactivate : function() {}
        });
        
        return bbox;
	}

    function addControls(map, layers, loader) {
        addBottomControls();

        var overpassAPI = new OverpassAPI(loader, map);
        new Live(overpassAPI, status); 
        new FastBackward(overpassAPI, status);
        
        var bboxChangeHandler = function(bbox) {
            overpassAPI.bbox = bbox;
        };
        var bboxControl = addBBoxControl(map, bboxChangeHandler);
        var onBBoxClick = function(e) {
            bboxControl.switchActive();
        };
        document.getElementById('bbox_button').onclick = onBBoxClick;
        
        var onClearClick = function(e) {
            for (var i = 0; i < layers.length; i++) {
                layers[i].removeAllFeatures();
            }
        };
        document.getElementById('clear_button').onclick = onClearClick;
	}


    init();
})();

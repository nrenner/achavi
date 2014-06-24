(function() {

    var displayProjection = "EPSG:4326";

    var hover;
    var renderers = [ "SVG" ]; // Canvas
    
    var status,
        loader,
        loading,
        overpassAPI,
        changesetRegex;

    function addBaseLayers(map) {

        //OpenLayers.Layer.OSM.wrapDateLine = false;

        // reuse Bing resolutions 0-21 as client layer resolutions
        var resolutions = OpenLayers.Layer.Bing.prototype.serverResolutions;
        // OSM zoom levels: 0-18
        var serverResolutions = resolutions.slice(0, 19);

        var osm = new OpenLayers.Layer.OSM(null, null, {
            wrapDateLine: false,
            opacity : 0.2,
            resolutions : resolutions,
            serverResolutions : serverResolutions
        });
        osm.attribution = 'tiles ' + osm.attribution;  
        map.addLayer(osm);

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

        var cAttribution = new OpenLayers.Control.Attribution();
        cAttribution.template = "achavi [attic]&nbsp&nbsp-&nbsp&nbsp${layers}";
        map.addControl(cAttribution);
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

        changesets = new OpenLayers.Layer.Vector("changeset", {
            projection : map.displayProjection,
            visibility : true,
            styleMap : styleMaps.changes,
            renderers : renderers
        });

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
            rendererOptions: { zIndexing: true },
            attribution: 'data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, '
                + 'licensed under <a href="http://opendatacommons.org/licenses/odbl/">ODbL</a>'
        });

        status = new Status();
        loading = new Loading();
        loader = new Loader(map, { changes: changes, old: old, changesets: changesets }, status);
        var parameters = OpenLayers.Control.ArgParser.prototype.getParameters();
        if (parameters.url) {
            // load augmented change file passed as 'url' parameter
            loader.GET({url: parameters.url, zoomToExtent: true});
        }
        if (parameters.changeset) {
            loadChangeset(parameters.changeset);
        }

        map.addLayer(changesets);
        map.addLayer(old);
        map.addLayer(changes);

        var vectorLayers = [ old, changes, changesets ];
        addControls(map, vectorLayers);

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

        hover = new OpenLayers.Control.HoverAndSelectFeature(vectorLayers, options);
        map.addControl(hover);
        hover.activate();

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
    }
    
    function addBottomControls() {
        var toggle = function(e) {
            var prefix = this.id.substring(0, this.id.indexOf('_')) + '_';
            document.getElementById(prefix + 'content').classList.toggle('hidden');
            document.getElementById(prefix + 'button').classList.toggle('hidden');
        };
        
        var bottomButtons = ['legend', 'help', 'about'];
        bottomButtons.forEach(function(id) {
            document.getElementById(id + '_minimize').onclick = toggle;
            document.getElementById(id + '_button').onclick = toggle;
        });
    }

    function addBBoxControl(map, bboxChangeCallback) {

        var col = 'rgba(255, 255, 255, 0.4)';
        bbox.style['default'].strokeColor = col;
        bbox.style['transform'].strokeColor = col;
        bbox.style['temporary'].strokeColor = col;
        
        // bbox vector layer for drawing
        var bboxLayer = new OpenLayers.Layer.Vector("bbox", {
            styleMap: bbox.createStyleMap(),
            // for now, hide layer by default, because bbox select control disables/interferes with main select control
            visibility: false
        });
        map.addLayer(bboxLayer);

        // bbox control
        bbox.addControls(map, bboxLayer, {
            update : bboxChangeCallback,
            activate : function() {
                // reset when new box is drawn (set bbox to null)
                bboxChangeCallback(null);
                document.getElementById('bbox_button').classList.add('button_active');
            },
            deactivate : function() {
                document.getElementById('bbox_button').classList.remove('button_active');
            }
        });

        var onBBoxClick = function(e) {
            bbox.switchActive();
        };
        document.getElementById('bbox_button').onclick = onBBoxClick;

        return bbox;
    }

    function addControls(map, layers) {

        addBottomControls();

        var bboxChangeHandler = function(bbox) {
            overpassAPI.bbox = bbox;
        };
        var bboxControl = addBBoxControl(map, bboxChangeHandler);

        overpassAPI = new OverpassAPI(loader, bboxControl);
        new Live(overpassAPI, status);
        new Diff(overpassAPI, loading, status);
        
        var onClearClick = function(e) {
            for (var i = 0; i < layers.length; i++) {
                layers[i].removeAllFeatures();
            }
            status.reset();
        };
        document.getElementById('clear_button').onclick = onClearClick;
        
        var fileReaderControl = new FileReaderControl(_.bind(loader.handleLoad, loader));
        fileReaderControl.addUrlHandler(overpassAPI.sequenceUrlRegex, _.bind(overpassAPI.loadByUrl, overpassAPI));
        changesetRegex = /.*\/changeset\/([0-9]*)/;
        fileReaderControl.addUrlHandler(changesetRegex, loadChangesetByUrl);
        fileReaderControl.activate();
    }

    function loadChangesetByUrl(url) {
        var id = parseInt(url.replace(changesetRegex, "$1"));
        loadChangeset(id);
    }

    function loadChangeset(id) {
        
        function handleDiff() {
            loading.loadEnd();
        }

        function handleChangeset() {
            var csFeature, cs, bbox, xhr, from, to;

            csFeature = changesets.getFeatureByFid('changeset.' + id);
            if (csFeature) {
                cs = csFeature.attributes;
                from = cs.created_at;
                to = cs.closed_at;
                bbox = new OpenLayers.Bounds(cs.min_lon, cs.min_lat, cs.max_lon, cs.max_lat);
                overpassAPI.bbox = bbox;

                // TODO relations (checkbox?)
                xhr = overpassAPI.loadDiff(from, to, false, handleDiff);
                loading.loadStart(xhr);
            }
        }

        loader.GET({
            url: 'http://www.openstreetmap.org/api/0.6/changeset/' + id, 
            zoomToExtent: true,
            postLoadCallback: handleChangeset
        });
    }

    init();
})();

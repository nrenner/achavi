/* Copyright (c) 2006-2012 by OpenLayers Contributors (see authors.txt for 
 * full list of contributors). Published under the 2-clause BSD license.
 * See license.txt in the OpenLayers distribution or repository for the
 * full text of the license. */

/**
 * @requires OpenLayers/Format/OSM.js
 */
 
/**  
 * Class: OpenLayers.Format.OSMMeta
 * Extended OSM parser. Adds meta attributes as tags.
 * Create a new instance with the <OpenLayers.Format.OSMMeta> constructor.
 *
 * Inherits from:
 *  - <OpenLayers.Format.OSM>
 */
OpenLayers.Format.OSMMeta = OpenLayers.Class(OpenLayers.Format.OSM, {
    
    // without id, which is already added as osm_id property to feature
    metaAttributes: ['version', 'timestamp', 'uid', 'user', 'changeset'],

    initialize: function(options) {
        OpenLayers.Format.OSM.prototype.initialize.apply(this, [options]);
    },

    getTags: function(dom_node, interesting_tags) {
        var tags = OpenLayers.Format.OSM.prototype.getTags.apply(this, arguments);
        var meta = this.getMetaAttributes(dom_node);
        tags = OpenLayers.Util.extend(tags, meta);
        return tags;
    },
    
    getMetaAttributes: function(dom_node) {
        var meta = {}, name;
        for (var i = 0; i < this.metaAttributes.length; i++) {
            name = this.metaAttributes[i];
            meta[name] = dom_node.getAttribute(name);
        }
        return meta;
    },

    CLASS_NAME: "OpenLayers.Format.OSMMeta" 
});     
/* Copyright (c) 2006-2012 by OpenLayers Contributors (see authors.txt for 
 * full list of contributors). Published under the 2-clause BSD license.
 * See license.txt in the OpenLayers distribution or repository for the
 * full text of the license. */

/**
 * @requires OSMMeta.js
 */
 
/**  
 * Class: OpenLayers.Format.OSMExt
 * Extended OSM parser. Returns all nodes (including way nodes) and all tags, 
 * without the overhead of checking interestingTagsExclude, which is ignored.
 * Create a new instance with the <OpenLayers.Format.OSMExt> constructor.
 *
 * Inherits from:
 *  - <OpenLayers.Format.OSMMeta>
 */
OpenLayers.Format.OSMExt = OpenLayers.Class(OpenLayers.Format.OSMMeta, {
    
    initialize: function(options) {
        OpenLayers.Format.OSMMeta.prototype.initialize.apply(this, [options]);

        // return used nodes (way nodes) as separate entities (check is ignored)
        this.checkTags = true;
    },

    getTags: function(dom_node, interesting_tags) {
        // ignore interesting_tags parameter, pass false to avoid check
        var tags = OpenLayers.Format.OSMMeta.prototype.getTags.apply(this, [dom_node, false]);
        // all tags are interesting
        return interesting_tags ? [tags, true] : tags;
    },
    
    CLASS_NAME: "OpenLayers.Format.OSMExt" 
});     
/* Copyright (c) 2006-2012 by OpenLayers Contributors (see authors.txt for 
 * full list of contributors). Published under the 2-clause BSD license.
 * See license.txt in the OpenLayers distribution or repository for the
 * full text of the license. */

/**
 * @requires OSMExt.js
 */

/**  
 * Class: OpenLayers.Format.OSC
 * OSC (OSM change file) parser. Create a new instance with the 
 *     <OpenLayers.Format.OSC> constructor.
 *
 * Inherits from:
 *  - <OpenLayers.Format.OSMExt>
 */
OpenLayers.Format.OSC = OpenLayers.Class(OpenLayers.Format.OSMExt, {

    initialize: function(options) {
        OpenLayers.Format.OSMExt.prototype.initialize.apply(this, [options]);

        this.metaAttributes.push('action');
    },

    // osmDoc optional
    read: function(doc, osmDoc) {
        // copied and modified version of OpenLayers.Format.OSM.read
        
        if (typeof doc == "string") { 
            doc = OpenLayers.Format.XML.prototype.read.apply(this, [doc]);
        }

        // OSM XML
        var osmNodes = {};
        if (osmDoc) {
            if (typeof osmDoc == "string") { 
                osmDoc = OpenLayers.Format.XML.prototype.read.apply(this, [osmDoc]);
            }
            osmNodes = this.getNodes(osmDoc);
        }

        // OSC
        var nodes = this.getNodes(doc);
        var ways = this.getWays(doc);
        
        // Geoms will contain at least ways.length entries.
        var feat_list = new Array(ways.length);
        
        for (var i = 0; i < ways.length; i++) {
            // no fixed length, nodes might be missing
            var point_list = [];
            
            var poly = this.isWayArea(ways[i]) ? 1 : 0; 
            for (var j = 0; j < ways[i].nodes.length; j++) {
               var node = nodes[ways[i].nodes[j]];

               // if not in OSC get referenced node from augmenting file (OSM XML)
               if (!node) {
                  node = osmNodes[ways[i].nodes[j]];
               }
               if (node) {
                   var point = new OpenLayers.Geometry.Point(node.lon, node.lat);
                   
                   // Since OSM is topological, we stash the node ID internally. 
                   point.osm_id = parseInt(ways[i].nodes[j]);
                   //point_list[j] = point;
                   point_list.push(point);
                   
                   // We don't display nodes if they're used inside other 
                   // elements.
                   node.used = true; 
               } else if (osmDoc) {
                   console.warn('node "' + ways[i].nodes[j] + '" referenced by way "' + ways[i].id + '" not found');
               }
            }
            if (point_list.length === 0 && ways[i].tags['action'] !== 'delete') {
                console.warn('no nodes for way "' + ways[i].id + '" found - way will not appear on map');
            }
            var geometry = null;
            if (poly) { 
                geometry = new OpenLayers.Geometry.Polygon(
                    new OpenLayers.Geometry.LinearRing(point_list));
            } else {    
                geometry = new OpenLayers.Geometry.LineString(point_list);
            }
            if (this.internalProjection && this.externalProjection) {
                geometry.transform(this.externalProjection, 
                    this.internalProjection);
            }        
            var feat = new OpenLayers.Feature.Vector(geometry,
                ways[i].tags);
            feat.osm_id = parseInt(ways[i].id);
            feat.fid = "way." + feat.osm_id;
            feat_list[i] = feat;
        } 
        for (var node_id in nodes) {
            var node = nodes[node_id];
            if (!node.used || this.checkTags) {
                var tags = null;
                
                if (this.checkTags) {
                    var result = this.getTags(node.node, true);
                    if (node.used && !result[1]) {
                        continue;
                    }
                    tags = result[0];
                } else { 
                    tags = this.getTags(node.node);
                }    
                
                var feat = new OpenLayers.Feature.Vector(
                    new OpenLayers.Geometry.Point(node['lon'], node['lat']),
                    tags);
                if (this.internalProjection && this.externalProjection) {
                    feat.geometry.transform(this.externalProjection, 
                        this.internalProjection);
                }        
                feat.osm_id = parseInt(node_id); 
                feat.fid = "node." + feat.osm_id;
                feat.used = node.used;
                feat_list.push(feat);
            }   
            // Memory cleanup
            node.node = null;
        }        
        return feat_list;
    },
    
    getMetaAttributes: function(dom_node) {
        var meta = OpenLayers.Format.OSMMeta.prototype.getMetaAttributes.apply(this, [dom_node]);
        meta['action'] = this.getActionString(dom_node);
        return meta;
    },
    
    getActionString: function(dom_node) {
        var action = dom_node.parentNode.tagName;
        return action;
    },
    
    CLASS_NAME: "OpenLayers.Format.OSC" 
});     
/* Copyright (c) 2006-2012 by OpenLayers Contributors (see authors.txt for 
 * full list of contributors). Published under the 2-clause BSD license.
 * See license.txt in the OpenLayers distribution or repository for the
 * full text of the license. */

/**
 * @requires OSC.js
 */

/**  
 * Class: OpenLayers.Format.OSCAugmented
 * Augmented OSC (OSM change file) parser. Create a new instance with the 
 *     <OpenLayers.Format.OSCAugmented> constructor.
 *
 * Inherits from:
 *  - <OpenLayers.Format.OSC>
 */
OpenLayers.Format.OSCAugmented = OpenLayers.Class(OpenLayers.Format.OSC, {

    initialize: function(options) {
        OpenLayers.Format.OSC.prototype.initialize.apply(this, [options]);
    },

    readAugmenting: function(augOscDoc) {
        var result = [];

        augOscDoc = this.toDocument(augOscDoc);

        // extract 'augment' node tree and pass to OSM.read (treat as OSM XML doc)
        var augmentNode = this.getAugmentNode(augOscDoc);
        if (augmentNode) {
            result = OpenLayers.Format.OSMExt.prototype.read.apply(this, [augmentNode]);
        }

        return result;
    },

    /**
     * NOTE: modifies the passed document (removes the augment node)!
     */
    read: function(augOscDoc) {
        var result = [];

        augOscDoc = this.toDocument(augOscDoc);
        
        // extract and delete 'augment' node tree and pass both to OSC.read
        // (treat 'augment' node as separate OSM XML doc)
        var augmentNode = this.getAugmentNode(augOscDoc);
        if (augmentNode) {
            augmentNode.parentNode.removeChild(augmentNode);
            result = OpenLayers.Format.OSC.prototype.read.apply(this, [augOscDoc, augmentNode]);
        } else {
            result = OpenLayers.Format.OSC.prototype.read.apply(this, [augOscDoc]);
        }
        
        return result;
    },
    
    isAugmented: function(augOscDoc) {
        augOscDoc = this.toDocument(augOscDoc);
        
        var augment_list = augOscDoc.getElementsByTagName("augment");
        return augment_list.length > 0;
    },

    toDocument: function(stringOrDoc) {
        if (typeof stringOrDoc == "string") { 
            stringOrDoc = OpenLayers.Format.XML.prototype.read.apply(this, [stringOrDoc]);
        }
        return stringOrDoc;
    },

    getAugmentNode: function(doc) {
        var result = null;
        var augment_list = doc.getElementsByTagName("augment");
        if (augment_list.length === 1) {
            result = augment_list[0];
        } else {
            console.warn('Exactly one "augment" section expected in OSC, found: ' + (augment_list.length));
        }
        return result;
    },
    
    CLASS_NAME: "OpenLayers.Format.OSCAugmented" 
});     
/* Copyright (c) 2006-2012 by OpenLayers Contributors (see authors.txt for 
 * full list of contributors). Published under the 2-clause BSD license.
 * See license.txt in the OpenLayers distribution or repository for the
 * full text of the license. */

/**
 * @requires OSC.js
 */

/**  
 * Class: OpenLayers.Format.OSCAugmented
 * Overpass API augmented diff parser. Create a new instance with the 
 *     <OpenLayers.Format.OSCAugmentedDiff> constructor.
 *
 * Inherits from:
 *  - <OpenLayers.Format.OSC>
 */
OpenLayers.Format.OSCAugmentedDiff = OpenLayers.Class(OpenLayers.Format.OSC, {

    initialize: function(options) {
        OpenLayers.Format.OSC.prototype.initialize.apply(this, [options]);
    },

    readAugmenting: function(doc) {
        var result = [];

        doc = this.toDocument(doc);

        var osm = doc.createElement("osm");
        this.appendChildren(osm, doc.getElementsByTagName("erase"));
        this.appendChildren(osm, doc.getElementsByTagName("keep"));

        result = OpenLayers.Format.OSMExt.prototype.read.apply(this, [osm]);

        return result;
    },

    read: function(doc) {
        var result = [];

        doc = this.toDocument(doc);
        
        var osm = doc.createElement("osm");
        this.appendChildren(osm, doc.getElementsByTagName("erase"));
        this.appendChildren(osm, doc.getElementsByTagName("keep"));

        var osc = doc.createElement("osmChange"); 
        this.appendChildren(osc, doc.getElementsByTagName("insert"));

        result = OpenLayers.Format.OSC.prototype.read.apply(this, [osc, osm]);

        return result;
    },

    appendChildren: function(node, children) {
        var clone, i;
        for (i = 0; i < children.length; i++) {
            clone = children[i].cloneNode(true);
            node.appendChild(clone);
        }
    },

    isAugmented: function () {
        return true;
    },

    toDocument: function(stringOrDoc) {
        if (typeof stringOrDoc == "string") { 
            stringOrDoc = OpenLayers.Format.XML.prototype.read.apply(this, [stringOrDoc]);
        }
        return stringOrDoc;
    },
    
    CLASS_NAME: "OpenLayers.Format.OSCAugmentedDiff" 
});     
/* Copyright (c) 2006-2012 by OpenLayers Contributors (see authors.txt for 
 * full list of contributors). Published under the 2-clause BSD license.
 * See license.txt in the OpenLayers distribution or repository for the
 * full text of the license. */

/**
 * @requires OSC.js
 */

/**
 * Class: OpenLayers.Format.OSCAugmentedDiffIDSorted Overpass API augmented diff
 * parser. Create a new instance with the
 * <OpenLayers.Format.OSCAugmentedDiffIDSorted> constructor.
 * 
 * Inherits from: - <OpenLayers.Format.OSC>
 */
OpenLayers.Format.OSCAugmentedDiffIDSorted = OpenLayers.Class(OpenLayers.Format.OSC, {

    initialize : function(options) {
        OpenLayers.Format.OSC.prototype.initialize.apply(this, [ options ]);
    },

    readAugmenting : function(doc) {
        var object;
        var old = [];
        var change = [];

        doc = this.toDocument(doc);

        var actionElementList = doc.getElementsByTagName("action");
        for ( var i = 0; i < actionElementList.length; i++) {
            var actionNode = actionElementList[i];
            var actionType = actionNode.getAttribute("type");
            switch (actionType) {
            case 'create':
                object = actionNode.firstElementChild;
                this.addFeature(change, object, actionNode, actionType);
                break;
            case 'delete':
            case 'modify':
                // old
                object = actionNode.firstElementChild.firstElementChild;
                var oldFeature = this.addFeature(old, object, actionNode, actionType);
                // new
                object = actionNode.lastElementChild.firstElementChild;
                var changeFeature = this.addFeature(change, object, actionNode, actionType);
                this.linkFeatures(changeFeature, oldFeature);
                break;
            case 'info':
                // only needed for relations (not handled yet) 
                break;
            default:
                console.warn('unhandled action type "' + actionType + '"');
            }
        }

        return {
            old : old,
            change : change,
            timestamp : this.getTimestamp(doc)
        };
    },
    
    getTimestamp: function(doc) {
        var timestamp = null;
        var metaList = doc.getElementsByTagName("meta");
        if (metaList && metaList.length > 0) {
            timestamp = metaList[0].getAttribute('osm_base');
        }
        return timestamp;
    },

    read : function(doc) {
        var obj = readAugmenting(doc);
        return obj.change.concat(obj.old);
    },
    
    addFeature:  function(featureList, object, actionNode, actionType) {
        var feature = this.parseFeature(object);
        if (feature) {
            feature.attributes['action'] = this.getActionString(actionNode, actionType);
            if (feature.osm_type === 'node') {
                var waymember = actionNode.getAttribute("waymember");
                feature.used = (waymember && waymember === "yes");
            }
            featureList.push(feature);
        }
        return feature;
    },

    parseFeature: function(object) {
        var feature = null, 
            tags;
        var type = object.tagName.toLowerCase();

        tags = this.getTags(object);

        var geometry = this.parseGeometry[type].apply(this, [object, tags]);
        if (geometry) {
            if (this.internalProjection && this.externalProjection) {
                geometry.transform(this.externalProjection, 
                    this.internalProjection);
            }        
            feature = new OpenLayers.Feature.Vector(geometry, tags);
            
            feature.osm_id = parseInt(object.getAttribute("id"));
            feature.osm_type = type;
            feature.fid = type + "." + feature.osm_id;
        }
        
        return feature;
    },

    getActionString: function(actionNode, actionType) {
        var actionString = actionType;
        var geometryAttr;
        if (actionType === 'modify') {
            geometryAttr = actionNode.getAttribute("geometry");
            if (geometryAttr && geometryAttr === "changed") {
                actionString = 'modify:geometry';
            }
        }
        return actionString;
    },

    /**
     * Property: parseGeometry
     * Properties of this object are the functions that parse geometries based
     *     on their type.
     */
    parseGeometry: {
        node: function(objectNode, tags) {
            var geometry = new OpenLayers.Geometry.Point(
                objectNode.getAttribute("lon"), 
                objectNode.getAttribute("lat"));
            return geometry;
        },
        
        way: function(object, tags) {
            var geometry, node, point;
            var nodeList = object.getElementsByTagName("nd");

            // We know the minimal of this one ahead of time. (Could be -1
            // due to areas/polygons)
            var pointList = new Array(nodeList.length);
            for (var j = 0; j < nodeList.length; j++) {
               node = nodeList[j];
               
               point = new OpenLayers.Geometry.Point(
                       node.getAttribute("lon"), 
                       node.getAttribute("lat"));
               
               // Since OSM is topological, we stash the node ID internally. 
               point.osm_id = parseInt(node.getAttribute("ref"));
               pointList[j] = point;
            }
            
            if (this.isWayArea(pointList, tags)) { 
                geometry = new OpenLayers.Geometry.Polygon(
                    new OpenLayers.Geometry.LinearRing(pointList));
            } else {    
                geometry = new OpenLayers.Geometry.LineString(pointList);
            }
            return geometry;
        },
        
        relation: function(objectNode) {
            // not handled yet
        },
    },

    linkFeatures: function(changeFeature, oldFeature) {
        if (changeFeature) {
            changeFeature.oldFeature = oldFeature;
        }
        if (oldFeature) {
            oldFeature.changeFeature = changeFeature;
        }        
    },

    // use original, not super method, because action is determined from 
    // action not object node
    getMetaAttributes: OpenLayers.Format.OSMMeta.prototype.getMetaAttributes,

    /** 
     * Method: isWayArea
     * Check whether the tags and geometry indicate something is an area.
     *
     * Parameters: 
     * pointList  - {Array(<OpenLayers.Geometry.Point>)} Way nodes
     * tags       - {Object} Way tags
     *  
     * Returns:
     * {Boolean}
     */
    isWayArea: function(pointList, tags) { 
        var poly_shaped = false;
        var poly_tags = false;
        
        if (pointList.length > 2  
            && pointList[0].osm_id === pointList[pointList.length - 1].osm_id) {
            poly_shaped = true;
        }

        for(var key in tags) {
            if (this.areaTags[key]) {
                poly_tags = true;
                break;
            }
        }

        return poly_shaped && poly_tags;            
    }, 

    appendChildren : function(node, children) {
        var clone, i;
        for (i = 0; i < children.length; i++) {
            clone = children[i].cloneNode(true);
            node.appendChild(clone);
        }
    },

    isAugmented : function() {
        return true;
    },

    toDocument : function(stringOrDoc) {
        if (typeof stringOrDoc == "string") {
            stringOrDoc = OpenLayers.Format.XML.prototype.read.apply(this, [ stringOrDoc ]);
        }
        return stringOrDoc;
    },

    CLASS_NAME : "OpenLayers.Format.OSCAugmentedDiffIDSorted"
});
/* Copyright (c) 2006-2012 by OpenLayers Contributors (see authors.txt for 
 * full list of contributors). Published under the 2-clause BSD license.
 * See license.txt in the OpenLayers distribution or repository for the
 * full text of the license. */

/**
 * @requires OpenLayers/Format/XML.js
 * @requires OpenLayers/Feature/Vector.js
 * @requires OpenLayers/Geometry/Point.js
 * @requires OpenLayers/Geometry/LineString.js
 * @requires OpenLayers/Geometry/Polygon.js
 * @requires OpenLayers/Projection.js
 */

/**  
 * Class: OpenLayers.Format.OSM
 * OSM parser. Create a new instance with the 
 *     <OpenLayers.Format.OSM> constructor.
 *
 * Inherits from:
 *  - <OpenLayers.Format.XML>
 */
OpenLayers.Format.OSMChangeset = OpenLayers.Class(OpenLayers.Format.XML, {

    metaAttributes: ['user', 'uid', 'created_at', 'closed_at', 'open', 'min_lat', 'min_lon', 'max_lat', 'max_lon'],

    /**
     * Constructor: OpenLayers.Format.OSM
     * Create a new parser for OSM.
     *
     * Parameters:
     * options - {Object} An optional object whose properties will be set on
     *     this instance.
     */
    initialize: function(options) {

        // OSM coordinates are always in longlat WGS84
        this.externalProjection = new OpenLayers.Projection("EPSG:4326");
        
        OpenLayers.Format.XML.prototype.initialize.apply(this, [options]);
    },
    
    /**
     * APIMethod: read
     * Return changeset from a OSM changeset doc
     
     * Parameters:
     * doc - {Element} 
     *
     * Returns:
     * Array({<OpenLayers.Feature.Vector>})
     */
    read: function(doc) {
        if (typeof doc == "string") { 
            doc = OpenLayers.Format.XML.prototype.read.apply(this, [doc]);
        }

        var feat_list = [];
        var changesetNode = null;
        var nodeList = doc.getElementsByTagName("changeset");
        if (nodeList.length > 0) {
            changesetNode = nodeList[0];
            var tags = this.getTags(changesetNode);
    
            // left, bottom, right, top
            var bounds = new OpenLayers.Bounds(tags.min_lon, tags.min_lat, tags.max_lon, tags.max_lat);
            var geometry = bounds.toGeometry();
            if (this.internalProjection && this.externalProjection) {
                geometry.transform(this.externalProjection, 
                    this.internalProjection);
            }        
            var feat = new OpenLayers.Feature.Vector(geometry, tags);
            feat.osm_id = parseInt(changesetNode.getAttribute("id"));
            feat.fid = "changeset." + feat.osm_id;
            feat_list.push(feat);
        } 

        return feat_list;
    },

    getTags: OpenLayers.Format.OSMMeta.prototype.getTags,
    
    getMetaAttributes: OpenLayers.Format.OSMMeta.prototype.getMetaAttributes,

    CLASS_NAME: "OpenLayers.Format.OSMChangeset" 
});     
OpenLayers.Control.LayerSwitcherBorder = OpenLayers.Class(OpenLayers.Control.LayerSwitcher, {

    borderDiv: null,

    initialize: function(options) {
        OpenLayers.Control.LayerSwitcher.prototype.initialize.apply(this, arguments);
    },

    draw: function() {
        this.borderDiv = OpenLayers.Control.prototype.draw.apply(this);
        this.div = null;
        /*
        this.borderDiv = document.createElement("div");
        //OpenLayers.Element.addClass(this.borderDiv, "border");
        OpenLayers.Element.addClass(this.borderDiv, this.displayClass);
        if (!this.allowSelection) {
            this.borderDiv.className += " olControlNoSelect";
            this.borderDiv.setAttribute("unselectable", "on", 0);
            this.borderDiv.onselectstart = OpenLayers.Function.False; 
        }    
        */

        OpenLayers.Control.LayerSwitcher.prototype.draw.apply(this);
        
        //this.div.style.width = this.borderDiv.style.width;
        //this.borderDiv.style.width = "auto";
        this.div.className = "layerSwitcherDiv";
        this.div.style.position = "";
        //OpenLayers.Element.addClass(this.div, "layerSwitcherDiv");
        //this.borderDiv.id = this.div.id;
        this.div.id = this.div.id + "_layerSwitcherDiv";
        
        this.maximizeDiv.style.position = "";

        this.borderDiv.appendChild(this.div);
        
//        OpenLayers.Util.modifyAlphaImageDiv(this.maximizeDiv, null, null, {w: 22, h: 22});
        
        return this.borderDiv;
    },

    maximizeControl: function(e) {

        // set the div's width and height to empty values, so
        // the div dimensions can be controlled by CSS
//        this.div.style.width = "";
//        this.div.style.height = "";
        this.layersDiv.style.display = "";

        this.showControls(false);

        if (e != null) {
            OpenLayers.Event.stop(e);                                            
        }
    },

    minimizeControl: function(e) {

        // to minimize the control we set its div's width
        // and height to 0px, we cannot just set "display"
        // to "none" because it would hide the maximize
        // div
//        this.div.style.width = "0px";
//        this.div.style.height = "0px";
        this.layersDiv.style.display = "none";

        this.showControls(true);

        if (e != null) {
            OpenLayers.Event.stop(e);                                            
        }
    }

    // CLASS_NAME: keep parent name because CSS classes are named after this
});
/**
 * Reads files using HTML5 file API
 *  
 * derived from http://www.html5rocks.com/en/tutorials/file/dndfiles/
 */
function FileReaderControl(onLoadCallback) {
    this.onLoadCallback = onLoadCallback;
    
    // {urlRegex:, handler:} objects
    this.urlHandlers = [];
}

FileReaderControl.prototype.addUrlHandler = function(urlRegex, handler) {
    this.urlHandlers.push({urlRegex: urlRegex, handler: handler});
};

FileReaderControl.prototype.activate = function() {
    if (window.File && window.FileReader && window.FileList) {
        document.getElementById('fileinput').addEventListener('change', _.bind(this.handleFileSelect, this), false);

        var dropZone = document.getElementById('map_div'); 
        dropZone.addEventListener('dragover', this.handleDragOver, false);
        dropZone.addEventListener('drop', _.bind(this.handleFileSelect, this), false);
    } else {
        // File API not supported
        document.getElementById('fileinput').disabled = true;
        console.warn('Browser does not support the HTML5 File API!');
    }    
};

FileReaderControl.prototype.handleFileSelect = function(evt) {
    var files, file;

    evt.stopPropagation();
    evt.preventDefault();

    // FileList from file input or drag'n'drop
    files = evt.target.files || evt.dataTransfer.files;
    if (files.length > 0) {
        file = files[0];
        console.log('handleFileSelect: ' + file.name);
    
        if (file.type === 'application/xml' || file.type === 'text/xml' || !file.type) {
            var fileReader = new FileReader();
            var handleLoad = _.bind(this.onLoadCallback, this);
            fileReader.onload = function(evt) {
                var text = evt.target.result;
                handleLoad(text, file.name);
            };
            fileReader.onerror = function(evt) {
                console.error('Error: ' + evt.target.error.code);
            };
            fileReader.readAsText(file);
        } else {
            console.error("File type '" + file.type + "' not recognized as XML for " + file.name);
        }
    } else if (evt.dataTransfer ) {
        var url = evt.dataTransfer.getData("URL");
        if (url) {
            var handled = false;
            for (var i = 0; i < this.urlHandlers.length; i++) {
                var obj = this.urlHandlers[i];
                if (obj.urlRegex.test(url)) {
                    obj.handler(url);
                    handled = true;
                    break;
                }
            }
            if (!handled) {
                console.warn("no handler found for url: " + url);
            }
        } else {
			console.warn("unhandled event dataTransfer: " + evt.dataTransfer);
		}
    } else {
		console.warn("unhandled event: " + evt);
	}
};

FileReaderControl.prototype.handleDragOver = function(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy';
};
OpenLayers.Control.HoverAndSelectFeature = OpenLayers.Class(OpenLayers.Control.SelectFeature, {
    initialize : function(layers, options) {
        this.hover = true;
        OpenLayers.Control.SelectFeature.prototype.initialize.apply(this, [ layers, options ]);

        // allow map panning while feature hovered or selected
        this.handlers['feature'].stopDown = false;
        this.handlers['feature'].stopUp = false;
    },

    clickFeature : function(feature) {
        if (this.hover) {
            this.hover = false;
            if (!this.highlightOnly) {
                // feature already selected by hover, unselect before calling super,
                // which is done to allow select handler to distinguish between hover and click
                this.unselect(feature);
            }
        }
        OpenLayers.Control.SelectFeature.prototype.clickFeature.apply(this, [ feature ]);
    },

    clickoutFeature : function(feature) {
        OpenLayers.Control.SelectFeature.prototype.clickoutFeature.apply(this, [ feature ]);
        this.hover = true;
    },

    CLASS_NAME : "OpenLayers.Control.HoverAndSelectFeature"
});
var bbox = (function() {

    var drawFeature, transform;
    var map, bboxLayer;

    /**
     * update, activate, deactivate
     */
    var callbacks;

    var style = {
        "default" : {
            fillColor : "#FFD119",
            fillOpacity : 0.1,
            strokeWidth : 2,
            strokeColor : "#333",
            strokeDashstyle : "solid"
        },
        "select" : {
            fillOpacity : 0.2,
            strokeWidth : 2.5,
        },
        "temporary" : {
            fillColor : "#FFD119",
            fillOpacity : 0.1,
            strokeDashstyle : "longdash"
        },
        "transform" : {
            display : "${getDisplay}",
            cursor : "${role}",
            pointRadius : 6,
            fillColor : "rgb(158, 158, 158)",
            fillOpacity : 1,
            strokeColor : "#333",
            strokeWidth : 2,
            strokeOpacity : 1
        }
    };

    function createStyleMap() {

        var styleMap = new OpenLayers.StyleMap({
            //"default" : new OpenLayers.Style(defaultStyle),
            "default" : new OpenLayers.Style(style["default"]),
            "select" : new OpenLayers.Style(style["select"]),
            "temporary" : new OpenLayers.Style(style["temporary"]),
            // render intent for TransformFeature control
            "transform" : new OpenLayers.Style(style["transform"], {
                context : {
                    getDisplay : function(feature) {
                        // Hide transform box, as it's styling is limited because of underlying bbox feature.
                        // Instead, the render intent of the bbox feature is assigned separately.
                        return feature.geometry.CLASS_NAME === "OpenLayers.Geometry.LineString" ? "none" : "";
                    },
                }
            })
        });
        /* debug
        var orig = OpenLayers.StyleMap.prototype.createSymbolizer;
        OpenLayers.StyleMap.prototype.createSymbolizer = function(feature, intent) {
            var ret = orig.apply(this, arguments);
            console.log(intent + '( ' + this.extendDefault + '): ' + JSON.stringify(ret));
            return ret;
        };
        */

        return styleMap;
    }

    function featureInsert(feature) {
        drawFeatureDeactivate();
        callbacks.update(getBBox(feature));
    }

    function onTransformComplete(evt) {
        callbacks.update(getBBox(evt.feature));
    }

    function drawFeatureActivate() {
        drawFeature.activate();
        if (transform.active) {
            transform.deactivate();
        }
        bboxLayer.destroyFeatures();

        // crosshair cursor
        OpenLayers.Element.addClass(map.viewPortDiv, "olDrawBox");

        callbacks.activate();
    }

    function drawFeatureDeactivate() {
        drawFeature.deactivate();

        // default cursor (remove crosshair cursor)
        OpenLayers.Element.removeClass(map.viewPortDiv, "olDrawBox");

        callbacks.deactivate();
    }

    function switchActive() {
        if (!drawFeature.active) {
            drawFeatureActivate();
        } else {
            drawFeatureDeactivate();
        }
    }

    function addControls(pMap, pBboxLayer, pCallbacks) {

        callbacks = pCallbacks;
        bboxLayer = pBboxLayer;
        map = pMap;

        // draw control
        /* TODO: use feature label or popup to update coordinates while drawing
        var onMove = function(geometry) {
            updateInfo(new OpenLayers.Feature.Vector(geometry));
        };
        */
        var polyOptions = {
            irregular : true,
            // allow dragging beyond map viewport 
            documentDrag : true
        };
        drawFeature = new OpenLayers.Control.DrawFeature(bboxLayer, OpenLayers.Handler.RegularPolygon, {
            handlerOptions : polyOptions
        /* 
        ,callbacks : {
            move : onMove
        }
        */
        });
        drawFeature.featureAdded = featureInsert;
        map.addControl(drawFeature);

        // feature edit control (move and resize), activated by select control
        transform = new OpenLayers.Control.TransformFeature(bboxLayer, {
            renderIntent : "transform",
            rotate : false,
            irregular : true
        });
        transform.events.register("transformcomplete", transform, onTransformComplete);
        map.addControl(transform);

        // select control
        // - highlight feature on hover to indicate that it is clickable
        // - activate editing on click (select), deactivate editing on click on map (unselect)
        var select = new OpenLayers.Control.HoverAndSelectFeature(bboxLayer, {
            hover : true,
            highlightOnly : true,
            onSelect : function(feature) {
                select.unhighlight(feature);
                transform.setFeature(feature);
                feature.renderIntent = "temporary";
                bboxLayer.drawFeature(feature);
            },
            onUnselect : function(feature) {
                transform.unsetFeature();
                feature.renderIntent = "default";
                bboxLayer.drawFeature(feature);
            }
        });

        map.addControl(select);
        select.activate();
    }

    function getBBox(feature) {
        return roundAndTransform(feature.geometry.getBounds());
    }

    function roundAndTransform(aBounds) {
        var bounds = aBounds.clone().transform(map.getProjectionObject(), map.displayProjection);
        
        var decimals = Math.floor(map.getZoom() / 3);
        var multiplier = Math.pow(10, decimals);

        // custom float.toFixed function that rounds to integer when .0
        // see OpenLayers.Bounds.toBBOX
        var toFixed = function(num) {
            return Math.round(num * multiplier) / multiplier;
        };

        // (left, bottom, right, top)
        var box = new OpenLayers.Bounds(
            toFixed(bounds.left),
            toFixed(bounds.bottom),
            toFixed(bounds.right),
            toFixed(bounds.top)
        );
        
        return box;
    }

    function addBBoxFromViewPort() {
        var bounds = map.getExtent();
        bboxLayer.addFeatures([new OpenLayers.Feature.Vector(bounds.toGeometry())]);

        return roundAndTransform(bounds);
    }

    return {
        style: style,
        createStyleMap : createStyleMap,
        addControls : addControls,
        switchActive : switchActive,
        addBBoxFromViewPort : addBBoxFromViewPort
    };
})();(function() {
    /* 
     * Patches OpenLayers.Request.issue. 
     * Adds config option "disableXRequestedWith" to disable setting X-Requested-With header.
     * (Error in Chrome: "Request header field X-Requested-With is not allowed by Access-Control-Allow-Headers")
     * see https://github.com/openlayers/openlayers/issues/188
     */

    var funcOldStr = OpenLayers.Request.issue.toString();
    var replacement = "customRequestedWithHeader === false && !(config.disableXRequestedWith === true)";

    // support both compressed and uncompressed
    var funcNewStr = funcOldStr.replace("customRequestedWithHeader===false", replacement);
    funcNewStr = funcNewStr.replace("customRequestedWithHeader === false", replacement);

    eval('OpenLayers.Request.issue = ' + funcNewStr);
    console.warn('patched OpenLayers.Request.issue');
    //console.debug(OpenLayers.Request.issue);
})();

/**
 * class OSMChangeStyle
 */
function OSMChangeStyle(map) {
    this.map = map;
}

OSMChangeStyle.prototype.getStyleMaps = function() {
    var styleMaps = {};

    var context = {
        getZIndex : function(feature) {
            var geometryType = feature.geometry.CLASS_NAME.substr(20);
            switch (geometryType) {
            case 'Polygon':
                if (feature.attributes.landuse)
                    return 10;
                else
                    return 20;
            case 'LineString':
                return 30;
            case 'Point':
                return 40;
            default:
                return 0;
            }
        }
    };

    // default style
    var defaultStyle = new OpenLayers.Style({
        graphicZIndex: '${getZIndex}',
        cursor: 'pointer',
        
        //dummy values to test for unmatched features
        strokeColor : "#FF00FF",
        strokeWidth : 4,
        strokeOpacity : 1.0,
        fillColor : 'orange'
    }, {
        context : context
    });
    var selectStyle = new OpenLayers.Style({
        graphicZIndex: '${getZIndex}',

        //dummy values to test for unmatched features
        strokeColor : "#FF00FF",
        strokeWidth: 4,
        strokeOpacity : 1.0
    }, {
        context : context
    });
    styleMaps.changes = new OpenLayers.StyleMap({
        "default" : defaultStyle,
        "select" : selectStyle
    });
    styleMaps.old = new OpenLayers.StyleMap({
        "default" : defaultStyle.clone(),
        "select" : selectStyle.clone()
    });

    // context
    var ruleContext = function(feature) {
        var ctx = OpenLayers.Util.applyDefaults({}, feature.attributes);
        OpenLayers.Util.applyDefaults(ctx , {
            hasTags: (feature.hasTags ? 'true' : 'false'),
            osmType: oscviewer.getOsmType(feature),
            used: (feature.used ? 'true' : 'false')
        });
        return ctx;
    };
    
    // util
    var cqlFormat = new OpenLayers.Format.CQL();
    var rule = function(cqlFilter, options) {
        OpenLayers.Util.applyDefaults(options, {
            filter: cqlFormat.read(cqlFilter),
            context: ruleContext
        });
        return new OpenLayers.Rule(options);
    };
    
    var ruleEqualTo = function(property, value, options) {
        OpenLayers.Util.applyDefaults(options, {
            filter: new OpenLayers.Filter.Comparison({
                type: OpenLayers.Filter.Comparison.EQUAL_TO,
                property: property,
                value: value
            }),
            context: ruleContext
        });
        return new OpenLayers.Rule(options);
    };
    
    // var
    getScaleFromZoom = function(zoom) {
        var res = map.getResolutionForZoom(zoom);
        var units = map.getUnits();
        var scale = OpenLayers.Util.getScaleFromResolution(res, units);
        return scale;
    };

    // rules
    var rules = [];

    rules.push(rule("osmType = 'changeset'", {
        symbolizer: {
            strokeColor: '#ee9900',
            strokeWidth: 4,
            strokeOpacity : 0.3
        }
    }));

    rules.push(rule("osmType = 'relation'", {
        symbolizer: {
            strokeWidth: 10,
            strokeOpacity : 0.4,
            fillOpacity : 0.1
        }
    }));
    rules.push(rule("osmType = 'relation'", {
        symbolizer: {
            strokeWidth: 6,
            strokeOpacity : 0.3
        },
        minScaleDenominator: getScaleFromZoom(18)
    }));
    rules.push(rule("osmType = 'relation'", {
        symbolizer: {
            strokeWidth: 4,
            strokeOpacity : 0.2
        },
        minScaleDenominator: getScaleFromZoom(15)
    }));

    rules.push(rule("osmType = 'way'", {
        symbolizer: {
            strokeWidth: 2,
            strokeOpacity : 1.0,
            fillOpacity : 0.2
        }
    }));
    rules.push(rule("osmType = 'way'", {
        symbolizer: {
            strokeWidth: 1,
            fillOpacity : 0.1
        },
        minScaleDenominator: getScaleFromZoom(15)
    }));
    rules.push(rule("osmType = 'way'", {
        symbolizer: {
            strokeWidth: 1.5,
            fillOpacity : 0.1
        },
        minScaleDenominator: getScaleFromZoom(10)
    }));

    var wayNodeSymbolizer = { 
        graphicName: "square",
        pointRadius: 3,
        fillOpacity: 1,
        strokeWidth: 1,
        strokeColor: 'black' // '#666'  'rgba(255, 255, 255, 0.4)'
    };
    rules.push(rule("osmType = 'node' AND hasTags = 'false'", {
        symbolizer: wayNodeSymbolizer
    }));
    rules.push(rule("osmType = 'node' AND hasTags = 'false'", {
        symbolizer: {
            pointRadius: 2,
            strokeWidth: 0.5
        },
        minScaleDenominator: getScaleFromZoom(17)
    }));
    rules.push(rule("osmType = 'node' AND hasTags = 'false' AND used = 'false'", {
        symbolizer: {
            pointRadius: 1,
            strokeWidth: 0
        },
        minScaleDenominator: getScaleFromZoom(15)
    }));
    // TODO Format.OSM does not set 'used' flag! 
    rules.push(rule("osmType = 'node' AND hasTags = 'false' AND used = 'true'", {
        symbolizer: {
            display: 'none'
        },
        minScaleDenominator: getScaleFromZoom(15)
    }));

    var oldModifyLowZoom = ruleEqualTo("action", "modify:geometry", {
        symbolizer: {
            display: 'none'
        },
        minScaleDenominator: getScaleFromZoom(13)
    });

    rules.push(rule("osmType = 'node' AND hasTags = 'true'", {
        symbolizer: {
            graphicName: "circle",
            pointRadius: 4,
            fillOpacity: 1,
            strokeWidth: 1,
            strokeColor: 'black'
        }
    }));
    rules.push(rule("osmType = 'node' AND hasTags = 'true'", {
        symbolizer: {
            pointRadius: 3,
            strokeWidth: 0.5
        },
        minScaleDenominator: getScaleFromZoom(15)
    }));
    rules.push(rule("osmType = 'node' AND hasTags = 'true'", {
        symbolizer: {
            pointRadius: 2
        },
        minScaleDenominator: getScaleFromZoom(12)
    }));
    rules.push(rule("osmType = 'node' AND hasTags = 'true'", {
        symbolizer: {
            pointRadius: 1
        },
        minScaleDenominator: getScaleFromZoom(8)
    }));
    
    // select rules
    var rulesSelect = [];

    rulesSelect.push(rule("osmType = 'changeset'", {
        symbolizer: {
            strokeOpacity : 0.8
        }
    }));

    rulesSelect.push(rule("osmType = 'relation'", {
        symbolizer: {
            strokeOpacity : 0.8,
            strokeColor: 'white'
        }
    }));

    rulesSelect.push(rule("osmType = 'way'", {
        symbolizer: {
            strokeWidth: 3,
            strokeColor: 'white'
        }
    }));
    rulesSelect.push(rule("osmType = 'way'", {
        symbolizer: {
            strokeWidth: 2
        },
        minScaleDenominator: getScaleFromZoom(15)
    }));

    rulesSelect.push(rule("osmType = 'node'", {
        symbolizer: {
            strokeWidth: 1.5,
            strokeColor: 'white'
        }
    }));

    // unique value rules (action)

    // changes
    var actionRules = {
        "create" : {
            strokeColor : '#FAF797',
            fillColor : '#FAF797'
        },
        "modify" : {
            strokeColor : 'lightskyblue',
            fillColor : 'lightskyblue'
        },
        "modify:geometry" : {
            strokeColor : 'lightgreen',
            fillColor : 'lightgreen'
        },
        "delete" : {
            display : 'none'
        }
    };
    styleMaps.changes.addUniqueValueRules("default", "action", actionRules);

    // old
    var osmActionRules = {
        "create" : {
            display : 'none'
        },
        "modify" : {
            display : 'none'
        },
        "modify:geometry" : {
            strokeColor : 'darkred',
            fillColor : 'darkred'
            //pointRadius : '${getGraphicRadiusOld}'
        },
        "delete" : {
            strokeColor : '#FF3333',
            fillColor : '#FF3333'
        },
        "augment" : {
            display : 'none'
        }
    };
    styleMaps.old.addUniqueValueRules("default", "action", osmActionRules);

    // after UniqueValueRules because of strokeColor nodes
    styleMaps.changes.styles['default'].addRules(rules);
    styleMaps.old.styles['default'].addRules(rules); 
    styleMaps.old.styles['default'].addRules([oldModifyLowZoom]); 
    styleMaps.changes.styles['select'].addRules(rules);
    styleMaps.old.styles['select'].addRules(rules); 
    styleMaps.changes.styles['select'].addRules(rulesSelect);
    styleMaps.old.styles['select'].addRules(rulesSelect); 
            
    return styleMaps;
};

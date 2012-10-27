var oscviewer = (function() {

    function buildFidMap(features) {
        var map = {};
        for(var i=0, len=features.length; i < len; i++) {
            map[features[i].fid] = features[i];
        }
        return map;        
    }

    function setActions(oscFeatures, osmFeatures) {
        var i;
        var oscFeature, osmFeature;
        var action;
        //var oscFeatures = oscLayer.features;
        var versionDiff;
        //var osmFeatures = [];
        
        var oscFeaturesFidMap = buildFidMap(oscFeatures);
        var osmFeaturesFidMap = buildFidMap(osmFeatures);
        
        var oscOnly = osmFeatures.length === 0;

        // Overpass diffs: distinguish deletes from old versions (before setting actions from osc!)
        for (i = 0; i < osmFeatures.length; i++) {
            osmFeature = osmFeatures[i];
            if (osmFeature.attributes['action'] === 'erase') {
                oscFeature = oscFeaturesFidMap[osmFeature.fid];
                if (oscFeature) {
                    // in 'insert' section = old version of modified object, remove 'erase'
                    delete osmFeature.attributes['action'];
                } else {
                    // replace action string 'erase' with 'delete' 
                    osmFeature.attributes['action'] = 'delete';
                    setHasTags(osmFeature, null);
                }
            } else if (osmFeature.attributes['action'] === 'keep') {
			    // set common action for referenced objects (for styling)
				osmFeature.attributes['action'] = 'augment';
			}
        }

        for (i = 0; i < oscFeatures.length; i++) {
            oscFeature = oscFeatures[i];
            osmFeature = null;
            
            action = oscFeature.attributes['action'];
            
            if (!(oscOnly || action === 'create')) {
                osmFeature = osmFeaturesFidMap[oscFeature.fid];
               
                if (action === 'modify' || action === 'delete') {
                    if (osmFeature) {
                        // set action to old object
                        if (action === 'modify') {
                            setModifyAction(osmFeature, oscFeature);
                        } else {
                            osmFeature.attributes['action'] = action;
                        }
                    } else {
                        console.warn('Feature "' + oscFeature.fid + '" not found');
                    }
                } else if (action === 'insert') {
                    // Overpass diffs
                    if (osmFeature) {
                        // modify
                        setModifyAction(osmFeature, oscFeature);
                    } else {
                        // create
                        oscFeature.attributes['action'] = 'create';
                    }
                }
            } 
            
            setHasTags(osmFeature, oscFeature);
        }
    }

    function setModifyAction(osmFeature, oscFeature) {
        var action = oscFeature.geometry.equals(osmFeature.geometry) ? 'modify' : 'modify:geometry';
        osmFeature.attributes['action'] = action;
        oscFeature.attributes['action'] = action;
    }

    function getHasTags(feature) {
        var result = false;
        for (var attr in feature.attributes) {
            if (!isMetaAttribute(attr)) {
                result = true;
                break;
            }
        }
        return result;
    }

    function setHasTags(osmFeature, oscFeature) {
        var osmHasTags = false;
        if (osmFeature) {
            osmHasTags = getHasTags(osmFeature);
            osmFeature.hasTags = osmHasTags;
        }
        if (oscFeature) {
            // also indicate that the old feature had tags, when the changed feature has none
            oscFeature.hasTags = osmHasTags || getHasTags(oscFeature);
        }
    }

    function isMetaAttribute(attr) {
        var metaAttrs = OpenLayers.Format.OSC.prototype.metaAttributes;
        return OpenLayers.Util.indexOf(metaAttrs, attr) !== -1;
    }

    function getInfoHtml(oldFeature, changeFeature) {
        var keys = [];
        var oldTags = undefined;
        var changeTags = undefined;
        var feature = changeFeature || oldFeature;
        var osm = {
            id : feature.osm_id,
            type : getOsmType(feature)
        };
        var action = feature.attributes['action'] || '';

        var infoHtml = '';
        infoHtml += '<div class="border">';
        infoHtml += '<div class="info">';
        infoHtml += '<div class="title">';
        // modify:geometry -> modify_geometry for CSS
        infoHtml += '<span class="' + action.replace(/:/g, "_") + '">';
        infoHtml += action;
        infoHtml += '</span>';
        infoHtml += ' ' + osm.type;
        infoHtml += ' ' + formatOsmLink(osm.id, osm.type);
        infoHtml += '</div>';

        if (!oldFeature && action != 'create') {
            infoHtml += '<div class="warning">Warning: Old feature not found,<br/>probably not included in OSM file</div>';
        }

        infoHtml += '<table>';

        if (oldFeature) {
            oldTags = oldFeature.attributes;
            keys = _.keys(oldTags);
        }
        if (changeFeature) {
            changeTags = changeFeature.attributes;
            keys = keys.concat(_.keys(changeTags));
        }
        keys = _.filter(keys, function(key) {
            return !isMetaAttribute(key);
        });
        keys.sort();
        keys = _.unique(keys, true);

        infoHtml += printMeta('timestamp', oldTags, changeTags, formatIsoDateTime);
        infoHtml += printMeta('user', oldTags, changeTags, formatOsmLink);
        infoHtml += printMeta('version', oldTags, changeTags);
        infoHtml += printMeta('changeset', oldTags, changeTags, formatOsmLink);

        infoHtml += '<tr><td class="tagsep" colspan="3"><hr/></td></tr>';
        infoHtml += printKeys(keys, oldTags, changeTags, action);

        infoHtml += '</table>';
        infoHtml += '</div>';
        infoHtml += '</div>';

        return infoHtml;
    }

    function getOsmType(feature) {
        return feature.fid.substring(0, feature.fid.indexOf('.'));
    }

    function formatIsoDateTime(dateTimeString) {
        return moment(dateTimeString).format('L LT');
    }

    function formatOsmLink(val, type) {
        var path = (type === 'user') ? '' : 'browse/';
        return '<a href="http://www.openstreetmap.org/' + path + type + '/' + val + '" target="_blank">' + val + '</a>';
    }

    function printMeta(key, oldTags, changeTags, format) {
        var infoHtml = '';
        if (!format) {
            // dummy 
            format = function(val) {
                return val;
            };
        }
        infoHtml += '<tr><td class="tagkey">' + key + '</td>';
        if (oldTags) {
            infoHtml += '<td class="default">' + format(oldTags[key], key) + '</td>';
        }
        if (changeTags) {
            infoHtml += '<td class="default">' + format(changeTags[key], key) + '</td>';
        }
        infoHtml += '</tr>';
        return infoHtml;
    }

    function printKeys(keys, oldTags, changeTags, action) {
        var i;
        var oldVal, changeVal;
        var classes;
        var infoHtml = '';
        for (i = 0; i < keys.length; i++) {
            key = keys[i];
            oldVal = oldTags && oldTags[key];
            changeVal = changeTags && changeTags[key];
            classes = getClasses(oldVal, changeVal, action);
            infoHtml += '<tr><td class="tagkey ' + classes.key + '">' + key + '</td>';
            if (oldTags) {
                infoHtml += '<td class="' + classes.old + '">' + val(oldVal) + '</td>';
            }
            if (changeTags) {
                infoHtml += '<td class="' + classes.change + '">' + val(changeVal) + '</td>';
            }
            infoHtml += '</tr>';
        }
        return infoHtml;
    }

    function getClasses(oldVal, changeVal, action) {
        var c = {
            key : 'keydefault',
            old : 'default',
            change : 'default'
        };
        if (_.isUndefined(oldVal)) {
            c.key = 'created';
            c.old = 'undefined';
            c.change = 'created';
        } else if (_.isUndefined(changeVal)) {
            // default on delete, because tags themselves are unchanged
            if (action !== 'delete') {
                c.key = 'deleted';
                c.old = 'deleted';
            }
            c.change = 'undefined';
        } else if (oldVal !== changeVal) {
            c.old = 'modified';
            c.change = 'modified';
        }

        return c;
    }

    function val(value) {
        return _.isUndefined(value) ? '' : value;
    }

    return {
        setActions : setActions,
        getInfoHtml: getInfoHtml,
        getOsmType: getOsmType
    };
})();
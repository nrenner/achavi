var oscviewer = (function() {

    var ACTION_MODIFY_GEOMETRY = 'modify:geometry';

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

            // handle special cases when old or new entity is out of scope
            // (geometry entering or leaving the bounding box)
            if (action === 'create' && oscFeature.attributes.version > 1) {
                oscFeature.scopeAction = action;
                oscFeature.attributes.action = ACTION_MODIFY_GEOMETRY;
            } else if (action === 'delete' && oscFeature.attributes.visible === 'true') {
                oscFeature.scopeAction = action;
                osmFeature.attributes.action = ACTION_MODIFY_GEOMETRY;
                oscFeature.attributes.action = ACTION_MODIFY_GEOMETRY;
            }
            
            setHasTags(osmFeature, oscFeature);
        }
    }

    function setModifyAction(osmFeature, oscFeature) {
        var action = oscFeature.geometry.equals(osmFeature.geometry) ? 'modify' : ACTION_MODIFY_GEOMETRY;
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

    // TODO move to OSMDiffFormat
    OpenLayers.Format.OSC.prototype.metaAttributes.push('action');
    OpenLayers.Format.OSC.prototype.metaAttributes.push('state');

    // 'visible' only set in attic format when entity moved out of bbox (-> action=delete)
    OpenLayers.Format.OSMMeta.prototype.metaAttributes.push('visible');

    function isMetaAttribute(attr) {
        var metaAttrs = OpenLayers.Format.OSC.prototype.metaAttributes;
        return OpenLayers.Util.indexOf(metaAttrs, attr) !== -1;
    }

    function isChangesetMetaAttribute(attr) {
        var metaAttrs = OpenLayers.Format.OSMChangeset.prototype.metaAttributes;
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
        var tagColoring = !feature.scopeAction; // no tag comparison when one feature out of scope

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

        if (feature.scopeAction) {
            var scopeText = feature.scopeAction === 'create' ? 'old' : 'new';
            infoHtml += '<div class="warning">Note: ' + scopeText + ' entity out of scope</div>';
        } else if (!oldFeature && action != 'create') {
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
            if (osm.type === 'changeset') {
                return !isChangesetMetaAttribute(key);
            } else {
                return !isMetaAttribute(key);
            }
        });
        keys.sort();
        keys = _.unique(keys, true);

        // single column display (no comparison) when same object version
        // e.g. for modify:geometry on way when only node changed or 
        // duplicated delete when change version is not available (Osmosis diff)
        if (oldTags && changeTags && oldTags.version === changeTags.version) {
            changeTags = undefined;
        }

        if (osm.type === 'changeset') {
            infoHtml += printChangesetMeta(oldTags);
        } else {
            infoHtml += printEntityMeta(oldTags, changeTags);
        }

        infoHtml += '<tr><td class="tagsep" colspan="3"><hr/></td></tr>';
        infoHtml += printKeys(keys, oldTags, changeTags, action, tagColoring);

        infoHtml += '</table>';
        infoHtml += '</div>';
        infoHtml += '</div>';

        return infoHtml;
    }

    function getOsmType(feature) {
        return feature.fid.substring(0, feature.fid.indexOf('.'));
    }

    function formatIsoDateTime(dateTimeString) {
        // locale-independent, ISO-like format, but in user's local time zone
        return moment(dateTimeString).format('YYYY-MM-DD HH:mm');
    }

    function formatIsoDateTimeSec(dateTimeString) {
        // locale-independent, ISO-like format, but in user's local time zone
        if (!dateTimeString) {
            return '';
        }
        return moment(dateTimeString).format('YYYY-MM-DD HH:mm:ss');
    }

    function formatOsmLink(val, type) {
        var path = (type === 'user') ? '' : 'browse/';
        return '<a href="http://www.openstreetmap.org/' + path + type + '/' + val + '" target="_blank">' + val + '</a>';
    }

    function printChangesetMeta(tags) {
        var infoHtml = '';

        infoHtml += printMeta('user', tags, null, formatOsmLink);
        infoHtml += printMeta('created_at', tags, null, formatIsoDateTimeSec);
        infoHtml += printMeta('closed_at', tags, null, formatIsoDateTimeSec);
        infoHtml += printMeta('open', tags);

        return infoHtml;
    }

    function printEntityMeta(oldTags, changeTags) {
        var infoHtml = '';

        infoHtml += printMeta('timestamp', oldTags, changeTags, formatIsoDateTime);
        infoHtml += printMeta('user', oldTags, changeTags, formatOsmLink);
        infoHtml += printMeta('version', oldTags, changeTags);
        infoHtml += printMeta('changeset', oldTags, changeTags, formatOsmLink);

        return infoHtml;
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

    function printKeys(keys, oldTags, changeTags, action, coloring) {
        var i;
        var oldVal, changeVal;
        var classes;
        var infoHtml = '';
        for (i = 0; i < keys.length; i++) {
            key = keys[i];
            oldVal = oldTags && oldTags[key];
            changeVal = changeTags && changeTags[key];
            classes = (oldTags && changeTags && coloring) ? getClasses(oldVal, changeVal, action) : getDefaultClasses();
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

    function getDefaultClasses() {
        var c = {
            key : 'keydefault',
            old : 'default',
            change : 'default'
        };
        return c;
    }

    function getClasses(oldVal, changeVal, action) {
        var c = getDefaultClasses();

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
        getOsmType: getOsmType,
        formatIsoDateTime: formatIsoDateTime
    };
})();
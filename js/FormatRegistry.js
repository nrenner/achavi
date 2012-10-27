/**
 * class FormatRegistry
 */
function FormatRegistry(formatOptions) {
    this.formatOptions = formatOptions;

    /* Maps XML root tag name to corresponding OpenLayers.Format class, custom name when multiple with same root */
    this.formats = {};
    this.formats.osmChange = OpenLayers.Format.OSCAugmented;
    this.formats.osm = OpenLayers.Format.OSMExt;
    this.formats.osmAugmentedDiff = OpenLayers.Format.OSCAugmentedDiff;
	this.formats.osmAugmentedDiff_IDSorted = OpenLayers.Format.OSCAugmentedDiffIDSorted;
    this.formats.osmChangeset = OpenLayers.Format.OSMChangeset;
}

FormatRegistry.prototype.getFormat = function(doc) {
    var format = null;
    var formatType = this.getFormatType(doc);
    var formatClass = this.formats[formatType];
    if (formatClass) {
        format = new formatClass(this.formatOptions);
    } else {
        console.error('unknown format "' + formatType + '"');
    }

    return {
        type : formatType,
        format : format
    };
};

FormatRegistry.prototype.getFormatType = function(doc) {
    var type = doc.documentElement.nodeName;
    
    // special cases with common root node name but different content 
    if (type === 'osm') {
        var node = doc.documentElement.firstChild;
        while (node) {
            // changeset info file
            if (node.nodeName === 'changeset') {
                type = 'osmChangeset';
                break;
            }
            node = node.nextSibling;
        }
    } else if (type === 'osmAugmentedDiff') {
		var formatAttribute = doc.documentElement.getAttribute('format');
		if (formatAttribute && formatAttribute === 'id-sorted') {
			type = 'osmAugmentedDiff_IDSorted';
		}
	}
        
    return type;
};
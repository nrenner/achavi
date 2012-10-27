function PopupHandler(map, old, changes) {

    this.selectedFeature = null;
    this.popup = null;

    this.onPopupClose = function(evt) {
		// TODO reference to HoverAndSelectFeature needed
        hover.unselect(selectedFeature);
    };

    this.onFeatureSelect = function(feature, mouseXy, hover) {
        var oldFeature, changeFeature;
        var infoHtml;

        selectedFeature = feature;

        if (feature.layer === changes) {
            changeFeature = feature;
            oldFeature = old.getFeatureByFid(feature.fid);
        } else {
            oldFeature = feature;
            changeFeature = changes.getFeatureByFid(feature.fid);
        }

        infoHtml = oscviewer.getInfoHtml(oldFeature, changeFeature);

        //OpenLayers.Popup.prototype.displayClass = "border";
        //OpenLayers.Popup.prototype.contentDisplayClass = "info";
        // use mouse position to place popup; using geometry center does nor really work for long ways   
        //feature.geometry.getBounds().getCenterLonLat()
        popup = new OpenLayers.Popup.Anchored("popup", map.getLonLatFromViewPortPx(mouseXy), null, infoHtml,
                {
                    size : new OpenLayers.Size(0, 0),
                    offset : new OpenLayers.Pixel(0, 0)
                }, false /*!hover*/, this.onPopupClose);
        popup.autoSize = true;

        // set CSS defined values, as OL keeps overwriting them
        popup.setBackgroundColor(popup.div.style.backgroundColor);
        popup.setOpacity(popup.div.style.opacity);
        popup.setBorder(popup.div.style.border);

        // prevent popup flickering when mouse is hovering both over feature and popup div
        if (hover) {
            popup.div.style['pointer-events'] = 'none';
        }

        feature.popup = popup;
        map.addPopup(popup);
    };

    this.onFeatureUnselect = function(feature) {
        map.removePopup(feature.popup);
        feature.popup.destroy();
        feature.popup = null;
    };
}
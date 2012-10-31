# achavi - Augmented OSM Change Viewer - alpha

Displays updates to [OpenStreetMap](openstreetmap.org) based on minutely [Augmented Diffs](http://wiki.openstreetmap.org/wiki/Overpass_API/Augmented_Diffs) provided by [Overpass API](http://overpass-api.de/augmented_diffs/).

*work in progress*

See [olex](https://github.com/nrenner/olex) repository for OpenLayers-related sources (included as lib/olex.js).

## License

TBD

## Install

Achavi is a pure JavaScript Browser app. It relies on the Overpass API for serving Augmented Diffs.

The project layout is already the runnable web app, there currently is no build. All files and directories are required at runtime, 
except readme.md and one of lib/openlayers/OpenLayers.js or OpenLayers.js.gz + .htaccess?. To use the compressed OpenLayers.js.gz, change the 
script URL in index.html.

## Licenses

TBD
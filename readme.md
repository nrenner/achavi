# achavi - Augmented OSM Change Viewer

Displays [OpenStreetMap](openstreetmap.org) changes based on the [Overpass API](https://overpass-api.de/) [Augmented Delta (adiff)](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL#Augmented_Delta_between_two_dates_.28.22adiff.22.29) query and the
[Augmented Diff](https://wiki.openstreetmap.org/wiki/Overpass_API/Augmented_Diffs#Contained_data) format.

https://overpass-api.de/achavi/ - production (master)  
https://nrenner.github.io/achavi/ - development, test (gh-pages)

*work in progress*

See [olex](https://github.com/nrenner/olex) repository for OpenLayers-related sources (included as lib/olex.js).

## License

Copyright (c) 2014 Norbert Renner, licensed under the [MIT License (MIT)](LICENSE)

## Install

Achavi is a pure JavaScript Browser app. It relies on the Overpass API for serving Augmented Diffs.

The project layout is already the runnable web app, there currently is no build. All files and directories are required at runtime,
except readme.md and one of lib/openlayers/OpenLayers.js or OpenLayers.js.gz + .htaccess?. To use the compressed OpenLayers.js.gz, change the
script URL in index.html.

## Licenses

* [OpenLayers](http://www.openlayers.org/): Copyright (c) 2005-2012 OpenLayers [Contributors](licenses/openlayers-authors.txt), [2-clause BSD License](licenses/openlayers-license.txt)
* [Underscore.js](http://underscorejs.org/): Copyright (c) 2009-2012 Jeremy Ashkenas, DocumentCloud, [MIT License](licenses/underscorejs-LICENSE)
* [Moment.js](http://momentjs.com/): Copyright (c) 2011-2012 Tim Wood, [MIT License](licenses/momentjs-LICENSE)

* loadinggif-4.gif by http://loadinggif.com/
* [layer-switcher-minimize.png](https://github.com/nrenner/openlayers_themes): Copyright (c) 2010, Development Seed, Inc., [3-clause BSD License](licenses/openlayers_themes-LICENSE.txt)

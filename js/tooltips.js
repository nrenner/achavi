var tooltips = (function() {

    // tag id > tooltip text (title attribute)

    var main = {
        bbox_button: "click and drag to draw bounding box (optional, else current map view is used), to display and edit activate 'bbox' layer",
        /*live_button: "load latest diff and activate minutely refreshing",*/
        clear_button: "remove all loaded changes"
    };

    var diff = {
        fromDatetime: "Enter start date & time (local time) of time range to load (Format: YYYY-MM-DD HH:mm). Defaults to -24h or last visit.",
        toDatetime: "Enter end date & time (local time) of time range to load (Format: YYYY-MM-DD HH:mm), or leave empty. Defaults to current time.",
        relations: "Check to also load changed relations, only basic support for relations right now.",
        load_button: "Load changes in the specified time range"
    };

    var player = {
        fast_backward_button: "fast backward - starts loading all augmented diffs previous to date & time entered, stop by pushing again, stops after limit of 24h",
        backward_button: "backward - load previous augmented diff to date & time entered",
        last_visit_button: "last visit - sets date & time to latest diff loaded in last session",
        now_button: "now - sets date & time to current time",
        datetime: "Enter date & time (local time) of augmented diff to load (Format: YYYY-MM-DD HH:mm), or set with last/now. Defaults to last visit.",
        load_button: "load augmented diff of date & time entered",
        forward_button: "forward - load next augmented diff to date & time entered",
        fast_forward_button: "fast forward - starts loading all augmented diffs after date & time entered, stop by pushing again, stops after limit of 24h",
    };

    var status = {
        status_countdown: "next refresh countdown - seconds until checking for new augmented diff",
        status_time: "base time - OSM base time when the last changes were published (usually lag of 1-2 minutes)",
        status_count: "diff count - number of loaded diffs",
        status_sequence: "sequence number - number of last loaded augmented diff",
        status_total_changes: "total changes - number of changes loaded",
        status_new_changes: "new changes - number of changes loaded with last diff",
        status_errors: "loading errors - number of too large diffs that were rejected"
    };

    /**
     * Add texts as tooltip to button and status bars, and also to help dialog.
     * Note: title attribute does not work with Firefox for Windows!
     */
    var setTitlesAndHelp = function(map, name) {
        //var html = name + '<br><table><tbody>';
        var html = '<div class="help_section">' + name + '</div>';
        for (var id in map) {
            var label;
            var ele = document.getElementById(id);
            ele.setAttribute('title', map[id]);
            if (id.substr(0,6) === 'status') {
                // for the status bar, set tooltip on labels as well 
                ele.previousElementSibling.setAttribute('title', map[id]);
                label = ele.previousElementSibling.innerText;
            } else {
                label = ele.innerText;
            }
            //html += '<tr><td>' + label + '</td><td>' + map[id] + '</td></tr>';
            html += '<div class="help_row"><div class="label_col">' + label + '</div><div class="description_col">' + map[id] + '</div></div>';
        }
        //html += '</tbody></table>';
        var eleHelp = document.getElementById('help_tooltips');
        eleHelp.innerHTML += html;
    };
    
    setTitlesAndHelp(main, 'Main buttons');
    setTitlesAndHelp(diff, 'Time range');
    //setTitlesAndHelp(player, 'Player');
    //setTitlesAndHelp(status, 'Status bar');
})();
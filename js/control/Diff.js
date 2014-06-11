function Diff(overpassAPI, status) {
    this.overpassAPI = overpassAPI;
    this.status = status;

    this.element = null;

    this.eleFromDatetime = document.getElementById('fromDatetime');
    this.eleToDatetime = document.getElementById('toDatetime');

    this.lastVisit = this.getLastVisit();
    if (this.lastVisit) {
        this.setDateTimeToLastVisit();
        console.log('last visit: ' + moment(this.lastVisit).format("YYYY-MM-DD HH:mm:ss"));
    } else {
        this.setDateTime(moment().subtract('days', 1));
    }

    document.getElementById('load_button').onclick = _.bind(this.load, this);
}

Diff.prototype.getLastVisit = function() {
    var lastVisitItem,
        lastVisit = null;

    try {
        lastVisitItem = localStorage.getItem(Status.STORAGE_KEY_LAST_VISIT);
    } catch (err) {
        console.warn('Failed to read last visit from localStorage: ' + err.message);
    }

    if (lastVisitItem) {
        lastVisit = parseInt(lastVisitItem);
    }
    return lastVisit;
};

Diff.prototype.setDateTime = function(dateTime) {
    this.eleFromDatetime.value = oscviewer.formatIsoDateTime(dateTime);
};

Diff.prototype.setDateTimeToLastVisit = function() {
    this.setDateTime(this.lastVisit);
};

Diff.prototype.setDateTimeToNow = function() {
    this.setDateTime(Date.now());
};

Diff.prototype.getTime = function(ele) {
    if (!ele.value) {
      return null;
    }
    return moment(ele.value, 'YYYY-MM-DD HH:mm').valueOf();
};

Diff.prototype.load = function() {
    var from = this.getTime(this.eleFromDatetime),
        to = this.getTime(this.eleToDatetime);
    this.status.loadStart();
    this.overpassAPI.loadDiff(from, to, _.bind(this.postLoad, this));
};

Diff.prototype.updateStatus = function() {
    this.status.countdown = null;
    this.status.update();
};

Diff.prototype.postLoad = function() {
    this.status.loadEnd();
    this.updateStatus();
};

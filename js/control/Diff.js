function Diff(overpassAPI, loading) {
    this.overpassAPI = overpassAPI;
    this.loading = loading;

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

    this.loadButton = document.getElementById('load_button');
    this.loadButton.onclick = _.bind(this.load, this);
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
        to = this.getTime(this.eleToDatetime),
        xhr;
    xhr = this.overpassAPI.loadDiff(from, to, _.bind(this.postLoad, this));
    this.loading.loadStart(xhr);
    this.loadButton.classList.add('button_disabled');
};

Diff.prototype.postLoad = function() {
    this.loading.loadEnd();
    this.loadButton.classList.remove('button_disabled');
 };

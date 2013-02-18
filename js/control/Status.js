/**
 * class Status
 */
function Status() {
    this.reset();
}

/** key for local storage, max timestamp of last visit */
Status.STORAGE_KEY_LAST_VISIT = 'achavi.last_visit';

Status.prototype.update = function() {
    var unset = '-';
    var sTimestamp = unset;
    if (this.timestamp) {
        sTimestamp = moment(this.timestamp).format('HH:mm');
        
        // remember last visit as max timestamp of loaded diffs
        var lastVisit = localStorage.getItem(Status.STORAGE_KEY_LAST_VISIT);
        if (lastVisit < this.timestamp) {
            localStorage.setItem(Status.STORAGE_KEY_LAST_VISIT, this.timestamp);
        }
    }
    
    document.getElementById('status_countdown').innerHTML = this.nvl(this.countdown, unset);
    document.getElementById('status_time').innerHTML = sTimestamp;
    document.getElementById('status_count').innerHTML = this.count || unset;
    document.getElementById('status_sequence').innerHTML = this.sequence || unset; 
    document.getElementById('status_new_changes').innerHTML = this.nvl(this.newChanges, unset);
    document.getElementById('status_total_changes').innerHTML = this.nvl(this.totalChanges, unset);
    document.getElementById('status_errors').innerHTML = this.errors || unset;
};

Status.prototype.reset = function() {
    this.countdown = null;
    this.sequence = null;
    /** number in milliseconds */
    this.timestamp = null;
    this.count = 0;
    this.newChanges = null;
    this.totalChanges = null;
    this.errors = 0;
    
    this.update();
};

Status.prototype.addChanges = function(changes) {
    this.newChanges = changes;
    if (this.totalChanges) {
        this.totalChanges += changes;
    } else {
        this.totalChanges = changes;
    }
};

Status.prototype.nvl = function(val, s) {
    return (val !== null) ? val : s;
};

Status.prototype.setCountdown = function(countdown) {
    this.countdown = countdown;
    this.update();
};

Status.prototype.loadStart = function() {
    this.setCountdown('&nbsp;');
    document.getElementById('status_countdown').classList.add('spinner');
};

Status.prototype.loadEnd = function() {
    document.getElementById('status_countdown').classList.remove('spinner');
};

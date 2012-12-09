/**
 * class Status
 */
function Status() {
    this.reset();
}

Status.prototype.update = function() {
    var unset = '-';
    var m, sTimestamp = unset;
    if (this.timestamp) {
        m = moment(this.timestamp.replace('\\:', ':'));
        sTimestamp = m.format('HH:mm');
    }
    
    document.getElementById('status_countdown').innerHTML = this.nvl(this.countdown, unset);
    document.getElementById('status_time').innerHTML = sTimestamp;
    document.getElementById('status_count').innerHTML = this.count || unset;
    document.getElementById('status_sequence').innerHTML = this.sequence || unset; 
    document.getElementById('status_new_changes').innerHTML = this.nvl(this.newChanges, unset);
    document.getElementById('status_total_changes').innerHTML = this.nvl(this.totalChanges, unset);
};

Status.prototype.reset = function() {
    this.countdown = null;
    this.sequence = null;
    this.timestamp = null;
    this.count = 0;
    this.newChanges = null;
    this.totalChanges = null;
    
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
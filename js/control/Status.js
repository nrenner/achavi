/**
 * class Status
 */
function Status() {
    this.sequence = null;
    this.timestamp = null;
    this.count = 0;
}

Status.prototype.update = function() {
    var unset = '-';
    var m, sTimestamp = unset, sCount;
    if (this.timestamp) {
        m = moment(this.timestamp.replace('\\:', ':'));
        sTimestamp = m.format('HH:mm');
    }
    sCount = (this.count != 0) ? this.count : unset;
    
    document.getElementById('status_time').innerHTML = sTimestamp;
    document.getElementById('status_count').innerHTML = sCount;
    document.getElementById('status_sequence').innerHTML = this.sequence || unset;
};

Status.prototype.reset = function() {
    this.sequence = null;
    this.timestamp = null;
    this.count = 0;
    
    this.update();
};

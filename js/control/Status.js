/**
 * class Status
 */
function Status() {
    this.sequence = null;
    this.timestamp = null;
    this.count = 0;
}

Status.prototype.update = function() {
    var m = moment(this.timestamp.replace('\\:', ':'));
    document.getElementById('status_time').innerHTML = m.format('HH:mm');
    document.getElementById('status_count').innerHTML = this.count;
    document.getElementById('status_sequence').innerHTML = this.sequence;
};

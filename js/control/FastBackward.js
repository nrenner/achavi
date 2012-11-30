/**
 * class FastBackward
 */
function FastBackward(overpassAPI, status) {
    this.overpassAPI = overpassAPI;
    this.status = status;

    this.interval = null;
    this.sequence = -1; 
    this.active = false;

    document.getElementById('fast_backward_button').onclick = _.bind(this.toggle, this);
}

FastBackward.prototype.start = function() {
    var currentSequence = this.overpassAPI.getCurrentSequence();
    if (currentSequence && currentSequence >= 0) {
        // getting empty response for current diff, so for now use previous instead (- 1)
        currentSequence--;
        sequence = currentSequence + 1;
    } else {
        console.error('invalid current sequence: "' + currentSequence + '"');
    }

    // success or failure
    return sequence !== -1;
};

FastBackward.prototype.load = function() {
    sequence--;
    this.overpassAPI.load(sequence, _.bind(this.postLoadHandler, this));
};

FastBackward.prototype.postLoadHandler = function() {
    this.status.sequence = sequence;
    this.status.count++;
    this.status.update();

    if (this.active) {
        window.setTimeout(_.bind(this.load, this), 200);
    } else {
        console.log('fast backward stopped');
    }
};

FastBackward.prototype.toggle = function(e) {
    // TODO ele from event
    var ele = document.getElementById('fast_backward_button');
    ele.classList.toggle('button_active');
    if (!this.active) {
        this.active = true;
        this.start();
        this.load();
    } else {
        this.active = false;
    }
    /*
    if (!this.interval) {
        if (this.start()) {
            this.interval = window.setInterval(_.bind(this.load, this), 5000);
        }
    } else {
        window.clearInterval(this.interval);
        this.interval = null;
        console.log('fast backward stopped');
    }
    */
};

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
        this.sequence = currentSequence + 1;
    } else {
        console.error('invalid current sequence: "' + currentSequence + '"');
    }

    // success or failure
    return this.sequence !== -1;
};

FastBackward.prototype.load = function() {
    this.sequence--;
    this.overpassAPI.load(this.sequence, _.bind(this.postLoad, this));
};

FastBackward.prototype.postLoad = function() {
    this.status.sequence = this.sequence;
    this.status.count++;
    this.status.update();

    if (this.active) {
        this.interval = window.setTimeout(_.bind(this.load, this), 200);
    } else {
        console.log('fast backward stopped');
    }
};

FastBackward.prototype.toggle = function(e) {
    var ele = e.srcElement;
    ele.classList.toggle('button_active');
    if (!this.active) {
        this.active = true;

        // test
        //this.sequence = 83690; 
        //this.sequence = 83610;
        //this.sequence = 83554;

        if (this.sequence === -1) {
            this.start();
        }
        this.load();
    } else {
        this.active = false;
        window.clearTimeout(this.interval); 
        this.interval = null;
        console.log('fast backward timer stopped');
    }
};

/**
 * class FastBackward
 */
function FastBackward(overpassAPI, status) {
    this.overpassAPI = overpassAPI;
    this.status = status;

    this.interval = null;
    this.sequence = -1; 
    this.active = false;
    
    // number of sequences (~ 1 per minute)
    this.limit = 60 * 24; // 24h
    this.stopSequence = null;

    this.element = document.getElementById('fast_backward_button');
    this.element.onclick = _.bind(this.toggle, this);
}

FastBackward.prototype.start = function() {
    var currentSequence = this.overpassAPI.getCurrentSequence();
    if (currentSequence && currentSequence >= 0) {
        // getting empty response for current diff, so for now use previous instead (- 1)
        currentSequence--;
        this.sequence = currentSequence + 1;
        this.stopSequence = this.sequence - this.limit;
    } else {
        console.error('invalid current sequence: "' + currentSequence + '"');
    }

    // success or failure
    return this.sequence !== -1;
};

FastBackward.prototype.load = function() {
    this.status.setCountdown('...');
    this.sequence--;
    if (this.sequence >= this.stopSequence) {
        this.overpassAPI.load(this.sequence, _.bind(this.postLoad, this));
    } else {
        this.stop();
        console.log('fast backward stopped - limit reached');
    }
};

FastBackward.prototype.postLoad = function() {
    this.status.sequence = this.sequence;
    this.status.count++;
    this.status.countdown = null;
    this.status.update();

    if (this.active) {
        this.interval = window.setTimeout(_.bind(this.load, this), 200);
    } else {
        console.log('fast backward stopped');
    }
};

FastBackward.prototype.stop = function() {
    this.active = false;
    window.clearTimeout(this.interval); 
    this.interval = null;
    this.element.classList.remove('button_active');
    this.status.setCountdown(null);
    console.timeEnd('fast backward');
};

FastBackward.prototype.toggle = function(e) {
    if (!this.active) {
        console.time('fast backward');
        this.element.classList.add('button_active');
        this.active = true;

        // test
        //this.sequence = 83690; 
        //this.sequence = 83610;
        //this.sequence = 83554;
        //this.sequence = 160697;

        if (this.sequence === -1) {
            this.start();
        }
        this.load();
    } else {
        this.stop();
        console.log('fast backward timer stopped');
    }
};

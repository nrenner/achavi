/**
 * class Live
 */
function Live(overpassAPI, status) {
    this.overpassAPI = overpassAPI;
    this.status = status;

    this.interval = null;
    this.sequence = -1; 
    this.nextLoadTime = null;
    
    this.retryDelay = 15000; // 15 sec.

    this.element = document.getElementById('live_button');
    this.element.onclick = _.bind(this.toggle, this);
}

Live.prototype.calcNextLoadTime = function() {
    // diff created every full minute, wait x sec for completion 
    return moment().add('minutes', 1).seconds(10);
};

Live.prototype.load = function() {
    this.status.setCountdown('...');
    var currentSequence = this.overpassAPI.getCurrentSequence();
    if (currentSequence && currentSequence >= 0) {
        // getting empty response for current diff, so for now use previous instead (- 1)
        currentSequence--;

        if (this.sequence === -1) {
            this.nextLoadTime = this.calcNextLoadTime();
            this.sequence = currentSequence;
            this.overpassAPI.load(this.sequence, _.bind(this.postLoad, this));
        } else { 
            if (currentSequence > this.sequence){
                if (currentSequence - this.sequence > 1) {
                    // shorter delay to catch up if more than one diff behind
                    this.nextLoadTime = +new Date() + this.retryDelay;
                } else {
                    this.nextLoadTime = this.calcNextLoadTime();
                }
                this.sequence++;
                this.overpassAPI.load(this.sequence, _.bind(this.postLoad, this));
            } else {
                this.status.setCountdown('x');
                this.nextLoadTime = +new Date() + this.retryDelay;
                console.log('skip refresh: sequence = ' + this.sequence + ', current sequence = ' + currentSequence);
            }
        }
    }
};

Live.prototype.postLoad = function() {
    this.status.sequence = this.sequence;
    this.status.count++;
    this.status.update();
};

Live.prototype.tick = function() {
    if (this.nextLoadTime <= +new Date()) {
        this.load();
    } else {
        this.status.setCountdown(moment(this.nextLoadTime).diff(moment(), 'seconds') + 1);
    }
};

Live.prototype.toggle = function(e) {
    this.element.classList.toggle('button_active');
    if (!this.interval) {
        this.load();
        this.interval = window.setInterval(_.bind(this.tick, this), 1000);
    } else {
        window.clearInterval(this.interval);
        this.interval = null;
        this.sequence = -1; 
        this.status.setCountdown(null);
        console.log('live stopped');
    }
};

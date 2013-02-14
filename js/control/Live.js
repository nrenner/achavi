/**
 * class Live
 */
function Live(overpassAPI, status) {
    this.overpassAPI = overpassAPI;
    this.status = status;

    this.interval = null;
    this.sequence = -1; 
    this.nextLoadTime = null;
    
    this.retryDelay = 30000; // 30 sec.
    this.catchUpDelay = 2000; // 2 sec.

    this.element = document.getElementById('live_button');
    this.element.onclick = _.bind(this.toggle, this);
}

Live.prototype.calcNextLoadTime = function() {
    var m = moment(this.nextLoadTime).add('minutes', 1);
    return m.valueOf();
};

Live.prototype.load = function() {
    this.status.setCountdown('...');
    var currentSequence = this.overpassAPI.getCurrentSequence();
    if (currentSequence && currentSequence >= 0) {
        if (this.sequence === -1) {
            this.nextLoadTime = this.calcNextLoadTime();
            this.sequence = currentSequence;
            this.overpassAPI.load(this.sequence, _.bind(this.postLoad, this));
        } else { 
            if (currentSequence > this.sequence){
                if (currentSequence - this.sequence > 1) {
                    // shorter delay to catch up if more than one diff behind
                    this.nextLoadTime += Date.now() + this.catchUpDelay;
                } else {
                    this.nextLoadTime = this.calcNextLoadTime();
                }
                this.sequence++;
                this.overpassAPI.load(this.sequence, _.bind(this.postLoad, this));
            } else {
                this.status.setCountdown('x');
                this.nextLoadTime += this.retryDelay;
                console.log('skip refresh: sequence = ' + this.sequence + ', next retry: ' + moment(this.nextLoadTime).format("HH:mm:ss"));
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
    if (this.nextLoadTime <= Date.now()) {
        this.load();
    } else {
        this.status.setCountdown(moment(this.nextLoadTime).diff(moment(), 'seconds') + 1);
    }
};

Live.prototype.toggle = function(e) {
    this.element.classList.toggle('button_active');
    if (!this.interval) {
        this.nextLoadTime = Date.now();
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

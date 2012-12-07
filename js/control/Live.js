/**
 * class Live
 */
function Live(overpassAPI, status) {
    this.overpassAPI = overpassAPI;
    this.status = status;

    this.interval = null;
    this.sequence = -1; 

    this.element = document.getElementById('live_button');
    this.element.onclick = _.bind(this.toggle, this);
}

Live.prototype.load = function() {
    var currentSequence = this.overpassAPI.getCurrentSequence();
    if (currentSequence && currentSequence >= 0) {
        // getting empty response for current diff, so for now use previous instead (- 1)
        currentSequence--;

        if (this.sequence === -1) {
            this.sequence = currentSequence;
            this.overpassAPI.load(this.sequence, _.bind(this.postLoad, this));

        } else { 
            if (currentSequence > this.sequence){
                this.sequence++;
                this.overpassAPI.load(this.sequence, _.bind(this.postLoad, this));
            } else {
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

Live.prototype.toggle = function(e) {
    this.element.classList.toggle('button_active');
    if (!this.interval) {
        this.load();
        this.interval = window.setInterval(_.bind(this.load, this), 60000);
    } else {
        window.clearInterval(this.interval);
        this.interval = null;
        this.sequence = -1; 
        console.log('live stopped');
    }
};

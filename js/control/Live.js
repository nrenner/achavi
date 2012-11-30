/**
 * class Live
 */
function Live(overpassAPI) {
    this.overpassAPI = overpassAPI;
    this.interval = null;
    this.sequence = -1; 

    document.getElementById('live_button').onclick = _.bind(this.toggle, this);
}

Live.prototype.load = function() {
    var currentSequence = this.overpassAPI.getCurrentSequence();
    if (currentSequence && currentSequence >= 0) {
        // getting empty response for current diff, so for now use previous instead (- 1)
        currentSequence--;

        if (sequence === -1) {
            sequence = currentSequence;
            this.overpassAPI.load(sequence);
        } else { 
            if (currentSequence > sequence){
                sequence++;
                this.overpassAPI.load(sequence);
            } else {
                console.log('skip refresh: sequence = ' + sequence + ', current sequence = ' + currentSequence);
            }
        }
    }
};

Live.prototype.toggle = function(e) {
    var ele = document.getElementById('live_button');
    ele.classList.toggle('button_active');
    if (!this.interval) {
        this.load();
        this.interval = window.setInterval(_.bind(this.load, this), 60000);
    } else {
        window.clearInterval(this.interval);
        this.interval = null;
        console.log('live stopped');
    }
};

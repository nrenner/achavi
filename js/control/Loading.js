/**
 * Loading panel
 */
function Loading() {
    document.getElementById('cancel_button').onclick = _.bind(this.cancel, this);
}

Loading.prototype.cancel = function() {
    this.xhr.abort();
};

Loading.prototype.loadStart = function(xhr) {
    this.xhr = xhr;
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('spinner').classList.add('spinner');
};

Loading.prototype.loadEnd = function() {
    document.getElementById('spinner').classList.remove('spinner');
    document.getElementById('loading').classList.add('hidden');
    this.xhr = null;
};

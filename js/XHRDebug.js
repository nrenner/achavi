/**
 * class XHRDebug
 */
function XHRDebug() {
    this.oldReadyState = null;
    this.oldTime = +new Date();
}

XHRDebug.prototype.log = function(request) {
    var states = ['UNSENT', 'OPENED', 'HEADERS_RECEIVED', 'LOADING', 'DONE'];
    var curTime, len;
    var readyState = request.readyState;

    if (readyState != this.oldReadyState) {
        console.log(states[readyState]);
        this.oldReadyState = readyState;
    }

    if (readyState == request.HEADERS_RECEIVED) {
        this.oldTime = +new Date();
        //console.log('headers = ' + request.getAllResponseHeaders());
    } else if (readyState == request.LOADING){
        curTime = +new Date();
        if ((curTime - this.oldTime) > 500) {
            len = request.responseText.length;
            console.log(len);
            this.oldTime = curTime;
        }
    } else if(readyState == request.DONE) {
        len = request.responseText.length;
        if (len > 302) {
            console.log(len);
        }
    }
};
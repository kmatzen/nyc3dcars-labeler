function Task() {
    console.log('dont call');
}

Task.prototype.load = function () {
    console.log('dont call');
}

Task.prototype.next = function () {
    console.log('dont call');
}

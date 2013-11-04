function Task(context, username, mode, elements) {
    this.username = username;
    this.context = context;
    this.mode = mode;
    this.elements = elements;
}

Task.prototype.load = function () {
}

Task.prototype.next = function () {
    var cont = this.load();
    if (!cont) {
        var assignmentId = $.deparam.querystring().assignmentId;
        var workerId = $.deparam.querystring().workerId;
        var hitId = $.deparam.querystring().hitId;
        var turkSubmitTo = $.deparam.querystring().turkSubmitTo;

        if (!assignmentId) {
            return;
        }

        var data = {
            'assignmentId':assignmentId,
            'workerId':workerId,
            'hitId':hitId,
        };

        $.ajax({
            type:'POST',
            url:'/submit_mturk',
            data:{'assignmentId':assignmentId},
            success:function () {
                window.location = decodeURIComponent(turkSubmitTo)+'/mturk/externalSubmit?'+$.param(data);
            },
            error:showFailure,
        });
    }
}

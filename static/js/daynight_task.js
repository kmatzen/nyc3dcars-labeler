function getTask (context, username, mode, elements) {
    return new DayNightTask (context, username, mode, elements);
}

DayNightTask.prototype = new Task();
DayNightTask.prototype.constructor = DayNightTask;

function DayNightTask(context, username, mode, elements) {
    Task.call(this, context, username, mode, elements);

    var buttons = this.context.$('button');

    this.image = null;
    this.label = null;
    this.pid = null;

    this.batch_idx = 0;
    var that = this;

    if (this.mode !== 'view')
        buttons.click(function () { that.submit(this); });

    this.load();
}

DayNightTask.prototype.submit = function (button) {
    var that = this;
    var daynightButtons = this.context.$('button');

    daynightButtons.button('loading');
    $.ajax({
        type:'POST',
        url:'save', 
        data:{
            'daynight':$(button).attr('id'), 
            'pid':this.pid, 
            'username':this.username,
            'assignmentId':$.deparam.querystring().assignmentId,
            'hitId':$.deparam.querystring().hitId,
            'duration':Date.now() - this.tic,
        }, 
        success:function (){ that.next(); },
        error: showFailure
    });
}

DayNightTask.prototype.loadImage = function (data) {
    var daynightButtons = this.context.$('button');
    var image = this.context.$('#image');

    this.tic = Date.now();
    this.image = data.data.image;
    this.label = data.data.label;
    this.pid = data.data.pid;
    daynightButtons.children().removeClass('active');

    image.css('background-image', 'url('+this.image+')'); 

    if (this.mode === 'view') {
        daynightButtons.attr('disabled', true);
        this.context.$('#'+this.label).addClass('active');
        this.context.$('#'+this.label).attr('disabled',false);
    } else {
        daynightButtons.button('reset');
    }
}

DayNightTask.prototype.load = function() {
    var that = this;

    var args = {'username':this.username};

    switch (this.mode) {
        case 'new':
            break;
        case 'edit':
            if (this.batch_idx >= this.elements.length) {
                return false;
            } else {
                args.pid = this.elements[this.batch_idx++];
            }
            break;
        case 'view':
            if (this.batch_idx >= this.elements.length) {
                return false;
            } else {
                args.dnid = this.elements[this.batch_idx++];
            }
            break;
    }

    $.ajax({
        dataType:'json',
        url:'load',
        data:args,
        success:function (data) { that.loadImage(data); },
        error:showFailure
    });

    return true;
}



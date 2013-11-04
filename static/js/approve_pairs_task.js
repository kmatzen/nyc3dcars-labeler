function getTask (context, username, mode, elements) {
    return new ApprovePairsTask (context, username, mode, elements);
}

ApprovePairsTask.prototype = new Task();
ApprovePairsTask.prototype.constructor = ApprovePairsTask;

function ApprovePairsTask(context, username, mode, elements) {
    Task.call(this, context, username, mode, elements);

    var options = this.context.$('#options');
    var nextButton = this.context.$('#next');

    this.image = null;

    var that = this;

    this.batch_idx = 0;

    if (this.mode !== 'view') 
        options.find('.btn').click(function () { that.submit($(this)); });
    else {
        nextButton.css('visibility','inherit');
        nextButton.click(function () { that.next(); } );
    }

    this.load();
}

ApprovePairsTask.prototype.submit = function (caller) {
    var options = this.context.$('#options');

    options.find('.btn').attr('disabled',true);
    var that = this;

    var answer = caller.attr('id');

    if (answer == 'image1')
        answer = this.vehicle1.vid;
    else if (answer == 'image2')
        answer = this.vehicle2.vid;

    $.ajax({
        type:'POST',
        url:'save', 
        data:{
            'answer':answer, 
            'vids':this.vehicle1.vid+'-'+this.vehicle2.vid, 
            'username':this.username,
            'assignmentId':$.deparam.querystring().assignmentId,
            'hitId':$.deparam.querystring().hitId,
            'duration':Date.now() - this.tic,
        }, 
        success:function (){ that.next(); },
        error: function (response) { 
            showFailure(response); 
            options.find('.btn').attr('disabled',false);
        },
    });
}

ApprovePairsTask.prototype.loadImage = function (data) {
    var options = this.context.$('#options');
    var image1 = this.context.$('#image1');
    var image2 = this.context.$('#image2');
    var progress = this.context.$('#progress');

    this.vehicle1 = data.data.vehicle1;
    this.vehicle2 = data.data.vehicle2;

    if (this.mode === 'view') {
        var buttons = options.find('.btn');
        buttons.attr('disabled', true);
        var answer = data.data.answer;
        var parsed = parseInt(answer);
        if (parsed && parsed == this.vehicle1.vid) {
            answer = image1;
        } else if (parsed && parsed == this.vehicle2.vid) {
            answer = image2;
        } else {
            answer = this.context.$('#'+answer);
        }
        answer.addClass('active');
        answer.attr('disabled',false);
    }

    image1.css('background-image', 'url('+this.vehicle1.image+')'); 
    image2.css('background-image', 'url('+this.vehicle2.image+')');

    progress.text('');
    
    this.tic = Date.now();
    
    if (this.mode !== 'new')
        progress.text('Pair '+this.batch_idx+' of '+this.elements.length);

    if (this.mode !== 'view')
        options.find('.btn').attr('disabled',false); 
}

ApprovePairsTask.prototype.load = function() {
    var that = this;

    var args = {'username':this.username};

    switch (this.mode) {
        case 'new':
            break;
        case 'edit':
            if (this.batch_idx >= this.elements.length) {
                return false;
            } else {
                args.vids = this.elements[this.batch_idx++];
            }
            break;
        case 'view':
            if (this.batch_idx >= this.elements.length) {
                return false;
            } else {
                args.apsid = this.elements[this.batch_idx++];
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



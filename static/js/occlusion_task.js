function getTask (context, username, mode, elements) {
    return new OcclusionTask(context, username, mode, elements);
}

OcclusionTask.prototype = new Task();
OcclusionTask.prototype.constructor = OcclusionTask;

function OcclusionTask (context, username, mode, elements) {
    Task.call(this, context, username, mode, elements);

    var submitButton = this.context.$('#submit');

    var that = this;

    this.batch_idx = 0;

    this.tic = null;

    if (this.mode !== 'view')
        submitButton.click(function () { that.submit(); });

    this.load();
}

OcclusionTask.prototype.submit = function () {
    var that = this;

    var submitButton = this.context.$('#submit');
    var occludedList = this.context.$('#occluded');

    submitButton.btn('loading');
    var labels = $.map(occludedList.children(), function (v) { 
        return v.id; 
    });

    $.ajax({
        type:'POST',
        url:'save', 
        data:{
            'order':JSON.stringify(labels), 
            'username':this.username,
            'assignmentId':$.deparam.querystring().assignmentId,
            'hitId':$.deparam.querystring().hitId,
            'duration':Date.now() - this.tic,
        }, 
        success:function () { that.next(); },
        error:showFailure
    });
}

OcclusionTask.prototype.enforceOrder = function () {
    var occludedList = this.context.$('#occluded');

    var children = occludedList.children();
    var nextCat = 0;
    var failed = false;
    for (var i = 0; i < children.length; ++i)
    {
        var child = $(children[i])
        var id = child.attr('id');
        var catStr = id.substring(3);
        if (id.substring(0,3) != 'cat')
            continue;
        var cat = parseInt(catStr);
        if (cat > nextCat)
        {
            failed = true;
            break;
        }
        else
        {
            nextCat += 1;
        }
    }
    if (failed)
    {
        occludedList.empty();
        occludedList.append(this.stashed);
    }
    this.stashOrder();
}

OcclusionTask.prototype.stashOrder = function() {
    var occludedList = this.context.$('#occluded');

    var children = occludedList.children();
    this.stashed = children;
}

OcclusionTask.prototype.loadRound = function(data) {
    var that = this;
    var occludedList = this.context.$('#occluded');
    var imageTemplate = this.context.$('#image_template');
    var submitButton = this.context.$('#submit');

    occludedList.children('[id^=img]').remove();

    var vehicles = data.data;

    $.each(vehicles, function (k, v) {
        var vehicle = imageTemplate.clone(); vehicle.css({
            'visibility':'inherit',
            'position':'inherit',
            'background-image':'url('+v.image+')'
        }).attr('id', 'img'+v.vid)

        if (that.mode === 'view' && v.label < 5)
            occludedList.children('#cat'+v.label).before(vehicle);
        else
            occludedList.append(vehicle);
    });

    if (this.mode !== 'view') {
        occludedList.sortable({
            update:function () { that.enforceOrder(); }
        }).disableSelection();
    }
    submitButton.btn('reset');
    this.stashOrder();
    this.tic = Date.now();
}

OcclusionTask.prototype.load = function() {
    var that = this;

    var args = {'username':this.username};

    switch (this.mode) {
        case 'new':
            break;
        case 'view':
            if (this.batch_idx >= this.elements.length) {
                return false;
            } else {
                args.osid = this.elements[this.batch_idx++];
            }
            break;
        case 'edit':
            if (this.batch_idx >= this.elements.length) {
                return false;
            } else {
                args.vids = this.elements[this.batch_idx++];
            }
            break;
    }

    $.ajax({
        dataType:'json',
        url:'load',
        data:args,
        success:function (data) { that.loadRound(data); },
        error:showFailure
    });

    return true;
}



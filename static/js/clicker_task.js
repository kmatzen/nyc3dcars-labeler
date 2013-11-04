function getTask (context, username, mode, elements) {
    return new ClickerTask(context, username, mode, elements);
}

ClickerTask.prototype = new Task();
ClickerTask.prototype.constructor = ClickerTask;

function ClickerTask (context, username, mode, elements) {
    Task.call(this, context, username, mode, elements);

    var that = this;

    var submitButton = this.context.$('#submit');

    this.selected = null;

    this.layer = null;
    this.container = null;
    this.image = null;
    this.points = null;
    this.pid = null;
    this.imagePreload = null;
    this.imageLayer = null;

    this.defaultRadius = 6;
    this.defaultStrokeWidth = 2;
    this.flash = false;
    this.flash_time = 0;
    this.stage = null;
    this.mouse_x = 0;
    this.mouse_y = 0;
    this.drag_x = 0;
    this.drag_y = 0;
    this.dragging = false;

    this.batch_idx = 0;

    this.registerKinetic();

    submitButton.click(function () { that.submit(); });
    this.load();
}

ClickerTask.prototype.loadImage = function (data) {
    var that = this;

    this.tic = Date.now();

    this.image = data.data.image;
    this.points = data.data.points;
    this.pid = data.data.pid;
    this.layer.removeChildren();
    this.stage.draw();

    this.updateCount();

    $('<img/>').load(function () { 
        that.loadImageDone(this); 
        that.loadPoints();
    }).attr('src', this.image);
}

ClickerTask.prototype.loadImageDone = function (image) {
    var submitButton = this.context.$('#submit');
    var progress = this.context.$('#progress');

    this.width = image.width;
    this.height = image.height;

    this.imageLayer.removeChildren();
    var aspect = this.width/this.height;
    var scale = Math.min(this.container.width()/this.width, this.container.height()/this.height);
    var canvas_width = scale*this.width
    var canvas_height = scale*this.height;
    var v_pad = (this.container.height() - canvas_height)/2;
    var h_pad = (this.container.width() - canvas_width)/2;

    var kImage = new Kinetic.Image({
        x: h_pad,
        y: v_pad,
        width: canvas_width,
        height: canvas_height,
        image: image,
    });

    this.imageLayer.add(kImage);
    this.stage.draw();
    submitButton.button('reset');

    progress.text(''); 

    if (this.mode !== 'new') {
        progress.text('Image '+this.batch_idx+' of '+this.elements.length)
    }
}

ClickerTask.prototype.load = function () {
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
                args.csid = this.elements[this.batch_idx++];
            }
            break;
    }

    var that = this;
    $.ajax({
        dataType: 'json',
        url: 'load',
        data: args,
        success: function (data) { that.loadImage(data); },
        error: showFailure
    });
    return true;
}

ClickerTask.prototype.submit = function() {
    var that = this;

    var submitButton = this.context.$('#submit');

    submitButton.button('loading');
    this.setZoom(1, 0, 0);
    var aspect = this.width/this.height;
    var scale = Math.min(this.container.width()/this.width, this.container.height()/this.height);
    var canvas_width = scale*this.width
    var canvas_height = scale*this.height;
    var v_pad = (this.container.height() - canvas_height)/2;
    var h_pad = (this.container.width() - canvas_width)/2;

    var points = $.map(this.layer.children, function (v) { 

        var x = (v.getPosition().x-h_pad)/canvas_width;
        var y = (v.getPosition().y-v_pad)/canvas_height;
        return {'x':x, 'y':y}; 
    });

    if (this.mode === 'view') 
        that.next();
    else {
        $.ajax({
            type: 'POST',
            url: 'save', 
            data: {
                'clicks':JSON.stringify(points), 
                'pid':this.pid, 
                'username':this.username,
                'assignmentId':$.deparam.querystring().assignmentId,
                'hitId':$.deparam.querystring().hitId,
                'duration':Date.now() - this.tic,
            }, 
            success: function () { that.next(); },
            error: showFailure
        });
    }
}

ClickerTask.prototype.registerKinetic = function () {
    var that = this;

    var image = this.context.$('#image');

    this.container = image;
    this.stage = new Kinetic.Stage({
        container: this.container.get(0),
        height: this.container.height(),
        width: this.container.width()
    });

    this.imageLayer = new Kinetic.Layer();

    this.stage.add(this.imageLayer);

    this.layer = new Kinetic.Layer()

    this.stage.add(this.layer);

    this.registerInput();

    setInterval(function () { that.flashPoints(); }, 100);
}

ClickerTask.prototype.flashPoints = function () {
    if (this.flash) {
        var time = Date.now();
        var diff = time - this.flash_time;
        if (diff < 150)
            $.each(this.layer.children, function (k, v) { v.setFill('yellow'); })
        else if (diff < 300)
            $.each(this.layer.children, function (k, v) { v.setFill('red'); })
        else if (diff < 450)
            $.each(this.layer.children, function (k, v) { v.setFill('yellow'); })
        else if (diff < 600)
            $.each(this.layer.children, function (k, v) { v.setFill('red'); })
        else if (diff > 900)
            this.flash_time = time;
        this.stage.draw();
    }
}

ClickerTask.prototype.registerInput = function() {
    var that = this;

    if (this.mode !== 'view')
        this.container.click(function (event) { that.mouseClickHandler(event); });

    this.container.keydown(function (event) { that.keyDownHandler(event); });
    this.container.keyup(function (event) { that.keyUpHandler(event); });
    this.container.mousewheel(function (event, delta, deltaX, deltaY) { that.scrollHandler(event, delta, deltaX, deltaY); });
    this.container.mousemove(function (event) { that.mouseMoveHandler(event); });
    this.container.mousedown(function (event) { that.mouseDownHandler(event); });
    this.container.mouseleave(function (event) { that.mouseUpHandler(event); });
    this.container.mouseup(function (event) { that.mouseUpHandler(event); });
    this.container.contextmenu(function (event) { that.ignore(event); });
}

ClickerTask.prototype.ignore = function(event) {
    event.preventDefault();
}

ClickerTask.prototype.mouseDownHandler = function(event) {
    switch(event.which) {
        case 3:
            this.dragging = true;
            this.drag_x = this.mouse_x;
            this.drag_y = this.mouse_y;
            event.preventDefault();
            break;
    }
}

ClickerTask.prototype.mouseUpHandler = function(event) {
    switch(event.which) {
        case 3:
            this.dragging = false;
            event.preventDefault();
            break;
    }
}

ClickerTask.prototype.mouseMoveHandler = function(event) {
    var old_mouse_x = this.mouse_x;
    var old_mouse_y = this.mouse_y;

    this.mouse_x = event.pageX - this.container.offset().left;
    this.mouse_y = event.pageY - this.container.offset().top;

    if (this.dragging) {
        var diff_x = this.mouse_x - old_mouse_x;
        var diff_y = this.mouse_y - old_mouse_y;

        var offset_x = -diff_x/this.stage.getScale().x + this.stage.getOffset().x;
        var offset_y = -diff_y/this.stage.getScale().y + this.stage.getOffset().y;

        if (offset_x < 0)
            offset_x = 0;

        if (offset_y < 0)
            offset_y = 0;

        if (offset_x > this.stage.getWidth() - this.stage.getWidth()/this.stage.getScale().x)
            offset_x = this.stage.getWidth() - this.stage.getWidth()/this.stage.getScale().x;

        if (offset_y > this.stage.getHeight() - this.stage.getHeight()/this.stage.getScale().y)
            offset_y = this.stage.getHeight() - this.stage.getHeight()/this.stage.getScale().y;


        this.stage.setOffset(offset_x, offset_y);
        this.stage.draw();
    }
}

ClickerTask.prototype.scrollHandler = function(event, delta, deltaX, deltaY) {
    if (deltaY < 0 && this.stage.getScale().x == 1)
        return;

    var zoom = this.stage.getScale().x * (1+deltaY/10.0);

    if (zoom < 1) 
        zoom = 1;

    var anchor_x = this.stage.getOffset().x + this.mouse_x/this.stage.getScale().x;
    var anchor_y = this.stage.getOffset().y + this.mouse_y/this.stage.getScale().y;
    var offset_x = anchor_x - this.mouse_x/zoom;
    var offset_y = anchor_y - this.mouse_y/zoom;


    if (offset_x < 0)
        offset_x = 0;

    if (offset_y < 0)
        offset_y = 0;

    if (offset_x > this.stage.getWidth() - this.stage.getWidth()/zoom)
        offset_x = this.stage.getWidth() - this.stage.getWidth()/zoom;

    if (offset_y > this.stage.getHeight() - this.stage.getHeight()/zoom)
        offset_y = this.stage.getHeight() - this.stage.getHeight()/zoom;

    this.setZoom(zoom, offset_x, offset_y);

    event.preventDefault();
}

ClickerTask.prototype.setZoom = function (zoom, offset_x, offset_y) {
    var that = this;
    $.each(this.layer.children, function (k, v) { 
        v.setRadius(that.defaultRadius/zoom);
        v.setStrokeWidth(that.defaultStrokeWidth/zoom);
    });
    this.stage.setScale(zoom);
    this.stage.setOffset(offset_x, offset_y);
    this.stage.draw();
}

ClickerTask.prototype.keyDownHandler = function(event) {
    switch (event.which) {
        case 8:
        case 46:
            if (this.mode !== 'view' && this.selected) {
                this.selected.remove();
                this.updateCount();
                this.setSelected(null);
            }
            this.stage.draw();
            event.preventDefault();
            break;
        case 32:
            if (!this.flash) {
                this.flash = true;
                this.flash_time = 0;
                this.setSelected(null);
            }
            event.preventDefault();
            break;
    }
}

ClickerTask.prototype.keyUpHandler = function(event) {
    switch (event.which) {
        case 32:
            this.flash = false;
            event.preventDefault();
            break;
    }
}

ClickerTask.prototype.loadPoints = function () {
    var that = this;

    var scale = Math.min(this.container.width()/this.width, this.container.height()/this.height);
    var canvas_width = scale*this.width
    var canvas_height = scale*this.height;
    var v_pad = (this.container.height() - canvas_height)/2;
    var h_pad = (this.container.width() - canvas_width)/2;

    $.each(this.points, function (k, v) { 
        var x = v.x*canvas_width+h_pad;
        var y = v.y*canvas_height+v_pad;
        that.addPoint(x, y);
    });
}

ClickerTask.prototype.addPoint = function (x, y) {
    var that = this;

    var circle = new Kinetic.Circle({
        x: x+this.stage.getOffset().x,
        y: y+this.stage.getOffset().y,
        radius: this.defaultRadius/this.stage.getScale().x,
        fill: 'green',
        stroke: '#555',
        strokeWidth: this.defaultStrokeWidth/this.stage.getScale().x,
        draggable: this.mode !== 'view',
    })

    this.setSelected(circle);

    circle.on('mousedown', function () { that.circleDrag(circle); });

    this.layer.add(circle);

    this.updateCount();
}

ClickerTask.prototype.updateCount = function () {
    var count = this.layer.children.length;
    var countField = this.context.$('#count');

    if (count == 1)
        countField.html('<b>1</b> car clicked in this image.');
    else
        countField.html('<b>' + count + '</b> cars clicked in this image.');
}

ClickerTask.prototype.mouseClickHandler = function (event) {
    switch (event.which) {
        case 1:
            var x = (event.pageX - this.container.offset().left)/this.stage.getScale().x;
            var y = (event.pageY - this.container.offset().top)/this.stage.getScale().y;

            this.addPoint(x, y);

            this.stage.draw();

            this.container.focus();

            event.preventDefault();
            break;
        case 3:
            event.preventDefault();
            break;
    }
}

ClickerTask.prototype.setSelected = function (point) {
    this.selected = point;
    $.each(this.layer.children, function (k, v) { v.setFill('red'); });
    if (this.selected)
        this.selected.setFill('green');
    this.stage.draw();
}

ClickerTask.prototype.circleDrag = function (circle) {
    this.setSelected(circle);
}


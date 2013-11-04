function getTask (context, username, mode, elements) {
    return new BBoxTask(context, username, mode, elements);
}

BBoxTask.prototype = new Task();
BBoxTask.prototype.constructor = BBoxTask;

function BBoxTask (context, username, mode, elements) {
    Task.call(this, context, username, mode, elements);

    var that = this;

    this.layer = null;
    this.container = null;
    this.bbox = null;
    this.imagePreload = null;
    this.imageLayer = null;

    this.defaultStrokeWidth = 6;
    this.stage = null;
    this.mouse_x = 0;
    this.mouse_y = 0;
    this.drag_x = 0;
    this.drag_y = 0;
    this.dragging = false;

    this.bottom_handle = false;
    this.top_handle = false;
    this.left_handle = false;
    this.right_handle = false;

    this.batch_idx = 0;

    this.registerKinetic();

    this.context.$('#submit').click(function () { that.submit(false); });
    this.context.$('#spam_guard_ok').click(function () { that.submit(true); });
    this.load();
}

BBoxTask.prototype.loadImage = function (data) {
    var that = this;

    this.tic = Date.now();

    this.bbox = data.data;
    this.stage.draw();

    $('<img/>').load(function () { that.loadImageDone(this); })
        .attr('src', this.bbox.image);
}

BBoxTask.prototype.loadImageDone = function (image) {
    this.width = image.width;
    this.height = image.height;
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

    this.imageLayer.removeChildren();
    this.imageLayer.add(kImage);

    this.rectangle = new Kinetic.Rect({
        x: h_pad + canvas_width*this.bbox.x1,
        y: v_pad + canvas_height*this.bbox.y1,
        width: canvas_width*(this.bbox.x2-this.bbox.x1),
        height: canvas_height*(this.bbox.y2-this.bbox.y1),
        stroke: 'red',
        strokeWidth: 2 
    });

    this.layer.removeChildren();
    this.layer.add(this.rectangle);

    var bbox_width = this.bbox.x2 - this.bbox.x1;
    var bbox_height = this.bbox.y2 - this.bbox.y1;
    var left = canvas_width*Math.max(0.0, this.bbox.x1 - 0.25*bbox_width);
    var right = canvas_width*Math.min(1.0, this.bbox.x2 + 0.25*bbox_width);
    var top = canvas_height*Math.max(0.0, this.bbox.y1 - 0.25*bbox_height);
    var bottom = canvas_height*Math.min(1.0, this.bbox.y2 + 0.25*bbox_height);
   
    var zoom = Math.min(this.container.height()/(bottom-top), this.container.width()/(right-left));

    var center_x = h_pad + (left + right)/2;
    var center_y = v_pad + (top + bottom)/2;
    var offset_x = center_x - this.container.width()/zoom/2;
    var offset_y = center_y - this.container.height()/zoom/2;

    this.setZoom(zoom, offset_x, offset_y);

    this.stage.draw();

    if (this.mode !== 'new') {
        this.context.$('#progress').text('Image '+this.batch_idx+' of '+this.elements.length);
    }
    this.context.$('#submit').button('reset');
}

BBoxTask.prototype.load = function () {
    var args = {};

    if (this.username !== null) {
        args.username = this.username;
    }

    switch (this.mode) {
        case 'new':
            break;
        case 'edit':
            if (this.batch_idx >= this.elements.length) {
                return false;
            } else {
                args.vid = this.elements[this.batch_idx++];
            }
            break;
        case 'view':
            if (this.batch_idx >= this.elements.length) {
                return false;
            } else {
                args.bbsid = this.elements[this.batch_idx++];
            }
            break;
    }
    var that = this;
    $.getJSON('load', args)
        .then(function (data) { that.loadImage(data); })
        .fail(showFailure);

    return true;
}

BBoxTask.prototype.showSpamGuard = function () {
    this.context.$('div.modal').modal('hide');
    this.context.$('#spam_guard').modal('show');
}

BBoxTask.prototype.submit = function(skipSpamGuard) {
    var that = this;

    this.context.$('#submit').button('loading');
    var aspect = this.width/this.height;
    var scale = Math.min(this.container.width()/this.width, this.container.height()/this.height);
    var canvas_width = scale*this.width
    var canvas_height = scale*this.height;
    var v_pad = (this.container.height() - canvas_height)/2;
    var h_pad = (this.container.width() - canvas_width)/2;

    var left = (this.rectangle.getX() - h_pad)/canvas_width;
    var top = (this.rectangle.getY() - v_pad)/canvas_height;
    var right = ((this.rectangle.getX()+this.rectangle.getWidth()) - h_pad)/canvas_width;
    var bottom = ((this.rectangle.getY()+this.rectangle.getHeight()) - v_pad)/canvas_height;

    var data = {};
    data.x1 = left;
    data.x2 = right;
    data.y1 = top;
    data.y2 = bottom;
    data.vid = this.bbox.vid;
    data.username = this.username;
    data.assignmentId = $.deparam.querystring().assignmentId;
    data.hitId = $.deparam.querystring().hitId;
    data.duration = Date.now() - this.tic;

    if (this.mode === 'view') 
        that.next();
    else {
        if (!skipSpamGuard) {
            var intersection = Math.max(0, Math.min(data.x2, this.bbox.x2) - Math.max(0, Math.max(data.x1, this.bbox.x1)))*Math.max(0, Math.min(data.y2, this.bbox.y2) - Math.max(data.y1, this.bbox.y1));
            var area1 = (this.bbox.x2-this.bbox.x1)*(this.bbox.y2-this.bbox.y1);
            var area2 = (data.x2-data.x1)*(data.y2-data.y1);
            var union = area1 + area2 - intersection;
            var overlap = intersection/union;
            if (overlap > 0.99) {
                this.showSpamGuard();
                this.context.$('#submit').button('reset');
                return;
            }
        }

        $.ajax({
            type: 'POST',
            url: 'save', 
            data: data, 
            success: function () { that.next(); },
            error: showFailure
        });
    }
}

BBoxTask.prototype.registerKinetic = function () {
    var that = this;

    this.container = this.context.$('#image');
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
}

BBoxTask.prototype.registerInput = function() {
    var that = this;

    if (this.mode !== 'view')
        this.container.click(function (event) { that.mouseClickHandler(event); });

    this.container.mousewheel(function (event, delta, deltaX, deltaY) { that.scrollHandler(event, delta, deltaX, deltaY); });
    this.container.mousemove(function (event) { that.mouseMoveHandler(event); });
    this.container.mousedown(function (event) { that.mouseDownHandler(event); });
    this.container.mouseleave(function (event) { that.mouseUpHandler(event); });
    this.container.mouseup(function (event) { that.mouseUpHandler(event); });
    this.container.contextmenu(function (event) { that.ignore(event); });
}

BBoxTask.prototype.ignore = function(event) {
    event.preventDefault();
}

BBoxTask.prototype.mouseDownHandler = function(event) {
    switch(event.which) {
        case 1:
            this.resize_x = this.stage.getOffset().x + this.mouse_x/this.stage.getScale().x;
            this.resize_y = this.stage.getOffset().y + this.mouse_y/this.stage.getScale().y;

            var left = this.rectangle.getX();
            var right = left + this.rectangle.getWidth();
            var top = this.rectangle.getY();
            var bottom = top + this.rectangle.getHeight();
            var zoom = this.stage.getScale().x;
            var pad = this.defaultStrokeWidth/zoom*2;

            // Left zone
            if (this.resize_x > left - pad && 
                this.resize_x < left + pad &&
                this.resize_y > top - pad &&
                this.resize_y < bottom + pad)
                this.left_handle = true;

            // Right zone
            if (this.resize_x > right - pad && 
                this.resize_x < right + pad &&
                this.resize_y > top - pad &&
                this.resize_y < bottom + pad)
                this.right_handle = true;

            // Top zone
            if (this.resize_x > left - pad && 
                this.resize_x < right + pad &&
                this.resize_y > top - pad &&
                this.resize_y < top + pad)
                this.top_handle = true;

            // Bottom zone
            if (this.resize_x > left - pad && 
                this.resize_x < right + pad &&
                this.resize_y > bottom - pad &&
                this.resize_y < bottom + pad)
                this.bottom_handle = true;

            event.preventDefault();
            break;
        case 3:
            this.dragging = true;
            this.drag_x = this.mouse_x;
            this.drag_y = this.mouse_y;
            event.preventDefault();
            break;
    }
}

BBoxTask.prototype.mouseUpHandler = function(event) {
    switch(event.which) {
        case 1:
            this.bottom_handle = false;
            this.top_handle = false;
            this.left_handle = false;
            this.right_handle = false;
            this.rectangle.setStroke('red');
            this.stage.draw();

            event.preventDefault();
            break;
        case 3:
            this.dragging = false;
            event.preventDefault();
            break;
    }
}

BBoxTask.prototype.mouseMoveHandler = function(event) {
    var old_mouse_x = this.mouse_x;
    var old_mouse_y = this.mouse_y;

    var rect = this.layer.getCanvas().element.getBoundingClientRect();
    this.mouse_x = event.pageX - $(document).scrollLeft() - rect.left;
    this.mouse_y = event.pageY - $(document).scrollTop() - rect.top;

    var x = this.stage.getOffset().x + this.mouse_x/this.stage.getScale().x;
    var y = this.stage.getOffset().y + this.mouse_y/this.stage.getScale().y;

    var zoom = this.stage.getScale().x;

    if (this.mode !== 'view') {
        if (this.left_handle) {
            var newWidth = this.rectangle.getWidth()+this.rectangle.getX() - x;
            if (newWidth > 2*this.defaultStrokeWidth/zoom) {
                this.rectangle.setWidth(newWidth);
                this.rectangle.setX(x);
            }
        }
        if (this.top_handle) {
            var newHeight = this.rectangle.getHeight()+this.rectangle.getY() - y;
            if (newHeight > 2*this.defaultStrokeWidth/zoom) {
                this.rectangle.setHeight(newHeight);
                this.rectangle.setY(y);
            }
        }
        if (this.right_handle) {
            var newWidth = x - this.rectangle.getX();
            if (newWidth > 2*this.defaultStrokeWidth/zoom)
                this.rectangle.setWidth(newWidth);
        }
        if (this.bottom_handle) {
            var newHeight = y - this.rectangle.getY();
            if (newHeight > 2*this.defaultStrokeWidth/zoom)
                this.rectangle.setHeight(newHeight);
        }

        if (this.left_handle || this.right_handle || this.top_handle || this.bottom_handle) {
            this.rectangle.setStroke('white');
            this.stage.draw();
        }
    }

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

BBoxTask.prototype.scrollHandler = function(event, delta, deltaX, deltaY) {
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

BBoxTask.prototype.setZoom = function (zoom, offset_x, offset_y) {
    var that = this;
    this.rectangle.setStrokeWidth(that.defaultStrokeWidth/zoom);
    this.stage.setScale(zoom);
    this.stage.setOffset(offset_x, offset_y);
    this.stage.draw();
}

BBoxTask.prototype.mouseClickHandler = function (event) {
    switch (event.which) {
        case 1:
            this.container.focus();

            event.preventDefault();
            break;
        case 3:
            event.preventDefault();
            break;
    }
}

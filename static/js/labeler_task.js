function LabelerTask(context, username, mode, elements) {
    var that,
        width,
        height,
        ground_extent,
        ground_geometry,
        ground_texture,
        ground_uniforms,
        ground_material,
        ground_mesh,
        light;

    Task.call(this, context, username, mode, elements);

    that = this;

    this.pid = null;
    this.tic = Date.now();

    this.vehicles = [];
    this.offset = new THREE.Vector3();

    this.ground_vShader = [
        '#ifdef GL_ES',
        'precision highp float;',
        '#endif',

        THREE.ShaderChunk.map_pars_vertex,

        'void main()',
        '{',
        THREE.ShaderChunk.map_vertex,
        '    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);',
        '}'].join('\n');

    this.ground_fShader = [
        '#ifdef GL_ES',
        'precision highp float;',
        '#endif',

        THREE.ShaderChunk.map_pars_fragment,

        'void main()',
        '{',
        '    gl_FragColor = vec4(1.0,1.0,1.0,1.0);',
        THREE.ShaderChunk.map_fragment,
        '    gl_FragColor.a = gl_FragColor.r;',
        '}'].join('\n');

    this.canvas = this.context.$('#labeler_canvas');
    width = this.canvas.width();
    height = this.canvas.height();

    this.camera = new THREE.PerspectiveCamera(75, width / height, 1, 1000);
    this.camera.name = 'camera';
    this.scene = new THREE.Scene();
    this.scene.add(this.camera);

    this.plane_camera = new THREE.OrthographicCamera(-1, 1, -1, 1, -1, 1);
    this.plane_scene = new THREE.Scene();
    this.plane_scene.add(this.plane_camera);

    light = new THREE.DirectionalLight(0xFFFFFF, 1);
    light.name = 'light';
    light.position.set(0, 0, 1);
    this.scene.add(light);

    this.scene.add(new THREE.AmbientLight(0x999999));

    ground_extent = 2000;
    ground_geometry = new THREE.PlaneGeometry(ground_extent, ground_extent, 1, 1);
    ground_texture = THREE.ImageUtils.loadTexture('/static/img/ground_tile.png');
    ground_texture.wrapS = THREE.RepeatWrapping;
    ground_texture.wrapT = THREE.RepeatWrapping;
    ground_texture.minFilter = THREE.LinearMipMapLinearFilter;
    ground_texture.magFilter = THREE.LinearFilter;
    ground_uniforms = THREE.UniformsUtils.merge([
        THREE.UniformsLib.common,
    ]);
    ground_uniforms.map.value = ground_texture;
    ground_uniforms.offsetRepeat.value = new THREE.Vector4(0, 0, ground_extent, ground_extent);
    ground_material = new THREE.ShaderMaterial({
        vertexShader: this.ground_vShader,
        fragmentShader: this.ground_fShader,
        transparent: true,
        uniforms: ground_uniforms,
    });
    ground_material.map = ground_texture;
    ground_mesh = new THREE.Mesh(ground_geometry, ground_material);
    ground_mesh.name = 'ground_mesh';
    this.ground = new THREE.Object3D();
    this.ground.add(ground_mesh);
    this.ground.name = 'ground';
    this.scene.add(this.ground);

    this.arrow = this.loadArrow();

    this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: this.canvas.get(0),
        preserveDrawingBuffer: true
    });
    this.renderer.autoClear = false;
//    this.renderer.setSize(width, height);
    this.renderer.setClearColorHex(0, 1);

    this.down = new Array(222);
    this.last = new Array(222);

    this.setKeyHandlers();

    this.addCarButtons();


    this.setButtonHandlers();


    if (this.mode !== 'view') {
        this.setMouseHandlers();

        setInterval(function () { that.inputHandler(); }, 1000 / 30);


    }

    this.batch_idx = 0;

    this.load();

    this.draw();
}

function getTask(context, username, mode, elements) {
    return new LabelerTask(context, username, mode, elements);
}

LabelerTask.prototype = new Task();
LabelerTask.prototype.constructor = LabelerTask;

LabelerTask.prototype.addCarButtons = function () {
    var that,
        names,
        vehicle_list;

    that = this;

    names = ['gmc', 'nissan', 'honda', 'pickup', 'jeep', 'mazda'];
    vehicle_list = this.context.$('#vehicle_list');
    $.each(names, function (k, v) {
        var button,
            image;

        button = $('<a/>')
            .attr('class', 'thumbnail')
            .attr('id', 'add-' + v)
            .css({
                'height': '63px',
                'background-image': 'url(img/loading.gif)',
                'background-position': 'center',
                'background-size': 'contain',
                'background-repeat': 'no-repeat'
            });
        image = $('<img/>')
            .load(function () { button.css('background-image', 'url(' + image.attr('src') + ')'); })
            .attr('src', '/static/img/vehicles/' + v + '_button.png');
        vehicle_list.append($('<li/>')).append(button);
    });
};

LabelerTask.prototype.setButtonHandlers = function () {
    var that;

    that = this;

    var submitButton = this.context.$('#submit');
    var addButtons = this.context.$('[id^=add-]');
    var deleteButton = this.context.$('#delete');
    var noGroundButton = this.context.$('#no_ground');
    var badPlaneButton = this.context.$('#bad_plane');
    var defectivePhotoButton = this.context.$('#defective_photo');
    var otherBadButton = this.context.$('#other_bad');
    var problemButton = this.context.$('#problem');
    var problemSubmitButton = this.context.$('#problem_submit');

    submitButton.click(function () { that.submit(); });

    if (this.mode !== 'view') {
        addButtons.click(function (event) { that.addVehicle(event, this); });
        deleteButton.click(function (event) { that.deleteVehicle(event); });
        noGroundButton.click(function () { that.flag('no ground'); });
        badPlaneButton.click(function () { that.flag('bad up'); });
        defectivePhotoButton.click(function () { that.flag('defective photo'); });
        otherBadButton.click(function () { that.flag('comment'); });
        problemButton.click(function (event) { that.reportProblem(event); });
        problemSubmitButton.click(function (event) { that.problemConfirm(event); });
    }
};

LabelerTask.prototype.problemConfirm = function () {
    var problemDescriptionField = this.context.$('#problem_description');
    var modals = this.context.$("div.modal");

    var description = problemDescriptionField.val();
    if (this.photo)
        description = 'pid:'+this.pid + ' ' + description;
    $.ajax({
        type: 'POST',
        url: '/problem',
        data: {
            'username': this.username,
            'description': description,
            'screenshot': this.problem_screenshot
        },
        success: function () { console.log('success'); },
        error: showFailure,
    });
    modals.modal('hide');
};

LabelerTask.prototype.addVehicle = function (event, caller) {
    var vehicle,
        pos,
        middle,
        projector,
        raycaster,
        intersects,
        point,
        diff,
        f,
        car;

    vehicle = {};
    vehicle.type = caller.id.split('-')[1];
    vehicle.vid = -1;

    pos = this.canvas.offset();
    middle = new THREE.Vector3(0, -0.9, -1);
    projector = new THREE.Projector();
    raycaster = projector.pickingRay(middle, this.camera);
    intersects = raycaster.intersectObject(this.ground, true);
    if (intersects.length > 0) {
        point = intersects[0].point;
        diff = new THREE.Vector3().sub(point, this.camera.position);
        diff.z = 0;
        if (diff.length() < 100) {
            vehicle.x = -point.x;
            vehicle.z = -point.y;
            console.log('within radius');
        } else {
            diff.normalize();
            diff.multiplyScalar(100.0);
            diff.addSelf(this.camera.position);
            vehicle.x = -diff.x;
            vehicle.z = -diff.y;
            console.log('outside radius');
        }
    } else {
        f = this.camera_forward.clone();
        f.z = 0.0;
        f.normalize().multiplyScalar(20.0);
        vehicle.x = -(f.x + this.camera.position.x);
        vehicle.z = -(f.y + this.camera.position.y);
        console.log('no intersection');
    }
    vehicle.theta = -90 - Math.atan2(this.camera_forward.y, this.camera_forward.x) * 180 / Math.PI;

    car = this.loadCar(vehicle);
    this.scene.add(car);
    this.vehicles.push(car);
    this.setSelected(car);
};

LabelerTask.prototype.deleteVehicle = function () {
    var that;

    that = this;

    this.scene.remove(this.selected);
    this.vehicles = $.grep(this.vehicles, function (v) { return v !== that.selected; });
    this.selected = null;
};

LabelerTask.prototype.submit = function () {
    var modals = this.context.$('div.modal');
    var saveModal = this.context.$('#save_modal');
    var comment = this.context.$('#comment');

    if (this.mode === 'view') {
        this.next();
    } else {
        var that,
            cars,
            data;

        that = this;

        modals.modal('hide');
        saveModal.modal('show');
        cars = $.map(this.vehicles, function (v, k) {
            var car,
                viewProjectionMatrix;

            car = {};
            car.x = -v.position.x;
            car.z = -v.position.y;
            car.theta = -v.rotation.z / Math.PI * 180;
            car.type = v.name;
            car.tempid = k;

            car.x1 = Infinity;
            car.x2 = -Infinity;
            car.y1 = Infinity;
            car.y2 = -Infinity;

            that.camera.matrixWorldInverse.getInverse(that.camera.matrixWorld);

            viewProjectionMatrix = new THREE.Matrix4();
            viewProjectionMatrix.multiply(that.camera.projectionMatrix, that.camera.matrixWorldInverse);

            $.each(v.children, function (child_idx, child) {
                var tx;

                if (child.name === 'arrow') {
                    return;
                }
                tx = new THREE.Matrix4();
                tx.multiply(viewProjectionMatrix, child.matrixWorld);
                if (child instanceof THREE.Mesh) {
                    $.each(child.geometry.vertices, function (k, p) {
                        var vector,
                            x,
                            y;

                        vector = p.clone();
                        tx.multiplyVector3(vector);
                        x = (vector.x + 1) / 2;
                        y = (1 - vector.y) / 2;
                        car.x1 = Math.min(car.x1, x);
                        car.x2 = Math.max(car.x2, x);
                        car.y1 = Math.min(car.y1, y);
                        car.y2 = Math.max(car.y2, y);
                    });
                }
            });
            return car;
        });
        data = {};
        data.cars = JSON.stringify(cars);
        data.cameraheight = that.camera.position.z;
        if (that.rid) {
            data.rid = that.rid;
        }
        if (that.pid) {
            data.pid = that.pid;
        }
        data.username = that.username;
        data.final = 1;
        data.comment = comment.val();
        data.assignmentId = $.deparam.querystring().assignmentId;
        data.hitId = $.deparam.querystring().hitId;
        data.duration = Date.now() - this.tic;
        data.screenshot = this.renderer.domElement.toDataURL("image/png");

        $.ajax({
            type: 'POST',
            url: 'save',
            data: data,
            success: function (response) {
                modals.modal('hide');
                that.next();
            },
            error: showFailure,
        });
    }
};

LabelerTask.prototype.load = function () {
    var args,
        pids,
        aids,
        that,
        cont;

    args = {'username': this.username};

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
                args.rid = this.elements[this.batch_idx++];
            }
            break;
    }

    that = this;
    $.ajax({
        dataType: 'json',
        url: 'load',
        data: args,
        success: function (data) { that.loadCallback(data); },
        error: showFailure,
    });
    return true;
};

LabelerTask.prototype.flag = function (msg) {
    var that,
        data;

    that = this;

    data = {'username': this.username, 'reason': msg};
    if (this.rid) {
        data.rid = this.rid;
    }
    if (this.pid) {
        data.pid = this.pid;
    }

    $.ajax({
        type: 'POST',
        url: 'flag',
        data: data,
        success: function () { that.next(); },
        error: showFailure,
    });
};

LabelerTask.prototype.reportProblem = function () {
    var that;

    that = this;

    this.uploadScreenshot(function (response) { that.submitProblem(response); });
};

LabelerTask.prototype.uploadScreenshot = function (callback) {
    var dataUrl;

    dataUrl = this.renderer.domElement.toDataURL("image/png");
    $.ajax({
        type: 'POST',
        url: 'screenshot',
        data: {'screenshot': dataUrl},
        success: function (response) {
            if (callback) {
                callback(response);
            }
        },
        error: showFailure,
    });
};

LabelerTask.prototype.submitProblem = function (screenshot) {
    var problemScreenshotImage = this.context.$('#problem_screenshot');
    var modals = this.context.$('div.modal');
    var problemModal = this.context.$('#problem_modal');

    this.problem_screenshot = screenshot.data.image;
    problemScreenshotImage.css('background-image', 'url(' + this.problem_screenshot + ')');
    modals.modal('hide');
    problemModal.modal('show');
};

LabelerTask.prototype.setMouseHandlers = function () {
    var that;

    that = this;

    this.canvas.mousedown(function (event) { that.mouseDownHandler(event); });
    this.canvas.mouseout(function (event) { that.mouseUpHandler(event); });
    this.canvas.mouseup(function (event) { that.mouseUpHandler(event); });
    this.canvas.mousemove(function (event) { that.mouseMoveHandler(event); });
};

LabelerTask.prototype.mouseDownHandler = function (event) {
    this.clicked = true;
    this.dragging = false;
    this.click_x = event.pageX;
    this.click_y = event.pageY;
    this.canvas.focus();
    event.preventDefault();
};

LabelerTask.prototype.mouseUpHandler = function (event) {
    this.clicked = false;
    this.dragging = false;
    event.preventDefault();
};

LabelerTask.prototype.mouseMoveHandler = function (event) {
    this.moved_x = event.pageX;
    this.moved_y = event.pageY;
    event.preventDefault();
};

LabelerTask.prototype.setKeyHandlers = function () {
    var that;

    that = this;

    this.canvas.keyup(function (event) { that.keyUpHandler(event); });
    this.canvas.keydown(function (event) { that.keyDownHandler(event); });
};

LabelerTask.prototype.keyUpHandler = function (event) {
    this.down[event.which] = false;
    event.preventDefault();
};

LabelerTask.prototype.keyDownHandler = function (event) {
    var time;

    time = new Date().getTime();
    if (!this.down[event.which]) {
        this.down[event.which] = true;
        this.last[event.which] = time;
    }
    event.preventDefault();
};

LabelerTask.prototype.setSelected = function (o) {
    this.selected = o;
    this.selected.add(this.arrow);
};

LabelerTask.prototype.inputHandler = function () {
    var that,
        time,
        diff,
        up,
        displacement,
        index,
        pos,
        x,
        y,
        mouse,
        projector,
        raycaster,
        intersects,
        minDist,
        picked,
        diff_x,
        diff_y,
        proxy_plane_geometry,
        proxy_plane,
        new_position;

    that = this;

    time = new Date().getTime();

    // R
    if (this.down[82]) {
        diff = time - this.last[82];
        up = this.camera_up.clone();
        up.multiplyScalar(-diff / 1000);
        if (up.length() < this.camera.position.length()) {
            this.camera.position.addSelf(up);
        }
        this.last[82] = time;
    }

    // F
    if (this.down[70]) {
        diff = time - this.last[70];
        up = this.camera_up.clone();
        up.multiplyScalar(diff / 1000);
        this.camera.position.addSelf(up);
        this.last[70] = time;
    }

    if (this.selected) {
        // Delete and Backspace
        if (this.down[8] || this.down[46]) {
            this.deleteVehicle();
            this.down[8] = false;
            this.down[46] = false;
        }

        // Q
        if (this.down[81]) {
            diff = time - this.last[81];
            this.selected.rotation.z += diff / 400;
            this.last[81] = time;
        }

        // W
        if (this.down[87]) {
            diff = time - this.last[87];
            displacement = this.camera_forward.clone();
            displacement.z = 0;
            displacement.normalize();
            displacement.multiplyScalar(diff / 200);
            this.selected.position.addSelf(displacement);
            this.last[87] = time;
        }

        // E
        if (this.down[69]) {
            diff = time - this.last[69];
            this.selected.rotation.z -= diff / 400;
            this.last[69] = time;
        }

        // A
        if (this.down[65]) {
            diff = time - this.last[65];
            displacement = this.camera_right.clone();
            displacement.z = 0;
            displacement.normalize();
            displacement.multiplyScalar(-diff / 200);
            this.selected.position.addSelf(displacement);
            this.last[65] = time;
        }

        // S
        if (this.down[83]) {
            diff = time - this.last[83];
            displacement = this.camera_forward.clone();
            displacement.z = 0;
            displacement.normalize();
            displacement.multiplyScalar(-diff / 200);
            this.selected.position.addSelf(displacement);
            this.last[83] = time;
        }

        // D
        if (this.down[68]) {
            diff = time - this.last[68];
            displacement = this.camera_right.clone();
            displacement.z = 0;
            displacement.normalize();
            displacement.multiplyScalar(diff / 200);
            this.selected.position.addSelf(displacement);
            this.last[68] = time;
        }

        // Tab
        if (this.down[9]) {
            index = $.inArray(this.selected, this.vehicles);
            this.setSelected(this.vehicles[(index + 1) % this.vehicles.length]);
            this.down[9] = false;
        }
    }

    if (this.clicked) {
        this.clicked = false;
        pos = this.canvas.offset();
        x = ((this.click_x - pos.left - this.h_pad) / this.image_width) * 2 - 1;
        y = -((this.click_y - pos.top - this.v_pad) / this.image_height) * 2 + 1;
        mouse = new THREE.Vector3(x, y, -1);
        projector = new THREE.Projector();
        raycaster = projector.pickingRay(mouse, this.camera);
        intersects = raycaster.intersectObjects(this.vehicles, true);

        minDist = Infinity;
        picked = null;
        $.each(intersects, function (k, v) {
            if (v.object.name !== 'arrow' && v.distance < minDist) {
                minDist = v.distance;
                picked = v.object.parent;
                that.hit_height = v.point.z;
                that.offset.sub(picked.position, v.point);
            }
        });

        if (picked) {
            this.dragging = true;
            this.rotating = this.down[16];
            this.setSelected(picked);
        }
    }

    if (this.dragging) {
        if (this.rotating) {
            diff_x = this.moved_x - this.click_x;
            diff_y = this.moved_y - this.click_y;
            this.click_x = this.moved_x;
            this.click_y = this.moved_y;
            this.selected.rotation.z += diff_x / 50;
        } else {
            pos = this.canvas.offset();
            x = ((this.moved_x - pos.left - this.h_pad) / this.image_width) * 2 - 1;
            y = -((this.moved_y - pos.top - this.v_pad) / this.image_height) * 2 + 1;
            mouse = new THREE.Vector3(x, y, -1);
            projector = new THREE.Projector();
            raycaster = projector.pickingRay(mouse, this.camera);
            proxy_plane_geometry = new THREE.PlaneGeometry(1000, 1000, 1, 1);
            proxy_plane = new THREE.Mesh(proxy_plane_geometry);
            proxy_plane.matrixWorld.elements[14] = this.hit_height;
            proxy_plane.position.z = this.hit_height;
            intersects = raycaster.intersectObject(proxy_plane);
            if (intersects.length) {
                new_position = new THREE.Vector3(intersects[0].point.x + this.offset.x, intersects[0].point.y + this.offset.y, this.selected.position.z);
                diff = new THREE.Vector3().sub(new_position, this.camera.position);
                diff.z = 0;
                if (diff.length() < 100.0) {
                    this.selected.position = new_position;
                } else {
                    console.log(new_position);
                    diff.normalize().multiplyScalar(100.0);
                    diff.addSelf(this.camera.position);
                    diff.z = 0;
                    this.selected.position = diff;
                }
            } else {
                diff = new THREE.Vector3().sub(this.selected.position, this.camera.position);
                diff.normalize().multiplyScalar(100.0);
                diff.addSelf(this.camera.position);
                diff.z = 0;
                this.selected.position = diff;
            }
        }
    }
};

LabelerTask.prototype.loadModel = function (name) {
    var resource,
        loader,
        model;

    resource = '/static/js/models/' + name + '.js';
    loader = new THREE.JSONLoader(true);
    model = new THREE.Object3D();
    loader.load(resource, function (geometry, materials) {
        var material,
            mesh,
            shadow_geometry,
            shadow_material,
            shadow;

        geometry.computeBoundingBox();
        material = new THREE.MeshFaceMaterial(materials);
        mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(0.3048, 0.3048, 0.3048);
        mesh.position.z = -0.3048 * geometry.boundingBox.min.y;
        mesh.rotation.x = Math.PI / 2;
        mesh.name = name;

        shadow_geometry = new THREE.PlaneGeometry(0.9 * 2 * 0.3048 * geometry.boundingBox.min.x, 0.9 * 2 * 0.3048 * geometry.boundingBox.min.z, 1, 1);
        shadow_material = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
        });
        shadow = new THREE.Mesh(shadow_geometry, shadow_material);
        shadow.position.z = 0.01;

        model.add(mesh);
        model.add(shadow);
    });
    return model;
};

LabelerTask.prototype.loadArrow = function () {
    var resource,
        loader,
        arrow;

    resource = '/static/js/models/arrow.js';
    loader = new THREE.JSONLoader(true);
    arrow = new THREE.Object3D();
    arrow.name = 'arrow';
    loader.load(resource, function (geometry) {
        var material,
            mesh;

        material = new THREE.MeshBasicMaterial({
            color: 0x00FF00
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(0.03, 0.03, 0.03);
        mesh.position.set(0, 0, 4);
        mesh.rotation.y = Math.PI / 2;
        mesh.name = 'arrow';
        arrow.add(mesh);
    });
    return arrow;
};

LabelerTask.prototype.loadCallback = function (data) {
    this.tic = Date.now();

    this.loadImage(data.data);
    this.loadCamera(data.data);
    this.loadRevision(data.data.result);
    this.loadMetadata(data.data.result);
};

LabelerTask.prototype.loadMetadata = function (data) {
    var comment = this.context.$('#comment');
    var flag = this.context.$('#flag');
    var flagButton = this.context.$('#flag_btn');

    comment.val(data.comment);

    if (data.reason) {
        flag.text(data.reason);
        flagButton.addClass('btn-warning');
    } else {
        flag.text('Bad Photo');
        flagButton.removeClass('btn-warning');
    }
};

LabelerTask.prototype.loadRevision = function (data) {
    var that;

    that = this;

    $.each(this.vehicles, function (k, v) { that.scene.remove(v); });

    this.vehicles = $.map(data.cars, function (v) { return that.loadCar(v); });
    $.each(this.vehicles, function (k, v) { that.scene.add(v); });
};

LabelerTask.prototype.loadCar = function (data) {
    var model;

    model = this.loadModel(data.type);
    model.position.x = -data.x;
    model.position.y = -data.z;
    model.rotation.z = -data.theta / 180 * Math.PI;
    model.name = data.type;
    return model;
};

LabelerTask.prototype.loadImage = function (data) {
    var texture,
        plane_geometry,
        plane_material,
        plane_mesh,
        plane,
        width,
        height,
        aspect;

    this.pid = data.id;

    texture = THREE.ImageUtils.loadTexture(data.image);
    plane_geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
    plane_material = new THREE.MeshBasicMaterial({map: texture});
    plane_mesh = new THREE.Mesh(plane_geometry, plane_material);
    plane = new THREE.Object3D();
    plane.add(plane_mesh);
    plane.rotation.x = Math.PI;
    this.plane_scene.remove();
    this.plane_scene.add(this.plane_camera);
    this.plane_scene.add(plane);
    width = this.canvas.width();
    height = this.canvas.height();
    aspect = data.width / data.height;
    this.image_width = aspect * height < width ? aspect * height : width;
    this.image_height = width / aspect < height ? width / aspect : height;
    this.h_pad = (width - this.image_width) / 2;
    this.v_pad = (height - this.image_height) / 2;
    this.renderer.setViewport(this.h_pad, this.v_pad, this.image_width, this.image_height);
};

LabelerTask.prototype.loadCamera = function (data) {
    var lat,
        lon,
        slat,
        slon,
        clat,
        clon,
        latlon,
        R,
        up,
        back,
        right,
        r11,
        r12,
        r13,
        r21,
        r22,
        r23,
        r31,
        r32,
        r33,
        rot,
        pos,
        lookat;

    lat = data.lat / 180 * Math.PI;
    lon = data.lon / 180 * Math.PI;
    slat = Math.sin(lat);
    slon = Math.sin(lon);
    clat = Math.cos(lat);
    clon = Math.cos(lon);

    latlon = new THREE.Matrix4();
    latlon.elements[0] = -slon;
    latlon.elements[1] = -clon * slat;
    latlon.elements[2] = clat * clon;
    latlon.elements[3] = 0;
    latlon.elements[4] = clon;
    latlon.elements[5] = -slon * slat;
    latlon.elements[6] = slon * clat;
    latlon.elements[7] = 0;
    latlon.elements[8] = 0;
    latlon.elements[9] = clat;
    latlon.elements[10] = slat;
    latlon.elements[11] = 0;
    latlon.elements[12] = 0;
    latlon.elements[13] = 0;
    latlon.elements[14] = 0;
    latlon.elements[15] = 1;

    up = new THREE.Vector3(data.upx, data.upy, -data.upz);
    back = new THREE.Vector3(-data.forwardx, -data.forwardy, data.forwardz);
    right = new THREE.Vector3()
        .cross(up, back);

    r11 = right.x;
    r12 = right.y;
    r13 = right.z;
    r21 = up.x;
    r22 = up.y;
    r23 = up.z;
    r31 = back.x;
    r32 = back.y;
    r33 = back.z;

    R = new THREE.Matrix4();
    R.elements[0] = r11;
    R.elements[1] = r12;
    R.elements[2] = r13;
    R.elements[3] = 0;
    R.elements[4] = r21;
    R.elements[5] = r22;
    R.elements[6] = r23;
    R.elements[7] = 0;
    R.elements[8] = r31;
    R.elements[9] = r32;
    R.elements[10] = r33;
    R.elements[11] = 0;
    R.elements[12] = 0;
    R.elements[13] = 0;
    R.elements[14] = 0;
    R.elements[15] = 1;

    rot = new THREE.Matrix4()
        .multiply(latlon, R);

    this.camera_up = rot.multiplyVector3(new THREE.Vector3(0, 1, 0));
    this.camera_right = rot.multiplyVector3(new THREE.Vector3(1, 0, 0));
    this.camera_forward = rot.multiplyVector3(new THREE.Vector3(0, 0, -1));
    this.camera.up.set(this.camera_up.x, this.camera_up.y, this.camera_up.z);

    this.ground.rotation.z = Math.atan2(this.camera_forward.y, this.camera_forward.x);

    pos = this.camera_up.clone()
        .multiplyScalar(data.result.cameraheight / this.camera_up.z);
    this.camera.position.set(pos.x, pos.y, pos.z);

    lookat = new THREE.Vector3();
    lookat.add(this.camera_forward, pos);
    this.camera.lookAt(lookat);

    this.camera.fov = data.fov;
    this.camera.aspect = data.aspect;
    this.camera.updateProjectionMatrix();

};

LabelerTask.prototype.draw = function () {
    var that;

    that = this;

    requestAnimationFrame(function () { that.draw(); });
    this.renderer.clear();
    this.renderer.render(this.plane_scene, this.plane_camera);
    if (!this.down[32]) {
        this.renderer.clear(false, true, false);
        this.renderer.render(this.scene, this.camera);
    }
};

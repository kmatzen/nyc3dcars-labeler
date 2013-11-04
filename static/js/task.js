$(function() {
function registerApplicationInit (context) {
    Ember.run.scheduleOnce('afterRender', context, function(){
    });
};

function registerLogin (context) {
    Ember.run.scheduleOnce('afterRender', context, function(){
        var loginButton = context.$('#login');
        var usernameField = context.$('#username');
        loginButton.click(function () {
            login(context);
        });

        usernameField.keyup(function (event) {
            if (event.keyCode == 13) {
                loginButton.click();
            }
        });
   });
};

function registerLogout (context) {
    Ember.run.scheduleOnce('afterRender', context, function(){
        var logoutButton = context.$('#logout');

        logoutButton.click(function () {
            logout(context);
        });
    });
}

function registerTaskNew (context) {
    Ember.run.scheduleOnce('afterRender', context, function () {
        var task = getTask (context, context.get('parentView').controller.get('id'), 'new');
    });
}

function registerTaskEditView (context, mode) {
    Ember.run.scheduleOnce('afterRender', context, function () {
        var task = getTask (context, context.get('parentView').controller.get('id'), mode, context.controller.get('task_ids'));
    });
}

function login(context) {
    var usernameField = context.$('#username');
    var username = usernameField.val();

    $.cookie('username', username, {'path':'/'})
    console.log(username);

    context.controller.transitionTo('tasks.new', App.User.create({'id':username}));
}

function logout(context) {
    $.removeCookie('username', {'path':'/'});

    context.controller.transitionTo('login');
}

window.App = Ember.Application.create({
    LOG_TRANSITIONS: true
});

App.Router.map(function() {
    this.resource('login');
    this.resource('tasks', { path: '/tasks/:user_id'}, function () {
        this.route ('new', { path: '/new/'} );
        this.route ('view', { path: '/view/:tasklist_id'} );
        this.route ('edit', { path: '/edit/:tasklist_id'} );
    });
});

App.User = Ember.Object.extend({});

App.User.reopenClass({
    find: function (user_id) {
        return App.User.create({id:user_id});
    },
});

App.Tasklist = Ember.Object.extend({});

App.Tasklist.reopenClass({
    find: function (tasklist_id) {
        var elements = tasklist_id.split(',');
        var model = App.Tasklist.create({
            task_ids:elements,
        });
        return model;
    },
});

App.ApplicationView = Ember.View.extend({
    didInsertElement: function () {
        this._super();
        registerApplicationInit (this);
        registerAdmin(this);
        registerFeedback(this);
        registerInstructions(this);
    },
});

App.IndexRoute = Ember.Route.extend({
    redirect: function() {
        var username = $.cookie('username');
        console.log(username);

        if (username == null) {
            this.transitionTo('login');
        } else {
            var params = App.User.create({'id':username});
            console.log(params);
            this.transitionTo('tasks.new', params);
        }
    },
});

App.LoginView = Ember.View.extend({
    didInsertElement: function () {
        this._super();
        registerLogin(this);
    },
});

App.TasksView = Ember.View.extend({
    didInsertElement: function () {
        this._super();
        registerLogout(this);
    },
    model: function (params) {
        return App.User.find(params);
    },
});

App.TasksNewView = Ember.View.extend({
    didInsertElement: function () {
        this._super();
        registerTaskNew (this);
    }
});

App.TasksViewView = Ember.View.extend({
    didInsertElement: function () {
        this._super();
        registerTaskEditView (this, 'view');
    },
    model: function (params) {
        return App.TaskList.find(params);
    },
});

App.TasksEditView = Ember.View.extend({
    didInsertElement: function () {
        this._super();
        registerTaskEditView (this, 'edit');
    },
    model: function (params) {
        return App.TaskList.find(params);
    },
});

});

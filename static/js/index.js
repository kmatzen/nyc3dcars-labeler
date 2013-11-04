$(function() {
function registerLogin (context) {
    Ember.run.scheduleOnce('afterRender', context, function () {
        var usernameField = context.$('#username');

        usernameField.keyup(function (event) {
            if (event.keyCode == 13) {
                $.cookie('username', usernameField.val(), {'path':'/'});
                context.controller.transitionTo('stats');
            }
        });
    });
}

function registerLogout (context) {
    Ember.run.scheduleOnce('afterRender', context, function(){
        var logoutButton = context.$('#logout');

        logoutButton.click(function (event) {
            $.removeCookie('username');
            context.controller.transitionTo('stats');
        });
    });
}

window.App = Ember.Application.create({
    LOG_TRANSITIONS: true
});

App.Router.map(function() {
    this.resource('stats');
});

App.Stat = Ember.Object.extend({
});

App.Stat.reopenClass({
    find: function () {
        var data = {};
        if (this.username != null) {
            data.username = this.username;
        }

        var stats = [];

        $.getJSON('/available', data)
            .then(function (data) {
                $.each (data, function (k, v) {
                    var model = App.Stat.create(v);
                    stats.addObject (model);
                });
            })
            .fail(showFailure);

        return stats;
    },
});

App.IndexRoute = Ember.Route.extend({
    redirect: function () {
        this.transitionTo ('stats');
    },
});

App.ApplicationView = Ember.View.extend({
    didInsertElement: function () {
        registerAdmin(this);
        registerFeedback(this);
    },
});

App.StatsView = Ember.View.extend({
    didInsertElement: function () {
        registerLogin (this);
        registerLogout (this);
    },
});

App.StatsRoute = Ember.Route.extend({
    model: function () {
        return App.Stat.find(this.username);
    },
});

});

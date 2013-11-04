$(function() {
function registerDelete (context) {
    Ember.run.schedule('afterRender', context, function () {
        var deleteButton = context.$('[id^=delete-]');

        deleteButton.click(function () {
            function deleteRequest (signedRequest) {
                var data = {
                    signedRequest:signedRequest,
                };

                $.ajax({
                    type: 'POST',
                    url: 'hittypes/'+context.content.id+'/delete',
                    data: data,
                    success: function (data) {
                        window.location.reload();
                    },
                    error: showFailure,
                });
            }

            facebookCall(deleteRequest);
        });
    });
}

function registerApprove (context) {
    Ember.run.schedule('afterRender', context, function () {
        var approveButton = context.$('[id^=approve-]');

        approveButton.click(function () {
            function approveRequest (signedRequest) {
                var data = {
                    signedRequest:signedRequest,
                };

                $.ajax({
                    type: 'POST',
                    url: 'assignments/'+context.content.id+'/approve',
                    data: data,
                    success: function (data) {
                        window.location.reload();
                    },
                    error: showFailure,
                });
            }

            facebookCall(approveRequest);
        });
    });
}

function registerReject (context) {
    Ember.run.schedule('afterRender', context, function () {
        var rejectButton = context.$('[id^=reject-]');

        rejectButton.click(function () {
            function rejectRequest (signedRequest) {
                var data = {
                    signedRequest:signedRequest,
                };

                $.ajax({
                    type: 'POST',
                    url: 'assignments/'+context.content.id+'/reject',
                    data: data,
                    success: function (data) {
                        window.location.reload();
                    },
                    error: showFailure,
                });
            }

            facebookCall(rejectRequest);
        });
    });
}


window.App = Ember.Application.create({
    LOG_TRANSITIONS: true
});


App.Router.map(function() {
    this.resource('jobs');
    this.resource('job', { path : '/jobs/:job_id' });
    this.resource('workers');
    this.resource('worker', { path : '/workers/:worker_id' });
});

function progressFormat (numerator, denominator) {
    return Math.floor(100.0*numerator/denominator);
}

App.Worker = Ember.Object.extend({
    toggleClass: function () {
        if (this.get('trust')) {
            return 'btn btn-warning active';
        } else {
            return 'btn btn-warning';
        }
    }.property('trust'),
});

App.Worker.reopenClass({
    findById: function (workerId) {
        var url = 'workers/'+workerId;
   
        var worker = App.Worker.create({});

        function requester (signedRequest) { 
            $.getJSON(url+'?'+$.param({signedRequest:signedRequest}))
                .then(function (data) {
                    worker.setProperties(data);
                })
                .fail(showFailure);
        }

        facebookCall (requester);

        return worker;
    },

    findAll: function () {
        var url = 'workers/';
   
        var workers = [];

        function requester (signedRequest) { 
            $.getJSON(url+'?'+$.param({signedRequest:signedRequest}))
                .then(function (data) {
                    data.forEach (function (v) {
                        var model = App.Worker.create(v);
                        workers.addObject(model);
                    });
                })
                .fail(showFailure);
        }

        facebookCall (requester);

        return workers;
    },

    find: function (workerId) {
        if (workerId) {
            return this.findById(workerId);
        } else {
            return this.findAll();
        }
    },
});

App.Job = Ember.Object.extend({
    submitted_assignments: function () {
        if (!this.get('id')) {
            return [];
        }

        return App.Assignment.findByJob(this.get('id'), 18, 0, 'Submitted');
    }.property('id'),

    approved_assignments: function () {
        if (!this.get('id')) {
            return [];
        }

        return App.Assignment.findByJob(this.get('id'), 18, 0, 'Approved');
    }.property('id'),

    rejected_assignments: function () {
       if (!this.get('id')) {
          return [];
       }

       return App.Assignment.findByJob(this.get('id'), 18, 0, 'Rejected');
    }.property('id'),

    pending_assignments: function () {
       if (!this.get('id')) {
          return [];
       }

       return App.Assignment.findByJob(this.get('id'), 18, 0, 'Pending');
    }.property('id'),

    host: function () {
        if (this.get('sandbox')) {
            return 'https://workersandbox.mturk.com';
        } else {
            return 'https://www.mturk.com';
        }
    }.property('sandbox'),

    icon: function () {
        if (this.get('sandbox')) {
            return '/static/img/sandbox.png';
        } else {
            return '/static/img/mturk.png';
        }
    }.property('sandbox'),

    iconStyle: function () {
        return 'background-position:center;background-repeat:no-repeat;background-size:contain;width:20px;height:20px;background-image:url('+this.get('icon')+')';
    }.property('icon'),

    mturkHref: function () {
        return this.get('host')+'/mturk/preview?groupId='+this.get('groupid');
    }.property('host', 'groupid'),

    submittedStyle: function () {
        return 'width:'+progressFormat(this.get('Submitted'), this.get('count'))+'%;padding-left: 0px;';
    }.property('Submitted', 'count'),

    approvedStyle: function () {
        return 'width:'+progressFormat(this.get('Approved'), this.get('count'))+'%;padding-left: 0px;';
    }.property('Approved', 'count'),
  
    rejectedStyle: function () {
        return 'width:'+progressFormat(this.get('Rejected'), this.get('count'))+'%;padding-left: 0px;';
    }.property('Rejected', 'count'),
   
    pendingStyle: function () {
        return 'width:'+progressFormat(this.get('Pending'), this.get('count'))+'%;padding-left: 0px;';
    }.property('Pending', 'count'),

});

App.Job.reopenClass({
    find: function (jobId) {
        if (jobId !== undefined) {
            var job = App.Job.create({});

            var requester = function (signedRequest) {
                $.getJSON('jobs/'+jobId+'?'+$.param({signedRequest:signedRequest}))
                    .then(function (data) {
                        job.setProperties(data.data);
                    })
                    .fail(showFailure);
            };

            facebookCall(requester);

            return job;

        } else {
            var jobs = [];
   
            var requester = function (signedRequest) {
                $.getJSON('jobs/?'+$.param({signedRequest:signedRequest}))
                    .then(function (data) {
                        data.data.forEach(function (job) {
                            var model = App.Job.create(job);
                            jobs.addObject(model);
                        });
                    })
                    .fail(showFailure);
            };

            facebookCall(requester);

            return jobs;
        }
    },
});

App.Assignment = Ember.Object.extend({
    view_href: function () {
        var csids = this.get('csids');
        var apsids = this.get('apsids');
        var bbsids = this.get('bbsids');
        var dnid = this.get('dnid');
        var osid = this.get('osid');
        var rid = this.get('rid');

        if (csids.length > 0) {
            return '/clicker/#/tasks/'+this.get('username')+'/view/'+csids.join(',');
        } else if (apsids.length > 0) {
            return '/approve_pairs/#/tasks/'+this.get('username')+'/view/'+apsids.join(',');
        } else if (bbsids.length > 0) {
            return '/bbox/#/tasks/'+this.get('username')+'/view/'+bbsids.join(',');
        } else if (dnid.length > 0) {
            return '/daynight/#/tasks/'+this.get('username')+'/view/'+dnid;
        } else if (osid.length > 0) {
            return '/occlusion/#/tasks/'+this.get('username')+'/view/'+osid;
        } else if (rid.length > 0) {
            return '/labeler/#/tasks/'+this.get('username')+'/view/'+rid;
        } else {
            return '';
        }
    }.property('username', 'csids', 'apsids', 'bbsids', 'dnid', 'osid', 'rid'),

});

App.Assignment.reopenClass({
    findByJob: function (jobId, limit, offset, type) {
        var assignments = [];

        function requester (signedRequest) {
            var data = {signedRequest:signedRequest};
            if (limit) {
                data.limit = limit;
            }
            if (offset) {
                data.offset = offset;
            }
            if (type) {
                data.type = type;
            }

            $.getJSON('jobs/'+jobId+'/assignments?'+$.param(data))
                .then(function (data) {
                    data.data.forEach(function (assignment) {
                        var model = App.Assignment.create(assignment);
                        assignments.addObject(model);
                    });
                })
                .fail(showFailure);
        }

        facebookCall (requester);
        
        return assignments;
    },
});

App.IndexRoute = Ember.Route.extend({
    redirect: function() {
        this.transitionTo('jobs');
    },

});

App.ApplicationView = Ember.View.extend({
    didInsertElement: function () {
        this._super();
        registerAdmin (this);
    },
});

App.WorkersView = Ember.View.extend({
    templateName: 'workers',
});

App.WorkerRowView = Ember.View.extend({
    templateName: 'workers/worker',
    didInsertElement: function () {
        this._super();
    },
});

App.JobView = Ember.View.extend({
    didInsertElement: function () {
        this._super();
    },
});

App.SubmittedAssignmentWellView = Ember.View.extend({
    templateName: 'job/submitted_assignment',
    didInsertElement: function () {
        this._super();
        registerApprove (this);
        registerReject (this);
    },
});

App.ReviewedAssignmentWellView = Ember.View.extend({
    templateName: 'job/reviewed_assignment',
});

App.PendingAssignmentWellView = Ember.View.extend({
    templateName: 'job/pending_assignment',
});

App.JobsView = Ember.View.extend({
    templateName: 'jobs',
});

App.JobRowView = Ember.View.extend({
    templateName: 'jobs/job',
    didInsertElement: function () {
        this._super();
        registerDelete (this);
    },
});

App.JobsRoute = Ember.Route.extend({
    model: function () {
        return App.Job.find();
    },
});

App.WorkersRoute = Ember.Route.extend({
    model: function () {
        return App.Worker.find();
    },
});

App.WorkerRoute = Ember.Route.extend({
    model: function (params) {
        return App.Worker.find(params.worker_id);
    },
});

App.JobRoute = Ember.Route.extend({
    model: function (params) {
        return App.Job.find(params.job_id);
    },
});

Ember.Handlebars.helper('duration-format', function (seconds) {
    if (seconds < 60) {
        name = 'second';
    } else if (seconds < 60*60) {
        seconds /= 60;
        name = 'minute';
    } else if (seconds < 60*60*24) {
        seconds /= 60*60;
        name = 'hour';
    } else {
        seconds /= 60*60*24;
        name = 'day';
    }

    if (seconds > 1)
        name += 's';

    return seconds + ' ' + name;
});

Ember.Handlebars.helper('date-format', function (date) {
    return date;
});

});

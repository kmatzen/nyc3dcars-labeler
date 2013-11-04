function createAssignment(v) {
    var assignment = cloneTemplate('assignment_template');
    appendID(assignment, v.asid);

    var view = assignment.find('[id^=view]');

    var data = {'username':v.username,'review':true};
    if (v.csids != '') {
        data.csids = v.csids.join('-');
        view.click(function () { window.open('/clicker?'+$.param(data), '_blank'); });
    } else if (v.apsids != '') {
        data.apsids = v.apsids.join('-');
        view.click(function () { window.open('/approve_pairs?'+$.param(data), '_blank'); });
    } else if (v.bbsids != '') {
        data.bbsids = v.bbsids.join('-');
        view.click(function () { window.open('/bbox?'+$.param(data), '_blank'); });
    } else if (v.dnid) {
        data.dnid = v.dnid; 
        view.click(function () { window.open('/daynight?'+$.param(data), '_blank'); });
    } else if (v.osid) {
        data.osid = v.osid;
        view.click(function () { window.open('/occlusion?'+$.param(data), '_blank'); });
    } else if (v.rid) {
        data.rid = v.rid;
        view.click(function () { window.open('/labeler?'+$.param(data), '_blank'); });
    } else {
        view.removeClass('btn-primary');
    }

    if (v.status == 'Submitted') {
        assignment.find('[id^=approve]')
            .click(function () { 
                $.ajax({
                    type:'POST',
                    url:'approve', 
                    data:{'asid':v.asid,'password':$.cookie('password')}, 
                    success:initializeJobs,
                    error:showFailure
                }); 
            });

        assignment.find('[id^=reject]')
            .click(function () { 
                $.ajax({
                    type:'POST',
                    url:'reject', 
                    data:{'asid':v.asid,'password':$.cookie('password')}, 
                    success:initializeJobs,
                    error:showFailure,
                }); 
            });
    } else {
        assignment.find('[id^=approve]')
            .remove();

        assignment.find('[id^=reject]')
            .remove();
    }


    updateAssignment(v, assignment);
    return assignment;
}

function updateAssignment(v, assignment) {
    assignment.find('[id^=username]')
        .attr('href', 'worker.html?uid='+v.uid)
        .text(v.username);

    assignment.find('[id^=asid]')
        .text(v.assignmentid);

}

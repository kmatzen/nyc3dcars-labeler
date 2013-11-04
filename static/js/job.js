function updateJob (v, job) {
    var htid = v.htid;

    job.find('[id^=duration]')
        .text('Duration: ' + formatSeconds(v.duration));

    job.find('[id^=reward]')
        .text('Reward: $' + v.reward.toFixed(2));

    job.find('[id^=count]')
        .text('Count: ' + v.count);

    job.find('[id^=keywords]')
        .text('Keywords: ' + v.keywords);

    job.find('[id^=description]')
        .text(v.description);

    job.find('[id^=SubmittedProgress]')
        .css('width', Math.floor(100.0*v.Submitted/v.count) + '%');

    job.find('[id^=ApprovedProgress]')
        .css('width', Math.floor(100.0*v.Approved/v.count) + '%');

    job.find('[id^=RejectedProgress]')
        .css('width', Math.floor(100.0*v.Rejected/v.count) + '%');


    var preview = job.find('[id^=preview]')
    if (v.sandbox) {
        preview.css('background-image', 'url(/static/img/sandbox.png)')
    }

    job.find('[id^=header]')
        .text(v.title);
}

function createJob (v, details) {
    var job = cloneTemplate(details ? 'job_template_details' : 'job_template');
    appendID(job, v.htid);

    var htid = v.htid;

    job.find('[id^=toggle]')
        .click(function () { $('#details-'+htid).toggleClass('collapse'); });

    job.find('[id^=drilldown-btn]')
        .attr('href', 'hittype?htid='+htid);

    job.find('[id^=Submitted-tab]')
        .attr('href', '#Submitted-'+htid);

    job.find('[id^=Approved-tab]')
        .attr('href', '#Approved-'+htid);

    job.find('[id^=Rejected-tab]')
        .attr('href', '#Rejected-'+htid);

    job.find('[id^=Pending-tab]')
        .attr('href', '#Pending-'+htid);

    var preview = job.find('[id^=preview]');
    preview.click(function (e) {
        var host = v.sandbox ? 'https://workersandbox.mturk.com' : 'https://www.mturk.com';
        window.open(host+'/mturk/preview?groupId='+v.groupid, '_blank'); 
        e.preventDefault(); 
    });


    updateJob(v, job);
    return job;
}


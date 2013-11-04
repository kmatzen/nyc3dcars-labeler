function facebookCall (callback) {
    if (window.facebookIsLoaded) {
        FB.getLoginStatus(function (response) {
            if (response.status === 'connected') {
                var signedRequest = response.authResponse.signedRequest;
                callback(signedRequest);
            }
        });
    } else {
        window.facebookLoaded.add(callback);
    }
}

function showFailure (response) {
    $('#error_details').html(response.responseText);
    $("div.modal").modal('hide');
    $('#error_modal').modal('show');
    $('#submit').button('reset');
}

function showSuccess () {
    $('div.modal').modal('hide');
    $('#success_modal').modal('show');
}


function registerInstructions (context) {
    Ember.run.scheduleOnce('afterRender', context, function(){
        var modals = context.$('div.modal');
        var instructionsModal = context.$('#instructions_modal');
        var instructionsButton = context.$('#instructions_button');
        var controlsButton = context.$('#controls_button');
        var controlsModal = context.$('#controls_modal');

        instructionsButton.click(function () {
            modals.modal('hide');
            instructionsModal.modal('show');
        });

        controlsButton.click(function () {
            modals.modal('hide');
            controlsModal.modal('show');
        });
    });
}

function registerFeedback (context) {
    Ember.run.scheduleOnce('afterRender', context, function(){
        var params = $.deparam.querystring();

        var feedbackButton = context.$('#feedback');
        var modals = context.$('div.modal');
        var feedbackModals = context.$('#feedback_modal');
        var feedbackSubmit = context.$('#feedback_submit');
        var successDetails = context.$('#success_details');
        var feedbackDescription = context.$('#feedback_description');
        var successModal = context.$('#success_modal');

        feedbackButton.click(function () {
            modals.modal('hide');
            feedbackModals.modal('show');
        });

        feedbackSubmit.click(function () {
            $.ajax({
                type:'POST',
                url:'/problem', 
                data: {'username':params.workerId||'', 'description':feedbackDescription.val()},
                success: function () {
                    successDetails.empty().append('Feedback successfully submitted.')
                    feedbackDescription.val('');
                    modals.modal('hide');
                    successModal.modal('show');
                },
                error: function (response) {
                    showFailure(response);
                }
            });
        });
    });
}

function registerAdmin (context) {
    Ember.run.scheduleOnce('afterRender', context, function(){
        var form = context.$('form[data-async]');
        var fields = context.$('input, textarea, select');
        var submit = form.find('[type=submit]')

        submit.click(function(event) {
            event.preventDefault();

            function orderRequest (signedRequest) {

                var data = {
                    signedRequest:signedRequest,
                };
                $.each(fields, function (k, v) {
                    if ($(v).attr('type') === 'checkbox') {
                        data[$(v).attr('name')] = $(v).is(':checked');
                    } else {
                        data[$(v).attr('name')] = $(v).val();
                    }
                });
     
                $.ajax({
                    type: $(form).attr('method'),
                    url: $(form).attr('action'),
                    data: data,
         
                    success: function () { window.location.reload(); },
                    error: showFailure,
                });
            }

            facebookCall (orderRequest);
        });
    });
};




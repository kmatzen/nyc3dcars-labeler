# -*- coding: latin-1 -*-

"""A set of utility functions used across the tasks."""

from flask import Flask, render_template, current_app
from flask.ext.restful import reqparse
from flask.ext.assets import Environment, Bundle

import traceback
from functools import wraps
import hmac
import hashlib
import json
import database

import datetime
import random
import boto



def create_app(package_name, js_assets=None, css_assets=None,
               settings_override=None):
    """Flask app factory."""

    app = Flask(package_name, instance_relative_config=True)

    app.config.from_pyfile('settings.cfg', silent=False)
    app.config.from_object(settings_override)

    assets = Environment(app)
    assets.url = '../static'

    common_css_assets = [
        'css/bootstrap.min.css',
        'css/animations.css',
        'css/superfish.css',
        'css/prettyPhoto.css',
        'css/style.css',
        'css/colors/blue.css',
        'css/theme-responsive.css',
    ]

    common_js_assets = [
        'js/jquery.min.js',
        'js/bootstrap.min.js',
        'js/handlebars.js',
        'js/ember.js',
        'js/jquery.cookie.js',
        'js/jquery.ba-bbq.min.js',
    ]

    if js_assets is not None:
        js_assets = common_js_assets + js_assets
    else:
        js_assets = common_js_assets
    js_bundle = Bundle(
        *js_assets,
        filters='jsmin',
        output='gen/' + package_name + '.js'
    )
    assets.register('js_all', js_bundle)

    if css_assets is not None:
        css_assets = common_css_assets + css_assets
    else:
        css_assets = common_css_assets
    css_bundle = Bundle(
        *css_assets,
        filters='cssmin',
        output='gen/' + package_name + '.css'
    )
    assets.register('css_all', css_bundle)

    assets.init_app(app)

    return app


def random_error():
    """Randomly selects a nonsense error message for when
       something internally goes wrong and we don't want to
       bother the user with the details."""

    return random.choice([
        """We apologise for the fault in the server.
           Those responsible have been sacked.""",
        'Sorry, server undergoing unscheduled discombobulation.',
        'Server go bye-bye.',
        'Huh?  Speak up, I cannot hear you.',
        'ಠ_ಠ',
    ])


def get_user(session, username):
    """Get a user from the database."""

    user = session.query(database.User) \
        .filter_by(username=username) \
        .first()

    if user is None:
        user = database.User(
            username=username,
            lastactivity=datetime.datetime.now(),
            trust=False,
        )
        session.add(user)
    else:
        user.lastactivity = datetime.datetime.now()

    session.flush()
    session.commit()

    return user


def mturk_template(args, name, **kwargs):
    """Renders the mturk template or the regular template
       based on whether the query string shows the request came
       from MTurk."""

    username = args.get('username', None)
    assignment_id = args.get('assignmentId', None)
    username = '"' + username + '"' if username is not None else 'null'
    mturk = assignment_id is not None
    instruction = assignment_id == 'ASSIGNMENT_ID_NOT_AVAILABLE'
    return render_template(
        '%s.html' % name,
        username=username,
        mturk=mturk,
        instruction=instruction,
        selected=name,
        **kwargs
    )


def pad(string):
    """Pad base64 string so that it is the correct length."""

    return string + ('=' * ((4 - len(string) % 4) % 4))


def verify_signed_request(signed_request):
    """Verify if the request was generated using Facebook API with
       the correct user."""

    if signed_request is None:
        return False

    encoded_signature, payload = signed_request.split('.')

    sig = pad(encoded_signature.replace('_', '/')
              .replace('-', '+')).decode('base64').encode('hex')
    data = json.loads(
        pad(payload.replace('_', '/').replace('-', '+')).decode('base64')
    )

    app_secret = current_app.config['FACEBOOK_APP_SECRET']

    expected_signature = hmac.new(
        app_secret,
        payload,
        hashlib.sha256
    ).hexdigest()

    user_id = current_app.config['FACEBOOK_USER_ID']

    return sig == expected_signature and data['user_id'] == user_id


def facebook_authenticate():
    """Decorator to make a user sign a request with Facebook API first."""

    def decorator(fcn):
        """Decorator implementation."""

        @wraps(fcn)
        def decorated_function(*args, **kwargs):
            """Facebook auth decorated function"""

            parser = reqparse.RequestParser()
            parser.add_argument('signedRequest', type=str, required=True)
            parsed_args = parser.parse_args()

            if not verify_signed_request(parsed_args.signedRequest):
                return 'Authorization Failed', 400

            return fcn(*args, **kwargs)

        return decorated_function

    return decorator


def database_session(fetch_user=True, return_random_error=True):
    """Decorator to retrieve database session for request."""

    def decorator(fcn):
        """Decorator implementation."""

        @wraps(fcn)
        def decorated_function(*args, **kwargs):
            """Database decorated function."""

            if fetch_user:
                parser = reqparse.RequestParser()
                parser.add_argument('username', type=str, required=True)
                parsed_args = parser.parse_args()

            session = database.SESSION()

            try:
                if fetch_user:
                    user = get_user(session, parsed_args.username)
                    return fcn(session, user, *args, **kwargs)
                else:
                    return fcn(session, *args, **kwargs)
            except Exception:
                if return_random_error:
                    current_app.logger.error(traceback.format_exc())
                    session.rollback()
                    return random_error(), 500
                else:
                    session.rollback()
                    raise
            finally:
                database.SESSION.remove()

        return decorated_function

    return decorator


def get_mturk_connection(sandbox):
    """Fetches the sandbox or regular mturk connection."""

    if sandbox:
        host = 'mechanicalturk.sandbox.amazonaws.com'
    else:
        host = 'mechanicalturk.amazonaws.com'

    connection = boto.connect_mturk(
        aws_access_key_id=current_app.config['MTURK_ACCESS_KEY_ID'],
        aws_secret_access_key=current_app.config['MTURK_SECRET_ACCESS_KEY'],
        host=host,
    )

    return connection


def mturk_save():
    """Generates assignment object from mturk submissions."""

    def decorator(fcn):
        """Decorator implementation."""

        @wraps(fcn)
        def decorated_function(session, user, *args, **kwargs):
            """MTurk save decorated function."""

            parser = reqparse.RequestParser()
            parser.add_argument('assignmentId', '', type=str)
            parser.add_argument('hitId', '', type=str)
            parsed_args = parser.parse_args()

            if (parsed_args.assignmentId == '') != (parsed_args.hitId == ''):
                return """
                    assignmentId and hitId must be either be 
                    specified or unspecified
                """, 400

            if parsed_args.hitId != '':
                hit = session.query(database.HIT) \
                    .filter_by(hitid=parsed_args.hitId) \
                    .one()

                assignment = session.query(database.Assignment) \
                    .filter_by(assignmentid=parsed_args.assignmentId) \
                    .first()

                if assignment is None:
                    assignment = database.Assignment(
                        user=user,
                        assignmentid=parsed_args.assignmentId,
                        HIT=hit,
                        status='Pending',
                        abandoned=False,
                    )
                    session.add(assignment)
            else:
                assignment = None

            return fcn(session, user, assignment, *args, **kwargs)

        return decorated_function

    return decorator

#!/usr/bin/env python

"""Clicker task."""

import datetime
import json
import os

from flask import jsonify, request
from flask.ext.restful import reqparse

import database

from sqlalchemy import func, or_, desc

from server_common import database_session, mturk_template, \
    create_app, mturk_save

APP = create_app(
    __name__,
    js_assets=[
        'js/jquery.mousewheel.min.js',
        'js/kinetic-v4.4.3.min.js',
        'js/common.js',
        'js/task.js',
        'js/basetask.js',
        'js/clicker_task.js',
    ],
)


@APP.route('/')
def template():
    """Clicker template handler."""

    parser = reqparse.RequestParser()
    parser.add_argument('pids', type=str)
    args = parser.parse_args()

    if args.pids is not None:
        num_images = len(args.pids.split('-'))
    else:
        num_images = None

    return mturk_template(
        request.args,
        'clicker',
        num_images=num_images
    )


@APP.route('/save', methods=['POST'])
@database_session()
@mturk_save()
def save(session, user, assignment):
    """Clicker save handler."""

    parser = reqparse.RequestParser()
    parser.add_argument('pid', type=int, required=True)
    parser.add_argument('duration', type=int, required=True)
    parser.add_argument('clicks', type=str, required=True)
    args = parser.parse_args()

    args.clicks = json.loads(args.clicks)

    click_session = database.ClickSession(
        user=user,
        pid=args.pid,
        creation=datetime.datetime.now(),
        assignment=assignment,
        duration=datetime.timedelta(milliseconds=args.duration),
    )
    session.add(click_session)

    for click in args.clicks:
        click = database.Click(
            click_session=click_session,
            x=click['x'],
            y=click['y'],
        )
        session.add(click)

    session.flush()
    # pylint: disable-msg=E1101
    session_id = click_session.id
    # pylint: enable-msg=E1101
    session.commit()

    return jsonify(status='ok', id=session_id)

@APP.route('/load')
@database_session()
def load(session, user):
    """Clicker load handler."""

    parser = reqparse.RequestParser()
    parser.add_argument('pid', None, type=int)
    parser.add_argument('csid', None, type=int)
    args = parser.parse_args()

    if args.pid is not None and args.csid is not None:
        return 'only pid or csid allowed', 400

    if args.pid is None and args.csid is None:
        # pylint: disable-msg=E1101,E1103
        photo = session.query(database.Photo) \
            .outerjoin(database.ClickSession) \
            .group_by(database.Photo.id) \
            .having(func.bool_and(or_(
                database.ClickSession.uid != user.id,
                database.ClickSession.uid == None
            ))) \
            .having(func.count(database.ClickSession.id) < 1) \
            .order_by(desc(func.count(database.ClickSession.id))) \
            .order_by(func.random()) \
            .first()
        # pylint: enable-msg=E1101,E1103
        points = []
    elif args.pid is not None and args.csid is None:
        photo = session.query(database.Photo) \
            .filter_by(id=args.pid) \
            .one()
        points = []
    elif args.csid is not None:
        clicker_session = session.query(database.ClickSession) \
            .filter_by(id=args.csid) \
            .one()

        photo = clicker_session.photo

        points = [{
            'x': point.x,
            'y': point.y
        } for point in clicker_session.clicks]

    data = {
        'pid': photo.id,
        'image': os.path.join(APP.config['HOST'], photo.name),
        'points': points,
    }

    if photo is None:
        return jsonify(status='empty')
    else:
        return jsonify(status='ok', data=data)

if __name__ == '__main__':
    APP.run()

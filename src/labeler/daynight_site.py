#!/usr/bin/env python

"""Day/Night adjustment task."""

import datetime
import os

from flask import jsonify, request
from flask.ext.restful import reqparse

import database

from sqlalchemy import func, or_, desc

from server_common import mturk_template, create_app, \
    database_session, mturk_save

APP = create_app(
    __name__,
    js_assets=[
        'js/common.js',
        'js/task.js',
        'js/basetask.js',
        'js/daynight_task.js',
    ],
)


@APP.route('/')
def template():
    """Day/Night template handler."""

    return mturk_template(request.args, 'daynight')


@APP.route('/load')
@database_session()
def load(session, user):
    """Day/Night load handler."""

    parser = reqparse.RequestParser()
    parser.add_argument('pid', None, type=int)
    parser.add_argument('dnid', None, type=int)
    args = parser.parse_args()

    if args.pid is not None and args.dnid is not None:
        return 'only pid or dnid allowed', 400

    if args.pid is None and args.dnid is None:
        # pylint: disable-msg=E1101,E1103
        photo = session.query(database.Photo) \
            .join(database.Annotation) \
            .outerjoin(database.DayNight) \
            .filter(database.Photo.seesground == True) \
            .group_by(database.Photo.id) \
            .having(func.bool_and(or_(
                database.DayNight.uid != user.id,
                database.DayNight.uid == None
            ))) \
            .having(func.count(database.DayNight.id) < 2) \
            .order_by(desc(func.count(database.DayNight.id))) \
            .order_by(func.random()) \
            .first()
        # pylint: enable-msg=E1101,E1103
        label = None
    elif args.pid is not None and args.dnid is None:
        photo = session.query(database.Photo) \
            .filter_by(id=args.pid) \
            .one()
        label = None
    elif args.dnid is not None:
        daynight = session.query(database.DayNight) \
            .filter_by(id=args.dnid) \
            .one()

        photo = daynight.photo

        label = daynight.daynight

    data = {
        'pid': photo.id,
        'image': os.path.join(APP.config['HOST'], photo.name),
        'label': label,
    }

    if photo is None:
        return jsonify(status='empty')
    else:
        return jsonify(status='ok', data=data)


@APP.route('/save', methods=['POST'])
@database_session()
@mturk_save()
def save(session, user, assignment):
    """Day/Night save handler."""

    parser = reqparse.RequestParser()
    parser.add_argument('pid', type=int, required=True)
    parser.add_argument('duration', type=int, required=True)
    parser.add_argument('daynight', type=str, required=True)
    args = parser.parse_args()

    daynight_entry = database.DayNight(
        user=user,
        pid=args.pid,
        daynight=args.daynight,
        creation=datetime.datetime.now(),
        assignment=assignment,
    )

    session.add(daynight_entry)

    session.flush()
    # pylint: disable-msg=E1101
    session_id = daynight_entry.id
    # pylint: enable-msg=E1101
    session.commit()

    return jsonify(status='ok', id=session_id)

if __name__ == '__main__':
    APP.run()

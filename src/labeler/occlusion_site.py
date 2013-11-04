#!/usr/bin/env python

"""Occlusion ranking task."""

import datetime
import json
import os

from flask import jsonify, request
from flask.ext.restful import reqparse

import database

from sqlalchemy import func, desc, or_

from server_common import mturk_template, database_session, \
    create_app, mturk_save

APP = create_app(
    __name__,
    js_assets=[
        'js/bootstrap_button_hack.js',
        'js/jquery-ui.min.js',
        'js/common.js',
        'js/task.js',
        'js/basetask.js',
        'js/occlusion_task.js',
    ],
    css_assets=[
        'css/occlusion.css',
    ],
)


@APP.route('/')
def template():
    """Occlusion ranking template handler."""

    return mturk_template(request.args, 'occlusion')


@APP.route('/load')
@database_session()
def load(session, user):
    """Occlusion ranking load handler."""

    parser = reqparse.RequestParser()
    parser.add_argument('vids', None, type=str)
    parser.add_argument('osid', None, type=int)
    args = parser.parse_args()

    if args.vids is not None and args.osid is not None:
        return 'only vids or osid allowed', 400

    if args.vids is not None:
        args.vids = [int(vid) for vid in args.vids.split('-')]

    if args.vids is None and args.osid is None:
        # pylint: disable-msg=E1101,E1103
        vehicles = session.query(database.Vehicle) \
            .outerjoin(database.OcclusionRanking) \
            .outerjoin(database.OcclusionSession) \
            .join(database.Revision) \
            .group_by(database.Vehicle.id) \
            .having(func.bool_and(or_(
                database.OcclusionSession.uid != user.id,
                database.OcclusionSession.uid == None
            ))) \
            .filter(database.Vehicle.cropped != None) \
            .filter(database.Revision.final == True) \
            .having(func.count(database.OcclusionSession.id) < 2) \
            .order_by(desc(func.count(database.OcclusionSession.id))) \
            .order_by(func.random()) \
            .limit(24)
        # pylint: disable-msg=E1101,E1103
        labels = [{
            'vid': vehicle.id,
            'image': os.path.join(APP.config['HOST'], vehicle.cropped)
        } for vehicle in vehicles]
    elif args.vids is not None and args.osid is None:
        # pylint: disable-msg=E1101
        vehicles = session.query(database.Vehicle) \
            .filter(database.Vehicle.id.in_(args.vids))
        # pylint: disable-msg=E1101

        labels = [{
            'vid': vehicle.id,
            'image': os.path.join(APP.config['HOST'], vehicle.cropped),
            'label': None,
        } for vehicle in vehicles]
    elif args.osid is not None:
        occlusion_session = session.query(database.OcclusionSession) \
            .filter_by(id=args.osid) \
            .one()

        labels = [{
            'vid': occlusion.vid,
            'image': os.path.join(
                APP.config['HOST'],
                occlusion.vehicle.cropped
            ),
            'label': occlusion.category,
        } for occlusion in occlusion_session.occlusions]

    if labels is None:
        return jsonify(status='empty')
    else:
        return jsonify(status='ok', data=labels)


@APP.route('/save', methods=['POST'])
@database_session()
@mturk_save()
def save(session, user, assignment):
    """Occlusion ranking save handler."""

    parser = reqparse.RequestParser()
    parser.add_argument('order', type=str, required=True)
    parser.add_argument('duration', type=int, required=True)
    args = parser.parse_args()

    args.order = json.loads(args.order)

    occlusion_session = database.OcclusionSession(
        user=user,
        creation=datetime.datetime.now(),
        duration=datetime.timedelta(milliseconds=args.duration),
        assignment=assignment,
    )
    session.add(occlusion_session)

    category = 0
    for entry in args.order:
        if entry[:3] == 'img':
            occlusion_ranking = database.OcclusionRanking(
                vid=int(entry[3:]),
                occlusion_session=occlusion_session,
                category=category)
            session.add(occlusion_ranking)
        else:
            if entry != 'cat%d' % category:
                return 'bad category order', 400
            category += 1

    session.flush()
    # pylint: disable-msg=E1101
    session_id = occlusion_session.id
    # pylint: enable-msg=E1101
    session.commit()

    return jsonify(status='ok', id=session_id)

if __name__ == '__main__':
    APP.run()

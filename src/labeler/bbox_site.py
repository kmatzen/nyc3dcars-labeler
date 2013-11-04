#!/usr/bin/env python

"""Bounding box adjustment task."""

import datetime
import os

from flask import request, jsonify
from flask.ext.restful import reqparse

import database

from sqlalchemy import func, desc, or_

from server_common import mturk_template, create_app, \
    database_session, mturk_save

APP = create_app(
    __name__,
    js_assets=[
        'js/jquery.mousewheel.min.js',
        'js/common.js',
        'js/task.js',
        'js/basetask.js',
        'js/kinetic-v4.4.3.min.js',
        'js/bbox_task.js',
    ],
)


@APP.route('/')
def template():
    """BBox template handler."""

    parser = reqparse.RequestParser()
    parser.add_argument('vids', type=str)
    args = parser.parse_args()

    if args.vids is not None:
        num_vehicles = len(args.vids.split('-'))
    else:
        num_vehicles = None
    return mturk_template(
        request.args,
        'bbox',
        num_vehicles=num_vehicles
    )


@APP.route('/save', methods=['POST'])
@database_session()
@mturk_save()
def save(session, user, assignment):
    """BBox save handler."""

    parser = reqparse.RequestParser()
    parser.add_argument('vid', type=int, required=True)
    parser.add_argument('duration', type=int, required=True)
    parser.add_argument('x1', type=float, required=True)
    parser.add_argument('x2', type=float, required=True)
    parser.add_argument('y1', type=float, required=True)
    parser.add_argument('y2', type=float, required=True)
    args = parser.parse_args()

    bbox_session = database.BoundingBoxSession(
        user=user,
        vid=args.vid,
        creation=datetime.datetime.now(),
        assignment=assignment,
        duration=datetime.timedelta(milliseconds=args.duration),
        x1=args.x1,
        x2=args.x2,
        y1=args.y1,
        y2=args.y2,
    )
    session.add(bbox_session)

    session.flush()
    # pylint: disable-msg=E1101
    session_id = bbox_session.id
    # pylint: enable-msg=E1101
    session.commit()

    return jsonify(status='ok', id=session_id)

@APP.route('/load')
@database_session()
def load(session, user):
    """BBox load handler."""

    parser = reqparse.RequestParser()
    parser.add_argument('vid', None, type=int)
    parser.add_argument('bbsid', None, type=int)
    args = parser.parse_args()

    if args.vid is not None and args.bbsid is not None:
        return 'only vid or bbsid allowed', 400

    if args.vid is None and args.bbsid is None:
        # pylint: disable-msg=E1101,E1103
        vehicle = session.query(database.Vehicle) \
            .join(database.Revision) \
            .outerjoin(database.BoundingBoxSession) \
            .filter(database.Revision.final == True) \
            .group_by(database.Vehicle.id) \
            .having(func.bool_and(or_(
                database.BoundingBoxSession.uid != user.id,
                database.BoundingBoxSession.uid == None
            ))) \
            .having(func.count(database.BoundingBoxSession.id) < 2) \
            .order_by(desc(func.count(database.BoundingBoxSession.id))) \
            .order_by(func.random()) \
            .first()
        # pylint: enable-msg=E1101,E1103

        photo = vehicle.revision.annotation.photo

        image = os.path.join(
            APP.config['HOST'],
            vehicle.revision.annotation.photo.name
        )

        bbox = {
            'x1': vehicle.x1,
            'x2': vehicle.x2,
            'y1': vehicle.y1,
            'y2': vehicle.y2,
            'vid': vehicle.id,
            'image': image,
        }
    elif args.vid is not None and args.bbsid is None:
        vehicle = session.query(database.Vehicle) \
            .filter_by(id=args.vid) \
            .one()

        photo = vehicle.revision.annotation.photo

        image = os.path.join(
            APP.config['HOST'],
            vehicle.revision.annotation.photo.name
        )

        bbox = {
            'x1': vehicle.x1,
            'x2': vehicle.x2,
            'y1': vehicle.y1,
            'y2': vehicle.y2,
            'vid': vehicle.id,
            'image': image,
        }
    elif args.bbsid is not None:
        bbox_session = session.query(database.BoundingBoxSession) \
            .filter_by(id=args.bbsid) \
            .one()

        vehicle = bbox_session.vehicle

        photo = vehicle.revision.annotation.photo

        image = os.path.join(
            APP.config['HOST'],
            vehicle.revision.annotation.photo.name
        )

        bbox = {
            'x1': bbox_session.x1,
            'x2': bbox_session.x2,
            'y1': bbox_session.y1,
            'y2': bbox_session.y2,
            'vid': vehicle.id,
            'image': image,
        }

    if bbox is None:
        return jsonify(status='empty')
    else:
        return jsonify(status='ok', data=bbox)

if __name__ == '__main__':
    APP.run()

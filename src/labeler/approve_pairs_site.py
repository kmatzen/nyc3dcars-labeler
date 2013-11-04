#!/usr/bin/env python

"""Approve annotation pair task."""

import datetime
import os

from flask import request, jsonify
from flask.ext.restful import reqparse

import database

from sqlalchemy import func, or_, desc

from server_common import mturk_template, database_session, \
    create_app, mturk_save

APP = create_app(
    __name__,
    js_assets=[
        'js/common.js',
        'js/task.js',
        'js/basetask.js',
        'js/approve_pairs_task.js',
    ],
)


@APP.route('/')
def template():
    """Approve pairs template handler."""

    parser = reqparse.RequestParser()
    parser.add_argument('vids', type=str)
    args = parser.parse_args()

    if args.vids is not None:
        num_pairs = len(args.vids.split('-'))
    else:
        num_pairs = None

    return mturk_template(
        request.args,
        'approve_pairs',
        num_pairs=num_pairs
    )


@APP.route('/load')
@database_session()
def load(session, user):
    """Approve pairs load handler."""

    parser = reqparse.RequestParser()
    parser.add_argument('vids', None, type=str)
    parser.add_argument('apsid', None, type=int)
    args = parser.parse_args()

    if args.vids is not None:
        args.vids = [int(vid) for vid in args.vids.split('-')]
        if len(args.vids) != 2:
            return 'vids must be two elements', 400

    if args.vids is None and args.apsid is None:
        # pylint: disable-msg=E1101,E1103
        vehicle = session.query(database.Vehicle) \
            .join(database.Revision) \
            .outerjoin(database.ApprovePairToVehicleAssociation) \
            .outerjoin(database.ApprovePairSession) \
            .group_by(database.Vehicle.id) \
            .having(func.bool_and(or_(
                database.ApprovePairSession.uid != user.id,
                database.ApprovePairSession.uid == None
            ))) \
            .filter(database.Revision.final == True) \
            .filter(database.Vehicle.cropped != None) \
            .filter(database.Vehicle.partner_id != None) \
            .having(func.count(database.ApprovePairSession.id) < 1) \
            .order_by(desc(func.count(database.ApprovePairSession.id))) \
            .order_by(func.random()) \
            .first()
        # pylint: enable-msg=E1101,E1103
        if vehicle:
            image1 = os.path.join(APP.config['HOST'], vehicle.cropped)
            image2 = os.path.join(APP.config['HOST'], vehicle.partner.cropped)

            labels = {
                'vehicle1': {
                    'vid': vehicle.id,
                    'image': image1,
                },
                'vehicle2': {
                    'vid': vehicle.partner_id,
                    'image': image2,
                }
            }
        else:
            labels = None
    elif args.vids is not None and args.apsid is None:
        vehicle = session.query(database.Vehicle) \
            .filter_by(id=args.vids[0]) \
            .one()

        if vehicle.partner_id != args.vids[1]:
            return 'not a valid vid pair', 400

        image1 = os.path.join(APP.config['HOST'], vehicle.cropped)
        image2 = os.path.join(APP.config['HOST'], vehicle.partner.cropped)

        labels = {
            'vehicle1': {
                'vid': vehicle.id,
                'image': image1,
            },
            'vehicle2': {
                'vid': vehicle.partner_id,
                'image': image2,
            }
        }
    elif args.apsid is not None:
        approve_pair_session = session.query(database.ApprovePairSession) \
            .filter_by(id=args.apsid) \
            .one()

        image1 = os.path.join(
            APP.config['HOST'],
            approve_pair_session.vehicles[0].cropped
        )

        image2 = os.path.join(
            APP.config['HOST'],
            approve_pair_session.vehicles[1].cropped
        )

        labels = {
            'vehicle1': {
                'vid': approve_pair_session.vehicles[0].id,
                'image': image1,
            },
            'vehicle2': {
                'vid': approve_pair_session.vehicles[1].id,
                'image': image2,
            },
            'answer': approve_pair_session.answer
        }

    if labels is None:
        return jsonify(status='empty')
    else:
        return jsonify(status='ok', data=labels)


@APP.route('/save', methods=['POST'])
@database_session()
@mturk_save()
def save(session, user, assignment):
    """Approve pairs save handler."""

    parser = reqparse.RequestParser()
    parser.add_argument('vids', type=str, required=True)
    parser.add_argument('duration', type=int, required=True)
    parser.add_argument('answer', type=str, required=True)
    args = parser.parse_args()

    args.vids = [int(vid) for vid in args.vids.split('-')]
    if len(args.vids) != 2:
        return '2 vids required', 400

    # pylint: disable-msg=E1101
    vehicles = session.query(database.Vehicle) \
        .filter(database.Vehicle.id.in_(args.vids)) \
        .all()
    # pylint: enable-msg=E1101

    approve_pair_session = database.ApprovePairSession(
        user=user,
        vehicles=vehicles,
        creation=datetime.datetime.now(),
        assignment=assignment,
        duration=datetime.timedelta(milliseconds=args.duration),
        answer=args.answer,
    )
    session.add(approve_pair_session)

    session.flush()
    # pylint: disable-msg=E1101
    session_id = approve_pair_session.id
    # pylint: enable-msg=E1101
    session.commit()

    return jsonify(status='ok', id=session_id)

if __name__ == '__main__':
    APP.run()

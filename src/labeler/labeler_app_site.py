#!/usr/bin/env python

"""Main Labeler task."""

import uuid
import urllib
import base64
import os
import json
import datetime
import math
import tempfile

from server_common import mturk_template, create_app, \
    database_session, mturk_save

from flask import jsonify, request
from flask.ext.restful import reqparse

from PIL import Image, ImageDraw

import boto
from boto.s3.key import Key

import database

from sqlalchemy import func, or_

APP = create_app(
    __name__,
    js_assets=[
        'js/three.min.js',
        'js/common.js',
        'js/task.js',
        'js/basetask.js',
        'js/labeler_task.js',
    ],
)


@APP.route('/')
def template():
    """Labeler template handler."""

    return mturk_template(request.args, 'labeler')


@APP.route('/load')
@database_session()
def load(session, user):
    """Labeler load handler."""

    parser = reqparse.RequestParser()
    parser.add_argument('pid', None, type=int)
    parser.add_argument('rid', None, type=int)
    args = parser.parse_args()

    if args.pid is not None and args.rid is not None:
        return 'only pid or rid allowed', 400

    if args.pid is None and args.rid is None:
        # pylint: disable-msg=E1101,E1103
        photo = session.query(database.Photo) \
            .outerjoin(database.Annotation) \
            .group_by(database.Photo.id) \
            .having(func.bool_and(or_(
                database.Annotation.uid != user.id,
                database.Annotation.uid == None))) \
            .having(func.count(database.Annotation.id) < 2) \
            .order_by(func.random()) \
            .filter(database.Photo.seesground == True) \
            .first()
        # pylint: enable-msg=E1101,E1103

        cameraheight = photo.aboveground if photo.aboveground > 0 else 1.75

        if photo:
            result = {
                'cameraheight': cameraheight,
                'cars': [],
            }
    elif args.pid and not args.rid:
        photo = session.query(database.Photo) \
            .filter_by(id=args.pid) \
            .one()
        cameraheight = photo.aboveground if photo.aboveground > 0 else 1.75
        result = {
            'cameraheight': cameraheight,
            'cars': [],
        }
    elif args.rid:
        revision = session.query(database.Revision) \
            .filter_by(id=args.rid) \
            .one()

        photo = revision.annotation.photo

        cameraheight = photo.aboveground if photo.aboveground > 0 else 1.75
        result = {
            'cameraheight': cameraheight,
            'cars': [],
        }
        cars = []
        for vehicle in revision.vehicles:
            car = {
                'x': vehicle.x,
                'z': vehicle.z,
                'theta': vehicle.theta,
                'type': vehicle.type,
            }
            cars += [car]
        result = {
            'cameraheight': revision.cameraheight,
            'cars': cars,
            'comment': revision.comment,
        }
        for flag in revision.annotation.flags:
            result['reason'] = flag.reason

    if photo is None:
        return jsonify(status='empty')
    else:
        fov = math.degrees(2 * math.atan2(photo.height, 2 * photo.focal))
        data = {
            'id': photo.id,
            'image': os.path.join(APP.config['HOST'], photo.name),
            'width': photo.width,
            'height': photo.height,
            'focal': photo.focal,
            'upx': photo.r21,
            'upy': photo.r22,
            'upz': -photo.r23,
            'forwardx': -photo.r31,
            'forwardy': -photo.r32,
            'forwardz': photo.r33,
            'lat': photo.lat,
            'lon': photo.lon,
            'fov': fov,
            'aspect': float(photo.width) / photo.height,
            'result': result,
        }

        return jsonify(status='ok', data=data)


@APP.route('/save', methods=['POST'])
@database_session()
@mturk_save()
def save(session, user, assignment):
    """Labeler save handler."""

    parser = reqparse.RequestParser()
    parser.add_argument('pid', type=int)
    parser.add_argument('rid', type=int)
    parser.add_argument('duration', type=int, required=True)
    parser.add_argument('cameraheight', type=float, required=True)
    parser.add_argument('cars', type=str, required=True)
    parser.add_argument('screenshot', type=str, required=True)
    parser.add_argument('final', type=bool, required=True)
    parser.add_argument('comment', type=str, required=True)
    args = parser.parse_args()

    if args.pid is not None and args.rid is not None:
        return 'only pid or rid allowed', 400

    if args.rid is None and args.pid is None:
        return 'rid or pid required', 400

    args.cars = json.loads(args.cars)

    if args.rid is not None:
        parent_revision = session.query(database.Revision) \
            .filter_by(id=args.rid) \
            .one()

        latest_revision = session.query(database.Revision) \
            .filter_by(parent_id=args.rid) \
            .first()

        if latest_revision is not None:
            return 'client is out of date', 400

        annotation = parent_revision.annotation

    else:
        annotation = database.Annotation(
            pid=args.pid,
            user=user,
        )
        session.add(annotation)

        parent_revision = None

    revision = database.Revision(
        annotation=annotation,
        cameraheight=args.cameraheight,
        creation=datetime.datetime.now(),
        duration=datetime.timedelta(milliseconds=args.duration),
        parent=parent_revision,
        final=args.final,
        comment=args.comment,
        assignment=assignment,
    )

    conn = boto.connect_s3(
        aws_access_key_id=APP.config['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=APP.config['AWS_SECRET_ACCESS_KEY'],
    )
    s3bucket = conn.lookup(APP.config['BUCKET'])
    k = Key(s3bucket)
    k.key = os.path.join(
        'screenshots',
        '%s.png' % uuid.uuid4(),
    )
    k.set_contents_from_string(args.screenshot)
    k.set_acl('public-read')
    revision.screenshot = k.key

    for car in args.cars:
        vehicle = database.Vehicle(
            type=car['type'],
            x=car['x'],
            z=car['z'],
            theta=car['theta'],
            x1=car['x1'],
            x2=car['x2'],
            y1=car['y1'],
            y2=car['y2'],
            revision=revision,
            bbox_priority=10,
        )

        # pylint: disable-msg=E1101
        vehicle.truncated = 1 - \
            (min(1, vehicle.x2) - max(0, vehicle.x1)) * \
            (min(1, vehicle.y2) - max(0, vehicle.y1)) / \
            ((vehicle.x2 - vehicle.x1) * (vehicle.y2 - vehicle.y1))
        # pylint: enable-msg=E1101
        session.add(vehicle)

    session.add(revision)

    session.flush()
    session.commit()

    with tempfile.NamedTemporaryFile(suffix='.jpg') as file_in:
        # pylint: disable-msg=E1101
        photo = revision.annotation.photo
        # pylint: enable-msg=E1101
        k = Key(s3bucket)
        k.key = photo.name
        k.get_contents_to_filename(file_in.name)
        image_in = Image.open(file_in.name)
        APP.logger.info(photo.name)
        APP.logger.info(file_in.name)

        for vehicle in revision.vehicles:
            if vehicle.cropped is not None:
                continue

            copy = image_in.copy()
            draw = ImageDraw.Draw(copy)

            x1 = vehicle.x1
            x2 = vehicle.x2
            y1 = vehicle.y1
            y2 = vehicle.y2

            width, height = copy.size
            box_width = width * (x2 - x1)
            box_height = height * (y2 - y1)
            box_x1 = int(math.ceil(
                max(0, min(width - 1, width * x1 - 0.25 * box_width))
            ))
            box_x2 = int(math.floor(
                max(0, min(width - 1, width * x2 + 0.25 * box_width))
            ))
            box_y1 = int(math.ceil(
                max(0, min(height - 1, height * y1 - 0.25 * box_height))
            ))
            box_y2 = int(math.floor(
                max(0, min(height - 1, height * y2 + 0.25 * box_height))
            ))
            if box_x1 == box_x2 or box_y1 == box_y2:
                box_x1 = 0
                box_x2 = 1
                box_y1 = 0
                box_y2 = 1
            draw.rectangle(
                (width * x1, height * y1, width * x2, height * y2),
                outline='red'
            )
            del draw
            cropped = copy.crop((box_x1, box_y1, box_x2, box_y2))

            with tempfile.NamedTemporaryFile(suffix='.jpg') as file_out:
                cropped.save(file_out.name, quality=90)
                k = Key(s3bucket)
                k.key = os.path.join('labels', '%d.jpg' % vehicle.id)
                k.content_type = 'image/png'
                k.set_contents_from_file(file_out)
                k.set_acl('public-read')
                vehicle.cropped = k.key

    session.flush()
    session.commit()

    # pylint: disable-msg=E1101
    return jsonify(status='ok', id=revision.id)
    # pylint: enable-msg=E1101


@APP.route('/flag', methods=['POST'])
@database_session()
def flagger(session, user):
    """Labeler flag handler."""

    parser = reqparse.RequestParser()
    parser.add_argument('pid', type=int)
    parser.add_argument('rid', type=int)
    parser.add_argument('reason', type=str, required=True)
    args = parser.parse_args()

    if args.rid is None and args.pid is None:
        return 'rid or pid is required', 400

    if args.rid is not None:
        revision = session.query(database.Revision) \
            .filter_by(id=args.rid) \
            .one()

        annotation = revision.annotation
    else:
        annotation = database.Annotation(
            pid=args.pid,
            user=user,
        )
        session.add(annotation)

    flag = database.Flag(
        annotation=annotation,
        reason=args.reason
    )

    session.add(flag)

    session.flush()
    # pylint: disable-msg=E1101
    session_id = flag.id
    # pylint: enable-msg=E1101
    session.commit()

    return jsonify(status='ok', id=session_id)


@APP.route('/screenshot', methods=['POST'])
def screenshot():
    """Submit screenshot to server."""

    parser = reqparse.RequestParser()
    parser.add_argument('screenshot', type=str, required=True)
    args = parser.parse_args()

    conn = boto.connect_s3(
        aws_access_key_id=APP.config['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=APP.config['AWS_SECRET_ACCESS_KEY'],
    )
    s3bucket = conn.lookup(APP.config['BUCKET'])
    k = Key(s3bucket)
    k.key = os.path.join(
        'problem_screenshots',
        '%s.png' % str(datetime.datetime.now())
    )
    prefix, data = args.screenshot.split(',')
    if prefix != 'data:image/png;base64':
        return 'wrong prefix', 400
    decoded = base64.b64decode(data)
    k.set_contents_from_string(decoded)
    k.set_acl('public-read')

    image = os.path.join(APP.config['HOST'], urllib.quote(k.key))

    data = {'image': image}

    return jsonify(status='ok', data=data)

if __name__ == '__main__':
    APP.run()

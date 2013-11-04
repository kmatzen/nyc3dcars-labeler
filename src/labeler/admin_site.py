#!/usr/bin/env python

"""An MTurk administration console."""

import struct
import hashlib
import time
import base64
import hmac
import datetime
import itertools

from flask import jsonify, render_template
from flask.ext.restful import reqparse

import database

from sqlalchemy import func, desc

from server_common import facebook_authenticate, database_session, \
    create_app, get_mturk_connection

from boto.mturk.question import ExternalQuestion
from boto.mturk.qualification import NumberHitsApprovedRequirement, \
    PercentAssignmentsApprovedRequirement, \
    Qualifications
from boto.mturk.connection import MTurkRequestError

APP = create_app(
    __name__,
    js_assets=[
        'js/common.js',
        'js/admin.js',
    ],
)


def authenticate(secretkey, code_attempt):
    """Enables PIN-based 2 factor auth."""

    now = int(time.time() / 30)

    secretkey = base64.b32decode(secretkey)

    # try 30 seconds behind and ahead as well
    for offset in [-1, 0, 1]:
        # convert timestamp to raw bytes
        packed = struct.pack(">q", now + offset)

        # generate HMAC-SHA1 from timestamp based on secret key
        hashed = hmac.HMAC(secretkey, packed, hashlib.sha1).digest()

        # extract 4 bytes from digest based on LSB
        offset = ord(hashed[-1]) & 0x0F
        truncated_hash = hashed[offset:offset + 4]

        # get the code from it
        code = struct.unpack(">L", truncated_hash)[0]
        code &= 0x7FFFFFFF
        code %= 1000000

        if code == code_attempt:
            return True

    return False


def batcher(iterable, num):
    """Breaks iterable into pieces of size num."""

    args = [iter(iterable)] * num
    return [[b for b in a if b] for a in itertools.izip_longest(*args)]


def create_vehicle_hit_num(num):
    """Creates a vehicle hit using a specified number of
       vehicles in each task."""

    def create_vehicle_hit(session, connection, hittype, db_type,
                           quota, batch, limit, name):
        """Creates a vehicle-based hit."""
        # pylint: disable-msg=E1101
        count = func.count(db_type.id)

        vehicles = session.query(database.Vehicle,
                                 database.Vehicle.id.label('vid'),
                                 count.label('count')) \
            .select_from(database.Vehicle) \
            .join(database.Revision) \
            .outerjoin(db_type) \
            .filter(database.Revision.final == True) \
            .group_by(database.Vehicle.id) \
            .order_by(count) \
            .having(count < quota) \
            .order_by(func.random())
        # pylint: enable-msg=E1101

        vehicles = vehicles.limit(num * batch * limit)

        base_url = APP.config['SITE'] + name + '/tasks/__TURKER__/edit/'
        for vehicle_batch in batcher(vehicles, num * batch):
            small_batches = batcher(vehicle_batch, num)
            sets = ['-'.join(str(a.vid) for a in s) for s in small_batches]
            vids = ','.join(sets)

            url = base_url + vids
            question = ExternalQuestion(external_url=url, frame_height=800)
            lifetime = datetime.timedelta(days=1)
            max_assignments = quota - \
                min(vehicle.count for vehicle in vehicle_batch)
            # pylint: disable-msg=E1101,E1103
            response = connection.create_hit(
                hittype.hittypeid,
                question=question,
                lifetime=lifetime,
                max_assignments=max_assignments
            )
            # pylint: enable-msg=E1101,E1103
            hit = database.HIT(
                hitid=response[0].HITId,
                HITType=hittype,
                creation=datetime.datetime.now(),
                lifetime=lifetime,
                max_assignments=max_assignments,
                vehicles=[vehicle[0] for vehicle in vehicle_batch],
            )
            session.add(hit)
    return create_vehicle_hit


def create_approve_pair_hit(session, connection, hittype, db_type,
                            quota, batch, limit, name):
    """Creates a hit specialized for pairs of vehicles."""

    # pylint: disable-msg=E1101
    count = func.count(database.ApprovePairSession.id)

    vehicles = session.query(database.Vehicle,
                             count.label('count')) \
        .select_from(database.Vehicle) \
        .join(database.Revision) \
        .outerjoin(database.ApprovePairToVehicleAssociation) \
        .outerjoin(database.ApprovePairSession) \
        .group_by(database.Vehicle) \
        .order_by(count) \
        .having(count < quota) \
        .order_by(func.random()) \
        .filter(database.Vehicle.cropped != None) \
        .filter(database.Vehicle.partner_id != None) \
        .filter(database.Revision.final == True)
    # pylint: enable-msg=E1101

    vehicles = vehicles.limit(batch * limit)

    base_url = APP.config['SITE'] + 'approve_pairs/tasks/__TURKER__/edit/'
    for vehicle_batch in batcher(vehicles, batch):
        vids = ','.join(
            '%d-%d' % (vehicle.id, vehicle.partner_id)
            for vehicle, count in vehicle_batch
        )

        url = base_url + vids
        question = ExternalQuestion(external_url=url, frame_height=800)
        lifetime = datetime.timedelta(days=1)
        max_assignments = quota - \
            min(count for vehicle, count in vehicle_batch)
        # pylint: disable-msg=E1101,E1103
        response = connection.create_hit(
            hittype.hittypeid,
            question=question,
            lifetime=lifetime,
            max_assignments=max_assignments
        )
        # pylint: enable-msg=E1101,E1103
        hit = database.HIT(
            hitid=response[0].HITId,
            HITType=hittype,
            creation=datetime.datetime.now(),
            lifetime=lifetime,
            max_assignments=max_assignments,
            vehicles=[vehicle for vehicle, count in vehicle_batch],
        )
        session.add(hit)


def create_photo_hit(session, connection, hittype, db_type,
                     quota, batch, limit, name):
    """Creates a photo-based HIT."""

    # pylint: disable-msg=E1101
    count = func.count(db_type.id)

    photos = session.query(database.Photo,
                           database.Photo.id.label('pid'),
                           count.label('count')) \
        .select_from(database.Photo) \
        .outerjoin(db_type) \
        .group_by(database.Photo.id) \
        .order_by(count) \
        .having(count < quota) \
        .order_by(func.random()) \
        .filter(database.Photo.seesground == True)
    # pylint: enable-msg=E1101

    photos = photos.limit(batch * limit)

    base_url = APP.config['SITE'] + name + '/tasks/__TURKER__/edit/'
    for photo_batch in batcher(photos, batch):
        url = base_url + ','.join(str(photo.pid) for photo in photo_batch)
        question = ExternalQuestion(external_url=url, frame_height=800)
        lifetime = datetime.timedelta(days=1)
        max_assignments = quota - \
            min(photo.count for photo in photo_batch)
        # pylint: disable-msg=E1101,E1103
        response = connection.create_hit(
            hittype.hittypeid,
            question=question,
            lifetime=lifetime,
            max_assignments=max_assignments
        )
        # pylint: enable-msg=E1101,E1103
        hit = database.HIT(
            hitid=response[0].HITId,
            HITType=hittype,
            creation=datetime.datetime.now(),
            lifetime=lifetime,
            max_assignments=max_assignments,
            photos=[photo[0] for photo in photo_batch],
        )
        session.add(hit)


@APP.route('/order', methods=['POST'])
@facebook_authenticate()
@database_session(fetch_user=False)
def order(session):
    """Order new MTurk HITs."""

    parser = reqparse.RequestParser()
    parser.add_argument('title', type=str, required=True)
    parser.add_argument('description', type=str, required=True)
    parser.add_argument('task', type=str, required=True)
    parser.add_argument('keywords', type=str, required=True)
    parser.add_argument('reward', type=float, required=True)
    parser.add_argument('duration', type=int, required=True)
    parser.add_argument('quota', type=int, required=True)
    parser.add_argument('limit', type=int, required=True)
    parser.add_argument('batch', type=int, required=True)
    #parser.add_argument('pin', None, type=int)
    #parser.add_argument('approval_delay', type=str)
    parser.add_argument('sandbox', type=str, required=True)
    args = parser.parse_args()

    if not args.sandbox:
        if args.pin is None:
            return 'pin required', 400

        if not authenticate(APP.config['TWO_FACTOR_SECRET'], args.pin):
            return 'authentication failed', 400

    connection = get_mturk_connection(args.sandbox)

    duration = datetime.timedelta(minutes=args.duration)

    hittype = session.query(database.HITType) \
        .filter_by(
            title=args.title,
            description=args.description,
            keywords=args.keywords,
            reward=args.reward,
            duration=duration,
            approval_delay=None,
            sandbox=args.sandbox
        ).first()

    if hittype is None:
        if args.sandbox:
            qual_req = None
        else:
            num_approved = NumberHitsApprovedRequirement(
                'GreaterThanOrEqualTo',
                1000
            )
            percent_approved = PercentAssignmentsApprovedRequirement(
                'GreaterThanOrEqualTo',
                97
            )

            qual_req = Qualifications([
                num_approved,
                percent_approved,
            ])

        hit_type = connection.register_hit_type(
            title=args.title,
            description=args.description,
            reward=args.reward,
            duration=60 * args.duration,
            keywords=args.keywords,
            approval_delay=None,
            qual_req=qual_req,
        )
        hittype = database.HITType(
            hittypeid=hit_type[0].HITTypeId,
            title=args.title,
            description=args.description,
            keywords=args.keywords,
            reward=args.reward,
            duration=duration,
            approval_delay=None,
            sandbox=args.sandbox,
            ignore=False,
        )
        session.add(hittype)

    hittype.ignore = False

    db_type = {
        'clicker': database.ClickSession,
        'bbox': database.BoundingBoxSession,
        'approve_pairs': database.ApprovePairSession,
        'labeler': database.Annotation,
        'occlusion': database.OcclusionRanking,
        'daynight': database.DayNight,
    }[args.task]

    hit_factory = {
        'clicker': create_photo_hit,
        'bbox': create_vehicle_hit_num(1),
        'approve_pairs': create_approve_pair_hit,
        'labeler': create_photo_hit,
        'occlusion': create_vehicle_hit_num(24),
        'daynight': create_photo_hit,
    }[args.task]

    hit_factory(
        session,
        connection,
        hittype,
        db_type,
        args.quota,
        args.batch,
        args.limit,
        args.task,
    )

    session.flush()
    # pylint: disable-msg=E1101,E1103
    hittype_id = hittype.id
    # pylint: enable-msg=E1101,E1103
    session.commit()

    return jsonify(status='ok', id=hittype_id)


@APP.route('/workers/')
@APP.route('/workers/<username>')
@facebook_authenticate()
@database_session(fetch_user=False)
def worker(session, username=None):
    """Fetch worker details."""

    users = session.query(database.User)

    if username is not None:
        users = users.filter_by(username=username)

    """
    hittypes = session.query(database.HITType) \
        .join(database.HIT) \
        .join(database.Assignment) \
        .filter(database.Assignment.uid == uid)

    result = {'username':user.username,'hittypes':[]}
    for hittype in hittypes:
        assignments = session.query(database.Assignment) \
            .join(database.HIT) \
            .filter(database.HIT.htid == hittype.id) \
            .filter(database.Assignment.uid == uid)

        stats = session.query(
            func.count(database.Assignment.id).label('count'),
            database.Assignment.status.label('status')) \
            .join(database.HIT) \
            .filter(database.HIT.htid == hittype.id) \
            .filter(database.Assignment.uid == uid) \
            .group_by(database.Assignment.status)

        status = {stat.status:stat.count for stat in stats}

        hittype_result = {
            'duration':hittype.duration.total_seconds(),
            'reward':hittype.reward,
            'sandbox':hittype.sandbox,
            'description':hittype.description,
            'title':hittype.title,
            'keywords':hittype.keywords,
            'htid':hittype.id,
            'groupid':hittype.hittypeid,
            'Submitted':0,
            'Approved':0,
            'Rejected':0,
            'Pending':0,
        }

        for k in status:
            hittype_result[k] = status[k]
        hittype_result['count'] = sum(status[k] for k in status)

        hittype_result['assignments'] = []
        for assignment in assignments:
            assignment_result = {
                'username':user.username,
                'assignmentid':assignment.assignmentid,
                'asid':assignment.id,
                'status':assignment.status,
                'csids':[cs.id for cs in assignment.click_sessions],
                'apsids':[aps.id for aps in assignment.approve_pair_sessions],
                'bbsids':[bbs.id for bbs in assignment.bbox_sessions],
                'dnid':None if assignment.daynight is None else assignment.daynight.id,
                'osid':None if assignment.occlusion_session is None else assignment.occlusion_session.id,
                'rid':None if assignment.annotation is None else assignment.annotation.id,
            }
            hittype_result['assignments'] += [assignment_result]

        result['hittypes'] += [hittype_result]
    """
    result = [
        {
            'id': user.username,
            'lastactivity': str(user.lastactivity),
            'trust': user.trust,
        }
        for user in users]

    if username is not None:
        result = result[0]

    return jsonify(status='ok', data=result)


@APP.route('/jobs/<int:job_id>/assignments')
@facebook_authenticate()
@database_session(fetch_user=False)
def fetch_assignments(session, job_id):
    """Fetch all assignments for job."""

    parser = reqparse.RequestParser()
    parser.add_argument('limit', None, type=int)
    parser.add_argument('offset', None, type=int)
    parser.add_argument('type', None, type=str)
    args = parser.parse_args()

    # pylint: disable-msg=E1101
    assignments = session.query(database.Assignment) \
        .join(database.HIT) \
        .join(database.HITType) \
        .filter(database.HITType.id == job_id) \
        .filter(database.Assignment.abandoned == False)

    if args.type is not None:
        assignments = assignments.filter(
            database.Assignment.status == args.type
        )

    assignments = assignments.order_by(desc(database.Assignment.id))
    # pylint: enable-msg=E1101

    if args.limit is not None:
        assignments = assignments.limit(args.limit)

    if args.offset is not None:
        assignments = assignments.offset(args.offset)

    data = []

    for assignment in assignments:
        result = {
            'id': assignment.id,
            'uid': assignment.user.id,
            'username': assignment.user.username,
            'status': assignment.status,
            'csids': [cs.id for cs in assignment.click_sessions],
            'bbsids': [bbs.id for bbs in assignment.bbox_sessions],
            'apsids': [aps.id for aps in assignment.approve_pair_sessions],
            'dnid': [p.id for p in assignment.daynights],
            'osid': [p.id for p in assignment.occlusion_sessions],
            'rid': [p.id for p in assignment.revisions],
        }
        data += [result]

    return jsonify(status='ok', data=data)


@APP.route('/hittypes/<int:hittype_id>/expire', methods=['POST'])
@facebook_authenticate()
@database_session(fetch_user=False)
def expire_hittype(session, hittype_id):
    """Expire all HITs for HIT type."""

    hittype = session.query(database.HITType) \
        .filter_by(id=hittype_id) \
        .one()

    connection = get_mturk_connection(hittype.sandbox)

    raise NotImplementedError()

    return jsonify(status='ok', id=hittype_id)


@APP.route('/hittypes/<int:hittype_id>/approve', methods=['POST'])
@database_session(fetch_user=False)
def approve_hittype(session, hittype_id):
    """Approve all HITs for HIT type."""

    hittype = session.query(database.HITType) \
        .filter_by(id=hittype_id) \
        .one()

    connection = get_mturk_connection(hittype.sandbox)

    for hit in hittype.hits:
        for assignment in hit.assignments:
            if assignment.status != 'Approved':
                try:
                    connection.approve_assignment(assignment.assignmentid)

                    assignment.status = 'Approved'
                    assignment.abandoned = False
                except MTurkRequestError:
                    pass

    session.flush()
    session.commit()

    return jsonify(status='ok', id=hittype_id)


@APP.route('/assignments/<int:assignment_id>/approve', methods=['POST'])
@facebook_authenticate()
@database_session(fetch_user=False)
def approve_assignment(session, assignment_id):
    """Approve a single assignment."""

    assignment = session.query(database.Assignment) \
        .filter_by(id=assignment_id) \
        .one()

    connection = get_mturk_connection(assignment.HIT.HITType.sandbox)

    connection.approve_assignment(assignment.assignmentid)

    assignment.status = 'Approved'
    assignment.abandoned = False

    session.flush()
    session.commit()

    return jsonify(status='ok', id=assignment_id)


@APP.route('/assignments/<int:assignment_id>/reject', methods=['POST'])
@facebook_authenticate()
@database_session(fetch_user=False)
def reject(session, assignment_id):
    """Reject an assignment."""

    assignment = session.query(database.Assignment) \
        .filter_by(id=assignment_id) \
        .one()

    connection = get_mturk_connection(assignment.HIT.HITType.sandbox)

    connection.reject_assignment(assignment.assignmentid)

    assignment.status = 'Rejected'
    assignment.abandoned = False

    session.flush()
    session.commit()

    return jsonify(status='ok', id=assignment_id)


@APP.route('/hittypes/<int:hittype_id>/delete', methods=['POST'])
@facebook_authenticate()
@database_session(fetch_user=False)
def delete_hittype(session, hittype_id):
    """Delete an entire HIT type."""

    hittype = session.query(database.HITType) \
        .filter_by(id=hittype_id) \
        .one()

    hittype.ignore = True

    session.flush()
    session.commit()

    return jsonify(status='ok', id=hittype_id)


@APP.route('/jobs/')
@facebook_authenticate()
@database_session(fetch_user=False)
def fetch_jobs(session):
    """Fetch all jobs."""

    hittypes = session.query(database.HITType) \
        .filter_by(ignore=False)

    jobs = []

    for hittype in hittypes:
        # pylint: disable-msg=E1101
        state_counts = session.query(
            func.count(database.Assignment.id).label('count'),
            database.Assignment.status.label('status')) \
            .join(database.HIT) \
            .filter(database.HIT.htid == hittype.id) \
            .filter(database.Assignment.abandoned == False) \
            .group_by(database.Assignment.status)
        # pylint: enable-msg=E1101

        states = {
            'Approved': 0,
            'Rejected': 0,
            'Submitted': 0,
            'Pending': 0
        }

        for state_count in state_counts:
            states[state_count.status] = state_count.count

        # pylint: disable-msg=E1101
        count, = session.query(
            func.sum(database.HIT.max_assignments)) \
            .filter(database.HIT.htid == hittype.id)
        # pylint: enable-msg=E1101

        job = {
            'Submitted': states['Submitted'],
            'Approved': states['Approved'],
            'Rejected': states['Rejected'],
            'Pending': states['Pending'],
            'count': count,
            'groupid': hittype.hittypeid,
            'id': hittype.id,
            'description': hittype.description,
            'reward': hittype.reward,
            'title': hittype.title,
            'keywords': hittype.keywords,
            'duration': hittype.duration.total_seconds(),
            'sandbox': hittype.sandbox
        }

        jobs += [job]

    return jsonify(status='ok', data=jobs)


@APP.route('/jobs/<int:job_id>')
@facebook_authenticate()
@database_session(fetch_user=False)
def fetch_job(session, job_id=None):
    """Fetch a single job."""

    hittype = session.query(database.HITType) \
        .filter_by(id=job_id) \
        .one()

    # pylint: disable-msg=E1101
    state_counts = session.query(
        func.count(database.Assignment.id).label('count'),
        database.Assignment.status.label('status')) \
        .join(database.HIT) \
        .filter(database.HIT.htid == hittype.id) \
        .filter(database.Assignment.abandoned == False) \
        .group_by(database.Assignment.status)
    # pylint: enable-msg=E1101

    states = {
        'Approved': 0,
        'Rejected': 0,
        'Submitted': 0,
        'Pending': 0
    }

    for state_count in state_counts:
        states[state_count.status] = state_count.count

    # pylint: disable-msg=E1101
    count, = session.query(
        func.sum(database.HIT.max_assignments)) \
        .filter(database.HIT.htid == hittype.id)

    assignments = session.query(database.Assignment.id) \
        .join(database.HIT) \
        .filter(database.HIT.htid == job_id) \
        .filter(database.Assignment.abandoned == False)
    # pylint: enable-msg=E1101

    job = {
        'Submitted': states['Submitted'],
        'Approved': states['Approved'],
        'Rejected': states['Rejected'],
        'Pending': states['Pending'],
        'count': count,
        'groupid': hittype.hittypeid,
        'id': hittype.id,
        'description': hittype.description,
        'reward': hittype.reward,
        'title': hittype.title,
        'keywords': hittype.keywords,
        'duration': hittype.duration.total_seconds(),
        'sandbox': hittype.sandbox,
        'assignment_ids': [a.id for a in assignments],
    }

    return jsonify(status='ok', data=job)


@APP.route('/')
def template():
    """Admin template handler."""

    return render_template(
        'admin.html', 
        FACEBOOK_APP_ID=APP.config['FACEBOOK_APP_ID']
    )

if __name__ == '__main__':
    APP.run()

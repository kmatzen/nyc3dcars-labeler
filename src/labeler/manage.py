#!/usr/bin/env python

"""Flask-script management script."""

import dateutil.parser
import datetime
import database
import math

from server_common import database_session, get_mturk_connection
from sqlalchemy import func, desc

from flask.ext.script import Manager

from admin_site import APP

MANAGER = Manager(APP)

def overlap(geom_a, geom_b):
    """Computes the overlap between two bounding boxes."""

    intersection_score = intersection(geom_a, geom_b)
    area1 = (geom_a.x2 - geom_a.x1) * (geom_a.y2 - geom_a.y1)
    area2 = (geom_b.y2 - geom_b.y1) * (geom_b.x2 - geom_b.x1)
    union_score = area1 + area2 - intersection_score
    overlap_score = intersection_score / union_score

    return overlap_score

def intersection(geom_a, geom_b):
    """Computes the interesction of two bounding boxes."""

    intersection_score = func.greatest(0,
                                       (func.least(geom_a.x2, geom_b.x2) -
                                        func.greatest(geom_a.x1, geom_b.x1))) * \
        func.greatest(0,
                      (func.least(geom_a.y2, geom_b.y2) -
                       func.greatest(geom_a.y1, geom_b.y1)))

    return intersection_score


def union(geom_a, geom_b):
    """Computes the union of two bounding boxes."""

    intersection_score = intersection(geom_a, geom_b)
    area1 = (geom_a.x2 - geom_a.x1) * (geom_a.y2 - geom_a.y1)
    area2 = (geom_b.y2 - geom_b.y1) * (geom_b.x2 - geom_b.x1)
    union_score = area1 + area2 - intersection_score

    return union_score

def delete_mturk (session, obj, allow):
    """Deletes an MTurk assignment, if allowed."""

    if obj.assignment is not None:
        if allow:
            session.delete(obj.assignment)
        else:
            raise Exception('Cannot delete user - Has MTurk assignments')

def map_vehicles(session, a, b):
    """Computes association between vehicle annotations."""

    mapping = {}

    for vehicle in a.vehicles:
        overlap_score = overlap(vehicle, database.Vehicle)

        if len(b.vehicles) == 0:
            mapping[vehicle.id] = None
            continue

        selected = session.query(database.Vehicle) \
            .filter(database.Vehicle.id.in_([elt.id for elt in b.vehicles])) \
            .filter(overlap_score > 0.7) \
            .filter(database.Vehicle.type == vehicle.type) \
            .filter(func.acos(func.cos((database.Vehicle.theta - vehicle.theta)/180*math.pi)) < math.radians(10)) \
            .order_by(desc(overlap_score)) \
            .first()

        mapping[vehicle.id] = None if not selected else selected.id

    return mapping

@MANAGER.command
@database_session(fetch_user=False, return_random_error=False)
def pair_vehicles(session):
    """Build annotation-to-annotation correspondence."""

    photos = session.query(database.Photo) \
        .join(database.Annotation) \
        .join(database.Revision) \
        .filter(database.Revision.final == True) \
        .group_by(database.Photo.id) \
        .having(func.count(database.Annotation.id) == 2)

    for photo in photos:
        revisions = session.query(database.Revision) \
            .join(database.Annotation) \
            .filter(database.Annotation.pid == photo.id) \
            .filter(database.Revision.final == True) \
            .all()

        assert(len(revisions) == 2)

        a_to_b = map_vehicles(session, revisions[0], revisions[1])

        b_to_a = map_vehicles(session, revisions[1], revisions[0])

        for a in a_to_b:
            b = a_to_b[a]
            if not b:
                continue
            newa = b_to_a[b]

            vehicle_a = session.query(database.Vehicle) \
                .filter(database.Vehicle.id == a) \
                .one()

            if vehicle_a.partner_id:
                assert vehicle_a.partner_id == b
            else:
                assert vehicle_a.partner_id is None
                vehicle_a.partner_id = b

            vehicle_b = session.query(database.Vehicle) \
                .filter(database.Vehicle.id == b) \
                .one()

            if vehicle_b.partner_id:
                assert vehicle_b.partner_id == a
            else:
                assert vehicle_b.partner_id is None
                vehicle_b.partner_id = a

    session.commit()


@MANAGER.option('--username', type=str)
@MANAGER.option('--allow-mturk', action='store_true')
@database_session(fetch_user=False, return_random_error=False)
def delete_user(session, username, allow_mturk):
    """Deletes a user from the system."""

    user = session.query(database.User) \
        .filter_by(username=username) \
        .one()

    for bbox_session in user.bbox_sessions:
        delete_mturk(session, bbox_session, allow_mturk)
        session.delete(bbox_session)

    for annotation in user.annotations:
        for revision in annotation.revisions:
            delete_mturk(session, revision, allow_mturk)
            session.delete(revision)
        session.delete(annotation)
    
    for problem in user.problems:
        session.delete(problem)

    for daynight in user.daynights:
        delete_mturk(session, daynight, allow_mturk)
        session.delete(daynight)

    for click_session in user.clicksessions:
        for click in click_session.clicks:
            session.delete(click)
        delete_mturk(session, click_session, allow_mturk)
        session.delete(click_session)

    for approve_pair_session in user.approve_pair_sessions:
        delete_mturk(session, approve_pair_session, allow_mturk)
        session.delete(approve_pair_session)

    for occlusion_session in user.occlusionsessions:
        for occlusion_ranking in occlusion_session.occlusions:
            session.delete(occlusion_ranking)
        delete_mturk(session, occlusion_session, allow_mturk)
        session.delete(occlusion_session)

    session.delete(user)

    session.flush()
    session.commit()

@MANAGER.command
@database_session(fetch_user=False, return_random_error=False)
def print_users(session):
    """Prints a lits of users in the system."""

    users = session.query(database.User)

    for user in users:
        print(user.username)

@MANAGER.option('--sandbox', action='store_true')
@database_session(fetch_user=False, return_random_error=False)
def gc_pending(session, sandbox):
    """Goes though our DB and purges any non-existant pending assignments."""

    connection = get_mturk_connection(sandbox)

    # pylint: disable-msg=E1101
    labeler_assignments = session.query(database.Assignment) \
        .join(database.HIT) \
        .join(database.HITType) \
        .filter(database.Assignment.status == 'Pending') \
        .filter(database.HITType.sandbox == sandbox)
    # pylint: enable-msg=E1101

    for labeler_assignment in labeler_assignments:
        try:
            connection.get_assignment(labeler_assignment.assignmentid)
        except:
            labeler_assignment.abandoned = True

    session.flush()
    session.commit()


@MANAGER.option('--sandbox', action='store_true')
@database_session(fetch_user=False, return_random_error=False)
def sync_mturk(session, sandbox):
    """Imports the current state of mturk to make sure we are in sync."""

    connection = get_mturk_connection(sandbox)

    mturk_hits = connection.get_all_hits()

    for mturk_hit in mturk_hits:
        labeler_hittype = session.query(database.HITType) \
            .filter_by(hittypeid=mturk_hit.HITTypeId) \
            .first()

        if labeler_hittype is None:
            print('Creating HITType ' + mturk_hit.HITTypeId)

            labeler_hittype = database.HITType(
                hittypeid=mturk_hit.HITTypeId,
                title=mturk_hit.Title,
                description=mturk_hit.Description,
                reward=float(mturk_hit.Amount),
                duration=datetime.timedelta(
                    seconds=int(mturk_hit.AssignmentDurationInSeconds)
                ),
                keywords=mturk_hit.Keywords,
                approval_delay=datetime.timedelta(
                    seconds=int(mturk_hit.AutoApprovalDelayInSeconds)
                ),
                sandbox=sandbox,
            )

            session.add(labeler_hittype)

        labeler_hit = session.query(database.HIT) \
            .filter_by(hitid=mturk_hit.HITId) \
            .first()

        if labeler_hit is None:
            print('Creating HIT ' + mturk_hit.HITId)
            creation = dateutil.parser.parse(mturk_hit.CreationTime)
            expiration = dateutil.parser.parse(mturk_hit.Expiration)
            labeler_hit = database.HIT(
                hitid=mturk_hit.HITId,
                creation=creation,
                lifetime=expiration - creation,
                max_assignments=mturk_hit.MaxAssignments,
                HITType=labeler_hittype,
            )
            session.add(labeler_hit)

        mturk_assignments = connection.get_assignments(mturk_hit.HITId)
        for mturk_assigment in mturk_assignments:
            labeler_assignment = session.query(database.Assignment) \
                .filter_by(assignmentid=mturk_assigment.AssignmentId) \
                .first()

            if labeler_assignment is None:
                labeler_user = session.query(database.User) \
                    .filter_by(username=mturk_assigment.WorkerId) \
                    .first()

                if labeler_user is None:
                    print('Creating user ' + mturk_assigment.WorkerId)
                    labeler_user = database.User(
                        username=mturk_assigment.WorkerId,
                        lastactivity=datetime.datetime.now(),
                    )
                    session.add(labeler_user)

                print('Creating Assignment ' + mturk_assigment.AssignmentId)
                labeler_assignment = database.Assignment(
                    user=labeler_user,
                    assignmentid=mturk_assigment.AssignmentId,
                    HIT=labeler_hit,
                    status=mturk_assigment.AssignmentStatus,
                )
                session.add(labeler_assignment)

            if labeler_assignment.status != mturk_assigment.AssignmentStatus:
                print('Recorded Status: %s, Actual Status: %s' % (
                    labeler_assignment.status,
                    mturk_assigment.AssignmentStatus
                ))
                labeler_assignment.status = mturk_assigment.AssignmentStatus
    session.flush()
    session.commit()

if __name__ == '__main__':
    MANAGER.run()

# pylint: disable=W0232,R0903

"""Module for interacting with postgres database."""

from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, backref, scoped_session, sessionmaker

__engine__ = create_engine(
    'postgresql://postgres:password123@localhost/labeler',
    isolation_level='READ UNCOMMITTED',
)
__metadata__ = MetaData(__engine__)
__Base__ = declarative_base(metadata=__metadata__)


class HITType(__Base__):

    """The HIT Type is what appears in the search engine on mturk."""

    __tablename__ = 'hittypes'
    __table_args__ = {'autoload': True}
    hits = relationship('HIT', backref='HITType')


class Assignment(__Base__):

    """A HIT can have multiple assignments to many users."""

    __tablename__ = 'assignments'
    __table_args__ = {'autoload': True}
    click_sessions = relationship('ClickSession', backref='assignment')
    approve_pair_sessions = relationship(
        'ApprovePairSession',
        backref='assignment'
    )
    bbox_sessions = relationship('BoundingBoxSession', backref='assignment')
    daynights = relationship('DayNight', backref='assignment')
    occlusion_sessions = relationship(
        'OcclusionSession',
        backref='assignment'
    )
    revisions = relationship('Revision', backref='assignment')


class HITPhotoAssociation(__Base__):

    """HIT to Photo many-to-many."""

    __tablename__ = 'hit_photo_association'
    __table_args__ = {'autoload': True}


class HITVehicleAssociation(__Base__):

    """HIT to Vehicle many-to-many."""

    __tablename__ = 'hit_vehicle_association'
    __table_args__ = {'autoload': True}


class HIT(__Base__):

    """A single HIT which may be done once per user."""

    __tablename__ = 'hits'
    __table_args__ = {'autoload': True}
    assignments = relationship('Assignment', backref='HIT')
    # pylint: disable-msg=E1101
    photos = relationship(
        'Photo',
        secondary=HITPhotoAssociation.__table__,
        backref='HITs'
    )
    vehicles = relationship(
        'Vehicle',
        secondary=HITVehicleAssociation.__table__,
        backref='HITs'
    )
    # pylint: enable-msg=E1101


class Click(__Base__):

    """A single click for the clicker task."""

    __tablename__ = 'clicks'
    __table_args__ = {'autoload': True}


class ClickSession(__Base__):

    """The whole clicker task session."""

    __tablename__ = 'clicksessions'
    __table_args__ = {'autoload': True}
    clicks = relationship('Click', backref='click_session')


class ApprovePairToVehicleAssociation(__Base__):

    """Approve pair to vehicle many-to-many."""

    __tablename__ = 'approve_pair_to_vehicle_association'
    __table_args__ = {'autoload': True}


class ApprovePairSession(__Base__):

    """Approve pair session."""

    __tablename__ = 'approve_pair_sessions'
    __table_args__ = {'autoload': True}
    # pylint: disable-msg=E1101
    vehicles = relationship(
        'Vehicle',
        secondary=ApprovePairToVehicleAssociation.__table__,
        backref='approve_pair_sessions'
    )
    # pylint: enable-msg=E1101


class BoundingBoxSession(__Base__):

    """Bounding box session."""

    __tablename__ = 'bounding_box_sessions'
    __table_args__ = {'autoload': True}


class User(__Base__):

    """Both regular users and mturk users in here."""

    __tablename__ = 'users'
    __table_args__ = {'autoload': True}
    annotations = relationship('Annotation', backref='user')
    problems = relationship('Problem', backref='user')
    daynights = relationship('DayNight', backref='user')
    clicksessions = relationship('ClickSession', backref='user')
    approve_pair_sessions = relationship('ApprovePairSession', backref='user')
    bbox_sessions = relationship('BoundingBoxSession', backref='user')
    occlusionsessions = relationship('OcclusionSession', backref='user')
    assignments = relationship('Assignment', backref='user')


class OcclusionSession(__Base__):

    """The occlusion session for several occlusion rankings."""

    __tablename__ = 'occlusionsessions'
    __table_args__ = {'autoload': True}
    occlusions = relationship('OcclusionRanking', backref='occlusion_session')


class OcclusionRanking(__Base__):

    """A single occlusion ranking."""

    __tablename__ = 'occlusionrankings'
    __table_args__ = {'autoload': True}


class DayNight(__Base__):

    """A day/night answer."""

    __tablename__ = 'daynights'
    __table_args__ = {'autoload': True}


class Photo(__Base__):

    """A photo in our collection."""

    __tablename__ = 'photos'
    __table_args__ = {'autoload': True}
    annotations = relationship('Annotation', backref='photo')
    daynights = relationship('DayNight', backref='photo')
    clicksessions = relationship('ClickSession', backref='photo')


class Flag(__Base__):

    """A user objection to a photo in the collection."""

    __tablename__ = 'flags'
    __table_args__ = {'autoload': True}


class Annotation(__Base__):

    """An annotation for a photo.  An annotation may have many revisions."""

    __tablename__ = 'annotations'
    __table_args__ = {'autoload': True}
    flags = relationship('Flag', backref='annotation')
    revisions = relationship('Revision', backref='annotation')


class Revision(__Base__):

    """A single revision which can also refer to a parent."""

    __tablename__ = 'revisions'
    __table_args__ = {'autoload': True}
    vehicles = relationship('Vehicle', backref='revision')
    parent = relationship(
        'Revision',
        uselist=False,
        remote_side='Revision.id',
        backref=backref('child', uselist=False)
    )


class Vehicle(__Base__):

    """The vehicle annotation."""

    __tablename__ = 'vehicles'
    __table_args__ = {'autoload': True}
    occlusionrankings = relationship('OcclusionRanking', backref='vehicle')
    bbox_sessions = relationship('BoundingBoxSession', backref='vehicle')
    partner = relationship('Vehicle', uselist=False)


class Problem(__Base__):

    """User-reported site problems."""

    __tablename__ = 'problems'
    __table_args__ = {'autoload': True}

__Base__.metadata.create_all(__engine__)
SESSION = scoped_session(sessionmaker(bind=__engine__))

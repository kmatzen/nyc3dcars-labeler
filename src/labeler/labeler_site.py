#!/usr/bin/env python

"""Provides some common functionality for the Labeler site."""

from flask import jsonify, render_template
from flask.ext.restful import reqparse

import database


from server_common import create_app, database_session

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

APP = create_app(__name__)


@APP.route('/')
def index():
    """The main page for the project."""

    return render_template('index.html')


@APP.route('/robots.txt')
def robots():
    """go away google"""

    return render_template('robots.txt')


@APP.route('/submit_mturk', methods=['POST'])
@database_session(fetch_user=False)
def submit_mturk(session):
    """Common location for mturk submission."""

    parser = reqparse.RequestParser()
    parser.add_argument('assignmentId', type=str, required=True)
    args = parser.parse_args()

    assignment = session.query(database.Assignment) \
        .filter_by(assignmentid=args.assignmentId) \
        .one()

    assignment.status = 'Submitted'

    session.flush()
    session.commit()

    return jsonify(status='ok', data={})


@APP.route('/problem', methods=['POST'])
@database_session()
def report_problem(session, user):
    """Problem reporting handler."""

    parser = reqparse.RequestParser()
    parser.add_argument('screenshot', type=str)
    parser.add_argument('description', type=str, required=True)
    args = parser.parse_args()

    problem = database.Problem(
        user=user,
        description=args.description,
        screenshot=args.screenshot,
        resolved=False
    )

    args = {
        'username': user.username,
        'description': args.description,
        'screenshot': args.screenshot,
    }

    message = ('<html>'
               '<body>'
               '%(username)s<br/>%(description)s<br/>'
               '<a href="%(screenshot)s">'
               '<img src="%(screenshot)s"/></a>'
               '</body></html>' % args
               )

    session.add(problem)

    msg = MIMEMultipart('alternative')
    from_address = APP.config['ADMIN_EMAIL']
    to_address = APP.config['REPORT_EMAIL']
    msg['Subject'] = 'Labeler problem reported'
    msg['From'] = from_address
    msg['To'] = to_address

    msg.attach(MIMEText(message, 'html'))

    smtp = smtplib.SMTP('localhost')
    smtp.sendmail(from_address, [to_address], msg.as_string())
    smtp.quit()

    session.flush()
    session.commit()

    # pylint: disable-msg=E1101
    return jsonify(status='ok', id=problem.id)
    # pylint: enable-msg=E1101

if __name__ == '__main__':
    APP.run()

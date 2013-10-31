#!/bin/bash

APP=labeler
SERVER_NAME=localhost

sudo apt-get install python-virtualenv nginx uwsgi uwsgi-plugin-python python-dev postgresql-server-dev-9.1 postgresql-9.1

virtualenv --no-site-packages venv
. venv/bin/activate
pip install -r requirements.txt

sed -e "s;%SERVER_NAME%;$SERVER_NAME;" -e "s;%ROOT%;$PWD;" -e "s;%APP%;$APP;" conf/nginx.conf.template > conf/$SERVER_NAME.conf
sudo ln -s -f $PWD/conf/$SERVER_NAME.conf /etc/nginx/sites-enabled/

sed -e "s;%SERVER_NAME%;$SERVER_NAME;" -e "s;%ROOT%;$PWD;" -e "s;%APP%;$APP;" conf/uwsgi.ini.template > conf/$SERVER_NAME.ini
sudo ln -s -f $PWD/conf/$SERVER_NAME.ini /etc/uwsgi/apps-enabled/

echo "Please set the default password to postgres in src/labeler/database.py.  The default is password123."
sudo -u postgres psql postgres -c "\password postgres"
sudo -u postgres createdb labeler

sudo rm /etc/nginx/sites-enabled/default

sudo -u postgres psql labeler -f schema.sql

echo "Please create your site config file in src/labeler/instance/settings.cfg.  There is a template in that directory."
cp src/labeler/instance/settings.cfg.template src/labeler/instance/settings.cfg

sudo service uwsgi restart
sudo service nginx restart


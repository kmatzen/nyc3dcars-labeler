nyc3dcars-labeler
=================

Web annotation interface used for the construction of NYC3DCars dataset.

The install.sh script contains the minimum required steps to go from a clean installation of something like Ubuntu to something that can run this application.  Please inspect each step and understand what it is doing before running it.  For example, src/labeler/database.py has a hardcoded password in it and unless you want the default that I've included, you should probably understand how postgres users and passwords work.  Also, while the repo contains the database schema, it does not include any data.  To start using the system, it's expected that you begin by populating the photos table with the photos you want annotated.

[![githalytics.com alpha](https://cruel-carlota.pagodabox.com/900b71453e2fd67800cfa459ff252bc4 "githalytics.com")](http://githalytics.com/kmatzen/nyc3dcars-labeler)

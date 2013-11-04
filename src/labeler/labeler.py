from werkzeug.wsgi import DispatcherMiddleware

from labeler_site import APP as root_app
from bbox_site import APP as bbox_app
from approve_pairs_site import APP as approve_pairs_app
from labeler_app_site import APP as labeler_app
from daynight_site import APP as daynight_app
from admin_site import APP as admin_app
from clicker_site import APP as clicker_app
from occlusion_site import APP as occlusion_app

application = DispatcherMiddleware(root_app, {
    '/bbox':            bbox_app,
    '/approve_pairs':   approve_pairs_app,
    '/labeler':         labeler_app,
    '/clicker':         clicker_app,
    '/daynight':        daynight_app,
    '/admin':           admin_app,
    '/occlusion':       occlusion_app,
})

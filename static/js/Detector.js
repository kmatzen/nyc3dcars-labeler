/**
 * @author alteredq / http://alteredqualia.com/
 * @author mr.doob / http://mrdoob.com/
 */

Detector = {
	canvas : !! window.CanvasRenderingContext2D,
	webgl : ( function () { try { return !! window.WebGLRenderingContext && !! document.createElement( 'canvas' ).getContext( 'experimental-webgl' ); } catch( e ) { return false; } } )(),
	workers : !! window.Worker,
	fileapi : window.File && window.FileReader && window.FileList && window.Blob,

	getWebGLErrorMessage : function () {

		var domElement = document.createElement('div');
		
		domElement.style.fontFamily = 'Cabin Condensed';
		domElement.style.fontSize = '1em';
		domElement.style.textAlign = 'center';
		domElement.style.position = "absolute";
		domElement.style.color = '#eee';
		domElement.style.paddingTop = '11px';
		domElement.style.width = '100%';

		if ( ! this.webgl ) {

			domElement.innerHTML = window.WebGLRenderingContext ? [
				'Sorry for the inconvenience, but apparently your graphics card doesn\'t support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" target="_blank">WebGL</a>.'
			].join( '\n' ) : [
				'Sorry for the inconvenience, but apparently your browser doesn\'t support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" target="_blank">WebGL</a>.<br>',
				'Please',
				'<a href="http://www.plus360degrees.com/no-webgl/"><b>CLICK HERE</b></a> to have the full experience!.',
				'Or use another browser like: <a href="http://www.google.com/chrome" target="_blank">Chrome</a>, ',
				'<a href="http://www.mozilla.com/en-US/firefox/new/" target="_blank">Firefox</a> or',
				'<a href="http://www.apple.com/safari/download/" target="_blank">Safari (Mac)</a>.'
			].join( '\n' );

		}

		return domElement;

	},

	addGetWebGLMessage : function ( parameters ) {

		var parent, id, domElement;

		parameters = parameters || {};

		parent = parameters.parent !== undefined ? parameters.parent : document.body;
		id = parameters.id !== undefined ? parameters.id : 'oldie';

		domElement = Detector.getWebGLErrorMessage();
		domElement.id = id;

		parent.appendChild( domElement );

	}

};

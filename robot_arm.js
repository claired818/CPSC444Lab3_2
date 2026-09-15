//----------------------------------------------------------------------------
// State Variable Setup 
//----------------------------------------------------------------------------

// This variable will store the WebGL rendering context
var gl;

//Collect shape information into neat package
var shapes = {
   wireCube: {points:[], colors:[], start:0, size:0, type: 0},
   solidCube: {points:[], colors:[], start:0, size:0, type: 0},
   axes: {points:[], colors:[], start:0, size:0, type: 0},
};

//Variables for Transformation Matrices
var modelViewMatrix = mat4();
var projectionMatrix  = mat4();
var modelViewMatrixLoc, projectionMatrixLoc;

//Model state variables
var shoulder = 0, elbow = 0;


//----------------------------------------------------------------------------
// Define Shape Data 
//----------------------------------------------------------------------------

//Some colours
var red = 		   	vec4(1.0, 0.0, 0.0, 1.0);
var green = 	   	vec4(0.0, 1.0, 0.0, 1.0);
var blue = 		   	vec4(0.0, 0.0, 1.0, 1.0);
var lightred =		vec4(1.0, 0.5, 0.5, 1.0);
var lightgreen =	vec4(0.5, 1.0, 0.5, 1.0);
var lightblue =   	vec4(0.5, 0.5, 1.0, 1.0);
var white = 	   	vec4(1.0, 1.0, 1.0, 1.0);


//Generate Axis Data: use LINES to draw. Three axes in red, green and blue
shapes.axes.points = 
[ 
	vec4(  2.0,  0.0,  0.0, 1.0), //x axis, will be green
	vec4( -2.0,  0.0,  0.0, 1.0),
	vec4(  0.0,  2.0,  0.0, 1.0), //y axis, will be red
	vec4(  0.0, -2.0,  0.0, 1.0),
	vec4(  0.0,  0.0,  2.0, 1.0), //z axis, will be blue
	vec4(  0.0,  0.0, -2.0, 1.0)
];

shapes.axes.colors = 
[
	green,green,
	red,  red,
	blue, blue
];


//Define points for a unit cube
var cubeVerts = [
	vec4( 0.5,  0.5,  0.5, 1), //0
	vec4( 0.5,  0.5, -0.5, 1), //1
	vec4( 0.5, -0.5,  0.5, 1), //2
	vec4( 0.5, -0.5, -0.5, 1), //3
	vec4(-0.5,  0.5,  0.5, 1), //4
	vec4(-0.5,  0.5, -0.5, 1), //5
	vec4(-0.5, -0.5,  0.5, 1), //6
	vec4(-0.5, -0.5, -0.5, 1), //7
];

//Look up patterns from cubeVerts for different primitive types
//Wire Cube - draw with LINE_STRIP
var wireCubeLookups = [
	0,4,6,2,0, //front
	1,0,2,3,1, //right
	5,1,3,7,5, //back
	4,5,7,6,4, //right
	4,0,1,5,4, //top
	6,7,3,2,6, //bottom
];

//Solid Cube - draw with TRIANGLES, 2 triangles per face
var solidCubeLookups = [
	0,4,6,   0,6,2, //front
	1,0,2,   1,2,3, //right
	5,1,3,   5,3,7,//back
	4,5,7,   4,7,6,//left
	4,0,1,   4,1,5,//top
	6,7,3,   6,3,2,//bottom
];

//Expand Wire Cube data: this wire cube will be white...
for (var i =0; i < wireCubeLookups.length; i++)
{
   shapes.wireCube.points.push(cubeVerts[wireCubeLookups[i]]);
   shapes.wireCube.colors.push(white);
}

//Expand Solid Cube data: each face will be a different color so you can see
//    the 3D shape better without lighting.
var colorNum = 0;
var colorList = [lightblue, lightgreen, lightred, blue, red, green];
for (var i = 0; i < solidCubeLookups.length; i++)
{
   shapes.solidCube.points.push(cubeVerts[solidCubeLookups[i]]);
   shapes.solidCube.colors.push(colorList[colorNum]);
   if (i % 6 == 5) colorNum++; //Switch color for every face. 6 vertices/face
}

//load data into points and colors arrays - runs once as page loads.
var points = [];
var colors = [];

//Convenience function:
//  - adds shape data to points and colors arrays
//  - adds primitive type to a shape
function loadShape(myShape, type)
{
   myShape.start = points.length;
   points = points.concat(myShape.points);
   colors = colors.concat(myShape.colors);
   myShape.size = points.length - myShape.start;
   myShape.type = type;
}

//----------------------------------------------------------------------------
// Initialization Event Function
//----------------------------------------------------------------------------

window.onload = function init() {
   canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );

    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

   // Set up data to draw
   // Mostly done globally in this program...
   loadShape(shapes.wireCube, gl.LINE_STRIP);
   loadShape(shapes.solidCube, gl.TRIANGLES);
   loadShape(shapes.axes, gl.LINES);

	// Load the data into GPU data buffers and
	// Associate shader attributes with corresponding data buffers
	//***Vertices***  ***Colors***
    var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

   // Get addresses of shader uniforms
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );

   //Set up projection matrix
   var aspect = canvas.width/canvas.height;
   //p = ortho(-3.4*aspect, 3.4*aspect, -3.4, 3.4, 1.0, 20.0);
   projectionMatrix = perspective(40.0, aspect, 0.1, 100.0);
	gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );

   //Set initial view
   var eye = vec3(0.0, 1.0, 10.0);
   var at = vec3(0.0, 0.0, 0.0);
   var up = vec3(0.0, 1.0, 0.0);

   modelViewMatrix = lookAt(eye, at, up);
   // gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
	
   //Animate - draw continuously
   requestAnimationFrame(animate);
};



//----------------------------------------------------------------------------
// Animation and Rendering Event Functions
//----------------------------------------------------------------------------

//animate()
//updates and displays the model based on elapsed time
//sets up another animation event as soon as possible
var prevTime = 0;
function animate()
{
    requestAnimationFrame(animate);
    
    //Do time corrected animation
    var curTime = new Date().getTime();
    if (prevTime != 0)
    {
       //Calculate elapsed time in seconds
       var timePassed = (curTime - prevTime)/1000.0;
       //Update any active animations 
       handleKeys(timePassed);
    }
    prevTime = curTime;
    
    //Draw
    render();
}

function render() {
	gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
	
   var armShape = shapes.wireCube;
   var matStack = [];
	
	//Save view transform
	matStack.push(modelViewMatrix);
	
		//Position Shoulder Joint
		modelViewMatrix = mult(modelViewMatrix,translate(-2.0, 0.0, 0.0));
		//Shoulder Joint
		modelViewMatrix = mult(modelViewMatrix,rotate(shoulder, vec3(0,0,1)));
		//Position Upper Arm Cube
		modelViewMatrix = mult(modelViewMatrix,translate(1.0, 0.0, 0.0));
		//Scale and Draw Upper Arm
		matStack.push(modelViewMatrix);
			modelViewMatrix = mult(modelViewMatrix,scalem(2.0, 0.4, 1.0));
			gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
			gl.drawArrays(armShape.type, armShape.start, armShape.size);
		//Undo Scale
		modelViewMatrix = matStack.pop();

	
		//Position Elbow Joint
		modelViewMatrix = mult(modelViewMatrix, translate(1.0, 0.0, 0.0));
		//Elbow Joint
		modelViewMatrix = mult(modelViewMatrix, rotate(elbow,vec3(0,0,1)));
		//Position Forearm Cube
		modelViewMatrix = mult(modelViewMatrix, translate(1, 0.0, 0.0));
		//Scale and Draw Forearm
		matStack.push(modelViewMatrix);
			modelViewMatrix = mult(modelViewMatrix, scalem(2.0, 0.4, 1.0));
			gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
			gl.drawArrays(armShape.type, armShape.start, armShape.size);
		//Undo Scale
		modelViewMatrix = matStack.pop();

    //Restore modelViewMatrix to initial state
	modelViewMatrix = matStack.pop();
	
}



//----------------------------------------------------------------------------
// Keyboard Event Functions
//----------------------------------------------------------------------------

//This array will hold the pressed or unpressed state of every key
var currentlyPressedKeys = [];

//Store current state of shift key
var shift;

document.onkeydown = function handleKeyDown(event) {
   currentlyPressedKeys[event.keyCode] = true;
   shift = event.shiftKey;

   //Get unshifted key character
   var c = event.keyCode;
   var key = String.fromCharCode(c);

	//Place key down detection code here
}

document.onkeyup = function handleKeyUp(event) {
   currentlyPressedKeys[event.keyCode] = false;
   shift = event.shiftKey;
   
   //Get unshifted key character
   var c = event.keyCode;
   var key = String.fromCharCode(c);

	//Place key up detection code here
}

//isPressed(c)
//Utility function to lookup whether a key is pressed
//Only works with unshifted key symbol
// ie: use "E" not "e"
//     use "5" not "%"
function isPressed(c)
{
   var code = c.charCodeAt(0);
   return currentlyPressedKeys[code];
}

//handleKeys(timePassed)
//Continuously called from animate to cause model updates based on
//any keys currently being held down
function handleKeys(timePassed) 
{
   //Place continuous key actions here - anything that should continue while a key is
   //held

   //Calculate how much to move based on time since last update
   var s = 90.0; //rotation speed in degrees per second
   var d = s*timePassed; //degrees to rotate on this frame
   
   //Shoulder Updates
   if (shift && isPressed("S")) 
   {

      if (shoulder < 90) shoulder = (shoulder + d);
      else shoulder = 90;
   }
   if (!shift && isPressed("S")) 
   {
      if (shoulder > -90) shoulder = (shoulder - d);
      else  shoulder = -90;
   }
   
   //Elbow Updates
   if (shift && isPressed("E")) 
   {
      if (elbow < 0) elbow = (elbow + d);
      else  elbow = 0;
   }
   if (!shift && isPressed("E")) 
   {
      if (elbow > -144) elbow = (elbow - d);
      else elbow = -144;
   }
}

"use strict";

var canvas, gl, program;
var NumVertices = 36;

var points = [];
var texCoords = [];
var texCoordsArray = [];

// we want to implement texture changing functionality, pressing 'c' will change the texture of the body
var bodyTextures = [];
var currentBodyTextureIndex = 0;

var headTextures = [];
var currentHeadTextureIndex = 0;

// for jumping and spinning animation
var animationState = "idle";
var jumpHeight = 0.0;
var jumpDuration = 1.0; // in seconds
var jumpStartTime = 0.0;
var spinSpeedVal = 0;
var spinDirection = 1; // 1 for clockwise, -1 for counterclockwise
const spinSpeedInput = document.getElementById('spinSpeed');

// Texture objects and image elements
var textures = {
    body: [],
    head: [],
    arms: null,
    legs: null,
    eyes: null,
    antennae: null
};

var images = {
    body: [], // array to hold body textures
    head: [], // array to hold head textures
    arms: new Image(),
    legs: new Image(),
    eyes: new Image(),
    antennae: new Image()
};

// Robot dimensions 
var BASE_HEIGHT = 4.0;
var BASE_WIDTH = 3.0;
var HEAD_HEIGHT = 2.0;
var HEAD_WIDTH = 2.0;
var ARM_WIDTH = 0.5;
var ARM_HEIGHT = 3.0;
var EYE_SIZE = 0.3;
var ANTENNA_HEIGHT = 1.0;
var ANTENNA_WIDTH = 0.1;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc;
var theta = [0, 0, 0];
var cam = [-0.4, 1, 3];
var distance_scale = 1;
var isIsometricView = false;

// Texture coordinate configuration
var texCoord = [
    vec2(0, 0),
    vec2(0, 1),
    vec2(1, 1),
    vec2(1, 0)
];

function configureTexture(image, textureUnit) {
    var texture = gl.createTexture();
    gl.activeTexture(textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    return texture;
}

function loadTextures() {
    // Set image sources and configure textures when loaded
    for(let i =0; i < 3; i++){
        images.body[i] = new Image();
        images.body[i].onload = function() {
            textures.body[i] = configureTexture(images.body[i], gl.TEXTURE0 + i);
        };
    }; 

    for(let i =0; i < 2; i++){
        images.head[i] = new Image();
        images.head[i].onload = function() {
            textures.head[i] = configureTexture(images.head[i], gl.TEXTURE3 + i);
        };
    };

    images.arms.onload = function() {
        textures.arms = configureTexture(images.arms, gl.TEXTURE5);
    };
    images.legs.onload = function() {
        textures.legs = configureTexture(images.legs, gl.TEXTURE6);
    };
    images.eyes.onload = function() {
        textures.eyes = configureTexture(images.eyes, gl.TEXTURE7);
    };
    images.antennae.onload = function() {
        textures.antennae = configureTexture(images.antennae, gl.TEXTURE8);
    };

    // Set the image sources for each texture
    images.body[0].src = "textures/body3.png";
    images.body[1].src = "textures/body1.jpg"; 
    images.body[2].src = "textures/body2.jpg"; 

    images.head[0].src = "textures/head.jpg";
    images.head[1].src = "textures/head2.jpg";
    
    images.arms.src = "textures/hand.jpg";  
    images.legs.src = "textures/legs.jpg";  
    images.eyes.src = "textures/eyes.png";  
    images.antennae.src = "textures/antenna.jpg";  
}

function quad(a, b, c, d, vertices) {
    var indices = [a, b, c, a, c, d];
    var texIndices = [0, 1, 2, 0, 2, 3];  // Texture coordinates for the quad
    
    for (var i = 0; i < indices.length; ++i) {
        points.push(vertices[indices[i]]);
        texCoordsArray.push(texCoord[texIndices[i]]);
    }
}

function generateCube(vertices) {
    quad(1, 0, 3, 2, vertices);    // Front face
    quad(2, 3, 7, 6, vertices);    // Right face
    quad(3, 0, 4, 7, vertices);    // Bottom face
    quad(6, 5, 1, 2, vertices);    // Back face
    quad(4, 5, 6, 7, vertices);    // Left face
    quad(5, 4, 0, 1, vertices);    // Top face
}

function generateRobotPart(scaleX, scaleY, scaleZ) {
    var vertices = [
        vec4(-0.5 * scaleX, -0.5 * scaleY, 0.5 * scaleZ, 1.0),
        vec4(-0.5 * scaleX, 0.5 * scaleY, 0.5 * scaleZ, 1.0),
        vec4(0.5 * scaleX, 0.5 * scaleY, 0.5 * scaleZ, 1.0),
        vec4(0.5 * scaleX, -0.5 * scaleY, 0.5 * scaleZ, 1.0),
        vec4(-0.5 * scaleX, -0.5 * scaleY, -0.5 * scaleZ, 1.0),
        vec4(-0.5 * scaleX, 0.5 * scaleY, -0.5 * scaleZ, 1.0),
        vec4(0.5 * scaleX, 0.5 * scaleY, -0.5 * scaleZ, 1.0),
        vec4(0.5 * scaleX, -0.5 * scaleY, -0.5 * scaleZ, 1.0)
    ];
    generateCube(vertices);
}

function generateRobot() {
    points = [];
    texCoordsArray = [];
    
    // Generate geometry for each part
    generateRobotPart(BASE_WIDTH, BASE_HEIGHT, BASE_WIDTH);           // Body
    generateRobotPart(HEAD_WIDTH, HEAD_HEIGHT, HEAD_WIDTH);          // Head
    generateRobotPart(EYE_SIZE, EYE_SIZE, EYE_SIZE);                // Left eye
    generateRobotPart(EYE_SIZE, EYE_SIZE, EYE_SIZE);                // Right eye
    generateRobotPart(ANTENNA_WIDTH, ANTENNA_HEIGHT, ANTENNA_WIDTH); // Left antenna
    generateRobotPart(ANTENNA_WIDTH, ANTENNA_HEIGHT, ANTENNA_WIDTH); // Right antenna
    generateRobotPart(ARM_WIDTH, ARM_HEIGHT, ARM_WIDTH);            // Left arm
    generateRobotPart(ARM_WIDTH, ARM_HEIGHT, ARM_WIDTH);            // Right arm
    generateRobotPart(ARM_WIDTH, ARM_HEIGHT, ARM_WIDTH);            // Left leg
    generateRobotPart(ARM_WIDTH, ARM_HEIGHT, ARM_WIDTH);            // Right leg
}

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.19, 0.125, 0.125, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // Initialize shaders and load textures
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    generateRobot();

    // Create and bind vertex buffer
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Create and bind texture coordinate buffer
    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    // Get uniform locations
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    var textureLoc = gl.getUniformLocation(program, "texture");
    
    // Set up projection matrix
    projectionMatrix = ortho(-10, 10, -10, 10, -10, 10);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(projectionMatrix));

    // Load textures
    loadTextures();

    // jumping and spinning controller
    document.getElementById('jumpButton').addEventListener('click', function(){
        animationState = "jump";
        jumpStartTime = performance.now() / 1000;
    });

    document.getElementById('spinButton').addEventListener('click', function(){
        animationState = "spin";
        spinSpeedVal = parseFloat(spinSpeedInput.value) || 0;
        spinDirection = spinDirection * -1;
    });
    

    document.getElementById('stopButton').addEventListener('click', function(){
        animationState = "idle";
        jumpHeight = 0.0;
        spinSpeed = 0.0;
    });

    document.getElementById('isometricButton').addEventListener('click', function(){
        isIsometricView = !isIsometricView;
    });

    document.getElementById('colorButton').addEventListener('click', function(){
        currentBodyTextureIndex = (currentBodyTextureIndex + 1) % textures.body.length;
        currentHeadTextureIndex = (currentHeadTextureIndex + 1) % textures.head.length;
    });

    render();
}

function setCameraView() {
    if (isIsometricView) {
        modelViewMatrix = lookAt(vec3(cam[0], cam[1], cam[2]), vec3(0, 0, 0), vec3(0, 1, 0));
        modelViewMatrix = mult(modelViewMatrix, rotate(45, vec3(1, 0, 0)));
        modelViewMatrix = mult(modelViewMatrix, rotate(45, vec3(0, 1, 0)));
        modelViewMatrix = mult(modelViewMatrix, rotate(45, vec3(0, 0, 1)));
    } else {
        modelViewMatrix = lookAt(vec3(cam[0], cam[1], cam[2]), vec3(0, 0, 0), vec3(0, 1, 0));
    }
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    setCameraView();

    modelViewMatrix = mult(modelViewMatrix, rotate(theta[0], vec3(1, 0, 0)));
    modelViewMatrix = mult(modelViewMatrix, rotate(theta[1], vec3(0, 1, 0)));
    modelViewMatrix = mult(modelViewMatrix, rotate(theta[2], vec3(0, 0, 1)));
    modelViewMatrix = mult(modelViewMatrix, scalem(distance_scale, distance_scale, distance_scale));

    // switch animation states
    switch(animationState){
        case "jump":
            var currentTime = performance.now() / 1000;
            var elapsedTime = currentTime - jumpStartTime;
            if(elapsedTime < jumpDuration){
                jumpHeight = Math.sin(Math.PI * elapsedTime / jumpDuration) * 10;
            } else {
                jumpHeight = 0.0;
                animationState = "idle";
            }
            modelViewMatrix = mult(modelViewMatrix, translate(0, jumpHeight, 0));
            break;
        case "spin":
            spinSpeedVal = parseFloat(spinSpeedInput.value) || 0;
            modelViewMatrix = mult(modelViewMatrix, rotate(spinSpeedVal * spinDirection * (performance.now() / 1000), vec3(0, 1, 0)));
            break;
    }

    // Draw body
    gl.activeTexture(gl.TEXTURE0+currentBodyTextureIndex);
    gl.bindTexture(gl.TEXTURE_2D, textures.body[currentBodyTextureIndex]);
    gl.uniform1i(gl.getUniformLocation(program, "texture"), currentBodyTextureIndex);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.drawArrays(gl.TRIANGLES, 0, NumVertices);

    // Draw head
    var headMatrix = mult(modelViewMatrix, translate(0, BASE_HEIGHT / 2 + HEAD_HEIGHT / 2, 0));
    gl.activeTexture(gl.TEXTURE3+currentHeadTextureIndex);
    gl.bindTexture(gl.TEXTURE_2D, textures.head[currentHeadTextureIndex]);
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 3 + currentHeadTextureIndex);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(headMatrix));
    gl.drawArrays(gl.TRIANGLES, NumVertices, NumVertices);

    // Draw eyes
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, textures.eyes);
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 5);
    
    var leftEyeMatrix = mult(headMatrix, translate(-HEAD_WIDTH/4, 0, HEAD_WIDTH/2));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(leftEyeMatrix));
    gl.drawArrays(gl.TRIANGLES, 2 * NumVertices, NumVertices);

    var rightEyeMatrix = mult(headMatrix, translate(HEAD_WIDTH/4, 0, HEAD_WIDTH/2));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(rightEyeMatrix));
    gl.drawArrays(gl.TRIANGLES, 3 * NumVertices, NumVertices);

    // Draw antennas
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, textures.antennae);
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 6);
    
    var leftAntennaMatrix = mult(headMatrix, translate(-HEAD_WIDTH/3, HEAD_HEIGHT/2 + ANTENNA_HEIGHT/2, 0));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(leftAntennaMatrix));
    gl.drawArrays(gl.TRIANGLES, 4 * NumVertices, NumVertices);

    var rightAntennaMatrix = mult(headMatrix, translate(HEAD_WIDTH/3, HEAD_HEIGHT/2 + ANTENNA_HEIGHT/2, 0));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(rightAntennaMatrix));
    gl.drawArrays(gl.TRIANGLES, 5 * NumVertices, NumVertices);

    // Draw arms
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, textures.arms);
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 2);
    
    var leftArmMatrix = mult(modelViewMatrix, mult(
        translate(-BASE_WIDTH/2 - ARM_HEIGHT/2, 0, 0),
        rotate(90, vec3(0, 0, 1))
    ));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(leftArmMatrix));
    gl.drawArrays(gl.TRIANGLES, 6 * NumVertices, NumVertices);

    var rightArmMatrix = mult(modelViewMatrix, mult(
        translate(BASE_WIDTH/2 + ARM_HEIGHT/2, 0, 0),
        rotate(-90, vec3(0, 0, 1))
    ));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(rightArmMatrix));
    gl.drawArrays(gl.TRIANGLES, 7 * NumVertices, NumVertices);

    // Draw legs
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, textures.legs);
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 3);
    
    var leftLegMatrix = mult(modelViewMatrix, translate(-BASE_WIDTH/4, -BASE_HEIGHT/2 - ARM_HEIGHT/2, 0));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(leftLegMatrix));
    gl.drawArrays(gl.TRIANGLES, 8 * NumVertices, NumVertices);

    var rightLegMatrix = mult(modelViewMatrix, translate(BASE_WIDTH/4, -BASE_HEIGHT/2 - ARM_HEIGHT/2, 0));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(rightLegMatrix));
    gl.drawArrays(gl.TRIANGLES, 9 * NumVertices, NumVertices);

    requestAnimFrame(render);
}

// Event listeners
window.addEventListener('keydown', function(event) {
    switch (event.key) {
        case 'ArrowLeft':
            theta[1] -= 2.0;
            break;
        case 'ArrowRight':
            theta[1] += 2.0;
            break;
        case 'ArrowUp':
            theta[0] -= 2.0;
            break;
        case 'ArrowDown':
            theta[0] += 2.0;
            break;
        case 'i':
            isIsometricView = !isIsometricView;
            break;
        case 'c':
            currentBodyTextureIndex = (currentBodyTextureIndex + 1) % textures.body.length;
            currentHeadTextureIndex = (currentHeadTextureIndex + 1) % textures.head.length;
            break;
        case 'j':
            animationState = "jump";
            jumpStartTime = performance.now() / 1000;
            break;
        case 's':
            animationState = "spin";
            break;
    }
});


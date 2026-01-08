if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var q1 = {
  '1':{x:154.5,y:0},
  '2':{x:302.5,y:0},
  '3':{x:77.5,y:130},
  '4':{x:226.5,y:130},
  '5':{x:374.5,y:130},
  '6':{x:0,y:260},
  '7':{x:148,y:260},
  '8':{x:300.5,y:260},
  '9':{x:448.5,y:260},
  '10':{x:74.5,y:392},
  '11':{x:224.5,y:392},
  '12':{x:373.5,y:392},
  '13':{x:149.5,y:522.2},
  '14':{x:299.5,y:522.2};
};

var renderer, loaderQueue, dispatcher, scenes,
    viewWth, viewHgh,viewHlfWth,viewHlfHgh, currentScene,
    viewPixelRatio=window.devicePixelRatio;

var _texs = {};
var scenebg, effectBuffer,sceneBlurBuffer,
    fxaaPass,blurPass,hdrPass;

function onResize(){
  viewWth=$(window).width();
  viewHgh=$(window).height();
  viewHlfWth=viewWth/2;
  viewHlfHgh=viewHgh/2;
  renderer.setSize(viewWth,viewHgh);
  effectBuffer[0].setSize(viewWth*viewPixelRatio,viewHgh*viewPixelRatio);
  effectBuffer[1].setSize(viewWth*viewPixelRatio,viewHgh*viewPixelRatio);
  fxaaPass.setResolution(viewWth*viewPixelRatio,viewHgh*viewPixelRatio)
  updateCamera();
}

function updateCamera(){
  for(var a in scenes){
    scenes[a].camera.aspect=viewWth/viewHgh;
    scenes[a].camera.updateProjectionMatrix();
  }
  currentScene.camera.aspect=viewWth/viewHgh;
  currentScene.camera.updateProjectionMatrix();
}

function onLoadingComplete(){
  initLoading();
  loaderQueue.removeEventListener("complete",onLoadingComplete);
  loaderQueue.removeEventListener("fileload",onImageFileLoad);
}
function prepareLoading(){
  loaderQueue=new createjs.LoadQueue(!0,imagePath,!0);
  loaderQueue.addEventListener("complete",onLoadingComplete);
  loaderQueue.loadFile({src:"js/shader.js",type:createjs.AbstractLoader.JAVASCRIPT});
  loaderQueue.loadFile({src:"js/FXAAShader.js",type:createjs.AbstractLoader.JAVASCRIPT});
  loaderQueue.loadFile({src:"js/KawaseBlurShader.js",type:createjs.AbstractLoader.JAVASCRIPT});
  loaderQueue.loadFile({src:"js/HDRShader.js",type:createjs.AbstractLoader.JAVASCRIPT});
  loaderQueue.loadFile({src:"assets/tile.png",id:"tile"});
}
function onImageFileLoad(a){
  a.item.type=="image" && renderer.setTexture2D(getTexture(a.item.id),0);
}

function initLoading(){
  renderer = new THREE.WebGLRenderer({antialias:false});
  renderer.setClearColor(0x000000,1);
  renderer.setPixelRatio(viewPixelRatio);
  renderer.autoClear=false;
  document.getElementById("three").appendChild( renderer.domElement );

  effectBuffer = [
    new THREE.WebGLRenderTarget(1,1,{format:THREE.RGBFormat}),
    new THREE.WebGLRenderTarget(1,1,{format:THREE.RGBFormat})
  ];
  sceneBlurBuffer=new THREE.WebGLRenderTarget(1,1,{format:THREE.RGBFormat});
  blurPass=new THREE.KawaseBlurPass(effectBuffer[0].texture);
  fxaaPass=new THREE.FXAAPass(effectBuffer[1].texture);
  hdrPass=new THREE.HDRPass(effectBuffer[0].texture,sceneBlurBuffer.texture);

  window.addEventListener("resize",onResize);


  initShader();
  initBG();
  initScene();

  clock=new THREE.Clock;
  createjs.Ticker.setFPS(60);

  start();
  onResize();
}

function initBG(){
  scenebg=new THREE.Scene;
  scenebg.userData.mat=_shaders["BG"];
  var a=new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2),scenebg.userData.mat);
  scenebg.add(a);
  scenebg.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  scenebg.autoUpdate=false;
}
function start(){
  animate();
}

function animate(){
  requestAnimationFrame(animate);
  render();
}

function getTexture( texture ){
  if(!_texs[texture]){
    var image=loaderQueue.getResult(texture);
    if(!image)return null;
    _texs[texture]=new THREE.Texture(image);
    _texs[texture].name = texture;
    _texs[texture].wrapS=_texs[texture].wrapT=THREE.RepeatWrapping;
    _texs[texture].needsUpdate=true;
  }
  return _texs[texture];
}

function initScene(){

  var scene = new THREE.Scene;
  scene.camera = new THREE.PerspectiveCamera( 65, 1, 1, 3000 );
  scene.camera.scene = scene;
  scene.camera.position.z = 1200;

  var material = _shaders["BASIC"].clone();
  material.defines.USE_TEXTURE = 1;

  material.uniforms.diffuse = { value : getTexture("tile") }

  var plane = new THREE.Mesh(
      new THREE.PlaneBufferGeometry( 135,156 ),
      material
  );

  plane.position.z = 0;
  scene.add(plane);
  currentScene = scene;
}

function renderScene(scene, buffer){
  // renderer.render(scenebg,scenebg.camera,buffer,true);
  renderer.render(scene,scene.camera,buffer,false);
}

var count = 0;
function render(){
  count += 0.02;

  scenebg.userData.mat.uniforms.time.value = count;
  renderer.render(scenebg,scenebg.camera,effectBuffer[0],true);
  // renderer.render(scenebg,scenebg.camera);
  renderScene(currentScene,effectBuffer[0]);
  blurPass.render(sceneBlurBuffer);
  hdrPass.render(effectBuffer[1]);
  fxaaPass.render(null,!0);
}

prepareLoading();

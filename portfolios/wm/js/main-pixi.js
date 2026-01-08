PIXI.settings.TARGET_FPMS = 0.04;
PIXI.settings.RENDER_OPTIONS.autoResize = true;
// PIXI.settings.RESOLUTION = window.devicePixelRatio;
// PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

// var stats = new Stats();
var percentText;
// document.body.appendChild( stats.dom );
var app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  resolution:window.devicePixelRatio
});
document.getElementById("three").appendChild(app.view);

var events = new PIXI.utils.EventEmitter();
var _canvas = document.createElement('canvas');
var _ctx = _canvas.getContext('2d');
var _canvasTextures = {},logoanim;
var bgm = document.getElementById("bgm");
var isBGMPlay = true;
function stopBGM(){
  // bgm.paused = true;

  bgm.pause();
  isBGMPlay = false;
  // bgm.stop();
}
function startBGM(){
  isBGMPlay = true;
  bgm.play();
}
function bgmVolumeTo(v,opt){
  TweenMax.to(bgm,0.5,_.assign({volume:v},opt));
}

function getTextureCanvas(name,reso){
  if( !_canvasTextures[name] ){
    var canvas = document.createElement('canvas');
    canvas.width = viewWidth;
    canvas.height = viewHeight;
    canvas.style.width = viewWidth+"px";
    canvas.style.height = viewHeight+"px";
    var ctx = canvas.getContext('2d');
    _canvasTextures[name] = {
      canvas:canvas,
      ctx:ctx
    }
  }
  return _canvasTextures[name];
}
function textureDrawCircle(name,radius,grad){
  var textureCanvas = getTextureCanvas(name);
  var _canvas = textureCanvas.canvas;
  var _ctx = textureCanvas.ctx;
  var gradient = _ctx.createLinearGradient(0,0, 0, radius);
  gradient.addColorStop(0, grad[0]);
  gradient.addColorStop(0, grad[1]);
  _ctx.clearRect(0,0,_canvas.width,_canvas.height);
  _ctx.fillStyle = gradient;
  _ctx.beginPath();
  _ctx.arc(0,0,radius,0,Math.PI*2);
  _ctx.fill();
}
function textureDrawGradientLine(name, linesArray, split,grad,strokeWidth){
  var textureCanvas = getTextureCanvas(name);
  var _canvas = textureCanvas.canvas;
  var _ctx = textureCanvas.ctx;
  _ctx.clearRect(0,0,_canvas.width,_canvas.height);
  if( linesArray.length<2 ) {
    return _canvasTextures[name].canvas;
  }
  for( var i=0;i<linesArray.length-1;(!!split?i+=2:i++)){
    var node = linesArray[i];
    var nextNode = linesArray[i+1];
    var gradient = _ctx.createLinearGradient(node.x, node.y, nextNode.x, nextNode.y);
    for( var j=0;j<grad.length;j++ ){
      gradient.addColorStop(j/grad.length, grad[j]);
      gradient.addColorStop(j/grad.length, grad[j]);
    }
    _ctx.strokeStyle = gradient;
    _ctx.lineCap="round";
    _ctx.lineWidth = strokeWidth||5;
    _ctx.save();
    _ctx.beginPath();
    _ctx.moveTo(node.x,node.y);
    _ctx.lineTo(nextNode.x,nextNode.y);
    _ctx.stroke();
    _ctx.restore();
  }
  return textureCanvas.canvas;
}
function textureDrawPixel(name,x,y,color){
  var textureCanvas = getTextureCanvas(name);
  var _canvas = textureCanvas.canvas;
  var _ctx = textureCanvas.ctx;

  return textureCanvas.canvas;
}

_canvas.width = window.innerWidth;
_canvas.height = window.innerHeight;
var viewWidth = window.innerWidth,viewHeight=window.innerHeight,
halfViewWidth=window.innerWidth*.5,halfViewHeight=window.innerHeight*.5;
function onResize(){
  viewWidth = window.innerWidth;
  viewHeight = window.innerHeight;

  halfViewWidth = Math.floor(viewWidth/2);
  halfViewHeight = Math.floor(viewHeight/2);

  if(percentText){
    percentText.x = halfViewWidth;
    percentText.y = halfViewHeight;
  }
  app.renderer.resize(viewWidth,viewHeight);
  events.emit('resize', viewWidth, viewHeight);
}

var uniforms = {
  "time": { type:'1f',value: 0.0 },
  "mouseX":{type:"1f",value:0.0},
  "mouseY":{type:"1f",value:0.0},
  "resolution": { type:'v2',value: { x: window.innerWidth, y:window.innerHeight }},
  "stepsize": { type:'1f',value: 0.39 },
  "zoom": { type:'1f',value: 2.0 },
  "tile": { type:'1f',value: 0.85 },
  "darkmatter":{ type:'1f',value:0.4 },
  "brightness": { type:'1f',value: 0.003 },
  "distfading":{type:'1f',value:0.56},
  "saturation":{type:'1f',value:0.8}
};

var mouse = {x:0,y:0};
var loaderQueue;
var _textures = {};
function createTexture( image,frame,orig,trim ){
  if( !_textures[image] ){
    var texture=loaderQueue.getResult(image,frame,orig,trim);
    if(!texture)return null;
    _textures[image]= new PIXI.BaseTexture( texture );
  }
  return new PIXI.Texture(_textures[image]);
}

function createAnimatedSprite( id,frameNums ){
  var json = loaderQueue.getResult(id);
  if(!json)return null;
  var textureArray = [];
  var res = PIXI.settings.RESOLUTION;
  for (var i=1,texture,sprite,frame; i <= frameNums; i++){
      frame = json.frames[ json.file+i ];
      texture = createTexture( json.file );
      texture.frame.x = frame.x/res;
      texture.frame.y = frame.y/res;
      texture.frame.width = frame.w/res;
      texture.frame.height = frame.h/res;
      texture.orig = new PIXI.Rectangle(frame.x,frame.y,frame.sourceW,frame.sourceH);
      texture.trim = new PIXI.Rectangle(frame.offX,frame.offY,frame.w,frame.h);
      texture._updateUvs();
      textureArray.push(texture);
  };
  return new PIXI.extras.AnimatedSprite(textureArray);
}


function onLoadingProgress(e){
  loadingScene.progress = ~~(e.progress*100);
}

function onLoadingComplete(){

  loaderQueue.removeEventListener("progress",onLoadingProgress);
  loaderQueue.removeEventListener("complete",onLoadingComplete);

  var o = new Orienter();
  o.onOrient = function (obj) {
    events.emit("orient",obj);
  };
  o.init();
  document.addEventListener('mousemove',function(e){
    mouse = {x:1-e.clientX / window.innerWidth,y:1 - e.clientY / window.innerHeight};
  })
}


var connectScene = {
  resize:function(){
    if( this.intro2 ){
      this.intro2.x = halfViewWidth;
      this.intro2.y = halfViewHeight;
    }
    if( this.cont ){
      this.cont.x = halfViewWidth;
      this.cont.y = halfViewHeight;
    }
    if(this.connecttitle) this.connecttitle.x = halfViewWidth;
  },
  voice:null,
  connecttitle:null,
  intro2:null,
  earth:null,
  qa:null,
  cont:null,
  linesData:[],
  selectedTiles:[],
  unselectedTiles:[],
  linesCont:null,
  mouse:null,
  wavePos:null,
  pinchFilter:null,
  correctArray:[],
  index:0,
  addSelectedTile:function(tile){
    var pos = new PIXI.Point(tile.position.x+halfViewWidth,tile.position.y+halfViewHeight);
    // pos.x *= window.devicePixelRatio;
    // pos.y *= window.devicePixelRatio;
    this.linesData.push(pos);
    this.selectedTiles.push(tile);
    this.unselectedTiles = _.xor(this.cont.children,this.selectedTiles);
    tile.getChildAt(0).tint = 0xd1ff54;
    var word = new PIXI.Sprite(createTexture("q"+this.index+tile.answer));
    word.anchor.set(0.5);
    word.scale.x = word.scale.y = 0.5;
    this.btmline.getChildAt(this.selectedTiles.length-1).addChild(word);
    TweenMax.from(word,0.3,{alpha:0});
    TweenMax.from(word.scale,0.3,{x:1,y:1});
    createjs.Sound.play("hit");
    if(this.selectedTiles.length==this.btmline.children.length){
      if(this.check()){
        this.out();
      }
      else{
        createjs.Sound.play("error");
        this.pointerUp(null,true);
      }
    }
  },
  check:function(){
    var answers = [];
    var correct;
    if( this.index==1 ) correct = [1,2,3,4,5,6,7,8,9,10];
    if( this.index==2 ) correct = [1,2,3,4,1,5,6,7,8,9,10];
    if( this.index==3 ) correct = [1,2,3,4,5,6,7,8,9,10,11];
    if( this.index==4 ) correct = [1,2,3,4,5,6,7,8,9];
    for(var i=0,tile;i<this.selectedTiles.length;i++){
      if(this.selectedTiles[i].answer!=correct[i]){
        return result = false;
      }
    }
    return true;

  },
  pointerDown:function(e){
    if(this.shaking) return;
    document.addEventListener("touchmove", this.touchmove);
    var cx = e.touches[0].clientX,
        cy = e.touches[0].clientY;
    for( var i=0,tile,dx,dy;i< this.cont.children.length;i++ ){
      tile = this.cont.children[i];
      if(tile.getBounds().contains(cx,cy)){
        this.addSelectedTile(tile);
        break;
      }
    }
    this.wavePos.x=halfViewWidth+((halfViewWidth-cx)/halfViewWidth)*50;
    this.wavePos.y=halfViewHeight+((halfViewHeight-cy)/halfViewHeight)*50;
    this.pinchFilter.center = [cx/viewWidth,cy/viewHeight];
    TweenMax.killTweensOf(this.pinchFilter,true);
    TweenMax.killTweensOf(this.cont,true);
    TweenMax.to( this.pinchFilter,0.3,{strength:0.5} );
  },
  pointerUp:function(e,shake){
    document.removeEventListener("touchmove", this.touchmove);
    var i;
    for( i=0;i<this.btmline.children.length;i++){
      var tian = this.btmline.getChildAt(i);
      while(tian.children.length){
        tian.removeChildAt(0).destroy();
      }
    }
    for(i=0;i<this.selectedTiles.length;i++){
      this.selectedTiles[i].getChildAt(0).tint=0xffffff;
    }
    this.mouse = null;
    this.linesData = [];
    this.selectedTiles = [];
    this.unselectedTiles = [];
    this.wavePos.x=halfViewWidth;
    this.wavePos.y=halfViewHeight;
    TweenMax.killTweensOf(this.pinchFilter,true);
    TweenMax.to( this.pinchFilter,0.3,{strength:0} );
    if(shake){
      var context = this;
      this.shaking = true;
      TweenMax.to( this.cont,0.1,{x:halfViewWidth+20,y:halfViewHeight} );
      TweenMax.to( this.cont,0.5,{delay:.1,x:halfViewWidth,y:halfViewHeight,ease:Elastic.easeOut,
      onComplete:function(){
        context.shaking=false;
      }} );
    }
  },
  shaking:false,
  touchmove:function(e){
    e.preventDefault();

    this.guide = false;

    var cx = e.touches[0].clientX,
        cy = e.touches[0].clientY,
        xr = cx/viewWidth,
        yr = cy/viewHeight;
    this.wavePos.x=halfViewWidth+((halfViewWidth-cx)/halfViewWidth)*20;
    this.wavePos.y=halfViewHeight+((halfViewHeight-cy)/halfViewHeight)*20;
    this.pinchFilter.center = [xr,yr];
    this.mouse ={
      x:cx,
      y:cy
    };
    for( var i=0,tile,dx,dy;i< this.unselectedTiles.length;i++ ){
      tile = this.unselectedTiles[i];
      var pos = this.cont.toGlobal(tile.position);
      dx = pos.x-cx;
      dy = pos.y-cy;
      if(Math.sqrt(dx*dx+dy*dy)<30 )
      this.addSelectedTile(tile);
    }
  },
  loop:function(){
    if(this.pinchFilter){
      this.pinchFilter.radius = Math.sin( Date.now()*0.001 )*20+80;
    }
    if(!this.shaking){
        this.cont.x += (this.wavePos.x-this.cont.x)*.1;
        this.cont.y += (this.wavePos.y-this.cont.y)*.1;
    }
    this.linesCont.x += (this.wavePos.x-halfViewWidth-this.linesCont.x)*.1;
    this.linesCont.y += (this.wavePos.y-halfViewHeight-this.linesCont.y)*.1;
    var arr = this.mouse ? _.concat(this.linesData,this.mouse) : this.linesData;
    textureDrawGradientLine("lines",arr,false,["#ccff59","#30ffdf"],5);
    this.linesCont.texture.update();
  },
  guidePointer:null,
  guideTL:null,
  guide:true,
  playTimes:0,
  begin:function(){
    var i;

    this.qa = loaderQueue.getResult("qa");
    var _index;
    do{
      _index=_.random(1,4);
    }while(_index==this.index);

    this.index = _index;

    if(!this.pinchFilter){
      this.pinchFilter = new PIXI.filters.BulgePinchFilter([0,0],90,0);
      this.pinchFilter.strength = 0;
    }
    if( this.index==1 ) this.correctArray = [1,2,3,4,5,6,7,8,9,10];
    if( this.index==2 ) this.correctArray = [1,2,3,4,1,5,6,7,8,9,10];
    if( this.index==3 ) this.correctArray = [1,2,3,4,5,6,7,8,9,10,11];
    if( this.index==4 ) this.correctArray = [1,2,3,4,5,6,7,8,9];

    this.wavePos = {x:halfViewWidth,y:halfViewHeight};
    this.cont = new PIXI.Sprite();
    this.cont.x = halfViewWidth;
    this.cont.y = halfViewHeight;
    app.stage.filters = [this.pinchFilter];
    warp.allowTouch();

    app.stage.addChild(this.cont);
    var linesContCanvas = getTextureCanvas("lines").canvas;
    linesContCanvas.width = viewWidth;
    linesContCanvas.height = viewHeight;
    this.linesCont = new PIXI.Sprite(PIXI.Texture.fromCanvas(textureDrawGradientLine("lines",this.linesData,false,["#ccff59","#10fffb"],10)));
    app.stage.addChild( this.linesCont );

    this.btmline = createAnimatedSprite('line_json',15);
    this.btmline.anchor.set(0.5);
    this.btmline.x = halfViewWidth;
    this.btmline.y = viewHeight-70;
    this.btmline.loop = false;
    TweenMax.delayedCall( 0.8,this.btmline.play.bind(this.btmline) );
    this.btmline.scale.x = this.btmline.scale.y = 0.5;

    this.connecttitle = createAnimatedSprite("connecttitle_json",17);
    this.connecttitle.loop=false;
    this.connecttitle.anchor.set(0.5);
    this.connecttitle.x = halfViewWidth;
    this.connecttitle.y = 80;
    this.connecttitle.play();
    app.stage.addChild(this.connecttitle);

    for( i=0,split=5;i<this.correctArray.length;i++){
      var tian = new PIXI.Sprite( createTexture("tian") );
      tian.anchor.set(0.5);
      if(i<split){
        tian.x = ~~(i*70-this.btmline.width/2+25);
        tian.y = -30;
      }
      else{
        tian.x = ~~((i-split)*70-this.btmline.width/2+25-(this.correctArray.length-10)*35);
        tian.y = 60;
      }
      TweenMax.from(tian,0.3,{alpha:0,delay:i*0.05+0.8});
      this.btmline.addChild(tian);
    }

    for( i=this.correctArray.length-1;i<this.qa.length-1;i++ ){
      this.correctArray.push(_.random(1,9));
    }
    // this.correctArray = _.sampleSize(this.correctArray,20);
    if(this.index==1)this.correctArray = [3,6,1,2,1,4,3,4,10,6,5,9,7,8];
    if(this.index==2)this.correctArray = [1,6,4,2,8,1,3,7,9,5,6,10,2,4];
    if(this.index==3)this.correctArray = [1,2,4,3,8,9,5,7,9,2,6,10,3,11];
    if(this.index==4)this.correctArray = [1,5,2,4,8,3,4,5,9,5,6,7,9,8];



    this.btmline.addChild(tian);
    app.stage.addChild(this.btmline);

    for( i=0;i<this.qa.length;i++ ){
      var tile = createAnimatedSprite('tilequeue_json',25);
      tile.x = this.qa[i].x;
      tile.y = this.qa[i].y;
      tile.answer = this.correctArray[i];
      tile.loop = false;
      tile.anchor.set(0.5);
      var word = new PIXI.Sprite(createTexture("q"+this.index+this.correctArray[i]));
      word.scale.set(0.5);
      word.anchor.set(0.5);
      var delay = Math.random()*.8+0.5;
      TweenMax.from(word,0.5,{alpha:0,delay:delay+0.2});
      tile.addChild(word);
      TweenMax.delayedCall( delay,tile.play.bind(tile) );
      tile.interactive = true;
      this.cont.addChild( tile );
    }
    this.guidePointer = new PIXI.Sprite(createTexture("guidepointer"));
    this.guidePointer.position = this.cont.getChildAt(_.indexOf(this.correctArray,1)).position;
    this.guidePointer.x += halfViewWidth;
    this.guidePointer.y += halfViewHeight;
    var nextPos = this.cont.getChildAt(_.indexOf(this.correctArray,2)).position;
    var context = this;
    app.stage.addChild(this.guidePointer);

    this.guide = true;
    this.guideTL = new TimelineMax({onComplete:function(){
      if(context.guide){
        context.guideTL.restart();
      }
    }});

    this.guideTL.from(this.guidePointer,0.2,{alpha:0});
    this.guideTL.to(this.guidePointer,0.5,{x:nextPos.x+halfViewWidth,y:nextPos.y+halfViewHeight});
    this.guideTL.to(this.guidePointer,0.2,{alpha:0});
    this.guideTL.pause();
    TweenMax.delayedCall( 1,function(){
      context.guideTL.play();
    } );
    this.playTimes++;

    app.ticker.add(this.loop);
    document.addEventListener("touchstart", this.pointerDown);
    document.addEventListener("touchend", this.pointerUp);
  },
  in:function(){
    this.addSelectedTile = this.addSelectedTile.bind(this);
    this.touchmove = this.touchmove.bind(this);
    this.pointerDown = this.pointerDown.bind(this);
    this.pointerUp = this.pointerUp.bind(this);
    this.resize = this.resize.bind(this);
    this.out = this.out.bind(this);
    this.begin = this.begin.bind(this);
    this.check = this.check.bind(this);
    var context = this;
    this.intro2 = new PIXI.Sprite(createTexture("intro2"));
    this.intro2.scale.set(0.5);
    this.intro2.anchor.set(0.5);

    warp.in.bind(warp)();
    app.stage.addChild( this.intro2 );

    events.on('resize',this.resize);
    this.resize();

    TweenMax.from(this.intro2,1,{alpha:0,y:"+=20"});
    TweenMax.to(this.intro2,1,{alpha:0,delay:2,onComplete:function(){
      context.intro2.destroy();
      context.intro2 = null;
      context.begin();
    }});
    this.loop = this.loop.bind(this);
  },
  outCompletly:function(cb){
    app.stage.filters = null;
    this.linesCont.destroy();
    app.ticker.remove(this.loop);
    events.off('resize',this.resize);
    for(var i=0;i<this.selectedTiles.length;i++ ){
      spOut(this.selectedTiles[i],0.3,{alpha:0,delay:i*0.03});
    }
    TweenMax.delayedCall(i*0.06,this.cont.destroy.bind(this.cont));
    TweenMax.delayedCall(i*0.06+0.1,cb);
    this.cont = this.connecttitle = this.linesCont = null;
    this.linesData=[];
    this.selectedTiles=[];
    this.unselectedTiles=[];
  },
  out:function(){
    document.removeEventListener("touchmove", this.touchmove);
    document.removeEventListener("touchstart", this.pointerDown);
    document.removeEventListener("touchend", this.pointerUp);

    warp.out();
    TweenMax.delayedCall(0.7,logo.in.bind(logo),[this.index]);
    if(this.guideTL){
      this.guideTL.kill();
    }
    this.mouse = null;
    this.linesData = [];
    this.wavePos.x=halfViewWidth;
    this.wavePos.y=halfViewHeight;
    TweenMax.killTweensOf(this.pinchFilter,true);
    TweenMax.to( this.pinchFilter,0.3,{strength:0} );
    var i=0,tile,ex,ey;
    for( i;i<this.unselectedTiles.length;i++){
      tile = this.unselectedTiles[i];
      TweenMax.to( tile.scale,0.5,{x:0,y:0,delay:i*0.03,onComplete:tile.destroy.bind(tile)});
    }
    spOut(this.btmline,0.5,{y:viewHeight+100});
    spOut(this.connecttitle,0.8,{y:-100});
    for( i=0;i<this.selectedTiles.length;i++ ){
      tile = this.selectedTiles[i];
      tile.getChildAt(0).tint = 0xffffff;
      if( this.index==1 ) {
        ex = (i%5)*46-100+(i>4?23:0);
        ey = i>4?-160:-210;
      }
      if( this.index==3 || this.index==2){
        ex = (i%(i<6?5:6))*46-110+(i<5?23:0)+(i>5?46:0);
        ey = i>4?-160:-210;
      }
      if( this.index==4 ) {
        ex = (i%5)*46-90+(i>4?23:0);
        ey = i>4?-160:-210;
      }
      TweenMax.to( tile.scale,0.5,{x:0,y:0,delay:i*0.03} );
      TweenMax.set( tile,{
        x:ex,
        y:ey,
        delay:.9
      });
      TweenMax.to( tile.scale,0.5,{
        x:0.6,
        y:0.6,
        delay:i*0.03+0.9
      });
    }
  }
}

function spOut(sp,dur,opt){
  TweenMax.to( sp,dur||0.5, _.assign(opt,{onComplete:sp.destroy.bind(sp)}) );
}
function spScaleOut(sp,dur,scale,opt){
  TweenMax.to(sp.scale,dur,_.assign(opt,{x:scale,y:scale,onComplete:sp.destroy.bind(sp)}));
}

var introScene = {
  button:null,
  t1:null,
  t2:null,
  earth:null,
  resize:function(){

    this.button.y = viewHeight - 80;
    this.button.x = halfViewWidth;
    if( this.t1 ){
      this.t1.x = halfViewWidth;
    }
    if(this.t2){
      this.t2.x = halfViewWidth;
    }
    if(this.earth){
      this.earth.x = halfViewWidth;
      this.earth.y = viewHeight+this.earth.height+100;
      this.earth.height = viewWidth/this.earth.ow*this.earth.oh;
      this.earth.width = viewWidth;
    }

  },
  in:function(){
    this.resize = this.resize.bind(this);
    this.out = this.out.bind(this);

    logoanim = bodymovin.loadAnimation({
        container: document.getElementById('logo'),
        renderer: 'svg',
        loop: false,
        autoplay: false,
        rendererSettings: {
            progressiveLoad:false
        },
        path: 'logodata.json'
    });
    this.earth = new PIXI.Sprite(createTexture("earth"));
    this.earth.anchor.set(0.5,1);
    this.earth.ow = this.earth.width;
    this.earth.oh = this.earth.height;
    // this.earth.height = this.earth.width/viewWidth*this.earth.height;
    // this.earth.width = viewWidth;
    this.earth.y = viewHeight+this.earth.height+50;

    starry.in();
    app.stage.addChild(this.earth);

    this.walking = createAnimatedSprite('walking_json',38);
    this.walking.anchor.set(0.5);
    this.walking.scale.set(0.5);

    this.walking.play();
    app.stage.addChild(this.walking);

    this.t1 = new PIXI.Sprite(createTexture("introt1"));
    this.t1.scale.set(0.5);
    this.t1.anchor.set(0.5);
    this.t1.y=150;
    this.t2 = new PIXI.Sprite(createTexture("introt2"));
    this.t2.scale.set(0.5);
    this.t2.anchor.set(0.5);
    this.t2.y=270;
    app.stage.addChild(this.t1);
    app.stage.addChild(this.t2);

    this.button = new PIXI.Sprite(createTexture("buttonGo"));
    this.button.scale.set(0.5);
    this.button.anchor.set(0.5,1);
    this.button.interactive = true;
    this.button.on("pointerdown", this.out);
    app.stage.addChild( this.button );
    events.on('resize',this.resize);
    this.resize();
    this.walking.x = halfViewWidth;
    this.walking.y = viewHeight-this.earth.height*.62;

    TweenMax.from(this.walking, .6,{alpha:0,y:"+=20",delay:1});
    TweenMax.from(this.t1,0.6,{alpha:0,y:"+=30",delay:0.3});
    TweenMax.from(this.t2,0.6,{alpha:0,y:"+=30",delay:0.5});
    TweenMax.to(this.earth,1,{y:viewHeight,ease:Power2.easeOut});
    TweenMax.from(this.button,0.5,{y:viewHeight-60,alpha:0,delay:1.6,ease:Power3.easeOut});

  },
  out:function(){
    createjs.Sound.play("hit2");
    this.button.off("pointerdown",this.out);
    starsBG.out();
    var context = this;
    TweenMax.to([this.t1,this.t2],0.5,{alpha:0});
    TweenMax.to(this.button.scale,0.5,{x:0.3,y:0.3,ease:Power3.easeOut});
    TweenMax.to(this.button,0.5,{alpha:0,ease:Power3.easeOut});
    TweenMax.to(this.walking,0.5,{alpha:0,ease:Power3.easeOut});
    TweenMax.to(this.earth,0.8,{y:viewHeight+this.earth.height,ease:Power3.easeIn,onComplete:function(){
      events.off('resize',context.resize);
      context.button.destroy();
      context.earth.destroy();
      context.walking.destroy();
      context.t1.destroy();
      context.t2.destroy();
      connectScene.in.bind(connectScene)();
    }});
  }
}

var loadingScene = {
  loop:function(){

    var percent = ~~(percentText.text), context = this;

    if(percent<this.progress)
    percentText.text = Math.min(this.progress,percent+3);

    if( this.progress==100 && percent==100 ){
      TweenMax.delayedCall(0.3,function(){

      });
      this.out(introScene.in.bind(introScene));
      app.ticker.remove(this.loop);
    }
  },
  progress:0,
  in:function(){
    this.loop = this.loop.bind(this);
    loaderQueue=new createjs.LoadQueue(!0,imagePath,!0);
    loaderQueue.installPlugin(createjs.Sound);
    loaderQueue.addEventListener("complete",onLoadingComplete);
    loaderQueue.addEventListener("progress",onLoadingProgress);
    loaderQueue.loadFile({src:"js/pixi-filters.js",type:createjs.AbstractLoader.JAVASCRIPT});
    loaderQueue.loadFile({src:"js/pixi-shaders.js",type:createjs.AbstractLoader.JAVASCRIPT});
    loaderQueue.loadFile({src:"js/lodash.min.js",type:createjs.AbstractLoader.JAVASCRIPT});
    loaderQueue.loadFile({src:"js/orienter.js",type:createjs.AbstractLoader.JAVASCRIPT});
    loaderQueue.loadFile({src:"js/bodymovin.js",type:createjs.AbstractLoader.JAVASCRIPT});
    loaderQueue.loadFile({src:"assets/voice/1.mp3",id:'voice1',type:createjs.AbstractLoader.SOUND});
    loaderQueue.loadFile({src:"assets/voice/2.mp3",id:'voice2',type:createjs.AbstractLoader.SOUND});
    loaderQueue.loadFile({src:"assets/voice/3.mp3",id:'voice3',type:createjs.AbstractLoader.SOUND});
    loaderQueue.loadFile({src:"assets/voice/4.mp3",id:'voice4',type:createjs.AbstractLoader.SOUND});
    loaderQueue.loadFile({src:"assets/hit.mp3",id:'hit',type:createjs.AbstractLoader.SOUND});
    loaderQueue.loadFile({src:"assets/hit3.mp3",id:'hit2',type:createjs.AbstractLoader.SOUND});
    loaderQueue.loadFile({src:"assets/error.wav",id:'error',type:createjs.AbstractLoader.SOUND});
    loaderQueue.loadFile({src:"assets/tile.png",id:"tile"});
    loaderQueue.loadFile({src:"assets/tile.json",id:"tilequeue_json",type:createjs.AbstractLoader.JSON});
    loaderQueue.loadFile({src:"assets/walking.png",id:"walking"});
    loaderQueue.loadFile({src:"assets/walking.json",id:"walking_json",type:createjs.AbstractLoader.JSON});
    loaderQueue.loadFile({src:"assets/line.png",id:"line"});
    loaderQueue.loadFile({src:"assets/line.json",id:"line_json",type:createjs.AbstractLoader.JSON});
    loaderQueue.loadFile({src:"assets/connecttitle.png",id:"connecttitle"});
    loaderQueue.loadFile({src:"assets/connecttitle.json",id:"connecttitle_json",type:createjs.AbstractLoader.JSON});
    loaderQueue.loadFile({src:"assets/qa.json",id:"qa"});
    loaderQueue.loadFile({src:"assets/button-go.png",id:"buttonGo"});
    loaderQueue.loadFile({src:"assets/btn-jiesuo.png",id:"buttonAgain"});
    loaderQueue.loadFile({src:"assets/btn-tansuo.png",id:"buttonGoEnd"});
    loaderQueue.loadFile({src:"assets/btn-share.png",id:"buttonShare"});
    loaderQueue.loadFile({src:"assets/intro2.png",id:"intro2"});
    loaderQueue.loadFile({src:"assets/intro-t1.png",id:"introt1"});
    loaderQueue.loadFile({src:"assets/intro-t2.png",id:"introt2"});
    loaderQueue.loadFile({src:"assets/earth.png",id:"earth"});
    loaderQueue.loadFile({src:"assets/starry.jpg",id:"starry"})
    loaderQueue.loadFile({src:"assets/tian.png",id:"tian"});
    loaderQueue.loadFile({src:"assets/sharetitle.png",id:"sharetitle"});
    loaderQueue.loadFile({src:"assets/ball.png",id:"ball"});
    loaderQueue.loadFile({src:"assets/guidepointer.png",id:"guidepointer"});

    var q;
    for(q=1;q<=10;q++)loaderQueue.loadFile({src:"assets/q/q1"+q+".png",id:"q1"+q});
    for(q=1;q<=10;q++)loaderQueue.loadFile({src:"assets/q/q2"+q+".png",id:"q2"+q});
    for(q=1;q<=11;q++)loaderQueue.loadFile({src:"assets/q/q3"+q+".png",id:"q3"+q});
    for(q=1;q<=9;q++)loaderQueue.loadFile({src:"assets/q/q4"+q+".png",id:"q4"+q});

    percentText = new PIXI.Text("1",{fontSize:10,fill:0xffffff,align:"center"});
    percentText.anchor.set(0.5);
    app.stage.addChild(percentText);
    TweenMax.from(percentText,0.3,{alpha:0});

    var context = this;
    $(".percent").text(0);
    TweenMax.to($('.loading .parts'),0.6,{width:52,height:52,ease:Back.easeOut,
      onStart:function(){
        $(".loading").removeClass("displayNone");
      }
    });
    TweenMax.delayedCall(0.3,function(){
      $(".loading").addClass("loading_in");

    });
    app.ticker.add(this.loop);

    window.addEventListener("resize",onResize);
    onResize();
  },
  out:function(cb){
    app.ticker.remove(this.loop);
    spOut(percentText,0.4,{alpha:0});
    // percentText = null;
    TweenMax.to($('.loading'),0.4,{opacity:0,
      onComplete:function(){
        $(".loading").addClass("displayNone");
        cb();
      }
    });
  }
}

var logoScene = {
  graphics:null,
  loop:function(){
    var g = this.graphics;
    g.clear();
    var count = 0;
    for( var name in this.waves ){
      var w = this.waves[name];
      w.y = Math.sin( (Date.now()+count*80) * 0.01 ) * 5;
      g.beginFill( w.c );
      g.drawRoundedRect(w.x,w.y,w.w,w.h,5);
      g.endFill();
      count++;
    }
    this.count++;
  },
  count:0,
  animating:false,
  waves:[
    { c:0xffff00,x:-30,y:0,w:10,h:10 },
    { c:0xffff00,x:-15,y:0,w:10,h:10 },
    { c:0xffff00,x:0,y:0,w:10,h:10 },
    { c:0xffff00,x:15,y:0,w:10,h:10 },
    { c:0xffff00,x:30,y:0,w:10,h:10 }
  ],
  in:function(){
    this.graphics = new PIXI.Graphics();
    var g = this.graphics;
    g.x = window.innerWidth*.5;
    g.y = window.innerHeight*.5;
    g.interactive = true;
    g.on("pointerdown", function(){
      this.animating = !this.animating;
    }.bind(this));
    app.stage.addChild( this.graphics );
    app.ticker.add(this.loop.bind(this));
  },
  out:function(){

  }
};

var starsBG = {
  destroy:function(){
    app.ticker.remove(this.loop);
    app.stage.removeChild(this.starSP);
    this.starSP = null;
  },
  loop:function(){
    if( !this.animating && this.stars.length==0 ){
      return this.destroy();
    }
    textureDrawGradientLine("stars",this.getDrawableArray(),true,['rgba(255,255,255,.9)',"rgba(255,255,255,.7)","rgba(255,255,255,0)"],2);
    this.starSP.texture.update();
    for( var i=this.stars.length-1;i>=0;i-- ){
      var star = this.stars[i];
      var d1 = Math.sqrt(Math.abs(star.x1-star.ox)+Math.abs(star.y1-star.oy)),
          d2 = Math.sqrt(Math.abs(star.x2-star.ox)+Math.abs(star.y2-star.oy));
      if( d1>star.dist ){
        star.spd -= star.spd*.01;
      }
      else if(star.spd<star.maxSpd){
        star.spd += star.accSpd;
      }
      if( star.spd2<star.maxSpd )
      star.spd2 += star.accSpd*.4;
      star.x1 += star.cos*star.spd;
      star.y1 += star.sin*star.spd;
      star.x2 += star.cos*star.spd2;
      star.y2 += star.sin*star.spd2;

      if( d1 >= star.dist &&
          d2 >= star.dist && Math.abs( d1-d2 )<0.1 ){
        this.stars.splice(i,1);
      }
      if(star.x2<star.x1&&star.y2>star.y1){
        star.x2 = star.x1;
        star.y2 = star.y1;
      }
    }
  },
  animating:false,
  addStar:function(){
    this.interval && clearInterval( this.interval );
    if(this.animating) this.interval = setInterval( this.addStar, ~~(Math.random()*1000)+300 );
    var len = viewHeight/viewWidth;
    var x = Math.random()*viewWidth+halfViewWidth, y = Math.random()*len*x-halfViewHeight;
    var ang = Math.random()*0.3+2.15, ms = ~~(Math.random()*20+10);
    this.stars.push({
      ox:x,oy:y,
      x1:x,y1:y,
      x2:x,y2:y,
      dist:ms*0.7,
      spd:0,spd2:0,accSpd:1,maxSpd:ms,
      cos:Math.cos(ang),
      sin:Math.sin(ang)
    });
  },
  getDrawableArray:function(){
    var res = [];
    for( var i=0;i<this.stars.length;i++ ){
      var star = this.stars[i];
      res.push({x:star.x1,y:star.y1});
      res.push({x:star.x2,y:star.y2});
    }
    return res;
  },
  starSP:null,
  stars:[],
  interval:null,
  in:function(){
    this.animating = true;
    this.loop = this.loop.bind(this);
    this.addStar = this.addStar.bind(this);
    this.addStar();
    this.starSP = new PIXI.Sprite(PIXI.Texture.fromCanvas(textureDrawGradientLine( "stars",this.getDrawableArray(),true,["#a4ff6c","#13ffed"] )));
    this.starSP.width = window.innerWidth;
    this.starSP.height = window.innerHeight;
    app.stage.addChild( this.starSP );
    app.ticker.add(this.loop);
  },

  out:function(){
    this.animating = false;
  }
}

var galaxy = {
  filter:null,
  sp:null,
  count:0,
  spd:0.0005,
  speedup:function(){
    TweenMax.to(this,3,{spd:0.03,ease:Power2.easeIn});
  },
  loop:function(){
    // filter.uniforms.mouseX = mouse.x;
    // filter.uniforms.mouseY = mouse.y;
    this.filter.uniforms.time = this.count;
    this.count += this.spd;
  },
  resize:function(){
    this.sp.width = viewWidth;
    this.sp.height = viewHeight;
  },
  in:function(){
    this.loop = this.loop.bind(this);
    this.resize = this.resize.bind(this);
    this.filter = new SpaceWarpFilter();
    this.sp = new PIXI.Sprite();
    this.sp.filters = [this.filter];
    app.stage.addChild(this.sp);
    // app.ticker.add(this.loop);
    setInterval( this.loop, 100);

    TweenMax.from( this.filter.uniforms, 2, {distfading:0});

    events.on('resize',this.resize);
    this.resize();
  },
  out:function(){

  }
}


var MATHPI180 = Math.PI / 180;
var MATHPI2 = Math.PI * 2;
var warp = {
  starHolderCount:300,
  starDistance : 8000,
  starBgHolder:[],
  starHolder:[],
  mouseActive:false,
  starSpeed : 20,
  starSpeedMin : 20,
  starSpeedMax : 250,
  fov : 300,
  fovMin : 210,
  fovMax : 300,
  mobile:false,
  starRotation:0,
  mouseDown:false,
  container:null,
  mousePos:null,
  center : null,
  imageData : null,
  pix : null,
  backgroundColor : { r:0, g:0, b:0, a:0 },
  addParticle:function( x, y, z, ox, oy, oz ) {
    var particle = {};
    particle.x = x;
    particle.y = y;
    particle.z = z;
    particle.ox = ox;
    particle.oy = oy;
    particle.x2d = 0;
    particle.y2d = 0;
    return particle;

  },
  setPixel:function( x, y, r, g, b, a ){
    var i = ( x + y * viewWidth ) * 4;
    this.pix[ i ] = r;
    this.pix[ i + 1 ] = g;
    this.pix[ i + 2 ] = b;
    this.pix[ i + 3 ] = a;

  },
  setPixelAdditive:function(x, y, r, g, b, a){
    var i = ( x + y * viewWidth ) * 4;
    this.pix[ i ]     +=  r;
    this.pix[ i + 1 ] +=  g;
    this.pix[ i + 2 ] += b;
    this.pix[ i + 3 ] += a;
  },
  clearImageData:function() {
    for ( var i = 0, l = this.pix.length; i < l; i += 4 ) {
      this.pix[ i ] = this.backgroundColor.r;
      this.pix[ i + 1 ] = this.backgroundColor.g;
      this.pix[ i + 2 ] = this.backgroundColor.b;
      this.pix[ i + 3 ] = this.backgroundColor.a;
    }
  },
  rgba2hex:function(r, g, b, a) {
    if (r > 255 || g > 255 || b > 255 || a > 255) throw "Invalid color component";
    return (256 + r).toString(16).substr(1) +((1 << 24) + (g << 16) | (b << 8) | a).toString(16).substr(1);
  },
  drawLine(x1, y1, x2, y2, r, g, b, a){
    var dx = Math.abs( x2 - x1 );
    var dy = Math.abs( y2 - y1 );
    var sx = ( x1 < x2 ) ? 1 : -1;
    var sy = ( y1 < y2 ) ? 1 : -1;
    var err = dx - dy;
    var lx = x1;
    var ly = y1;

    while ( true ) {
      if ( lx > 0 && lx < viewWidth && ly > 0 && ly < viewHeight ) {
        this.setPixel( lx, ly, r, g, b, a );
      }
      if ( ( lx === x2 ) && ( ly === y2 ) )
        break;
      var e2 = 2 * err;
      if ( e2 > -dx ) {
        err -= dy;
        lx += sx;
      }
      if ( e2 < dy ) {
        err += dx;
        ly += sy;
      }
    }
  },
  render:function(){
    this.clearImageData();
    var i, j, l, k, m, n;
    var rx, rz;
    var star;
    var scale;
    //---

    if ( this.mouseActive ) {
      this.starSpeed += 2;
      if ( this.starSpeed > this.starSpeedMax )
        this.starSpeed = this.starSpeedMax;
    } else {
      this.starSpeed -= 1;
      if ( this.starSpeed < this.starSpeedMin )
        this.starSpeed = this.starSpeedMin;
    }

    if ( !this.mouseActive ) {
      this.fov += 0.5;
      if ( this.fov > this.fovMax )
        this.fov = this.fovMax;
    } else {
      this.fov -= 1;
      if ( this.fov < this.fovMin )
        this.fov = this.fovMin;
    }
    var warpSpeedValue;
    if ( this.mobile ) {
      warpSpeedValue = this.starSpeed * ( this.starSpeed / this.starSpeedMax );
    }
    else {
      warpSpeedValue = this.starSpeed * ( this.starSpeed / ( this.starSpeedMax / 2 ) );
    }
    for ( i = 0, l = this.starBgHolder.length; i < l; i++ ) {
      star = this.starBgHolder[ i ];

      scale = this.fov / ( this.fov + star.z );
      star.x2d = ( star.x * scale ) + this.center.x;
      star.y2d = ( star.y * scale ) + this.center.y;

      if ( star.x2d > 0 && star.x2d < viewWidth && star.y2d > 0 && star.y2d < viewHeight ) {
        this.setPixel( star.x2d | 0, star.y2d | 0, star.color.r, star.color.g, star.color.b, 255 );
      }
    }
    //---
    for ( i = 0, l = this.starHolder.length; i < l; i++ ) {
      star = this.starHolder[ i ];
      star.z -= this.starSpeed;
      star.distance += this.starSpeed;
      if ( star.z < -this.fov + star.w ) {
        star.z = this.starDistance;
        star.distance = 0;
      }
      var distancePercent = star.distance / star.distanceTotal;
      star.color.r = Math.floor( star.oColor.r * distancePercent );
      star.color.g = Math.floor( star.oColor.g * distancePercent );
      star.color.b = Math.floor( star.oColor.b * distancePercent );

      scale = this.fov / ( this.fov + star.z );

      star.x2d = ( star.x * scale ) + this.center.x;
      star.y2d = ( star.y * scale ) + this.center.y;

      if ( star.x2d > 0 && star.x2d < viewWidth && star.y2d > 0 && star.y2d < viewHeight ) {
        this.setPixelAdditive( star.x2d | 0, star.y2d | 0, star.color.r, star.color.g, star.color.b, 255 );
      }

      if ( this.starSpeed != this.starSpeedMin ) {
        var nz = star.z + warpSpeedValue;
        scale = this.fov / ( this.fov + nz );
        var x2d = ( star.x * scale ) + this.center.x;
        var y2d = ( star.y * scale ) + this.center.y;
        if ( x2d > 0 && x2d < viewWidth && y2d > 0 && y2d < viewHeight ) {
          this.drawLine( star.x2d | 0, star.y2d | 0, x2d | 0, y2d | 0, star.color.r, star.color.g, star.color.b, 255 );
        }
      }
      if ( this.mouseDown ) {
        var radians = MATHPI180 * this.starRotation;
        var cos = Math.cos( radians );
        var sin = Math.sin( radians );
        star.x = ( cos * ( star.ox - this.center.x ) ) + ( sin * ( star.oy - this.center.y ) ) + this.center.x,
        star.y = ( cos * ( star.oy - this.center.y ) ) - ( sin * ( star.ox - this.center.x ) ) + this.center.y;
      }
    }
    getTextureCanvas("warp",true).ctx.putImageData( this.imageData, 0, 0 );

    if ( this.mouseActive ) {
      this.center.x += ( this.mousePos.x - this.center.x ) * 0.015;
    } else {
      this.center.x += ( halfViewWidth - this.center.x ) * 0.015;

    }
    if ( this.mouseDown ) {
      this.starRotation -= 0.5;
    }
    this.container.texture.update();
  },
  addParticles:function(){
    var i;
    var x, y, z;
    var colorValue;
    var particle;
    for ( i = 0; i < this.starHolderCount / 3; i++ ) {
      x = Math.random() * 24000 - 12000;
      y = Math.random() * 4500 - 2250;
      z = Math.round( Math.random() * this.starDistance );//Math.random() * 700 - 350;
      colorValue = Math.floor( Math.random() * 55 ) + 5;
      particle = this.addParticle( x, y, z, x, y, z );
      particle.color = { r:colorValue, g:colorValue, b:colorValue, a:255 };
      this.starBgHolder.push( particle );
    }

    for ( i = 0; i < this.starHolderCount; i++ ) {
      x = Math.random() * 10000 - 5000;
      y = Math.random() * 10000 - 5000;
      z = Math.round( Math.random() * this.starDistance );
      colorValue = Math.floor( Math.random() * 155 ) + 100;
      particle = this.addParticle( x, y, z, x, y, z );
      particle.color = { r:colorValue, g:colorValue, b:colorValue, a:255 };
      particle.oColor = { r:colorValue, g:colorValue, b:colorValue, a:255 };
      particle.w = 1;
      particle.distance = this.starDistance - z;
      particle.distanceTotal = Math.round( this.starDistance + this.fov - particle.w );
      this.starHolder.push( particle );
    }
  },
  touchStartHandler:function(event){
    event.preventDefault();
    event.stopPropagation();
    this.mouseDown = true;
    this.mouseActive = true;
  },
  touchEndHandler:function(event){
    event.preventDefault();
    event.stopPropagation();
    this.mouseDown = false;
    this.mouseActive = false;
  },
  touchMoveHandler:function(event){
    event.preventDefault();
    event.stopPropagation();
    this.mousePos = {
      x:event.touches[0].clientX,
      y:event.touches[0].clientY
    };
  },
  touchCancelHandler:function(event){
    this.mouseDown = false;
    this.mouseActive = false;
  },
  resize:function(){
    var textureCanvas = getTextureCanvas("warp",true);
    this.imageData = textureCanvas.ctx.getImageData( 0, 0, viewWidth,viewHeight );
    this.pix = this.imageData.data;
  },
  in:function(){
    this.render = this.render.bind(this);
    this.addParticles = this.addParticles.bind(this);
    this.addParticle = this.addParticle.bind(this);
    this.setPixelAdditive = this.setPixelAdditive.bind(this);
    this.setPixel = this.setPixel.bind(this);
    this.drawLine = this.drawLine.bind(this);
    this.touchStartHandler = this.touchStartHandler.bind(this);
    this.touchEndHandler = this.touchEndHandler.bind(this);
    this.touchMoveHandler = this.touchMoveHandler.bind(this);
    this.touchCancelHandler = this.touchCancelHandler.bind(this);
    this.clearImageData = this.clearImageData.bind(this);
    this.resize=this.resize.bind(this);
    this.allowTouch=this.allowTouch.bind(this);

    this.mousePos = {x:halfViewWidth,y:halfViewHeight};
    this.center = {x:halfViewWidth, y:halfViewHeight};
    this.imageData = getTextureCanvas("warp",true).ctx.getImageData( 0, 0, viewWidth,viewHeight );
    this.pix = this.imageData.data;

    this.container = new PIXI.Sprite(PIXI.Texture.fromCanvas(getTextureCanvas("warp",true).canvas));
    this.container.blendMode = PIXI.BLEND_MODES.ADD;
    app.stage.addChild(this.container);
    this.container.width = viewWidth;
    this.container.height = viewHeight;

    events.on('resize',this.resize);
    this.resize();

    this.addParticles();
    app.ticker.add( this.render );
  },
  allowTouch:function(){
    document.addEventListener( 'touchstart', this.touchStartHandler, false );
    document.addEventListener( 'touchend', this.touchEndHandler, false );
    document.addEventListener( 'touchmove', this.touchMoveHandler, false );
    document.addEventListener( 'touchcancel',this. touchCancelHandler, false );
  },
  out:function(){
    this.starSpeed = 20;
    this.starSpeedMin = 20;
    this.mouseDown = false;
    this.mouseActive = false;
    document.removeEventListener( 'touchstart', this.touchStartHandler, false );
    document.removeEventListener( 'touchend', this.touchEndHandler, false );
    document.removeEventListener( 'touchmove', this.touchMoveHandler, false );
    document.removeEventListener( 'touchcancel',this. touchCancelHandler, false );
    events.off('resize',this.resize);
    app.ticker.remove(this.render);
    spOut(this.container,0.5,{alpha:0});
  }
}


var attractiveStars = {
  attrStars:[],
  hole:{x:200,y:200},
  power:0.3,
  cont:null,
  attract:function(star){
    var angle,  cx, cy, lax, lay,jl;
    cx = this.hole.x - star.x;
    cy = this.hole.y - star.y;
    cx *= .01;
    cy *= .01;
    angle = Math.atan(cx / cy)*.9;
    // star.angle += (angle-star.angle)*0.5;
    jl = Math.sqrt(cx * cx + cy * cy);
    power = this.power;
    lax = Math.abs(power * Math.sin(angle));
    lay = Math.abs(power * Math.cos(angle));
    star.vx += cx > 0 ? lax : -lax;
    star.vy += cy > 0 ? lay : -lay;
  },
  move:function(star){
    var maxSpeed = star.ms;
    star.vx = Math.abs(star.vx) > maxSpeed ? maxSpeed * Math.abs(star.vx) / star.vx : star.vx;
    star.vy = Math.abs(star.vy) > maxSpeed ? maxSpeed * Math.abs(star.vy) / star.vy : star.vy;
    star.oldx = star.x;
    star.oldy = star.y;
    star.x += star.vx;
    star.y += star.vy;
  },
  addStar:function(x,y){
    this.attrStars.push({angle:0,ms:Math.random()*4+4,vx:0,vy:0,r:3,x:x,y:y,oldx:x,oldy:y,color:"#a2ff6f"});
  },
  draw:function(star){
    var tc = getTextureCanvas("attractStarsBuffer");
    tc.ctx.save();
    tc.ctx.strokeStyle = star.color;
    tc.ctx.lineCap = tc.ctx.lineJoin = "round";
    tc.ctx.lineWidth = star.r;
    tc.ctx.beginPath();
    tc.ctx.moveTo(star.oldx - star.r, star.oldy - star.r);
    tc.ctx.lineTo(star.x - star.r, star.y - star.r);
    tc.ctx.stroke();
    tc.ctx.restore();
  },
  loop:function(){
    var tc = getTextureCanvas("attractStars");
    var tcBuffer = getTextureCanvas("attractStarsBuffer");
    tcBuffer.ctx.save();
    tcBuffer.ctx.globalCompositeOperation = 'destination-out';
    tcBuffer.ctx.globalAlpha = 0.15;
    tcBuffer.ctx.fillRect(0, 0, tcBuffer.canvas.width, tcBuffer.canvas.height);
    tcBuffer.ctx.restore();
    tc.ctx.clearRect( 0,0,tc.canvas.width,tc.canvas.height );

    for( var i=0,star;i<this.attrStars.length;i++ ){
      star = this.attrStars[i];
      this.attract(star);
      this.move(star);
      this.draw(star);
    }
    tc.ctx.drawImage(tcBuffer.canvas, 0, 0);
    this.cont.texture.update();
  },
  in:function(){
    this.loop = this.loop.bind(this);
    this.addStar = this.addStar.bind(this);
    this.attract = this.attract.bind(this);
    this.move = this.move.bind(this);
    this.draw = this.draw.bind(this);

    for( var i=0;i<20;i++ ){
      this.addStar(Math.random()*viewWidth-halfViewWidth,Math.random()*viewHeight-halfViewHeight);
    }
    var tcBuffer = getTextureCanvas("attractStarsBuffer");
    tcBuffer.canvas.width = viewWidth;
    tcBuffer.canvas.height = 500;

    var tc = getTextureCanvas("attractStars");
    tc.canvas.width = viewWidth;
    tc.canvas.height = 500;

    this.cont = new PIXI.Sprite(PIXI.Texture.fromCanvas(getTextureCanvas("attractStars").canvas));
    // this.cont.scale.set(window.devicePixelRatio);
    app.stage.addChild( this.cont );

    app.ticker.add(this.loop);
  }
}

var starry = {
  sky:null,
  olon:null,
  olat:null,
  wave:{x:0,y:0},
  resize:function(){
    this.wave.x = this.sky.x = halfViewWidth;
    this.wave.y = this.sky.y = halfViewHeight;
    this.sky.width = this.sky.oh/viewHeight*viewWidth;
    this.sky.height = viewHeight;
  },
  onOrient:function(o){

    if(!this.olon)this.olon = o.lon;
    var lon = Math.abs(o.lon-this.olon),
        lat = Math.abs(o.lat-this.olat),
        marginx = (this.sky.width-viewWidth)/2,
        marginy = (this.sky.height-viewHeight)/2;

    if(lon<180){
      this.wave.x = -Math.min(1,lon/45)*marginx + halfViewWidth;
    }
    else{
      this.wave.x = Math.min(1,(360-lon)/45)*marginx + halfViewWidth;
    }
    if(lat<180){
      this.wave.y = -Math.min(1,lat/45)*marginy + halfViewHeight;
    }
    else{
      this.wave.y = Math.min(1,(360-lat)/45)*marginy + halfViewHeight;
    }

  },
  loop:function(){

    this.sky.x += (this.wave.x-this.sky.x)*0.02;
    this.sky.y += (this.wave.y-this.sky.y)*0.02;
  },
  in:function(){
    this.logger = document.createElement("div");
    this.logger.style.position="absolute";
    this.logger.style.color="#fff";
    this.logger.style.right = "0";
    document.body.appendChild(this.logger);

    this.resize = this.resize.bind(this);
    this.onOrient = this.onOrient.bind(this);
    this.loop = this.loop.bind(this);

    this.sky = new PIXI.Sprite(createTexture("starry"));
    this.sky.anchor.set(0.5);
    this.sky.oh = this.sky.height;
    this.sky.width = this.sky.height/viewHeight*viewWidth;
    this.sky.height = viewHeight;
    TweenMax.from(this.sky,1,{alpha:0});
    app.stage.addChild(this.sky);
    app.stage.swapChildren( starsBG.starSP,this.sky );

    app.ticker.add(this.loop);
    events.on("resize",this.resize);
    events.on("orient",this.onOrient);
    this.resize();
  }
}

var maxVolume = 0.8;

var playRipple = TweenMax.to($("#ripple"),1,{width:280,height:280,alpha:0,marginLeft:-140,marginTop:-140,
  onComplete:function(){
    if(logo.complete) {
      $("#logoRipple").addClass("displayNone");
      return;
    }
    playRipple.restart();
  }
});

playRipple.pause();



var logo ={
  complete:false,
  playing:false,
  sound:null,
  index:0,
  btnAgain:null,
  btnGoEnd:null,
  dom:document.getElementById("logo"),
  soundPlayComplete:function(){
    if($(".voice").hasClass("on")) startBGM();

    this.sound.removeEventListener("complete",this.soundPlayComplete);
    this.complete = true;
    logoanim.goToAndStop(200,true);
    // this.out();
  },
  enterframe:function(){
    if(logoanim.currentFrame>=200){
      if(this.complete){
        this.playing = false;
        if(logoanim.currentFrame>380){
          logoanim.onEnterFrame = null;
          this.dom.style.display = "none";
        }
        return;
      }
      logoanim.goToAndPlay(110,true);
    }
  },
  playSound:function(){
    if(this.playing) return;
    if(!bgm.paused) startBGM();

    $("#logoRipple").removeClass("displayNone");
    playRipple.restart();

    this.playing = true;
    this.sound = createjs.Sound.play("voice"+this.index);
    this.sound.addEventListener("complete",this.soundPlayComplete);
    this.complete = false;
    logoanim.goToAndPlay(110,true);
  },
  resize:function(){
    this.btnAgain.y = this.btnGoEnd.y = viewHeight-80;
    if(connectScene.playTimes==2){
      this.btnGoEnd.x = halfViewWidth;
    }
    else{
      this.btnAgain.x = halfViewWidth-85;
      this.btnGoEnd.x = halfViewWidth+85;
    }
  },
  playAgain(){
    starlinks.out();
    createjs.Sound.play("hit2");
    TweenMax.to(this.sound,0.5,{volume:0});
    this.soundPlayComplete();
    this.out();
    logoanim.onEnterFrame = null;
    connectScene.outCompletly( connectScene.in.bind(connectScene) );
    // connectScene.in();
    //
  },
  goEnd(){
    createjs.Sound.play("hit2");
    TweenMax.to(this.sound,0.5,{volume:0});
    this.soundPlayComplete();
    this.out();
    connectScene.outCompletly( shareScene.in.bind(shareScene) );
  },
  rippleInterval:null,
  in:function(index){
    this.index = index;
    this.soundPlayComplete = this.soundPlayComplete.bind(this);
    this.in = this.in.bind(this);
    this.playSound = this.playSound.bind(this);
    this.out = this.out.bind(this);
    this.enterframe = this.enterframe.bind(this);
    this.resize = this.resize.bind(this);
    this.playAgain = this.playAgain.bind(this);
    this.goEnd = this.goEnd.bind(this);
    this.dom.style.display = "block";
    logoanim.setSpeed(1);
    logoanim.onEnterFrame = this.enterframe;
    logoanim.loop = false;
    logoanim.goToAndPlay(1,true);

    this.rippleInterval = setTimeout(function(){
      $("#logoRipple").removeClass("displayNone");
      playRipple.restart();
    },800);


    this.playing = true;
    this.complete = false;
    this.btnAgain = new PIXI.Sprite(createTexture("buttonAgain"));
    this.btnAgain.interactive = true;
    this.btnAgain.on("pointerdown",this.playAgain);
    this.btnAgain.scale.set(0.5);
    this.btnAgain.anchor.set(0.5);
    this.btnGoEnd = new PIXI.Sprite(createTexture("buttonGoEnd"));
    this.btnGoEnd.scale.set(0.5);
    this.btnGoEnd.anchor.set(0.5);
    this.btnGoEnd.interactive = true;
    this.btnGoEnd.on("pointerdown",this.goEnd);
    app.stage.addChild(this.btnAgain);
    app.stage.addChild(this.btnGoEnd);


    if(connectScene.playTimes==2){
      this.btnAgain.visible = false;
    }

    events.on("resize",this.resize);
    this.resize();
    TweenMax.from([this.btnAgain,this.btnGoEnd],0.5,{
      y:"+=30",alpha:0,delay:"+=0.2"
    });
    this.sound = createjs.Sound.play("voice"+index);

    stopBGM();
    // if(!bgm.paused) bgmVolumeTo(Math.min(0.2,maxVolume));
    this.sound.addEventListener("complete",this.soundPlayComplete);
    this.dom.addEventListener("touchstart",this.playSound);

    starlinks.in();
  },
  out:function(){
    clearTimeout(this.rippleInterval);
    this.rippleInterval = null;

    this.sound = null;
    events.off("resize",this.resize);
    this.btnAgain.off("pointerdown",this.playAgain);
    this.btnGoEnd.off("pointerdown",this.goEnd);
    this.dom.removeEventListener("touchstart",this.playSound);
    logoanim.goToAndPlay(325,true);
    var context=this;
    spOut(this.btnAgain,0.3,{alpha:0});
    spOut(this.btnGoEnd,0.3,{alpha:0});
  }
}

function spScaleIn(sp,dur,scale,opt){
  TweenMax.from(sp.scale,dur,_.assign(opt||{},{x:scale,y:scale}));
}
function spScaleInWithAlpha(sp,dur,scale,opt){
  spScaleIn(sp,dur,scale);
  TweenMax.from(sp,dur,_.assign(opt||{},{alpha:0}));
}
var shareScene = {
  sharebtn:null,
  sharetitle:null,
  ball:null,
  graphics:null,
  text:null,
  resize:function(){
    this.ball.x = this.sharetitle.x = this.sharebtn.x = halfViewWidth;
    this.ball.y = 200;
    this.sharebtn.y = viewHeight-200;
    this.sharetitle.y = 200;
  },
  showshare:function(){
    if(starlinks.isOuting||starlinksGuide.isOuting)return;
    this.graphics.visible = true;

    this.text = new PIXI.Text('点击右上角分享',  {fontSize:16,fill:0x00f9f9});
    this.text.anchor.set(1,0);
    this.text.x = viewWidth-55;
    this.text.y = 22;
    app.stage.addChild(this.text);
    TweenMax.from(this.text,0.5,{alpha:0});

    starlinks.out();
    starlinksGuide.in();
    TweenMax.to(this.graphics,0.8,{alpha:1});
  },
  hideshare:function(){
    if(starlinks.isOuting||starlinksGuide.isOuting)return;
    if(this.text){
      TweenMax.killTweensOf(this.text);
      app.stage.removeChild(this.text);
      this.text = null;
    }
    var context = this;
    starlinks.in();
    starlinksGuide.out();
    TweenMax.to(this.graphics,0.8,{alpha:0,onComplete:function(){
      context.graphics.visible = false;
    }});
  },
  in:function(){
    this.hideshare = this.hideshare.bind(this);
    this.showshare = this.showshare.bind(this);
    this.resize = this.resize.bind(this);

    this.sharetitle = new PIXI.Sprite( createTexture("sharetitle") );
    this.sharetitle.scale.set(0.5);
    this.sharetitle.anchor.set(0.5);
    app.stage.addChild(this.sharetitle);

    this.ball = new PIXI.Sprite( createTexture("ball") );
    this.ball.scale.set(0.5);
    this.ball.anchor.set(0.5);
    app.stage.addChild(this.ball);

    this.graphics = new PIXI.Graphics();
    this.graphics.beginFill(0,0.7);
    this.graphics.drawRect(0,0,viewWidth,viewHeight);
    this.graphics.endFill();
    this.graphics.interactive = true;
    this.graphics.alpha = 0;
    this.graphics.visible = false;
    this.graphics.on("pointerdown",this.hideshare);
    app.stage.addChild(this.graphics);

    this.sharebtn = new PIXI.Sprite( createTexture("buttonShare") );
    this.sharebtn.interactive = true;
    this.sharebtn.scale.set(0.5);
    this.sharebtn.anchor.set(0.5);
    this.sharebtn.on("pointerdown",this.showshare);
    app.stage.addChild(this.sharebtn);



    events.on("resize",this.resize);
    this.resize();

    $("#qrcode").attr("style","display:block");

    starsBG.in();


    spScaleInWithAlpha(this.sharetitle,0.5,0.7,{y:"+=30",ease:Power2.easeOut});
    spScaleInWithAlpha(this.ball,0.5,0.7);
    spScaleInWithAlpha(this.sharebtn,0.5,0.7,{delay:0.1});
  },
  out:function(){

  }
}

function distance(p1,p2){
  var dx = p1.x-p2.x,
      dy = p1.y-p2.y;
  return Math.sqrt(dx*dx+dy*dy);
}


var starlinks = {
  particles:[],num:20,graphics:null,maxLineAlpha:1,
  isOuting:false,
  loop:function(){
    this.graphics.clear();
    for(var i=0,d,p,p2,j;i<this.num;i++){
      p=this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if( p.x>viewWidth )p.vx = Math.min(p.vx,-p.vx);
      if( p.x<0 )p.vx = Math.max(p.vx,-p.vx);
      if( p.y>viewHeight )p.vy = Math.min(p.vy,-p.vy);
      if( p.y<0 )p.vy = Math.max(p.vy,-p.vy);
      this.graphics.beginFill(p.color,1);
      this.graphics.drawCircle(p.x,p.y,p.r);
      this.graphics.endFill();
      for( j=i;j<this.num;j++){
        p2 = this.particles[j];
        d = distance(p,p2);
        if(j!=i && d<100){
          this.graphics.lineStyle(1,p.color,Math.min(this.maxLineAlpha,1-d/100));
          this.graphics.moveTo(p.x,p.y)
          this.graphics.lineTo(p2.x,p2.y)
        }
      }
    }
  },
  in:function(){
    this.loop = this.loop.bind(this);
    this.out = this.out.bind(this);
    this.maxLineAlpha = 1;
    this.isOuting = true;
    var context = this;
    for(var i=0,p;i<this.num;i++) {
      p = {
        r:Math.random()*3+3, color:0x2CFFFE, x:Math.random()*viewWidth, y:Math.random()*viewHeight, vx:Math.random()*2-1,vy:Math.random()*2-1
      };
      TweenMax.from(p,0.3,{r:0,onComplete:function(){
        context.isOuting = false;
      }});
      this.particles.push(p);
    }
    this.graphics = new PIXI.Graphics;
    app.stage.addChild(this.graphics);
    app.ticker.add(this.loop);
  },
  out:function(){
    this.isOuting = true;
    for(var i=0;i<this.num;i++)
    TweenMax.to(this.particles[i],0.3,{r:0,delay:i*0.005});
    var context = this;
    TweenMax.to(this,0.3,{maxLineAlpha:0});
    TweenMax.delayedCall(0.8,function(){
      app.ticker.remove(context.loop);
      context.particles = [];
      context.graphics.destroy();
      context.isOuting = false;
    })
  }
}
var starFormat = [{x:73,y:338},
{x:103,y:363},
{x:61,y:322},
{x:91,y:320},
{x:124,y:334},
{x:190,y:350},
{x:167,y:298},
{x:134,y:302},
{x:116,y:287},
{x:72,y:291},
{x:100,y:241},
{x:179,y:318},
{x:208,y:258},
{x:180,y:277},
{x:164,y:265},
{x:176,y:258},
{x:148,y:211},
{x:120,y:207},
{x:184,y:213},
{x:202,y:201},
{x:171,y:192},
{x:145,y:163},
{x:166,y:162},
{x:190,y:171},
{x:217,y:152},
{x:189,y:144},
{x:237,y:92},
{x:212,y:89},
{x:221,y:43},
{x:234,y:70},
{x:262,y:21},
{x:276,y:1}];
var starlinksGuide = {
  isOuting:false,
  particles:[],num:starFormat.length,graphics:null,maxLineAlpha:1,
  loop:function(){
    this.graphics.clear();
    for(var i=0,d,p,p2,j;i<this.num;i++){
      p=this.particles[i];
      if(!this.isOut){
        p.r = (Math.sin(Date.now()*0.004-i*0.15)+1)*2+1;
      }
      this.graphics.beginFill(p.color,1);
      this.graphics.drawCircle(p.x,p.y,p.r);
      this.graphics.endFill();
      if(i<this.num-1){
        p2 = this.particles[i+1];
          this.graphics.lineStyle(1,p.color,Math.min(this.maxLineAlpha,(p2.r-p.r)/1));
          this.graphics.moveTo(p.x,p.y)
          this.graphics.lineTo(p2.x,p2.y)

      }
    }
  },
  in:function(){
    var context = this;
    this.loop = this.loop.bind(this);
    this.out = this.out.bind(this);
    this.maxLineAlpha = 1;
    for(var i=0,p;i<this.num;i++) {
      this.particles.push({
        r:Math.random()*2+1, or:Math.random()+1,color:0x2CFFFE, x:starFormat[i].x, y:starFormat[i].y, vx:0,vy:0
      });
    }
    this.graphics = new PIXI.Graphics;
    this.graphics.x = 90;
    shareScene.graphics.addChild(this.graphics);
    app.ticker.add(this.loop);
  },
  out:function(){
    this.isOuting = true;
    for(var i=0;i<this.num;i++)
    TweenMax.to(this.particles[i],0.3,{r:0,delay:i*0.005});
    var context = this;
    TweenMax.to(this,0.3,{maxLineAlpha:0});
    TweenMax.delayedCall(0.8,function(){
      app.ticker.remove(context.loop);
      context.particles = [];
      context.graphics.destroy();
      context.isOuting = false;
    })
  }
}

$(document).on('touchmove',function(e){
  e.preventDefault();
})
$(document).ready(function() {
  loadingScene.in.bind(loadingScene)();

  $(".voice").tap(function(){
    $(this).toggleClass('on');
    if($(this).hasClass('on')){
      maxVolume = 0.8;
      // bgmVolumeTo(maxVolume);
      startBGM();
    }
    else{
      stopBGM();
      maxVolume = 0;
      // bgmVolumeTo(maxVolume,{onComplete:function(){
      //   bgm.paused = true;
      // }});
    }

  })
  starsBG.in();
  // starlinksGuide.in();
  // attractiveStars.in();
});


// app.ticker.add(function(){
//   stats.update();
// });


function showRot() {
    if ($(window).width() > $(window).height()) {
        $("#ROT").show()
        app.stop();
    } else {
        $("#ROT").hide();
        app.start();
    }
}

showRot();
window.addEventListener('resize', showRot);


function preventBehavior(e) {
  e.preventDefault(); 
};
document.addEventListener("touchmove", preventBehavior, {passive: false});
///

PIXI.settings.TARGET_FPMS = 0.04;
PIXI.settings.RENDER_OPTIONS.autoResize = true;
PIXI.utils.skipHello();


// var stats = new Stats();
// document.body.appendChild( stats.dom );
var app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  resolution:window.devicePixelRatio,
  transparent:true
});
document.getElementById("container").appendChild(app.view);

var container = new PIXI.Container();
app.stage.addChild( container );
var pixelsize = new PIXI.Point(0,0);
var pixelfilter = new PIXI.filters.PixelateFilter(pixelsize);
// container.filters = [ pixelfilter ];
// pixelsize.x = pixelsize.y = 40;


function pixelIn( fast ){
  pixelsize.set(100,100);
  container.filters = [ pixelfilter ];
  TweenMax.to(pixelsize,fast ? 0 : 0.5,{x:0.1,y:0.1,ease:Cubic.easeOut,onComplete:function(){
    container.filters = [];
  }});
}
function pixelOut(cb){
  pixelsize.set(1,1);
  container.filters = [ pixelfilter ];
  TweenMax.to(pixelsize,0.5,{x:100,y:100,ease:Cubic.easeIn,onComplete:function(){
    cb && cb();
  }});
}


var events = new PIXI.utils.EventEmitter(),
    _canvas = document.createElement('canvas'),
    _ctx = _canvas.getContext('2d'),
    _canvasTextures = {};
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

var _textures = {};
function createTexture( image,frame,orig,trim ){
  if( !_textures[image] ){
    var texture=loadingScene.loader.getResult(image,frame,orig,trim);
    if(!texture)return null;
    _textures[image]= new PIXI.BaseTexture( texture );
  }
  return new PIXI.Texture(_textures[image]);
}

function createAnimatedSprite( id,frameNums ){
  var json = loadingScene.loader.getResult(id);
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
var viewWidth = window.innerWidth,viewHeight=window.innerHeight,
halfViewWidth=window.innerWidth*.5,halfViewHeight=window.innerHeight*.5,
oWidth = 750, oWidthHalf = 375, oHeight = 1334, oHeightHalf = oHeight/2,normalDivide = 0.562;
function onResize(){
  setTimeout(function(){
    viewWidth = window.innerWidth;
    viewHeight = window.innerHeight;
    var divide = viewWidth / 750;
    if( viewWidth/viewHeight>=normalDivide ){
      divide = viewHeight/1334;
    }
    container.scale.y = container.scale.x = divide;
    container.x = (viewWidth-750*divide)/2;
    container.y = (viewHeight-1334*divide)/2;

    viewWidth *= divide;
    viewHeight *= divide;
    halfViewWidth = viewWidth/2;
    halfViewHeight = viewHeight/2;

    app.renderer.resize(window.innerWidth,window.innerHeight);
    events.emit('resize', viewWidth, viewHeight);
  },300);
}

var pagemanager = function(){
  this.history=[];
  this.index = -1;
}
var pmp = pagemanager.prototype;
pmp.pageTo=function(page,data,replace){
  this.switchToNextPage({
    page:page,data:data
  },replace);
}
pmp.goBack = function(){
  return this.pageIndexTo(this.index-1);
}
pmp.pageIndexTo = function(ind){
  if(ind<0 || ind>this.history.length-1 || this.outing || this.index===ind ) return false;
  if(this.switchToNextPage(this.history[ind],true)){
    this.index = ind;
  }
}
pmp.outCurrentPage = function(then){
  function outed(){
    this.outing = false;
    then();
  }
  this.history[this.index].page.out(outed.bind(this));
}
pmp.inNextPage = function(replace){
  this.nextPage && this.nextPage.in(this.nextPageData);
  var insert = { page:this.nextPage,data:this.nextPageData };
  if(replace){
    this.history[this.index] = insert;
  }
  else{
    this.index>=0 && this.history.splice(this.index+1,this.history.length);
    this.history[++this.index] = insert;
  }

}
pmp.switchToNextPage = function(next,replace){
  if(this.index>-1 && this.history[this.index].page.name == next.page.name) return false;
  this.nextPage = next.page;
  this.nextPageData = next.data;
  if(this.outing) return false;
  if(this.index>=0){
    this.outing = true;

    this.outCurrentPage((function(ctx){
      return function(){
        ctx.inNextPage.call(ctx,replace)
      }
    })(this));
  }
  else{
    this.inNextPage(replace);
  }
  return true;
}
var pm = new pagemanager();
function clamp(min, value ,max) {
  return Math.min(Math.max(value, min), max);
};
function sign(value){
  return value>0 ? 1 : (value===0?0:-1);
}
var loadingScene = {
  name:"loadingscene",
  preloadComplete: function(){
    this.loader.off('complete');

    this.logo = cSprite("loading-logo")._anc(0.5)._pos(oWidthHalf,oHeightHalf)._apt(this.container);
    this.perc = cText("0%",'#ffffff',32)._pos(oWidthHalf-this.logo.width/2,oHeightHalf+65)._apt(this.container);

    var ctx = this;
    this.tl = new TimelineMax({
      onComplete:function(){
        ctx.loader = new createjs.LoadQueue(false,'assets/');
        ctx.loader.on('progress', ctx.onProgress.bind(ctx), ctx);
        ctx.loader.loadManifest(ctx.manifest);
      }
    });
    this.tl.from( [this.logo,this.perc], .1, {alpha:0,ease:Linear.easeNone});
  },
  onProgress:function(e){
    this.perc.text = ~~(e.progress*100) + "%";
    if(e.progress===1) {
      this.loader.off('progress', this.onProgress, this);
      pm.pageTo(HomeScene,null,true);
    }
  },
  out:function(cb){
    var ctx = this;
    // pixelOut(function(){
      ctx.container.destroy({children: true, texture: true });
      cb();
    // });
  },
  in:function(data){
    this.container = container.addChild(new PIXI.Container());
    // app.renderer.backgroundColor = 0x000000;
    this.manifest = data;
    this.loader = new createjs.LoadQueue(false,'assets/');
    this.loader.setMaxConnections(3);
    this.loader.on('complete', this.preloadComplete, this );
    this.loader.loadManifest([
      { id:"loading-logo", src:"loading-logo.png" }
    ]);
    window.addEventListener('orientationchange',onResize);
    window.addEventListener('resize',onResize);
    onResize();
  }
}
var HomeScene = {
  name:"home",
  loop:function(e){
    var sin = Math.sin(Date.now()*0.007);
    this.arrow.y = this.arrowpy + sin*10;
    this.gf.outerStrength = 1.5+sin*1.5;
  },
  in:function(data){
    $("body").addClass("bgblack");
    this.container = container.addChild(new PIXI.Container());

    this.bg = cSprite("home")._apt(this.container);
    this.contact = cSprite("btn-contact")._apt(this.container)._pos(oWidth-170,30);
    this.start = cSprite("btn-start")._apt(this.container)._anc(0.5)._pos(oWidthHalf,oHeightHalf+430);
    this.arrowpy = oHeightHalf+330;
    this.arrow = cSprite("arrow")._apt(this.container)._anc(0.5)._pos(oWidthHalf,oHeightHalf+330);
    this.gf = new PIXI.filters.GlowFilter(10,5);
    this.arrow.filters = [this.gf];

    this.contact.interactive = this.start.interactive = true;
    this.contact.once('tap',function(){
      pageToContact();
    });
    this.start.once('tap',function(){
      pm.pageTo(LadderScene,true);
      // pm.pageTo(NavScene,true);
    });
    this.tl = new TimelineMax();
    this.tl.from( [this.bg,this.contact,this.start], .5, {alpha:0,ease:Linear.easeNone});
    app.ticker.add(this.loop,this);
    pixelIn();
  },
  out:function(cb){
    var ctx = this;
    app.ticker.remove(this.loop,this);
    pixelOut(function(){
      ctx.container.destroy({children: true, texture: true });
      cb();
    });
    this.tl.reverse();
  }
}
var LadderScene = {
  name:"ladderscene",
  slideDelay:8000,
  out:function(cb){
    app.view.removeEventListener("touchmove", this.onTouchMove);
    app.view.removeEventListener("touchstart", this.onTouchStart);
    app.view.removeEventListener("touchend", this.onTouchEnd);
    app.ticker.remove( this.loop, this );
    clearInterval(this.interval);
    var ctx = this;
    pixelOut(function(){
      ctx.container.destroy({children: true, texture: true });
      cb && cb();
    });
    // this.tl.reverse().vars.onReverseComplete = function(){
    //   ctx.container.destroy({children: true, texture: true });
    //   cb();
    // };
  },
  loop:function(){
    var h = oHeight/8;
    var num = (this.bar.y / h);
    var next = (this.bar.y%h)/h;
    this.txt.text = 'level'+(~~(this.bar.y/h)+1);

    for( var i=0,scale,alpha,l;i<8;i++ ){
      l=this['l'+(i+1)];
      alpha = scale = clamp(0,(num+1)-i,8);
      if(alpha>1){
        alpha = 2-alpha;
      }
      alpha = clamp(0,alpha,1);
      l._scl(scale,scale)._alp(alpha);
    }
    var sin = Math.sin(Date.now()*0.007);
    this.upper.y = this.upperpy + sin*10;
  },
  onTouchStart:function(e){
    this.oy = this.bar.y;
    this.sy = e.touches[0].clientY;
    clearInterval(this.interval);
  },
  onTouchEnd:function(e){
    var h = oHeight/8;
    var fix = this.oy;
    if(this.bar.y/h>=7){
      pm.pageTo(NavScene,true);
      return;
    }
    if(Math.abs(this.bar.y-this.oy)>h/3){
      fix = h*(~~(this.oy/h)+sign(this.bar.y-this.oy));
    }

    TweenMax.to(this.bar,0.3,{y:fix});
    this.interval = setInterval(this.slideNext.bind(this),this.slideDelay);
  },
  onTouchMove:function(e){
    var cy = e.touches[0].clientY;
    var h = oHeight/8;
    var dy = this.sy-cy;
    var my = dy / h /2 * h;

    this.bar.y = this.oy + my;
    this.bar.y = clamp(Math.max(0,this.oy-h),this.bar.y,Math.min(oHeight-h,this.oy+h));
  },
  slideNext(){
    var h = oHeight/8;
    if(this.bar.y/h>=7){
      pm.pageTo(NavScene,true);
    }
    else{
      TweenMax.to(this.bar,0.6,{y:this.bar.y+h,ease:Cubic.easeInOut});
    }
  },
  in:function(data){

    $("body").addClass("bgblack");
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);

    this.container = container.addChild(new PIXI.Container());
    // app.renderer.backgroundColor = 0x000000;
    this.bg = cSprite("ladder-bg")._apt(this.container);

    this.l1 = cSprite("l1")._apt(this.container)._anc(0.5)._pos(oWidthHalf,oHeightHalf);
    this.l2 = cSprite("l2")._apt(this.container)._anc(0.5)._pos(oWidthHalf,oHeightHalf);
    this.l3 = cSprite("l3")._apt(this.container)._anc(0.5)._pos(oWidthHalf,oHeightHalf);
    this.l4 = cSprite("l4")._apt(this.container)._anc(0.5)._pos(oWidthHalf,oHeightHalf);
    this.l5 = cSprite("l5")._apt(this.container)._anc(0.5)._pos(oWidthHalf,oHeightHalf);
    this.l6 = cSprite("l6")._apt(this.container)._anc(0.5)._pos(oWidthHalf,oHeightHalf);
    this.l7 = cSprite("l7")._apt(this.container)._anc(0.5)._pos(oWidthHalf,oHeightHalf);
    this.l8 = cSprite("l8")._apt(this.container)._anc(0.5)._pos(oWidthHalf,oHeightHalf);

    this.upper = cSprite("upper")._apt(this.container)._anc(0.5)._pos(oWidthHalf,oHeightHalf+500);
    this.upperpy = oHeightHalf+500
    this.skip = cSprite("skip")._apt(this.container)._pos(oWidth-130,145);
    this.skip.interactive = true;

    this.skip.once('tap',function(){
      pm.pageTo(NavScene,true);
    });
    this.contact = cSprite("btn-contact")._apt(this.container)._pos(oWidth-170,30);

    this.contact.interactive = true;
    this.contact.once('tap',function(){
      pageToContact();
    });

    this.bar = this.container.addChild(new PIXI.Sprite());
    this.txt = cText("level1",0x86bc25,30)._apt(this.bar)._rot(Math.PI/2)._pos(45,28);
    this.txt.style.letterSpacing = 5;
    var g = this.bar.addChild(new PIXI.Graphics())
    g.beginFill(0x86bc25);
    g.drawRect(0,0,12,oHeight/8);
    g.endFill();

    this.interval = setInterval(this.slideNext.bind(this),this.slideDelay);

    app.view.addEventListener("touchmove", this.onTouchMove);
    app.view.addEventListener("touchstart", this.onTouchStart);
    app.view.addEventListener("touchend", this.onTouchEnd);
    app.ticker.add( this.loop,this );

    this.tl = new TimelineMax();
    this.tl.from( [this.bg], .5, {alpha:0,ease:Linear.easeNone});
    pixelIn();
  }
}

var NavScene = {
  name:"navscene",
  lmarea:[
    new PIXI.Rectangle(30,503,350,290),
    new PIXI.Rectangle(270,593,400,280),
    new PIXI.Rectangle(254,900,355,260),
    new PIXI.Rectangle(390,1060,345,265),
    new PIXI.Rectangle(170,910,330,270),
    new PIXI.Rectangle(170,700,350,280)
  ],
  onTap:function(n){
    var pop = cSprite("pop"+n)._apt(this.container),ctx=this;
    var area = ctx.lmarea[n-1];
    var btn = wrapObjd(new PIXI.Sprite())._hit(0,0,area.width,area.height)._pos(area.x,area.y)._apt(pop);
    var popTap = function(e){
      if(e.target==btn){
        if(n==1){ pageToVision(); }
        if(n==2){ pageToGather(); }
        if(n==3){ pageToCJD(); }
        if(n==4){ pageToDS(); }
        if(n==5){ pageToVP(); }
        if(n==6){ pageToDW(); }
      }
      else{
        TweenMax.to(pop,0.3,{alpha:0,onComplete:function(){
          pop.destroy({children:true});
        }});
      }
      pop.off('tap',popTap);
      btn.off('tap',popTap);
    }
    pop.on('tap',popTap);
    btn.on('tap',popTap);
    pop.interactive = true;
    TweenMax.from(pop,0.3,{alpha:0});
  },
  in:function(data){

    this.container = container.addChild(new PIXI.Container());
    $("body").addClass("bgblack");
    this.nav = cSprite("nav")._apt(this.container);
    this.contact = cSprite("btn-contact")._apt(this.container)._pos(oWidth-170,30);

    this.contact.interactive = true;
    this.contact.once('tap',function(){
      pageToContact();
    });

    var ctx = this;
    var bindTap = function(n){
      return function(){
        ctx.onTap.call(ctx,n);
      }
    }
    wrapObjd(new PIXI.Sprite())._apt(this.container)._hit(335,400,90,90).on('tap',bindTap(1));
    wrapObjd(new PIXI.Sprite())._apt(this.container)._hit(595,555,90,90).on('tap',bindTap(2));
    wrapObjd(new PIXI.Sprite())._apt(this.container)._hit(595,852,90,90).on('tap',bindTap(3));
    wrapObjd(new PIXI.Sprite())._apt(this.container)._hit(335,1010,90,90).on('tap',bindTap(4));
    wrapObjd(new PIXI.Sprite())._apt(this.container)._hit(75,852,90,90).on('tap',bindTap(5));
    wrapObjd(new PIXI.Sprite())._apt(this.container)._hit(75,555,90,90).on('tap',bindTap(6));

    this.cover = new PIXI.Graphics;
    this.cover.beginFill(0,0.7);
    this.cover.drawRect(0,0,750,1334);
    this.cover.endFill();
    this.cover.visible = false;
    this.container.addChild(this.cover);


    this.tl = new TimelineMax();
    this.tl.from( this.container, .5, {alpha:0,ease:Linear.easeNone});
    pixelIn();
  },
  out:function(cb){
    var ctx = this;
    // pixelOut(function(){
      ctx.container.destroy({children: true, texture: true });
      cb && cb();
    // });
    // this.tl.reverse().vars.onReverseComplete = function(){
    //   ctx.container.destroy({children: true, texture: true });
    //   cb && cb();
    // };
  }
}

var NEEDUPDATE = 'needupdate';

function cContent(src,cb,rx,ry){
  src = "assets/"+src;
  var loop = function(){
    rotate.rotation += 0.1;
  }
  var texture = PIXI.Texture.fromImage(src), ctx=this;
  var sprite = new PIXI.Sprite(texture);
  var rotate = cSprite("rotate")._anc(0.5)._apt(sprite)._pos(rx||oWidthHalf,ry||970/2);
  var loader = new PIXI.loaders.Loader();
  loader.add(src,texture);
  loader.once('complete',function(){
    sprite.removeChild(rotate);
    app.ticker.remove( loop, this );
    sprite.emit(NEEDUPDATE);
    cb && cb();
  });
  loader.load();
  app.ticker.add( loop, this );
  return wrapObjd(sprite);
}

function cScrollContentWithTitle(title,content,cb){
  var cont = new PIXI.Container();
  content._apt(cont);
  title._apt(cont);
  cont._des = function(){
    content._des();
    cb && cb();
  }
  return wrapObjd(cont);
}

function cScrollContent(content){
  var maskHeight = 970;
  var touchStart = function(e){
    this.oy = content.y;
    this.sy = e.touches[0].clientY;
  }
  var touchMove = function(e){
    var dy = e.touches[0].clientY - this.sy;
    dy *= 2;
    content._pos( 0,clamp(maskHeight-content.height,this.oy+dy, 0) );
  }
  var hasEvent = false;
  var initScroll = function(){
    // if( content.height>maskHeight ){
      if(hasEvent) return;
      hasEvent = true;
      document.addEventListener("touchstart",touchStart);
      document.addEventListener("touchmove",touchMove);
    // }
    // else{
      // uninScroll();
    // }
  }
  var uninScroll = function(){
    hasEvent = false;
    document.removeEventListener("touchstart",touchStart);
    document.removeEventListener("touchmove",touchMove);
  }

  content.mask = new PIXI.Graphics();
  content.on(NEEDUPDATE,initScroll);

  var scrollCont = new PIXI.Container();
  scrollCont.addChild(content,content.mask);
  scrollCont.content = content;
  scrollCont._des = function(){
    uninScroll();
    scrollCont.content = null;
    content.off(NEEDUPDATE,initScroll);
    scrollCont._des = null;
    scrollCont.destroy({children: true, texture: true });
  }
  scrollCont._drawMsk = function(w,h){
    maskHeight = h;
    content.mask.clear();
    content.mask.beginFill(0);
    content.mask.drawRect(0,0,w,h);
    return scrollCont;
  }
  scrollCont._drawMsk(oWidth,maskHeight);
  scrollCont.initScroll = initScroll;
  scrollCont.uninScroll = uninScroll;

  return wrapObjd(scrollCont);
}

function cTabContent(objs,offx,offy){
  var cont = new PIXI.Container();
  var tabs = [];
  var current;
  var switchCurrentTab = function(bool){
    if(current===undefined) return;
    var curTab = tabs[current];
    curTab.sel.visible = bool;
    curTab.nor.visible = !bool;
    if(!bool) curTab.content.uninScroll && curTab.content.uninScroll();
    else curTab.content.initScroll && curTab.content.initScroll();
    bool ? cont.addChild(curTab.content) : cont.removeChild(curTab.content);
  }
  var to = function(index){
    switchCurrentTab(false);
    current = index;
    switchCurrentTab(true);
    return cont;
  }
  var onTap = function(f){
    to(this.num);
  }

  for(var i=0,tab,px=offx||0;i<objs.length;i++){
    tab = objs[i];
    var nor = cSprite(tab.nor)._apt(cont)._pos(px,offy||0);
    var sel = cSprite(tab.sel)._apt(cont)._pos(px,offy||0);
    px += sel.width;
    nor.visible = true;
    sel.visible = false;
    nor.interactive = true;
    nor.on('tap',onTap);
    nor.num = i;
    tabs.push({
      nor:nor,sel:sel,content:tab.content
    })
  }

  to(0);
  cont._des=function(){
    tabs.forEach(function(tab){
      tab.nor.off('tap',onTap);
      tab.nor.num = null;
      tab.content._des();
      tab.content.destroy({children: true, texture: true });
    });
    tabs = null;
    cont._des = null;
    cont.destroy({children: true, texture: true });
  }
  return wrapObjd(cont);
}



var ScrollScene = {
  in:function(data){
    var o = Object.create(data);
    return Object.assign(o, ScrollScene,{in:(function(){
      $("body").removeClass("bgblack");
      this.container = container.addChild(new PIXI.Container());
      this.frame = cSprite("frame2")._apt(this.container);
      this.contact = cSprite("btn-contact-white")._apt(this.container)._pos(oWidth-170,30);
      this.contact.interactive = true;
      this.contact.once('tap',function(){
        pageToContact();
      });

      this.content = this.createContent()._apt(this.container);

      var backbtn = this.container.addChild(new PIXI.Sprite());
      backbtn.interactive = true;
      backbtn.hitArea = new PIXI.Rectangle(0, 0, 100, 100);
      backbtn.once('tap',pm.goBack.bind(pm));

      this.tl = new TimelineMax();
      this.tl.from( this.container, .35, {alpha:0,ease:Linear.easeNone});
      pixelIn(true);
    }).bind(o)});
  },
  out:function(cb){
    var ctx = this;
    // pixelOut(function(){
      ctx.content._des();
      ctx.container.destroy({children: true, texture: true });
      cb && cb();
    // });
    // this.tl.reverse().vars.onReverseComplete = function(){
    //   ctx.content._des();
    //   ctx.container.destroy({children: true, texture: true });
    //   cb();
    // };
  }
}

function wrapObjd(objd){
  objd._pos = function(x,y){
    return setPosition(this,x,y);
  }
  objd._apt = function(cont){
    return cont.addChild(this);
  }
  objd._anc = function(anchor){
    this.anchor.set(anchor);
    return this;
  }
  objd._scl = function(x,y){
    this.scale.set(x,y);
    return this;
  }
  objd._alp = function(v){
    this.alpha = v;
    return this;
  }
  objd._rot = function(v){
    this.rotation=v;
    return this;
  }
  objd._hit = function(x,y,w,h){
    if(x!==undefined)this.hitArea = new PIXI.Rectangle(x,y,w,h);
    // var graphic = this.addChild(new PIXI.Graphics)
    // graphic.beginFill(0xcccccc);
    // graphic.drawRect(x,y,w,h);
    // graphic.endFill();
    this.interactive = true;
    return this;
  }
  objd._hid = function(){
    this.alpha = 0;
    return this;
  }
  return objd;
}

function cSprite(id){
  return wrapObjd(new PIXI.Sprite(createTexture(id)));;
}
function cText(txt,color,size,lh,wr,wrw){
  var sprite = new PIXI.Text(txt,new PIXI.TextStyle({fontFamily:["PingFang SC"],fontSize:size,fill:color,lineHeight:lh||size,wordWrap:!!wr,wordWrapWidth:wrw||100}));
  return wrapObjd(sprite);
}

function setPosition(target,x,y){
  if(x!==undefined) target.x = x;
  if(y!==undefined) target.y = y;
  return target;
}
function verticalAlign(target,height){
  return setPosition(target,undefined,(height-target.height)/2);
}
function destroyOBJD(obj){
  while( obj.children.length ){
    destroyOBJD( obj.getChildAt(0) );
    obj.removeChildAt(0);
  }
}
function sceneBindMethods( array ){
  for( var i=0;i<array.length;i++ ){
    var scene = array[i]
    for( var k in scene ){
      var m = scene[k];
      if( typeof m ==='function' ){
        m = m.bind(scene);
      }
    }
  }
}


///page to
function pageToContact(){
  pm.pageTo.call(pm,ScrollScene.in({
    name:"contact",
    createContent:function(){
      return cScrollContent(cContent("c-contact.png"))._pos(0,150)._drawMsk(oWidth,1070);
    }
  }));
}
function pageToGather(){
  pm.pageTo.call(pm,ScrollScene.in({
    name:"gather",
    createContent:function(){

      var cont = wrapObjd(new PIXI.Container);
      var scrollContent = cScrollContent(cont)._drawMsk(oWidth,1000)._pos(0,220);
      scrollContent.initScroll();
      var gp = new PIXI.Sprite.fromImage("assets/c-gp.png");
      cont.addChild(gp);


      var menu = new PIXI.Sprite.fromImage("assets/gp-12345.png");
      menu.x = 70;

      var show = function(bt,t,c){
        // TweenMax.killAll();

        b1.alpha = b2.alpha = b3.alpha = b4.alpha = b5.alpha = 0;
        t1.style.fontSize = t2.style.fontSize = t3.style.fontSize = t4.style.fontSize = t5.style.fontSize = 22;
        c1.alpha = c2.alpha = c3.alpha = c4.alpha = c5.alpha = 0;

        c1.visible = c2.visible = c3.visible = c4.visible = c5.visible = false;
        c.visible = true;

        TweenMax.to(t.style,.3,{fontSize:30,lineHeight:30});
        TweenMax.to([c,bt],.3,{alpha:1});
      }
      var bindTap = function(bt,t,c){
        return function(){
          TweenMax.to(scrollContent.content,.3,{y:-gp.height-gp.y});
          show(bt,t,c);
        }
      }

      var folder = new PIXI.Container();

      var t1 = cText("What specific growth behavior should we drive?","#0097a9",22,26,true,500)._pos(190,80)._apt(folder);
      var t2 = cText("Which customer segments do we want to target?","#0097a9",22,26,true,500)._pos(190,182)._apt(folder);
      var t3 = cText("What drivers and barriers do we want to address with each target segment?","#86bc25",22,26,true,500)._pos(190,342)._apt(folder);
      var t4 = cText("How should we position our offer?","#86bc25",22,26,true,500)._pos(190,452)._apt(folder);
      var t5 = cText("How to activate your customers?","#86bc25",22,26,true,500)._pos(190,560)._apt(folder);

      var c1 = cContent("c-gp1.png")._apt(folder)._pos(t1.x,t1.y+60)._hid();
      var c2 = cContent("c-gp2.png")._apt(folder)._pos(t2.x,t2.y+60)._hid();
      var c3 = cContent("c-gp3.png")._apt(folder)._pos(t3.x,t3.y+60)._hid();
      var c4 = cContent("c-gp4.png")._apt(folder)._pos(t4.x,t4.y+30)._hid();
      var c5 = cContent("c-gp5.png")._apt(folder)._pos(t5.x,t5.y+30)._hid();

      var b1 = cContent("gp-b1.png",null,1,1)._apt(menu)._anc(0.5)._hid()._pos(50,93)._hit();
      b1.on('tap',bindTap(b1,t1,c1));
      var b2 = cContent("gp-b2.png",null,1,1)._apt(menu)._anc(0.5)._hid()._pos(50,197)._hit();
      b2.on('tap',bindTap(b2,t2,c2));
      var b3 = cContent("gp-b3.png",null,1,1)._apt(menu)._anc(0.5)._hid()._pos(50,357)._hit();
      b3.on('tap',bindTap(b3,t3,c3));
      var b4 = cContent("gp-b4.png",null,1,1)._apt(menu)._anc(0.5)._hid()._pos(50,467)._hit();
      b4.on('tap',bindTap(b4,t4,c4));
      var b5 = cContent("gp-b5.png",null,1,1)._apt(menu)._anc(0.5)._hid()._pos(50,575)._hit();
      b5.on('tap',bindTap(b5,t5,c5));

      show(b1,t1,c1);

      cont.addChild(menu,folder);

      var interval = setInterval(function(){
        menu.y = folder.y = gp.y+gp.height;
      },100);

      var loop = function(){
        if(gp.height>0 && Math.abs(scrollContent.content.y)>gp.height+gp.y){
          menu.y = Math.abs(scrollContent.content.y);
        }
        else{
          menu.y = gp.y+gp.height;
        }
      }
      app.ticker.add(loop);

      return cScrollContentWithTitle(cSprite("t-gp")._pos(0,110),scrollContent,function(){
        app.ticker.remove(loop);
        clearInterval(interval);
      });
    }
  }))
}
function pageToCJD(){
  pm.pageTo.call(pm,ScrollScene.in({
    name:"cjd",
    createContent:function(){
      var content = cScrollContent(cContent("c-cjd.png"))._pos(0,220)._drawMsk(oWidth,1000);
      var title = cSprite("t-cjd")._pos(0,110);
      return cScrollContentWithTitle(title,content)
    }
  }));
}
function pageToDS(){
  pm.pageTo.call(pm,ScrollScene.in({
    name:"ds",
    createContent:function(){
      var content = cScrollContent(cContent("c-ds.png"))._pos(0,220)._drawMsk(oWidth,1000);
      var title = cSprite("t-ds")._pos(0,110);
      return cScrollContentWithTitle(title,content)
    }
  }));
}
function pageToVP(){
  pm.pageTo.call(pm,ScrollScene.in({
    name:"vp",
    createContent:function(){
      var content = cScrollContent(cContent("c-vp.png"))._pos(0,220)._drawMsk(oWidth,1000);
      var title = cSprite("t-vp")._pos(0,110);
      return cScrollContentWithTitle(title,content);
    }
  }));
}
function pageToDW(){
  pm.pageTo.call(pm,ScrollScene.in({
    name:"dw",
    createContent:function(){
      return cTabContent([
        {
          nor:"dw1-nor",sel:"dw1-sel", content:cScrollContent(cContent("c-dw1.png"))._pos(0,250)
        },
        {
          nor:"dw2-nor",sel:"dw2-sel", content:cScrollContent(cContent("c-dw2.png"))._pos(0,250)
        }
      ], 65, 110);
    }
  }));
}

function pageToVision(){

  var cvision1 = function(){
    var cont = new PIXI.Container();
    var cTabCont = function(tit,desp,c){
      var cont = new PIXI.Container();
      cText(tit,c,34,34,true,620)._apt(cont)._pos(65,170);
      cText(desp,0x53565a,26,40,true,620)._apt(cont)._pos(65,260);
      return wrapObjd(cont);
    }
    var range = function(){
      for(var i=1,last;i<cont.children.length;i++){
        last = cont.getChildAt(i-1);
        cont.getChildAt(i).y = last.y+last.height;
      }

    }
    var interval = setInterval(range,100);

    cContent("vision2-1.png",range)._apt(cont);
    cTabContent([
      {nor:"m1-nor",sel:"m1-sel", content:cTabCont("How you make money","Innovative profit models find a fresh way to convert a firm’s offerings and other sources of value into cash. Great models reflect a deep understanding of what customers and users actually cherish and where new revenue or pricing opportunities might lie. Innovative profit models often challenge an industry’s archaic assumptions about what to offer, what to charge, or how to collect revenues. This is a large component of their appeal, seeing as how most industries follow a dominant profit model that often goes unquestioned for decades and leaves a vast amount of room for improvement.",0x00a3e0)},
      {nor:"m2-nor",sel:"m2-sel", content:cTabCont("How you connect with others to create value","In today’s hyper-connected world, no company can or should do everything alone. Network innovations provide a way for firms to take advantage of other companies’ processes, technologies, offerings, channels, and brands—pretty much any and every component of a business. These innovations mean a firm can capitalize on its own strengths while harnessing the capabilities and assets of others. Network innovations also help executives to share risk in developing new offers and ventures. These collaborations can be brief or enduring, and they can be formed between close allies or even staunch competitors.",0x00a3e0)},
      {nor:"m3-nor",sel:"m3-sel", content:cTabCont("How you organize and align your talent and assets","Structure innovations are focused on organizing company assets—hard, human, or intangible—in unique ways that create value. They can include everything from superior talent management systems to ingenious configurations of heavy capital equipment. An enterprise’s fixed costs and corporate functions can also be improved through Structure innovations, including departments such as Human Resources, R&D, and IT. Ideally, such innovations also help attract talent to the organization by creating supremely productive working environments or fostering a level of performance that competitors can’t match.",0x00a3e0)},
      {nor:"m4-nor",sel:"m4-sel", content:cTabCont("How you use signature or superior methods to do your work","Process innovations involve the activities and operations that produce an enterprise’s primary offerings. Innovating here requires a dramatic change from “business as usual” that enables the company to use unique capabilities, function efficiently, adapt quickly, and build market–leading margins. Process innovations often form the core competency of an enterprise, and may include patented or proprietary approaches that yield advantage for years or even decades. Ideally, they are the “special sauce” you use that competitors simply can’t replicate.",0x00a3e0)},
    ], 65, 0)._apt(cont);
    cContent("vision2-2.png",range)._apt(cont);
    cTabContent([
      {nor:"n1-nor",sel:"n1-sel", content:cTabCont("How you develop distinct features and functionalities","Product Performance innovations address the value, features, and quality of a company’s offering. This type of innovation applies to both entirely new products as well as updates and line extensions that add substantial value. Too often, people mistake Product Performance for the direct sum of innovation. While certainly important, innovation is only one of the Ten Types of innovation, and it’s often the easiest for competitors to copy. Think about any product or feature war you’ve witnessed—whether torque and toughness in trucks, toothbrushes that are easier to hold and use, even with baby strollers. Too quickly, it all devolves into an expensive mad dash to parity. Product Performance innovations that deliver long-term competitive advantage are the exception rather than the rule.",0xf57d00)},
      {nor:"n2-nor",sel:"n2-sel", content:cTabCont("How you create complementary products and services","Product System innovations are rooted in how individual products and services connect or bundle together to create a robust and scalable system. This is fostered through interoperability, modularity, integration, and other ways of creating valuable connections between otherwise distinct and disparate offerings. Product System innovations help you build ecosystems that captivate and delight customers and defend against competitors.",0xf57d00)}
    ], 65, 0)._apt(cont);
    cContent("vision2-3.png",range)._apt(cont);
    cTabContent([
      {nor:"o1-nor",sel:"o1-sel", content:cTabCont("How you support and amplify the value of your offerings","Service innovations ensure and enhance the utility, performance, and apparent value of an offering. They make a product easier to try, use, and enjoy; they reveal features and functionality customers might otherwise overlook; and they fix problems and smooth rough patches in the customer journey. Done well, they elevate even bland and average products into compelling experiences that customers come back for again and again.",0xef4b00)},
      {nor:"o2-nor",sel:"o2-sel", content:cTabCont("How you deliver your offerings to customers and users","Channel innovations encompass all the ways that you connect your company’s offerings with your customers and users. While e-commerce has emerged as a dominant force in recent years, traditional channels such as physical stores are still important — particularly when it comes to creating immersive experiences. Skilled innovators in this type often find multiple but complementary ways to bring their products and services to customers. Their goal is to ensure that users can buy what they want, when and how they want it, with minimal friction and cost and maximum delight.",0xef4b00)},
      {nor:"o3-nor",sel:"o3-sel", content:cTabCont("How you represent your offerings and business","Brand innovations help to ensure that customers and users recognize, remember, and prefer your offerings to those of competitors or substitutes. Great ones distill a “promise” that attracts buyers and conveys a distinct identity. They are typically the result of carefully crafted strategies that are implemented across many touchpoints between your company and your customers, including communications, advertising, service interactions, channel environments, and employee and business partner conduct. Brand innovations can transform commodities into prized products, and confer meaning, intent, and value to your offerings and your enterprise.",0xef4b00)},
      {nor:"o4-nor",sel:"o4-sel", content:cTabCont("How you foster compelling interactions","Customer Engagement innovations are all about understanding the deep-seated aspirations of customers and users, and using those insights to develop meaningful connections between them and your company. Great Customer Engagement innovations provide broad avenues for exploration, and help people find ways to make parts of their lives more memorable, fulfilling, delightful — even magical.",0xef4b00)},
    ], 65, 0)._apt(cont);
    cont._des = function(){
      clearInterval(interval);
    }
    return wrapObjd(cont);
  }

  pm.pageTo.call(pm,ScrollScene.in({
    name:"vision",
    createContent:function(){
      return cTabContent([
        {
          nor:"vision1-nor",sel:"vision1-sel", content:cScrollContent(cContent("vision1.png"))._pos(0,250)
        },
        {
          nor:"vision2-nor",sel:"vision2-sel", content:cScrollContent(cvision1())._pos(0,250)
        }
      ], 65, 110);
    }
  }));
}



$(document).ready( function(){
  sceneBindMethods([loadingScene,HomeScene]);
  pm.pageTo(loadingScene,[
    { id:"btn-contact", src:"btn-contact.png" },
    { id:"btn-contact-white", src:"btn-contact-white.png" },
    { id:"btn-start",src:"btn-start.png" },
    { id:"home",src:"home.jpg" },
    { id:"frame2",src:"frame2.png" },
    { id:"ladder-bg",src:"ladder-bg.jpg" },
    { id:"rotate",src:"rotate.png" },
    { id:"nav",src:"nav.jpg" },
    { id:"skip",src:"skip.png" },
    { id:"upper",src:"upper.png" },
    { id:"vision1-nor",src:"vision1-nor.png" },
    { id:"vision2-nor",src:"vision2-nor.png" },
    { id:"vision1-sel",src:"vision1-sel.png" },
    { id:"vision2-sel",src:"vision2-sel.png" },
    { id:"m1-nor",src:"m1-nor.png" },
    { id:"m2-nor",src:"m2-nor.png" },
    { id:"m3-nor",src:"m3-nor.png" },
    { id:"m4-nor",src:"m4-nor.png" },
    { id:"m1-sel",src:"m1-sel.png" },
    { id:"m2-sel",src:"m2-sel.png" },
    { id:"m3-sel",src:"m3-sel.png" },
    { id:"m4-sel",src:"m4-sel.png" },

    { id:"n1-nor",src:"n1-nor.png" },
    { id:"n2-nor",src:"n2-nor.png" },
    { id:"n1-sel",src:"n1-sel.png" },
    { id:"n2-sel",src:"n2-sel.png" },

    { id:"o1-nor",src:"o1-nor.png" },
    { id:"o2-nor",src:"o2-nor.png" },
    { id:"o3-nor",src:"o3-nor.png" },
    { id:"o4-nor",src:"o4-nor.png" },
    { id:"o1-sel",src:"o1-sel.png" },
    { id:"o2-sel",src:"o2-sel.png" },
    { id:"o3-sel",src:"o3-sel.png" },
    { id:"o4-sel",src:"o4-sel.png" },
    { id:"l1",src:"l1.png" },
    { id:"l2",src:"l2.png?2" },
    { id:"l3",src:"l3.png" },
    { id:"l4",src:"l4.png" },
    { id:"l5",src:"l5.png" },
    { id:"l6",src:"l6.png" },
    { id:"l7",src:"l7.png" },
    { id:"l8",src:"l8.png" },

    { id:"pop1",src:"pop1.png" },
    { id:"pop2",src:"pop2.png" },
    { id:"pop3",src:"pop3.png" },
    { id:"pop4",src:"pop4.png" },
    { id:"pop5",src:"pop5.png" },
    { id:"pop6",src:"pop6.png" },

    { id:"arrow",src:"arrow.png" },
    { id:"t-cjd",src:"t-cjd.png" },
    { id:"t-ds",src:"t-ds.png" },
    { id:"t-vp",src:"t-vp.png" },
    { id:"t-gp",src:"t-gp.png" },
    { id:"dw1-nor",src:"dw1-nor.png" },
    { id:"dw2-nor",src:"dw2-nor.png" },
    { id:"dw1-sel",src:"dw1-sel.png" },
    { id:"dw2-sel",src:"dw2-sel.png" }
  ]);

});

function showRot() {
  if (window.orientation == 90 || window.orientation == -90){
    $("#ROT").show();
  }
  else{
    $("#ROT").hide();
  }
}

showRot();
window.addEventListener('orientationchange',showRot);
window.addEventListener('resize', showRot);

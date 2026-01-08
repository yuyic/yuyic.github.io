THREE.KawaseBlurPass = function(diffuse){
	var material = new THREE.ShaderMaterial( {
		uniforms: THREE.KawaseBlurShader.uniforms,
		vertexShader: THREE.KawaseBlurShader.vertexShader,
		fragmentShader: THREE.KawaseBlurShader.fragmentShader,
		transparent:true,
	});
	
	var tDiffuse = diffuse;
	
	material.uniforms.tDiffuse.value = diffuse;
	material.uniforms.resolution.value.set(1/diffuse.width,1/diffuse.height)
	
	var camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	var scene = new THREE.Scene();
	var quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), material );
	scene.add( quad );	
	scene.autoUpdate = false;
	
	var buffers = [
		new THREE.WebGLRenderTarget(1,1,{
			format:THREE.RGBAFormat,
		}),
		new THREE.WebGLRenderTarget(1,1,{
			format:THREE.RGBAFormat,
		})		
	]
	
	var index = 0;
	
	this.render = function(writeBuffer){		
		material.uniforms.tDiffuse.value = tDiffuse
		material.uniforms.level.value =0
		renderer.render( scene, camera,buffers[index],true);
		
		material.uniforms.tDiffuse.value = buffers[index].texture
		material.uniforms.level.value =1
		index=1-index
		renderer.render( scene, camera,buffers[index],true);
		
		material.uniforms.tDiffuse.value = buffers[index].texture
		index=1-index
		material.uniforms.level.value =1
		renderer.render( scene, camera,buffers[index],true);
		
		material.uniforms.tDiffuse.value = buffers[index].texture
		index=1-index
		material.uniforms.level.value =2
		renderer.render( scene, camera,writeBuffer,true);
	}
		
	this.setResolution = function(x,y){
		material.uniforms.resolution.value.set(x,y);	
		buffers[0].setSize(x,y);	
		buffers[1].setSize(x,y);
	}
	
	this.setSource = function(diffuse){
		tDiffuse = diffuse;
	}
	
}

THREE.KawaseBlurShader = {
	uniforms:{
		tDiffuse:{value:null,type:"t"},
		resolution:{value:new THREE.Vector2(1/1024,1/768)},
		level:{value:0,type:"f"},
	},
	
	vertexShader: [
		"varying vec2 vUv;",
		"void main() {",
			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),
	
	fragmentShader: [
		"uniform sampler2D tDiffuse;",
		"uniform vec2 resolution;",
		"uniform float level;",
		"varying vec2 vUv;",
		
		"void main(){",
			"vec2 step1 = (vec2(level) + 0.5) / resolution;",
			"vec4 col = vec4(0.);",			
			"col += texture2D(tDiffuse, vUv + step1) / 4.;",
			"col += texture2D(tDiffuse,  vUv - step1) / 4.;",
			"vec2 step2 = step1;",
			"step2.x = -step2.x;",
			"col += texture2D(tDiffuse, vUv + step2) / 4.;",
			"col += texture2D(tDiffuse,  vUv - step2) / 4.;",
			"gl_FragColor = col;",
		"}",
		
	].join( "\n" ),
	
	
}
THREE.HDRPass = function(diffuse,blur){
	var material = new THREE.ShaderMaterial( {
		uniforms: THREE.HDRShader.uniforms,
		vertexShader: THREE.HDRShader.vertexShader,
		fragmentShader: THREE.HDRShader.fragmentShader,
		depthWrite:false,
		depthTest:false,
	});
	
	material.uniforms.tDiffuse.value = diffuse;
	material.uniforms.tBlur.value = blur;
	
	var camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	var scene = new THREE.Scene();
	var quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), material );
	scene.add( quad );	
	scene.autoUpdate = false;
	
	this.setSource = function(diffuse){
		material.uniforms.tDiffuse.value = diffuse;
	}
	
	this.render = function(writeBuffer){
		renderer.render( scene, camera,writeBuffer,true);	
	}
}

THREE.HDRShader = {
	
	uniforms:{tDiffuse:{value:null},tBlur:{value:null}},
	
	vertexShader: [
		"varying vec2 vUv;",
		"void main() {",
			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),
	
	fragmentShader: [
		"varying vec2 vUv;",
		"uniform sampler2D tDiffuse;",
		"uniform sampler2D tBlur;",
		
		"const float Threshold = 0.6;",
		"const float Intensity = 1.3;",	
		
		"vec3 Desaturate(vec3 color, float Desaturation){",
			"vec3 grayXfer = vec3(0.3, 0.59, 0.11);",
			"vec3 gray = vec3(dot(grayXfer, color));",
			"return mix(color, gray, Desaturation);",
		"}",
	
		"void main(){",
			"vec3 Color = texture2D(tDiffuse, vUv).rgb;",
    
			"vec3 Highlight = max((texture2D(tBlur, vUv).rgb-Threshold)*Intensity,0.);",
				
			"gl_FragColor = vec4(1.0-(1.0-Color)*(1.0-Highlight),1.);", //Screen Blend Mode
			
			
			//"gl_FragColor.rgb = Desaturate(gl_FragColor.rgb, .2);",
		"}",
	].join("\n")
	
	
}
THREE.FXAAPass = function(diffuse){
	var material = new THREE.ShaderMaterial( {
		uniforms: THREE.FXAAShader.uniforms,
		vertexShader: THREE.FXAAShader.vertexShader,
		fragmentShader: THREE.FXAAShader.fragmentShader
	});
	
	this.brightness = {value:0}
	material.uniforms.tDiffuse.value = diffuse;
	material.uniforms.brightness = this.brightness;
//	material.uniforms.tNoise.value = getTexture("noise2");
	//material.uniforms.time = globalUniforms.time;
	
	var camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	var scene = new THREE.Scene();
	var quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), material );
	scene.add( quad );	
	scene.autoUpdate = false;
	
	this.render = function(writeBuffer,clear){
		renderer.render( scene, camera,writeBuffer,clear);	
	}
		
	this.setResolution = function(x,y){
		material.uniforms.resolution.value.set(x,y);
	}
}


THREE.FXAAShader = {

	uniforms: {
		"tDiffuse":   { type: "t", value: null },
	//	"tNoise":   { type: "t", value: null },
		"resolution": { type: "v2", value: new THREE.Vector2(  1024, 1024 ) }
	},

	vertexShader: [
		"void main() {",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [
		"uniform float brightness;",
		"uniform sampler2D tDiffuse;",
	//	"uniform sampler2D tNoise;",
		"uniform vec2 resolution;",

		"#define FXAA_REDUCE_MIN   (1.0/128.0)",
		"#define FXAA_REDUCE_MUL   (1.0/8.0)",
		"#define FXAA_SPAN_MAX     8.0",

		"void main() {",
			"vec2 uv = gl_FragCoord.xy  / resolution;",
			
			"vec3 rgbNW = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( -1.0, -1.0 ) ) / resolution ).xyz;",
			"vec3 rgbNE = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( 1.0, -1.0 ) ) / resolution ).xyz;",
			"vec3 rgbSW = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( -1.0, 1.0 ) ) / resolution ).xyz;",
			"vec3 rgbSE = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( 1.0, 1.0 ) ) / resolution ).xyz;",
			"vec4 rgbaM  = texture2D( tDiffuse,  uv );",
			"vec3 rgbM  = rgbaM.xyz;",
			"vec3 luma = vec3( 0.299, 0.587, 0.114 );",

			"float lumaNW = dot( rgbNW, luma );",
			"float lumaNE = dot( rgbNE, luma );",
			"float lumaSW = dot( rgbSW, luma );",
			"float lumaSE = dot( rgbSE, luma );",
			"float lumaM  = dot( rgbM,  luma );",
			"float lumaMin = min( lumaM, min( min( lumaNW, lumaNE ), min( lumaSW, lumaSE ) ) );",
			"float lumaMax = max( lumaM, max( max( lumaNW, lumaNE) , max( lumaSW, lumaSE ) ) );",

			"vec2 dir;",
			"dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));",
			"dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));",

			"float dirReduce = max( ( lumaNW + lumaNE + lumaSW + lumaSE ) * ( 0.25 * FXAA_REDUCE_MUL ), FXAA_REDUCE_MIN );",

			"float rcpDirMin = 1.0 / ( min( abs( dir.x ), abs( dir.y ) ) + dirReduce );",
			"dir = min( vec2( FXAA_SPAN_MAX,  FXAA_SPAN_MAX),",
				  "max( vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),",
						"dir * rcpDirMin)) / resolution;",
			"vec4 rgbA = (1.0/2.0) * (",
        	"texture2D(tDiffuse,  gl_FragCoord.xy  / resolution + dir * (1.0/3.0 - 0.5)) +",
			"texture2D(tDiffuse,  gl_FragCoord.xy  / resolution + dir * (2.0/3.0 - 0.5)));",
    		"vec4 rgbB = rgbA * (1.0/2.0) + (1.0/4.0) * (",
			"texture2D(tDiffuse,  gl_FragCoord.xy  / resolution + dir * (0.0/3.0 - 0.5)) +",
      		"texture2D(tDiffuse,  gl_FragCoord.xy  / resolution + dir * (3.0/3.0 - 0.5)));",
    		"float lumaB = dot(rgbB, vec4(luma, 0.0));",

			
			
			
			"if ( ( lumaB < lumaMin ) || ( lumaB > lumaMax ) ) {",

				"gl_FragColor = rgbA;",

			"} else {",
				"gl_FragColor = rgbB;",

			"}",
			
		//	"if(brightness)"
			//"float noise = texture2D(tNoise,gl_FragCoord.xy  / resolution*.2+time*.05).r*texture2D(tNoise,gl_FragCoord.xy  / resolution*vec2(1.,3.)+time*.02).r;",
			//"float t = mix(noise,1.,smoothstep(.5,.85,1.0 - .5*length(uv-.5)));",
			"gl_FragColor.rgb = mix(gl_FragColor.rgb,vec3(1.),brightness);",
			

		"}"

	].join( "\n" )

};

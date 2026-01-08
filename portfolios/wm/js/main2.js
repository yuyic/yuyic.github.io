if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
			var effectFXAA;
			var mouseX = 0, mouseY = 0,
			windowHalfX = window.innerWidth / 2,
			windowHalfY = window.innerHeight / 2,
			camera, scene, renderer, material, composer;
			init();
			animate();
      function createGeometry() {
        var geometry = new THREE.Geometry();
        for ( var i = 0; i < 200; i ++ ) {
          var vertex1 = new THREE.Vector3();
          vertex1.x = Math.random() * 2 - 1;
          vertex1.y = Math.random() * 2 - 1;
          vertex1.z = Math.random() * 2 - 1;
          vertex1.normalize();
          vertex1.multiplyScalar( 450 );

          var vertex2 = vertex1.clone();
          vertex2.multiplyScalar( Math.random() * 0.09 + 1 );
          geometry.vertices.push( vertex1 );
          geometry.vertices.push( vertex2 );
        }
        return geometry;
      }

			function init() {
				var i, container;
				container = document.createElement( 'div' );
				document.body.appendChild( container );
				camera = new THREE.PerspectiveCamera( 33, window.innerWidth / window.innerHeight, 1, 10000 );
				camera.position.z = 700;
				scene = new THREE.Scene();
				renderer = new THREE.WebGLRenderer( { antialias: false } );
				renderer.setPixelRatio( window.devicePixelRatio );
				renderer.setSize( window.innerWidth, window.innerHeight );
				renderer.autoClear = false;
				container.appendChild( renderer.domElement );
				var geometry = createGeometry();
					colors = [];
				for ( i = 0; i < geometry.vertices.length; i ++ ) {
					colors[ i ] = new THREE.Color( 0xffffff );
					// colors[ i ].setHSL( 0.6, 1.0, Math.max( 0, ( 200 - geometry.vertices[ i ].x ) / 400 ) * 0.5 + 0.5 );
          // colors[ i ].setHSL( 0.6, 1.0, i / geometry.vertices.length );
				}
				geometry.colors = colors;
				// lines

				material = new THREE.LineBasicMaterial( { color: 0xffffff, opacity: 1, linewidth: Math.random()*100, vertexColors: THREE.VertexColors } );
				var line, p, scale = 0.3, d = 225;
				var parameters =  [
					[ material, scale*1.5, [0,0,0],  geometry ]
				];
				for ( i = 0; i < parameters.length; ++i ) {
					p = parameters[ i ];
					line = new THREE.Line( p[ 3 ],  p[ 0 ] );
					line.scale.x = line.scale.y = line.scale.z =  p[ 1 ];
					line.position.x = p[ 2 ][ 0 ];
					line.position.y = p[ 2 ][ 1 ];
					line.position.z = p[ 2 ][ 2 ];
					scene.add( line );
				}
				//
				stats = new Stats();
				//container.appendChild( stats.dom );
				//
				//
				var renderModel = new THREE.RenderPass( scene, camera );
				var effectBloom = new THREE.BloomPass( 1.3 );
				var effectCopy = new THREE.ShaderPass( THREE.CopyShader );
				effectFXAA = new THREE.ShaderPass( THREE.FXAAShader );
				var width = window.innerWidth || 2;
				var height = window.innerHeight || 2;
				effectFXAA.uniforms[ 'resolution' ].value.set( 1 / width, 1 / height );
				effectCopy.renderToScreen = true;
				composer = new THREE.EffectComposer( renderer );
				composer.addPass( renderModel );
				composer.addPass( effectFXAA );
				composer.addPass( effectBloom );
				composer.addPass( effectCopy );
				//
				window.addEventListener( 'resize', onWindowResize, false );
			}
			function onWindowResize() {
				windowHalfX = window.innerWidth / 2;
				windowHalfY = window.innerHeight / 2;
				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();
				renderer.setSize( window.innerWidth, window.innerHeight );
				effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
				composer.reset();
			}

			function animate() {
				requestAnimationFrame( animate );
				render();
				stats.update();
			}
			function render() {

				camera.lookAt( scene.position );
				var time = Date.now() * 0.0005;
				for ( var i = 0; i < scene.children.length; i ++ ) {
					var object = scene.children[ i ];
					if ( object instanceof THREE.Line ) object.rotation.y = time * ( i % 2 ? 1 : -1 );
				}
				renderer.clear();
        // renderer.render(scene,camera);
				composer.render();
			}

export class TesseraEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.z = 9;
    this.clock = new THREE.Clock();
    this.count = 850;
    this.positions = new Float32Array(this.count * 3);
    this.vel = new Float32Array(this.count * 3);
    this.hues = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) {
      const k = i * 3;
      this.positions[k] = (Math.random() - 0.5) * 7;
      this.positions[k + 1] = (Math.random() - 0.5) * 7;
      this.positions[k + 2] = (Math.random() - 0.5) * 3;
      this.hues[i] = 0.57 + (Math.random() - 0.5) * 0.08;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    g.setAttribute('aHue', new THREE.BufferAttribute(this.hues, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      uniforms: {uTime:{value:0},uEnergy:{value:0},uFog:{value:0.3},uArrival:{value:0}},
      vertexShader: `attribute float aHue; varying float vHue; uniform float uTime; uniform float uEnergy; void main(){vHue=aHue; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=(3.0+uEnergy*2.0)*(120.0/-mv.z); gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `varying float vHue; uniform float uEnergy; uniform float uFog; uniform float uArrival; vec3 h2r(float h,float s,float l){float c=(1.-abs(2.*l-1.))*s;float x=c*(1.-abs(mod(h*6.,2.)-1.));float m=l-c*.5;vec3 r;if(h<1./6.)r=vec3(c,x,0.);else if(h<2./6.)r=vec3(x,c,0.);else if(h<3./6.)r=vec3(0.,c,x);else if(h<4./6.)r=vec3(0.,x,c);else if(h<5./6.)r=vec3(x,0.,c);else r=vec3(c,0.,x);return r+m;} void main(){vec2 p=gl_PointCoord-.5; float d=length(p); float a=exp(-d*d*(44.-uFog*20.)); if(a<.01) discard; float sat=.22+uEnergy*.48; float lit=.44+uEnergy*.1+uArrival*.2; vec3 c=h2r(vHue,sat,lit); gl_FragColor=vec4(c,a*0.6);}`
    });
    this.points = new THREE.Points(g, m); this.scene.add(this.points);
    this.lineGeom = new THREE.BufferGeometry();
    this.linePos = new Float32Array(180 * 3 * 2);
    this.lineGeom.setAttribute('position', new THREE.BufferAttribute(this.linePos, 3));
    this.lines = new THREE.LineSegments(this.lineGeom, new THREE.LineBasicMaterial({ color: 0xf2f7ff, transparent: true, opacity: 0.09 }));
    this.scene.add(this.lines);
    this.resize(); window.addEventListener('resize', () => this.resize());
  }
  resize(){const w=window.innerWidth,h=window.innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  update(state){const dt=Math.min(this.clock.getDelta(),0.033), t=this.clock.elapsedTime; const s=state.current;
    const energy = s.reach*0.45+s.tracking*0.5+s.friction*0.35+s.response*0.25;
    const drift = 0.0009 + s.drift*0.004; const cohesion = 0.0007 + s.tracking*0.003; const turbulence = s.friction*0.004;
    for(let i=0;i<this.count;i++){const k=i*3; const x=this.positions[k], y=this.positions[k+1];
      this.vel[k]+=(-x*cohesion)+(Math.sin(t*0.3+i*0.07)*drift)+(Math.sin((y+t)*2.2)*turbulence);
      this.vel[k+1]+=(-y*cohesion)+(Math.cos(t*0.23+i*0.05)*drift)+(Math.cos((x-t)*2.1)*turbulence);
      this.vel[k+2]+=Math.sin(t*0.2+i*0.12)*0.0008;
      const slow = 0.96 - s.inhabited_silence*0.07; this.vel[k]*=slow;this.vel[k+1]*=slow;this.vel[k+2]*=0.97;
      this.positions[k]+=this.vel[k];this.positions[k+1]+=this.vel[k+1];this.positions[k+2]+=this.vel[k+2];
      if(Math.abs(this.positions[k])>4.5) this.vel[k]*=-1; if(Math.abs(this.positions[k+1])>4.5) this.vel[k+1]*=-1; if(Math.abs(this.positions[k+2])>2.2) this.vel[k+2]*=-1;
      this.hues[i]=0.57 + Math.sin(i*0.03+t*0.05+s.drift)*0.05 + s.reach*0.07;
    }
    let c=0; const threshold=0.4 - s.tracking*0.12 + s.inhabited_silence*0.05;
    for(let i=0;i<110 && c<180;i++){const a=(i*13)%this.count,b=(i*29+7)%this.count;const ax=this.positions[a*3],ay=this.positions[a*3+1],bx=this.positions[b*3],by=this.positions[b*3+1];
      const d=Math.hypot(ax-bx,ay-by); if(d<threshold){const p=c*6;this.linePos[p]=ax;this.linePos[p+1]=ay;this.linePos[p+2]=this.positions[a*3+2];this.linePos[p+3]=bx;this.linePos[p+4]=by;this.linePos[p+5]=this.positions[b*3+2];c++;}
    }
    this.lineGeom.setDrawRange(0,c*2); this.lineGeom.attributes.position.needsUpdate=true;
    this.points.geometry.attributes.position.needsUpdate=true; this.points.geometry.attributes.aHue.needsUpdate=true;
    this.points.material.uniforms.uTime.value=t; this.points.material.uniforms.uEnergy.value=energy;
    this.points.material.uniforms.uFog.value=1-state.confidence; this.points.material.uniforms.uArrival.value=s.arrival;
    this.renderer.render(this.scene,this.camera);
  }
}

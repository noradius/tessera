const CONFIG = {
  count: 1200,
  fieldRadius: 4.8,
  depth: 3.2,
  grid: 0.7,
  neighborR: 0.9,
  separationR: 0.26,
  maxFilaments: 320,
  maxFilamentsPerParticle: 2,
};

function fract(x) { return x - Math.floor(x); }

export class TesseraEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.z = 9;
    this.clock = new THREE.Clock();

    this.count = CONFIG.count;
    this.positions = new Float32Array(this.count * 3);
    this.vel = new Float32Array(this.count * 3);
    this.hues = new Float32Array(this.count);
    this.phase = new Float32Array(this.count);
    this.sat = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      const k = i * 3;
      this.positions[k] = (Math.random() - 0.5) * 8;
      this.positions[k + 1] = (Math.random() - 0.5) * 8;
      this.positions[k + 2] = (Math.random() - 0.5) * CONFIG.depth;
      this.hues[i] = fract(0.55 + (i / this.count) * 0.7 + (Math.random() - 0.5) * 0.11);
      this.phase[i] = Math.random();
      this.sat[i] = 0.4 + Math.random() * 0.35;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    g.setAttribute('aHue', new THREE.BufferAttribute(this.hues, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(this.phase, 1));
    g.setAttribute('aSat', new THREE.BufferAttribute(this.sat, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      uniforms: {uTime:{value:0},uEnergy:{value:0},uFog:{value:0.35},uArrivalBloom:{value:0},uHeart:{value:0}},
      vertexShader: `attribute float aHue;attribute float aPhase;attribute float aSat;varying float vHue;varying float vPhase;varying float vSat;uniform float uTime;uniform float uEnergy;void main(){vHue=aHue;vPhase=aPhase;vSat=aSat;vec4 mv=modelViewMatrix*vec4(position,1.0);float b1=sin(uTime*0.8+aPhase*6.2831);float b2=sin(uTime*0.23+aPhase*3.1416);gl_PointSize=(2.3+uEnergy*2.8)*(1.0+b1*0.08+b2*0.035)*(130.0/-mv.z);gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `varying float vHue;varying float vPhase;varying float vSat;uniform float uEnergy;uniform float uFog;uniform float uArrivalBloom;uniform float uHeart;vec3 h2r(float h,float s,float l){float c=(1.-abs(2.*l-1.))*s;float x=c*(1.-abs(mod(h*6.,2.)-1.));float m=l-c*.5;vec3 r;if(h<1./6.)r=vec3(c,x,0.);else if(h<2./6.)r=vec3(x,c,0.);else if(h<3./6.)r=vec3(0.,c,x);else if(h<4./6.)r=vec3(0.,x,c);else if(h<5./6.)r=vec3(x,0.,c);else r=vec3(c,0.,x);return r+m;}void main(){vec2 p=gl_PointCoord-.5;float d=length(p);float body=exp(-d*d*(45.-uFog*18.));float halo=exp(-d*d*(13.-uFog*7.));float a=body+halo*0.2; if(a<.01) discard; float hueShift=(sin(vPhase*6.2831)*0.03)*uEnergy + uHeart*0.04; float sat=clamp(vSat + uEnergy*0.16 + uHeart*0.2,0.2,0.95); float lit=0.24 + uEnergy*0.1 + halo*0.15 + uArrivalBloom*0.06; vec3 c=h2r(fract(vHue+hueShift),sat,lit); c += vec3(0.01,0.03,0.08)*halo*(0.9-uFog*0.4); c = mix(c, vec3(0.86,0.9,0.98), clamp(uArrivalBloom*body*0.45,0.,0.35)); gl_FragColor=vec4(c,a*(0.52+uEnergy*0.18));}`
    });
    this.points = new THREE.Points(g, m); this.scene.add(this.points);

    this.lineGeom = new THREE.BufferGeometry();
    this.linePos = new Float32Array(CONFIG.maxFilaments * 6);
    this.lineAlpha = new Float32Array(CONFIG.maxFilaments * 2);
    this.lineGeom.setAttribute('position', new THREE.BufferAttribute(this.linePos, 3));
    this.lineGeom.setAttribute('aLineAlpha', new THREE.BufferAttribute(this.lineAlpha, 1));
    this.lines = new THREE.LineSegments(this.lineGeom, new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uLineColor:{value:new THREE.Vector3(0.92,0.95,1)}},vertexShader:`attribute float aLineAlpha;varying float vLineAlpha;void main(){vLineAlpha=aLineAlpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`uniform vec3 uLineColor;varying float vLineAlpha;void main(){gl_FragColor=vec4(uLineColor,vLineAlpha*0.11);}`}));
    this.scene.add(this.lines);

    this.grid = new Map();
    this.resize(); window.addEventListener('resize', () => this.resize());
  }

  resize(){const w=window.innerWidth,h=window.innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}

  cymatic(x,y,t,s){const fx=Math.sin(x*(1.5+s.folding*1.8)+t*0.2)*Math.cos(y*(1.7+s.reach*1.5)-t*0.17);const fy=Math.sin((x+y)*(0.9+s.response*1.4)-t*0.13);return {x:fx*0.0018,y:fy*0.0018};}

  buildGrid(){this.grid.clear(); for(let i=0;i<this.count;i++){const k=i*3;const gx=Math.floor(this.positions[k]/CONFIG.grid);const gy=Math.floor(this.positions[k+1]/CONFIG.grid);const key=gx+','+gy;const arr=this.grid.get(key); if(arr) arr.push(i); else this.grid.set(key,[i]); }}
  neighbors(x,y){const gx=Math.floor(x/CONFIG.grid),gy=Math.floor(y/CONFIG.grid);const out=[];for(let ix=-1;ix<=1;ix++)for(let iy=-1;iy<=1;iy++){const a=this.grid.get((gx+ix)+','+(gy+iy));if(a) out.push(...a);}return out;}

  update(state){const dt=Math.min(this.clock.getDelta(),0.033), t=this.clock.elapsedTime; const s=state.current;
    const energy = s.reach*0.34+s.tracking*0.35+s.reception*0.3+s.response*0.2+s.aliveness*0.15;
    this.buildGrid();

    const silenceDrag = 0.985 - s.inhabited_silence * 0.08;
    const frictionShear = s.friction * 0.0035;
    const arrivalBoost = state.arrivalPhase === 3 ? 1.7 : 1.0;

    for(let i=0;i<this.count;i++){
      const k=i*3; const px=this.positions[k], py=this.positions[k+1];
      const neigh=this.neighbors(px,py);
      let ax=0,ay=0,cx=0,cy=0,sx=0,sy=0,n=0;
      for (const j of neigh){ if(j===i) continue; const q=j*3;const dx=this.positions[q]-px,dy=this.positions[q+1]-py;const d2=dx*dx+dy*dy; if(d2<CONFIG.neighborR*CONFIG.neighborR){n++;ax+=this.vel[q];ay+=this.vel[q+1];cx+=this.positions[q];cy+=this.positions[q+1]; if(d2<CONFIG.separationR*CONFIG.separationR){sx-=dx/(d2+0.01);sy-=dy/(d2+0.01);} } }
      if(n>0){ ax=(ax/n-this.vel[k])*0.0012; ay=(ay/n-this.vel[k+1])*0.0012; cx=((cx/n)-px)*0.0008*(0.4+s.tracking); cy=((cy/n)-py)*0.0008*(0.4+s.tracking); }
      const cym=this.cymatic(px,py,t,s);
      const cenX=-px*(0.0004+s.place*0.0008), cenY=-py*(0.0004+s.place*0.0008);
      const shearX=Math.sin(py*1.7+t*1.3)*frictionShear, shearY=Math.cos(px*1.5-t*1.1)*frictionShear;
      this.vel[k] += (ax+cx+sx*0.00022 + cym.x + cenX + shearX)*arrivalBoost;
      this.vel[k+1] += (ay+cy+sy*0.00022 + cym.y + cenY + shearY)*arrivalBoost;
      this.vel[k+2] += Math.sin(t*0.21+i*0.11)*0.00035 + (Math.random()-0.5)*0.00008;
      this.vel[k]*=silenceDrag; this.vel[k+1]*=silenceDrag; this.vel[k+2]*=0.992;

      if (state.arrivalPhase===1){ this.vel[k] += -px*0.0012; this.vel[k+1] += -py*0.0012; }
      else if (state.arrivalPhase===2){ this.vel[k]*=0.92; this.vel[k+1]*=0.92; }
      else if (state.arrivalPhase===4){ this.vel[k] += Math.sin(i*0.37+t*0.9)*0.0005; this.vel[k+1] += Math.cos(i*0.31-t*1.1)*0.0005; }

      this.positions[k]+=this.vel[k]; this.positions[k+1]+=this.vel[k+1]; this.positions[k+2]+=this.vel[k+2];
      const r=Math.hypot(this.positions[k],this.positions[k+1]); if(r>CONFIG.fieldRadius){const f=(r-CONFIG.fieldRadius)*0.003; this.vel[k]-=(this.positions[k]/r)*f; this.vel[k+1]-=(this.positions[k+1]/r)*f;}
      if(Math.abs(this.positions[k+2])>CONFIG.depth) this.vel[k+2]*=-0.8;
    }

    let c=0; const threshold=0.25 + s.tracking*0.3 + s.reception*0.22;
    for(let i=0;i<this.count && c<CONFIG.maxFilaments;i++){
      const k=i*3; const near=this.neighbors(this.positions[k],this.positions[k+1]); let used=0;
      for(const j of near){ if(j<=i || used>=CONFIG.maxFilamentsPerParticle || c>=CONFIG.maxFilaments) continue;
        const q=j*3; const dx=this.positions[q]-this.positions[k],dy=this.positions[q+1]-this.positions[k+1];const d=Math.hypot(dx,dy); if(d>0.14&&d<threshold){
          const rel=Math.abs(this.hues[i]-this.hues[j]); const resonance=1-Math.min(rel,1-rel)*2; if(resonance<0.35) continue;
          const p=c*6,a=c*2; this.linePos[p]=this.positions[k];this.linePos[p+1]=this.positions[k+1];this.linePos[p+2]=this.positions[k+2];this.linePos[p+3]=this.positions[q];this.linePos[p+4]=this.positions[q+1];this.linePos[p+5]=this.positions[q+2];
          const alpha=(1-d/threshold)*(0.45+resonance*0.4)*(0.6+s.reception*0.5); this.lineAlpha[a]=alpha; this.lineAlpha[a+1]=alpha; c++; used++;
        }
      }
    }

    this.lineGeom.setDrawRange(0,c*2); this.lineGeom.attributes.position.needsUpdate=true; this.lineGeom.attributes.aLineAlpha.needsUpdate=true;
    this.points.geometry.attributes.position.needsUpdate=true;
    this.points.material.uniforms.uTime.value=t; this.points.material.uniforms.uEnergy.value=energy;
    this.points.material.uniforms.uFog.value=1-state.confidence;
    this.points.material.uniforms.uArrivalBloom.value=state.arrivalPhase===3 ? 1 : (state.arrivalPhase===4 ? 0.35 : 0);
    this.points.material.uniforms.uHeart.value=state.heartMemoryWave;
    this.renderer.render(this.scene,this.camera);
  }
}

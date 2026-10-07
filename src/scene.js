const YGA = window.YGA = window.YGA || { motion: true, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, stage: null };
/* YGA stage: one WebGL1 context, many DOM-anchored objects. No dependencies.
   Palette: Beige #FFF7E6 · Almond #F9E9DA · Bone #E3DAC9 · Pine #00311F ·
   Pine-deep #002416 · Forest #183630 · Gold #E5C690. sRGB in, sRGB out. */

/* ---- 1. matrix core --------------------------------------------------------- */
const mul=(a,b)=>{const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;};
function transform(p=[0,0,0],r=[0,0,0],s=[1,1,1]){const[x,y,z]=r,cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);const rx=[1,0,0,0,0,cx,sx,0,0,-sx,cx,0,0,0,0,1],ry=[cy,0,-sy,0,0,1,0,0,sy,0,cy,0,0,0,0,1],rz=[cz,sz,0,0,-sz,cz,0,0,0,0,1,0,0,0,0,1];const out=mul(mul(ry,rx),rz);for(let c=0;c<3;c++)for(let w=0;w<3;w++)out[c*4+w]*=s[c];out[12]=p[0];out[13]=p[1];out[14]=p[2];return out;}
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n);};
const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
function lookAt(eye,target){const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];}
function perspective(fov,aspect,near=.1,far=120){const f=1/Math.tan(fov/2);return[f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];}
function normalMatrix(m){const a=[m[0],m[1],m[2]],b=[m[4],m[5],m[6]],c=[m[8],m[9],m[10]];const bc=cross(b,c),ca=cross(c,a),ab=cross(a,b),d=dot(a,bc)||1;return[...bc.map(v=>v/d),...ca.map(v=>v/d),...ab.map(v=>v/d)];}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ss=(e0,e1,x)=>{const t=clamp((x-e0)/(e1-e0||1),0,1);return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t;
const lerpA=(a,b,t)=>typeof a==='number'?a+(b-a)*t:Array.from(a,(v,i)=>v+(b[i]-v)*t);
const PI=Math.PI, H=PI/2;

/* ---- 2. geometry: four primitives, flat per-face normals -------------------- */
function chamferBox(c=.07,e=.04){
  const verts=[],normals=[],uvs=[];
  const ring=(s,z)=>[[-s+c,-s,z],[s-c,-s,z],[s,-s+c,z],[s,s-c,z],[s-c,s,z],[-s+c,s,z],[-s,s-c,z],[-s,-s+c,z]];
  const rings=[ring(.5-c,-.5),ring(.5,-.5+e),ring(.5,.5-e),ring(.5-c,.5)];
  const tri=(a,b,d,n)=>{n=n||norm(cross(sub(b,a),sub(d,a)));[a,b,d].forEach(v=>{verts.push(...v);normals.push(...n);uvs.push(v[0]+.5,v[1]+.5);});};
  for(let j=0;j<3;j++)for(let k=0;k<8;k++){const q=(k+1)%8;tri(rings[j][k],rings[j][q],rings[j+1][q]);tri(rings[j][k],rings[j+1][q],rings[j+1][k]);}
  for(let k=0;k<8;k++){const q=(k+1)%8;tri([0,0,-.5],rings[0][q],rings[0][k],[0,0,-1]);tri([0,0,.5],rings[3][k],rings[3][q],[0,0,1]);}
  return{verts,normals,uvs};
}
function cylinder(seg=40){const verts=[],normals=[],uvs=[];const add=(p,n)=>{verts.push(...p);normals.push(...n);uvs.push(p[0]+.5,p[2]+.5);};for(let i=0;i<seg;i++){const a=i*2*PI/seg,b=(i+1)*2*PI/seg,pa=[Math.cos(a)*.5,Math.sin(a)*.5],pb=[Math.cos(b)*.5,Math.sin(b)*.5],na=[pa[0]*2,0,pa[1]*2],nb=[pb[0]*2,0,pb[1]*2];for(const[p,n]of[[[pa[0],-.5,pa[1]],na],[[pb[0],-.5,pb[1]],nb],[[pb[0],.5,pb[1]],nb],[[pa[0],-.5,pa[1]],na],[[pb[0],.5,pb[1]],nb],[[pa[0],.5,pa[1]],na]])add(p,n);add([0,.5,0],[0,1,0]);add([pa[0],.5,pa[1]],[0,1,0]);add([pb[0],.5,pb[1]],[0,1,0]);add([0,-.5,0],[0,-1,0]);add([pb[0],-.5,pb[1]],[0,-1,0]);add([pa[0],-.5,pa[1]],[0,-1,0]);}return{verts,normals,uvs};}
function annulus(ri=.80,seg=48){
  const verts=[],normals=[],uvs=[];
  const add=(p,n)=>{verts.push(...p);normals.push(...n);uvs.push(p[0]+.5,p[1]+.5);};
  const quad=(a,b,c,d,n)=>{add(a,n);add(b,n);add(c,n);add(a,n);add(c,n);add(d,n);};
  for(let i=0;i<seg;i++){const a=i*2*PI/seg,b=(i+1)*2*PI/seg;
    const ca=Math.cos(a)*.5,sa=Math.sin(a)*.5,cb=Math.cos(b)*.5,sb=Math.sin(b)*.5,n=norm([ca+cb,sa+sb,0]);
    quad([ca,sa,-.5],[cb,sb,-.5],[cb,sb,.5],[ca,sa,.5],n);
    quad([ca*ri,sa*ri,.5],[cb*ri,sb*ri,.5],[cb*ri,sb*ri,-.5],[ca*ri,sa*ri,-.5],[-n[0],-n[1],0]);
    quad([ca,sa,.5],[cb,sb,.5],[cb*ri,sb*ri,.5],[ca*ri,sa*ri,.5],[0,0,1]);
    quad([ca*ri,sa*ri,-.5],[cb*ri,sb*ri,-.5],[cb,sb,-.5],[ca,sa,-.5],[0,0,-1]);
  }
  return{verts,normals,uvs};
}
/* prism(pts): extruded flat convex profile, z -0.5..0.5, with a chamfered rim */
function prism(pts,e=.12){
  const verts=[],normals=[],uvs=[],n=pts.length;
  const cx=pts.reduce((s,p)=>s+p[0],0)/n,cy=pts.reduce((s,p)=>s+p[1],0)/n;
  const inset=pts.map(p=>[p[0]+(cx-p[0])*e,p[1]+(cy-p[1])*e]);
  const tri=(a,b,d)=>{const nn=norm(cross(sub(b,a),sub(d,a)));[a,b,d].forEach(v=>{verts.push(...v);normals.push(...nn);uvs.push(v[0]+.5,v[1]+.5);});};
  const z0=-.5,z1=-.5+e*.6,z2=.5-e*.6,z3=.5;
  for(let k=0;k<n;k++){const q=(k+1)%n,A=pts[k],B=pts[q],a=inset[k],b=inset[q];
    tri([A[0],A[1],z1],[B[0],B[1],z1],[B[0],B[1],z2]);tri([A[0],A[1],z1],[B[0],B[1],z2],[A[0],A[1],z2]);
    tri([A[0],A[1],z2],[B[0],B[1],z2],[b[0],b[1],z3]);tri([A[0],A[1],z2],[b[0],b[1],z3],[a[0],a[1],z3]);
    tri([B[0],B[1],z1],[A[0],A[1],z1],[a[0],a[1],z0]);tri([B[0],B[1],z1],[a[0],a[1],z0],[b[0],b[1],z0]);
    tri([cx,cy,z3],[a[0],a[1],z3],[b[0],b[1],z3]);tri([cx,cy,z0],[b[0],b[1],z0],[a[0],a[1],z0]);}
  return{verts,normals,uvs};
}

/* ---- 3. tones and materials (all derived from the six brand tokens) ---------- */
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const TONE={
  pineDeep:hex('#001B11'), pine:hex('#00311F'), forest:hex('#183630'), forestHi:hex('#335238'),
  bronze:hex('#6A5D43'), goldLo:hex('#C9A972'), gold:hex('#E5C690'), goldHi:hex('#FFF6E2'),
  boneLo:hex('#9FA796'), bone:hex('#E3DAC9'), boneHi:hex('#FFFDF6'),
  almondLo:hex('#BFAE9A'), almond:hex('#F9E9DA'), beige:hex('#FFF7E6'), glassLo:hex('#0B2A20')
};
const MAT={
  pine  :{d:'pineDeep',m:'pine',   l:'gold',    s:.62,k:.10,r:'gold',  rk:.26},
  forest:{d:'pine',    m:'forest', l:'goldLo',  s:.56,k:.06,r:'gold',  rk:.30},
  gold  :{d:'bronze',  m:'goldLo', l:'goldHi',  s:.46,k:.85,r:'forest',rk:.26},
  bone  :{d:'boneLo',  m:'bone',   l:'boneHi',  s:.52,k:.00,r:'forest',rk:.46},
  almond:{d:'almondLo',m:'almond', l:'boneHi',  s:.55,k:.00,r:'forest',rk:.42},
  glass :{d:'pineDeep',m:'glassLo',l:'forestHi',s:.74,k:.10,r:'bone',  rk:.30},
  paper :{d:'beige',   m:'beige',  l:'beige',   s:.50,k:.00,r:'beige', rk:.00}
};

/* ---- 4. shaders ----------------------------------------------------------------- */
const VS=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUv;
uniform mat4 uModel,uViewProjection;uniform mat3 uNormal;
varying vec3 vPosition,vNormal;varying vec2 vUv;
void main(){vec4 p=uModel*vec4(aPosition,1.);vPosition=p.xyz;vNormal=normalize(uNormal*aNormal);vUv=aUv;gl_Position=uViewProjection*p;}`;
const FS=`precision mediump float;
uniform vec3 uDark,uMid,uLite,uRim,uPaper,uShade,uEye;
uniform vec4 uSurf,uGC;uniform vec2 uFog,uGK;uniform float uGround;
uniform sampler2D uTexture;
varying vec3 vPosition,vNormal;varying vec2 vUv;
const vec3 KEY=vec3(-0.3856,0.7896,0.4774);
const vec3 FILL=vec3(0.7730,0.1880,-0.6059);
void main(){
  float fog=clamp((length(uEye-vPosition)-uFog.x)/(uFog.y-uFog.x),0.0,1.0);
  if(uGround>0.5){
    vec2 d=vec2((vUv.x-0.5)*uGC.z-uGC.x,-(vUv.y-0.5)*uGC.w-uGC.y)/uGK;
    float g=exp(-(d.x*d.x/11.0+d.y*d.y/5.5));
    float c=exp(-(d.x*d.x/2.4+(d.y-0.5)*(d.y-0.5)/1.1));
    gl_FragColor=vec4(uShade,clamp(g*0.34+c*0.30,0.0,0.56)*(1.0-fog));return;
  }
  vec3 n=normalize(vNormal),v=normalize(uEye-vPosition);
  float key=max(dot(n,KEY),0.0),fill=max(dot(n,FILL),0.0);
  float s=clamp(0.17+0.62*key+0.22*fill+0.26*(n.y*0.5+0.5)+0.10*max(-n.y,0.0),0.0,1.0);
  vec3 col=mix(uDark,uMid,smoothstep(0.0,uSurf.x,s));
  col=mix(col,uLite,smoothstep(uSurf.x,1.0,s));
  vec3 tex=texture2D(uTexture,vUv).rgb;
  col=mix(col,tex*(0.80+0.22*key+0.10*(n.y*0.5+0.5)),uSurf.w);
  float spec=pow(max(dot(n,normalize(KEY+v)),0.0),mix(42.0,110.0,uSurf.y));
  col+=vec3(0.98,0.95,0.88)*spec*mix(0.14,0.70,uSurf.y)*(1.0-uSurf.w*0.7);
  col=mix(col,uRim,clamp(pow(1.0-max(dot(n,v),0.0),3.2)*uSurf.z,0.0,1.0));
  col=mix(col,uPaper,fog*0.62);
  gl_FragColor=vec4(col,1.0);
}`;

/* ---- 5. stage ------------------------------------------------------------------- */
function createStage(canvas){
  let gl;
  try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:false,depth:true,preserveDrawingBuffer:false});}catch(e){return null;}
  if(!gl)return null;
  const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('shader');return s;};
  let program;
  try{program=gl.createProgram();const v=shader(gl.VERTEX_SHADER,VS),f=shader(gl.FRAGMENT_SHADER,FS);
    gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('link');}catch(e){return null;}
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);
  gl.clearColor(1,.969,.902,0);
  const u={};for(const k of['Model','ViewProjection','Normal','Dark','Mid','Lite','Rim','Paper','Shade','Eye','Surf','Fog','Ground','GC','GK','Texture'])u[k]=gl.getUniformLocation(program,'u'+k);
  const attrib=['Position','Normal','Uv'].map(x=>gl.getAttribLocation(program,'a'+x));
  attrib.forEach(a=>gl.enableVertexAttribArray(a));
  gl.uniform1i(u.Texture,0);

  let uniqueTris=0;
  const mesh=data=>{const b=[data.verts,data.normals,data.uvs].map(a=>{const x=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,x);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(a),gl.STATIC_DRAW);return x;});uniqueTris+=data.verts.length/9;return{buffers:b,count:data.verts.length/3};};
  const M={
    bar:mesh(chamferBox(.11,.07)), cube:mesh(chamferBox(.07,.04)), slab:mesh(chamferBox(.03,.02)),
    cyl:mesh(cylinder(40)), ring:mesh(annulus(.80,48)), thin:mesh(annulus(.88,48)),
    head:mesh(prism([[-.5,-.32],[.5,-.32],[0,.5]],.10)),
    plane:mesh({verts:[-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,-.5,0,.5,.5,0,-.5,.5,0],normals:Array(6).fill([0,0,1]).flat(),uvs:[0,0,1,0,1,1,0,0,1,1,0,1]})
  };

  /* ---- procedural textures, re-baked after document.fonts.ready ------------- */
  const recipes=[];
  function bake(r){
    const c=document.createElement('canvas');c.width=r.w;c.height=r.h;const x=c.getContext('2d');
    try{r.draw(x,r.w,r.h);}catch(e){}
    gl.bindTexture(gl.TEXTURE_2D,r.t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);
  }
  function texture(draw,w=512,h=512){
    const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
    for(const[p,v]of[[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,p,v);
    const r={t,draw,w,h};recipes.push(r);bake(r);return t;
  }
  const D=(w,px)=>w+' '+px+'px "Big Shoulders", "Arial Narrow", Impact, sans-serif';
  const S=(w,px,it)=>(it?'italic ':'')+w+' '+px+'px Spectral, Georgia, "Times New Roman", serif';
  const PINE='#00311F',DEEP='#002416',FOREST='#183630',GOLD='#E5C690',BONE='#E3DAC9',BEIGE='#FFF7E6',ALMOND='#F9E9DA',GINK='#7A5A1C';
  const track=(c,v)=>{try{c.letterSpacing=v;}catch(e){}};
  const fit=(c,txt,maxW,w,px,disp=true)=>{let s=px;c.font=disp?D(w,s):S(w,s);while(c.measureText(txt).width>maxW&&s>8){s-=2;c.font=disp?D(w,s):S(w,s);}return s;};
  function wrap(c,txt,x,y,maxW,lh){let line='';const out=[];for(const w of txt.split(' ')){const t=line?line+' '+w:w;if(c.measureText(t).width>maxW&&line){out.push(line);line=w;}else line=t;}out.push(line);out.forEach((l,i)=>c.fillText(l,x,y+i*lh));return y+out.length*lh;}
  function arrow(c,x,y,s,col,lw){c.strokeStyle=col;c.lineWidth=lw;c.lineCap='square';c.beginPath();c.moveTo(x,y+s);c.lineTo(x+s,y);c.moveTo(x+s*.3,y);c.lineTo(x+s,y);c.lineTo(x+s,y+s*.7);c.stroke();}
  function rarrow(c,x,y,s,col,lw){c.strokeStyle=col;c.lineWidth=lw;c.beginPath();c.moveTo(x,y);c.lineTo(x+s,y);c.moveTo(x+s*.62,y-s*.36);c.lineTo(x+s,y);c.lineTo(x+s*.62,y+s*.36);c.stroke();}
  const rules=(c,x,y,w,n,gap,col,th=4)=>{c.fillStyle=col;for(let i=0;i<n;i++)c.fillRect(x,y+i*gap,w*(i===n-1?.6:1-(i%3)*.08),th);};
  const T={};
  T.blank=texture(c=>{c.fillStyle=BEIGE;c.fillRect(0,0,2,2);},2,2);
  /* hero phone: the carousel slide */
  T.phone=texture((c,w,h)=>{
    c.fillStyle=DEEP;c.fillRect(0,0,w,h);
    c.fillStyle=GOLD;c.beginPath();c.arc(52,66,26,0,7);c.fill();c.fillStyle=PINE;c.font=D(800,24);c.textAlign='center';c.fillText('YGA',52,75);c.textAlign='left';
    c.fillStyle=BEIGE;c.font=S(600,25);c.fillText('yourgrowthagency',92,60);
    c.fillStyle=BONE;c.font=S(400,19);c.fillText('Carousel · 7 slides',92,88);
    c.fillStyle=BEIGE;c.fillRect(22,124,w-44,760);
    c.fillStyle=GOLD;c.fillRect(22,124,w-44,10);
    track(c,'3px');c.fillStyle=GINK;c.font=D(700,24);c.fillText('SLIDE 01 / 07',52,190);track(c,'0px');
    c.fillStyle=PINE;c.font=D(800,66);
    const end=wrap(c,'HERE’S EXACTLY HOW WE TURN YOUR CONTENT INTO YOUR FIRST DIGITAL PRODUCT.',52,262,w-104,60);
    c.fillStyle=GOLD;c.fillRect(52,end-22,120,10);
    c.fillStyle=PINE;c.fillRect(w-226,800,174,58);c.fillStyle=GOLD;c.font=S(400,30,1);c.fillText('Swipe',w-206,839);rarrow(c,w-118,829,46,GOLD,4);
    for(let i=0;i<7;i++){c.fillStyle=i?FOREST:GOLD;c.fillRect(w/2-91+i*26,914,i?12:18,12);}
    rules(c,30,962,w-60,3,34,'#183630',8);
  },512,1100);
  /* hero laptop: a guide product page */
  T.guide=texture((c,w,h)=>{
    c.fillStyle=BEIGE;c.fillRect(0,0,w,h);
    c.fillStyle=PINE;c.font=D(900,36);c.fillText('YGA',40,52);
    c.font=S(400,18);['Guide','Inside','Questions'].forEach((s,i)=>c.fillText(s,w-330+i*96,48));
    c.fillRect(40,72,w-80,2);
    c.fillStyle=PINE;c.fillRect(52,104,232,316);c.fillStyle=GOLD;c.fillRect(52,104,14,316);
    c.font=D(900,62);['FIND','YOUR','LIGHT.'].forEach((s,i)=>c.fillText(s,88,182+i*58));
    c.fillStyle=BONE;c.font=S(400,17,1);c.fillText('A guide by you',88,394);
    arrow(c,224,348,36,GOLD,6);
    track(c,'3px');c.fillStyle=GINK;c.font=D(700,19);c.fillText('CUSTOM GUIDE · EBOOK',326,124);track(c,'0px');
    c.fillStyle=PINE;c.font=D(800,58);c.fillText('YOUR KNOWLEDGE.',324,184);c.fillText('A COMPLETE GUIDE.',324,238);
    c.fillStyle=FOREST;c.font=S(400,19);wrap(c,'Researched, written and designed around the questions your audience keeps asking.',326,280,w-370,27);
    c.fillStyle=PINE;c.fillRect(326,352,190,52);c.fillStyle=GOLD;c.font=D(700,23);track(c,'2px');c.fillText('GET THE GUIDE',346,386);track(c,'0px');
    c.strokeStyle=PINE;c.lineWidth=2;c.strokeRect(530,352,150,52);c.fillStyle=PINE;c.font=S(400,18,1);c.fillText('Look inside',556,384);
    c.fillStyle=ALMOND;c.fillRect(0,438,w,h-438);c.fillStyle=BONE;for(let i=0;i<3;i++)c.fillRect(40+i*246,450,226,24);
  },800,474);
  /* workbook / case cover */
  T.cover=texture((c,w,h)=>{
    c.fillStyle=PINE;c.fillRect(0,0,w,h);c.fillStyle=GOLD;c.fillRect(0,0,w,12);
    c.font=D(900,52);c.fillText('YGA',40,92);
    track(c,'4px');c.fillStyle=BONE;c.font=D(700,20);c.fillText('WORKBOOK · 01',300,84);track(c,'0px');
    c.fillStyle=BEIGE;c.font=D(900,112);c.fillText('YOUR',40,260);c.fillText('FIRST',40,360);c.fillStyle=GOLD;c.fillText('PRODUCT.',40,460);
    c.fillStyle=BONE;c.font=S(400,26,1);c.fillText('Created entirely for you.',42,516);
    arrow(c,372,560,96,GOLD,14);
    c.fillStyle=FOREST;c.fillRect(40,660,w-80,4);
  },512,700);
  T.chipA=texture((c,w,h)=>{c.fillStyle=BONE;c.fillRect(0,0,w,h);c.fillStyle=GOLD;c.beginPath();c.arc(40,48,16,0,7);c.fill();c.fillStyle=PINE;c.font=S(400,30,1);c.fillText('Can you go deeper?',72,58);},512,96);
  T.chipB=texture((c,w,h)=>{c.fillStyle=PINE;c.fillRect(0,0,w,h);c.fillStyle=GOLD;c.font=S(400,30,1);c.fillText('Where should I start?',30,58);},512,96);
  const sheet=(bg,ac)=>texture((c,w,h)=>{c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle=PINE;c.fillRect(22,26,w*.55,22);c.fillStyle=ac;c.fillRect(w-58,24,30,30);rules(c,22,82,w-44,8,26,'#B9B2A2',6);c.fillStyle=PINE;c.fillRect(22,h-46,60,6);},256,340);
  T.sheetA=sheet(BEIGE,GOLD);T.sheetB=sheet(ALMOND,FOREST);
  T.mono=texture((c,w,h)=>{c.fillStyle=GOLD;c.fillRect(0,0,w,h);c.strokeStyle=PINE;c.lineWidth=6;c.strokeRect(18,18,w-36,h-36);c.fillStyle=PINE;c.textAlign='center';c.font=D(900,120);c.fillText('YGA',w/2,h/2+42);c.textAlign='left';},256,256);
  const cardArt=(kicker,l1,l2,glyph,bg,fg,ac)=>texture((c,w,h)=>{
    c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle=ac;c.fillRect(0,0,w,10);
    track(c,'4px');c.fillStyle=ac;c.font=D(700,24);c.fillText(kicker,36,66);track(c,'0px');
    c.fillStyle=fg;const px=Math.min(fit(c,l1,w-72,900,120),fit(c,l2,w-72,900,120));c.font=D(900,px);c.fillText(l1,34,240);c.fillText(l2,34,240+px*.86);
    c.fillStyle=ac;c.strokeStyle=ac;
    if(glyph===0)arrow(c,36,420,120,ac,18);
    if(glyph===1){c.beginPath();c.moveTo(40,420);c.lineTo(150,480);c.lineTo(40,540);c.closePath();c.fill();}
    if(glyph===2){for(let i=0;i<3;i++)for(let j=0;j<3;j++)if((i+j)%2===0)c.fillRect(38+i*42,420+j*42,34,34);}
    c.fillRect(36,h-56,w-72,6);
  },512,658);
  T.card=[cardArt('01 / CUSTOM GUIDES','FIND','YOUR LIGHT.',0,PINE,BEIGE,GOLD),
          cardArt('02 / CREATOR-LED COURSES','SHOW THEM','YOUR WAY.',1,BONE,PINE,FOREST),
          cardArt('03 / CUSTOM WORKBOOKS','MAKE ROOM FOR','PROGRESS.',2,GOLD,PINE,PINE)];
  const rebake=()=>recipes.forEach(bake);

  /* ---- draw primitives ----------------------------------------------------- */
  let draws=0,tris=0;
  function draw(shape,m,matName,tex,ground){
    const A=MAT[matName]||MAT.pine;
    for(let i=0;i<3;i++){gl.bindBuffer(gl.ARRAY_BUFFER,shape.buffers[i]);gl.vertexAttribPointer(attrib[i],i===2?2:3,gl.FLOAT,false,0,0);}
    gl.uniformMatrix4fv(u.Model,false,m);
    gl.uniformMatrix3fv(u.Normal,false,normalMatrix(m));
    gl.uniform3fv(u.Dark,TONE[A.d]);gl.uniform3fv(u.Mid,TONE[A.m]);gl.uniform3fv(u.Lite,TONE[A.l]);gl.uniform3fv(u.Rim,TONE[A.r]);
    gl.uniform4f(u.Surf,A.s,A.k,A.rk,tex?1:0);
    gl.uniform1f(u.Ground,ground?1:0);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex||T.blank);
    gl.drawArrays(gl.TRIANGLES,0,shape.count);draws++;tris+=shape.count/3;
  }
  const part=(parent,p,s,mat,r,shape)=>draw(shape||M.cube,mul(parent,transform(p,r||[0,0,0],s)),mat);
  const face=(parent,p,s,tex,r)=>draw(M.plane,mul(parent,transform(p,r||[0,0,0],[s[0],s[1],1])),'paper',tex);
  const top=(parent,p,s,tex)=>face(parent,p,s,tex,[-H,0,0]);
  /* ground(parent,y,size,k): a transparent plane that carries only the warm
     two-lobe contact shadow; k scales the lobes to the object's footprint. */
  function ground(parent,y,k=[1,1],c=[0,0],size=[18,12]){
    gl.uniform4f(u.GC,c[0],c[1],size[0],size[1]);gl.uniform2f(u.GK,k[0],k[1]);
    draw(M.plane,mul(parent,transform([0,y,0],[-H,0,0],[size[0],size[1],1])),'paper',null,1);
  }
  const disc=(root,y,r,mat='bone')=>{draw(M.cyl,mul(root,transform([0,y,0],[0,0,0],[r,.24,r])),mat);draw(M.cyl,mul(root,transform([0,y-.17,0],[0,0,0],[r*.91,.16,r*.91])),'forest');};
  /* 7-bar numeral table: a top, b top-right, c bottom-right, d bottom, e bottom-left, f top-left, g middle */
  const DIG=['abcdef','bc','abged','abgcd','fgbc','afgcd','afgedc','abc','abcdefg','abcdfg'];
  const BAR={a:[0,1.22,1.78,.46,0],d:[0,-1.22,1.78,.46,0],g:[0,0,1.78,.46,0],
    f:[-.66,.61,.46,1.68,1],b:[.66,.61,.46,1.68,1],e:[-.66,-.61,.46,1.68,1],c:[.66,-.61,.46,1.68,1]};

  /* ---- 6. the cast ---------------------------------------------------------- */
  const OBJ={
  hero:{fog:[14,36],fit:1.15,idle:1,
    cam(p){const focus=Math.sin(clamp(p*2,0,2)*H),launch=clamp(p*2-1,0,1),travel=Math.sin(p*PI);
      return{eye:[7.8-focus*2.3-travel*.5+launch*.6,4.3-focus*1.0+launch*.9,12.3-focus*2.4-travel*.7+launch*1.1],target:[0,.6+launch*.55,0],fov:.56};},
    build(c){
      const{root,p,bob,mobile}=c,mode=clamp(p*2,0,2),launch=clamp(mode-1,0,1);
      ground(root,-2.19,[1,1],[0,0],[20,13]);
      if(launch>.01)draw(M.ring,mul(root,transform([0,-6.2+launch*7.3,-2.75],[.06,0,0],[7.4,7.4,.17])),'gold');
      /* Pine arch, Gold reveal, Bone aperture */
      part(root,[-3.12,.18,-.65],[.86,4.45,1.55],'pine',[0,0,-.04],M.bar);
      part(root,[3.12,.18,-.65],[.86,4.45,1.55],'pine',[0,0,.04],M.bar);
      part(root,[0,2.62,-.65],[7.12,1.25,1.55],'pine',null,M.bar);
      part(root,[0,3.29,-.65],[6.6,.09,1.25],'forest',null,M.slab);
      part(root,[-2.61,.12,-.60],[.14,3.85,1.35],'gold',null,M.slab);
      part(root,[2.61,.12,-.60],[.14,3.85,1.35],'gold',null,M.slab);
      part(root,[0,1.94,-.60],[5.22,.15,1.35],'gold',null,M.slab);
      part(root,[0,-.02,-1.46],[5.15,3.9,.15],'bone',null,M.slab);
      /* plinth: Bone deck, Forest under-course, Gold fascia and ribs */
      part(root,[0,-1.96,0],[7.45,.23,4.35],'bone',null,M.slab);
      part(root,[0,-2.10,.02],[7.20,.16,4.20],'forest',null,M.slab);
      part(root,[0,-1.78,-.85],[5.28,.14,2.32],'forest',null,M.slab);
      part(root,[0,-1.95,2.14],[7.45,.09,.09],'gold');
      const ribs=mobile?4:7,step=4.26/(ribs-1);
      for(let i=0;i<ribs;i++)part(root,[-2.13+i*step,-1.70,-.7],[.028,.020,1.75],'gold');
      part(root,[0,2.60,.16],[5.30,1.02,.08],'bone',null,M.slab);part(root,[0,2.06,.17],[5.30,.05,.07],'gold',null,M.slab);
      letter(root,-1.45,2.6,'Y');letter(root,0,2.6,'G');letter(root,1.52,2.6,'A');
      /* laptop: the guide product page */
      const lap=mul(root,transform([-.35,-1.64,1.05],[0,-.13,0]));
      part(lap,[0,0,0],[3.1,.13,1.85],'bone',null,M.slab);
      part(lap,[0,.081,-.17],[2.5,.015,.92],'pine',null,M.slab);
      const cols=mobile?5:10,rows=mobile?3:4;
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)part(lap,[-1.1+i*(2.2/(cols-1)),.096,-.49+j*.21],[.18,.01,.13],'almond',null,M.slab);
      part(lap,[0,.082,.51],[.7,.014,.39],'forest',null,M.slab);
      const hinge=mul(lap,transform([0,.08,-.79],[-.13-.09*Math.sin(mode),0,0]));
      part(hinge,[0,.99,0],[3.1,1.95,.115],'bone',null,M.slab);
      part(hinge,[0,1,.072],[2.94,1.8,.02],'pine',null,M.slab);
      face(hinge,[0,1,.09],[2.82,1.67],T.guide);
      /* phone: the carousel slide, resting on a small Forest stand */
      const pz=.85+(.7-Math.min(mode,.7))*.6;
      part(root,[2.04,-1.76,pz-.08],[1.2,.18,.62],'forest',[0,-.28,0],M.slab);
      const ph=mul(root,transform([2.04,-.40+bob*.5,pz],[.07,-.28,.10]));
      part(ph,[0,0,0],[1.21,2.49,.15],'pine',null,M.slab);
      part(ph,[.615,0,.02],[.05,2.49,.13],'gold',null,M.slab);
      part(ph,[0,0,.09],[1.12,2.4,.04],'glass',null,M.slab);
      face(ph,[0,-.02,.12],[1.03,2.21],T.phone);
      part(ph,[0,1.15,.13],[.30,.045,.016],'forest',null,M.slab);
      /* workbook with Gold foredge */
      const lift=Math.sin(mode*H);
      const bk=mul(root,transform([-2.1+mode*.18,-.55+lift*.45+bob,1.12+lift*.8],[.04,.22+mode*.16,-.13+mode*.12]));
      part(bk,[0,0,0],[1.7,2.3,.2],'pine',null,M.slab);
      part(bk,[.035,0,.112],[1.57,2.23,.032],'bone',null,M.slab);
      face(bk,[0,0,.146],[1.68,2.3],T.cover);
      part(bk,[-.815,0,.125],[.05,2.3,.05],'gold',null,M.slab);
      part(bk,[.800,0,.112],[.03,2.2,.04],'gold',null,M.slab);
      /* audience questions, Act I */
      const aud=1-ss(.3,1,mode);
      for(let i=0;i<2;i++){
        const q=mul(root,transform([i?1.1:-1.15,1.2+(i?.3:0)+bob*.8+aud*.25,1.0+mode*.12-(1-aud)*1.4],[0,-.14,i?-.08:.06]));
        part(q,[0,0,0],[2.15,.43,.07],i?'pine':'bone',null,M.slab);
        face(q,[0,0,.05],[2.06,.386],i?T.chipB:T.chipA);
      }
      /* Gold launch pad and three-tone growth steps */
      draw(M.cyl,mul(root,transform([3.5,-1.66,1.5],[0,0,0],[1.55,.36,1.55])),'gold');
      const st=mul(root,transform([3.4,-1.48+launch*.06,1.53],[0,-.1,0]));
      ['pine','forest','gold'].forEach((m,i)=>part(st,[-.48+i*.42,(.3+i*.4)/2,0],[.38,.3+i*.4+launch*i*.18,.6],m));
    }},

  /* six stages, one per sixth of the pinned #process scroll */
  transform:{fog:[12,30],fit:1.35,
    cam:p=>({eye:[3.1-p*.5,3.5-p*.5,8.6-p*.6],target:[.15,-.45+p*.35,0],fov:.56}),
    build(c){
      const{root,p}=c,s=clamp(p*6,0,6)-.5,i0=clamp(Math.floor(s),0,4),f=ss(.18,.82,clamp(s-i0,0,1));
      const K=list=>lerpA(list[i0],list[i0+1],f);
      ground(root,-1.53,[.95,.85]);
      part(root,[0,-1.30,0],[6.8,.22,3.4],c.dark?'forest':'bone',null,M.slab);
      part(root,[0,-1.45,.02],[6.5,.14,3.2],c.dark?'pine':'forest',null,M.slab);
      part(root,[0,-1.22,1.70],[6.8,.07,.07],'gold');
      /* present: the whole case pivots on its front edge toward the camera */
      const pr=K([0,0,0,0,0,1]),pv=[0,-1.19,1.17];
      const C=mul(root,mul(transform(pv,[.5*pr,-.12*pr,0]),transform(pv.map(v=>-v))));
      if(pr>.01)part(root,[0,-1.19+.55*pr,-.93],[1.1,1.1*pr,.18],'forest',null,M.slab);
      /* the sheets: scattered, fanned, one lifts, stacked */
      const fan=i=>{const a=-.62+i*.31,L=.95;return[-.2-Math.sin(a)*L,-1.17+i*.032,1.25-Math.cos(a)*L,0,a,0];};
      const stack=(i,j)=>[0,-1.075+i*.032,.05,0,j*(i-2)*.025,0];
      const P=[
        [[-2.25,-1.170,.55,0,.42,0],fan(0),[-2.2,-1.17,-.75,0,.20,0],stack(0,1),stack(0,0),stack(0,0)],
        [[-.95,-1.170,-.55,0,-.30,0],fan(1),[-1.05,-1.17,-.95,0,-.10,0],stack(1,1),stack(1,0),stack(1,0)],
        [[.45,-1.170,.62,0,.85,0],fan(2),[0,.15,.55,1.05,-.10,.03],stack(2,1),stack(2,0),stack(2,0)],
        [[1.95,-1.165,-.35,0,-.16,0],fan(3),[1.05,-1.17,-.95,0,.12,0],stack(3,1),stack(3,0),stack(3,0)],
        [[-1.55,-1.135,.25,0,1.25,.02],fan(4),[2.2,-1.17,-.75,0,-.22,0],stack(4,1),stack(4,0),stack(4,0)]];
      for(let i=0;i<5;i++){const q=K(P[i]),m=mul(C,transform([q[0],q[1],q[2]],[q[3],q[4],q[5]]));
        part(m,[0,0,0],[1.5,.03,2.0],i%2?'almond':'bone',null,M.slab);
        top(m,[0,.017,0],[1.42,1.92],i%2?T.sheetB:T.sheetA);}
      /* the Pine tray rises out of the deck under the stack */
      part(C,[0,K([-1.36,-1.36,-1.36,-1.14,-1.14,-1.14]),.05],[1.76,.10,2.26],'pine',null,M.slab);
      /* the Pine case with its Gold band closes over */
      const q=K([[.4,4.8,-.4,-.5,.3,.1],[.4,4.8,-.4,-.5,.3,.1],[.4,4.6,-.4,-.5,.3,.1],[.25,1.0,-.25,-.42,.18,.06],[0,-1.13,.05,0,0,0],[0,-1.13,.05,0,0,0]]);
      const L=mul(C,transform([q[0],q[1],q[2]],[q[3],q[4],q[5]]));
      part(L,[0,.40,0],[1.84,.09,2.34],'pine',null,M.slab);
      part(L,[0,.20,1.13],[1.84,.40,.08],'pine',null,M.slab);part(L,[0,.20,-1.13],[1.84,.40,.08],'pine',null,M.slab);
      part(L,[.88,.20,0],[.08,.40,2.34],'pine',null,M.slab);part(L,[-.88,.20,0],[.08,.40,2.34],'pine',null,M.slab);
      top(L,[0,.447,-.08],[1.62,2.0],T.cover);
      part(L,[0,.425,.72],[1.88,.06,.30],'gold',null,M.slab);
      part(L,[.905,.2,.72],[.05,.44,.30],'gold',null,M.slab);part(L,[-.905,.2,.72],[.05,.44,.30],'gold',null,M.slab);
      /* Improve: a small Gold ring rises beside the presented case */
      const ry=K([-2.4,-2.4,-2.4,-2.4,-2.4,-.58]);
      if(ry>-2.3)draw(M.ring,mul(root,transform([2.35,ry,.45],[0,-.55,0],[1.18,1.18,.16])),'gold');
    }},

  kit:{fog:[11,28],fit:1,
    cam:p=>({eye:[2.9,2.8-p*.5,6.9],target:[0,-.45,0],fov:.54}),
    build(c){
      const{root,p}=c,n=ss(.08,.56,p);
      ground(root,-1.69,[.5,.75]);
      disc(root,-1.44,3.3);
      const L=[['pine',2.9,2.1,.46],['bone',2.66,1.92,.36],['gold',2.44,1.74,.20],['almond',2.22,1.56,.30]];
      let y=-1.32;
      L.forEach((s,i)=>{
        const spread=(1-n)*(1.55-i*.30),yaw=-.22+(1-n)*(.30-i*.14);
        part(root,[(1-n)*(i-1.5)*.42,y+s[3]/2+spread,(1-n)*(i-1.5)*.30],[s[1],s[3],s[2]],s[0],[(1-n)*.07,yaw,(1-n)*.05],M.slab);
        y+=s[3]*n+(1-n)*.3;
      });
      if(n>.55){const b=ss(.55,1,n),G=mul(root,transform([0,-1.32,0],[0,-.22,0]));
        part(G,[-.45,.67,0],[.34,1.40,2.16*b+.04],'gold',null,M.slab);
        part(G,[-.45,.86,1.12*b],[.48,.48,.08],'gold');}
    }},

  tiers:{fog:[12,30],fit:1.3,
    cam:()=>({eye:[2.4,3.0,10.4],target:[0,-.25,0],fov:.52}),
    build(c){
      const{root,p,variant}=c,pick=variant|0;
      ground(root,-1.84,[1,.75]);
      part(root,[0,-1.62,0],[7.2,.22,3.2],'bone',null,M.slab);
      part(root,[0,-1.76,.02],[6.9,.14,3.0],'forest',null,M.slab);
      part(root,[0,-1.60,1.55],[7.2,.08,.08],'gold');
      const Hh=[1.10,1.80,2.50],TN=['forest','pine','pine'];
      for(let i=0;i<3;i++){
        const on=ss(0,1,clamp((p-i*.12)/.5,0,1)),h=Hh[i]*(.08+.92*on),chosen=i===pick,x=-2.25+i*2.25,r=[0,-.08+i*.08,0];
        const y=-1.51+h/2+(chosen?.16*on:0);
        part(root,[x,y,0],[1.72,h,1.72],TN[i],r,M.bar);
        part(root,[x,y+h/2+.07,0],[1.84,.14,1.84],'bone',r,M.slab);
        part(root,[x,y+h/2+.16,0],[1.60,.05,1.60],'gold',r,M.slab);
        if(chosen&&on>.6){const k=ss(.6,1,on);draw(M.ring,mul(root,transform([x,y+h/2+.20+.42*k,0],[H,0,0],[1.55*k,1.55*k,.09])),'gold');}
      }
    }},

  digit:{fog:[10,26],fit:.9,
    cam:p=>({eye:[1.5,1.25,9.0-p*.4],target:[0,-.30,0],fov:.52}),
    build(c){
      const{root,p,variant}=c,on=ss(0,.6,p),d=DIG[clamp(parseInt(variant,10)||0,0,9)];
      ground(root,-2.24,[.55,.8]);
      disc(root,-2.00,4.0);
      draw(M.thin,mul(root,transform([0,-.18,-.62],[0,0,0],[4.3,4.3,.14])),'gold');
      const g=mul(root,transform([0,-.18-(1-on)*1.4,0],[0,-.12+(1-on)*.30,0]));
      part(g,[0,0,-.28],[1.90,2.80,.12],'forest',null,M.slab);
      for(const k of d){const b=BAR[k];part(g,[b[0],b[1],b[4]?-.03:0],[b[2],b[3],b[4]?.40:.46],'pine',null,M.bar);}
      if(d==='abcdef')part(g,[0,0,.02],[.26,1.9,.30],'gold',[0,0,-.42],M.bar);
    }},

  launch:{fog:[12,32],fit:1,idle:1,
    cam:p=>({eye:[2.3,1.9,13.2-p*.6],target:[.25,.05+p*.15,-.4],fov:.54}),
    build(c){
      const{root,p,bob}=c,go=ss(.08,.75,p);
      ground(root,-2.26,[.6,.9]);
      disc(root,-2.00,4.4);
      draw(M.thin,mul(root,transform([0,.05,-1.9],[.05,0,0],[5.0,5.0,.16])),'gold');
      part(root,[0,-1.57,0],[2.60,.62,2.60],'pine',[0,-.22,0],M.bar);
      part(root,[0,-1.22,0],[2.20,.10,2.20],'gold',[0,-.22,0],M.slab);
      const a=mul(root,transform([-.2+go*.45,-1.05+go*1.25+bob*.5,.2],[0,-.30,-.7854]));
      part(a,[0,.2,0],[.50,2.7,.50],'gold',null,M.bar);
      draw(M.head,mul(a,transform([0,1.95,0],[0,0,0],[1.55,1.30,.50])),'gold');
      part(a,[0,-1.0,0],[.62,.18,.62],'forest',null,M.slab);
    }},

  card:{fog:[8,22],fit:.86,
    cam:()=>({eye:[0,.8,7.6],target:[0,-.32,0],fov:.56}),
    build(c){
      const{root,p,variant}=c,on=ss(0,.45,p),v=clamp(variant|0,0,2);
      ground(root,-2.06,[.45,.35]);
      part(root,[0,-1.86,0],[3.0,.20,1.1],'bone',null,M.slab);
      part(root,[0,-1.99,.01],[2.8,.12,1.0],'forest',null,M.slab);
      part(root,[0,-1.85,.56],[3.0,.06,.06],'gold');
      const g=mul(root,transform([0,-.11-(1-on)*.6,0],[-.05,0,0]));
      part(g,[0,0,0],[2.60,3.30,.22],['pine','bone','gold'][v],null,M.slab);
      face(g,[0,0,.115],[2.46,3.16],T.card[v]);
      part(g,[1.22,-1.52,.04],[.34,.34,.26],'gold',[0,0,.7854]);
    }},

  mark:{fog:[8,20],fit:.9,
    cam:()=>({eye:[1.6,1.9,6.8],target:[0,-.25,0],fov:.52}),
    build(c){
      const{root,p}=c;
      ground(root,-1.48,[.45,.55]);
      draw(M.cyl,mul(root,transform([0,-1.25,0],[0,0,0],[3.0,.2,3.0])),'bone');
      draw(M.cyl,mul(root,transform([0,-1.39,0],[0,0,0],[2.7,.14,2.7])),'forest');
      const g=mul(root,transform([0,-.10,0],[0,-.5+p*1.25,0]));
      part(g,[0,0,0],[2.10,2.10,2.10],'pine',null,M.bar);
      part(g,[0,0,1.07],[1.46,1.46,.08],'gold',null,M.slab);
      face(g,[0,0,1.112],[1.40,1.40],T.mono);
      part(g,[1.07,0,0],[.08,1.46,1.46],'bone',null,M.slab);
      part(g,[0,1.07,0],[1.46,.08,1.46],'forest',null,M.slab);
    }}
  };
  function letter(parent,x,y,type){
    const L=mul(parent,transform([x,y,.33],[0,0,0],[.62,.62,.62])),part=(P,p,s,m,r)=>draw(M.bar,mul(P,transform(p,r||[0,0,0],s)),'forest');
    if(type==='Y'){part(L,[-.38,.3,0],[.38,1.12,.36],'forest',[0,0,.55]);part(L,[.38,.3,0],[.38,1.12,.36],'forest',[0,0,-.55]);part(L,[0,-.47,0],[.39,.9,.36],'forest');}
    if(type==='G'){part(L,[-.58,0,0],[.35,1.75,.36],'forest');part(L,[0,.7,0],[1.3,.35,.36],'forest');part(L,[0,-.7,0],[1.3,.35,.36],'forest');part(L,[.5,-.32,0],[.35,.9,.36],'forest');part(L,[.33,.06,0],[.65,.33,.36],'forest');}
    if(type==='A'){part(L,[-.38,0,0],[.37,1.9,.36],'forest',[0,0,-.32]);part(L,[.38,0,0],[.37,1.9,.36],'forest',[0,0,.32]);part(L,[0,-.18,0],[.8,.3,.36],'forest');}
  }

  /* ---- 7. anchors ------------------------------------------------------------- */
  const html=document.documentElement,media=matchMedia('(prefers-reduced-motion: reduce)');
  let reduced=media.matches,paused=html.dataset.motion==='off'||YGA.motion===false,dead=false,frame=0,last=0,t=0;
  let dpr=1,vw=1,vh=1,live=0,dprCap=1.65,slow=0,samples=0,frames=0,drawn=0;
  let px=-1e4,py=-1e4,hasPointer=false,grab=null,grabX=0,grabYaw=0;
  const anchors=[];
  const BG={deep:hex('#002416'),pine:hex('#00311F'),almond:hex('#F9E9DA'),beige:hex('#FFF7E6')};
  function backdrop(el){
    for(let n=el;n&&n.nodeType===1;n=n.parentElement){
      const m=getComputedStyle(n).backgroundColor.match(/[\d.]+/g);
      if(m&&m.length>=3&&(m.length<4||+m[3]>.5))return m.slice(0,3).map(v=>v/255);
      if(n.hasAttribute('data-section'))break;}
    if(el.closest('.inv-deep'))return BG.deep;
    if(el.closest('.inv'))return BG.pine;
    if(el.closest('#inside'))return BG.almond;
    return BG.beige;
  }
  function tint(a){
    a.bg=backdrop(a.el);
    const lum=.2126*a.bg[0]+.7152*a.bg[1]+.0722*a.bg[2];
    /* light ground: warm green-grey pool; dark ground: the section colour, deeper */
    a.dark=lum<.35;a.shade=a.dark?a.bg.map(v=>v*.18):TONE.boneLo;
  }
  const io=new IntersectionObserver(entries=>{
    for(const e of entries){const a=anchors.find(x=>x.el===e.target);if(a&&a.near!==e.isIntersecting){a.near=e.isIntersecting;live+=a.near?1:-1;}}
    if(live>0){last=performance.now();schedule();}else{cancelAnimationFrame(frame);frame=0;render(performance.now(),true);}
  },{rootMargin:'140px 0px'});
  function register(el){
    const name=el.getAttribute('data-3d');
    if(!OBJ[name]||anchors.some(a=>a.el===el))return null;
    const a={el,name,def:OBJ[name],idx:anchors.length,p:0,v:0,raw:0,yaw:0,tyaw:0,pitch:0,tpitch:0,near:false,manual:0,
      variant:el.getAttribute('data-3d-variant')||'0',hold:el.hasAttribute('data-3d-hold'),drag:el.hasAttribute('data-3d-drag'),
      pin:el.hasAttribute('data-3d-pin')?el.closest('[data-pin]'):null,section:el.closest('[data-section]')};
    if(a.hold){const b=document.querySelector('[data-act][aria-pressed="true"]');if(b)a.manual=clamp((+b.getAttribute('data-act')||0)/2,0,1);}
    tint(a);anchors.push(a);io.observe(el);
    if(a.drag){
      el.style.touchAction='pan-y';
      el.addEventListener('pointerdown',e=>{if(e.button)return;grab=a;grabX=e.clientX;grabYaw=a.tyaw;px=e.clientX;py=e.clientY;schedule();});
    }
    return a;
  }
  function scan(scope=document){(scope.querySelectorAll?scope:document).querySelectorAll('[data-3d]').forEach(register);anchors.forEach(tint);schedule();}

  /* ---- 8. the single render loop ------------------------------------------------ */
  const mh=()=>{const m=document.querySelector('.masthead');if(!m)return 0;const b=m.getBoundingClientRect();return b.bottom>0&&b.height<vh*.5?b.bottom:0;};
  function render(now=performance.now(),clearOnly){
    frame=0;
    if(dead)return;
    const dt=Math.min((now-last)/1000,.05)||.016;last=now;
    const still=paused||reduced;
    if(!still)t+=dt;
    gl.disable(gl.SCISSOR_TEST);gl.viewport(0,0,canvas.width,canvas.height);
    gl.clearColor(1,.969,.902,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    if(clearOnly||document.hidden||!live||!canvas.getClientRects().length)return;
    if(!still&&samples<90){samples++;if(dt>.024)slow++;if(samples===90&&slow>36&&dprCap>1.2){dprCap=1.2;resize();return;}}
    frames++;draws=0;tris=0;drawn=0;
    gl.enable(gl.SCISSOR_TEST);
    const k=still?1:1-Math.exp(-dt*7),mobile=vw<650,hb=mh();
    let settled=true,idle=false;
    for(const a of anchors){
      if(!a.near)continue;
      const r=a.el.getBoundingClientRect();
      if(r.bottom<0||r.top>vh||r.width<4||r.height<4)continue;
      /* scissor = anchor ∩ its section ∩ the viewport below the masthead */
      let L=Math.max(r.left,0),Tp=Math.max(r.top,hb),R=Math.min(r.right,vw),B=Math.min(r.bottom,vh);
      if(a.section){const q=a.section.getBoundingClientRect();L=Math.max(L,q.left);Tp=Math.max(Tp,q.top);R=Math.min(R,q.right);B=Math.min(B,q.bottom);}
      const own=clamp((vh*.86-r.top)/(r.height+vh*.42),0,1);
      if(a.pin){const q=a.pin.getBoundingClientRect();a.raw=clamp(-q.top/Math.max(1,q.height-vh),0,1);}
      else a.raw=a.hold?a.manual:own;
      a.p+=(a.raw-a.p)*k;a.v+=(own-a.v)*k;
      const inside=!still&&hasPointer&&px>r.left-40&&px<r.right+40&&py>r.top-40&&py<r.bottom+40;
      if(grab===a)a.tyaw=clamp(grabYaw+(px-grabX)*.004,-.80,.80);
      else a.tyaw=inside?((px-r.left)/r.width-.5)*.44:0;
      a.tpitch=inside?((py-r.top)/r.height-.5)*.07:0;
      a.yaw+=(a.tyaw-a.yaw)*k;a.pitch+=(a.tpitch-a.pitch)*k;
      if(Math.abs(a.raw-a.p)+Math.abs(own-a.v)+Math.abs(a.tyaw-a.yaw)+Math.abs(a.tpitch-a.pitch)>.0015)settled=false;
      if(R-L<1||B-Tp<1)continue;
      const D=a.def;if(D.idle)idle=true;
      gl.viewport(Math.round(r.left*dpr),Math.round((vh-r.bottom)*dpr),Math.max(1,Math.round(r.width*dpr)),Math.max(1,Math.round(r.height*dpr)));
      const sx=Math.floor(L*dpr),sy=Math.floor((vh-B)*dpr);
      gl.scissor(sx,sy,Math.max(1,Math.ceil(R*dpr)-sx),Math.max(1,Math.ceil((vh-Tp)*dpr)-sy));
      gl.clearColor(a.bg[0],a.bg[1],a.bg[2],0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      const aspect=r.width/r.height,cam=D.cam(a.p,aspect,mobile),fit=Math.pow(Math.max(1,(D.fit||1)/aspect),.9);
      const eye=cam.target.map((v,i)=>v+(cam.eye[i]-v)*fit);
      gl.uniformMatrix4fv(u.ViewProjection,false,mul(perspective(cam.fov,aspect),lookAt(eye,cam.target)));
      gl.uniform3fv(u.Eye,eye);gl.uniform2f(u.Fog,D.fog[0]*fit,D.fog[1]*fit);
      gl.uniform3fv(u.Paper,a.bg);gl.uniform3fv(u.Shade,a.shade);
      const enter=still?1:ss(0,.18,a.v),exit=still?1:1-ss(.9,1,a.v);
      const away=(1-enter)*16+(1-exit)*12;
      const root=mul(transform([0,0,-away]),transform([0,-.1,0],[a.pitch,-.18+a.yaw,0]));
      D.build({root,p:a.p,enter,exit,t,bob:(!still&&D.idle)?Math.sin(t*.8+a.idx)*.055:0,mobile,variant:a.variant,dark:a.dark});
      drawn++;
    }
    if(!settled||(idle&&!still))frame=requestAnimationFrame(render);
  }
  function schedule(){if(!frame&&!dead&&!document.hidden){last=last||performance.now();frame=requestAnimationFrame(render);}}

  /* ---- 9. lifecycle --------------------------------------------------------------- */
  function resize(){
    vw=Math.max(1,canvas.clientWidth||innerWidth);vh=Math.max(1,canvas.clientHeight||innerHeight);
    dpr=Math.min(devicePixelRatio||1,vw<650?Math.min(1.35,dprCap):dprCap);
    canvas.width=Math.round(vw*dpr);canvas.height=Math.round(vh*dpr);
    anchors.forEach(tint);schedule();
  }
  const onScroll=()=>schedule();
  const onMove=e=>{px=e.clientX;py=e.clientY;hasPointer=e.pointerType==='mouse';if(hasPointer&&!paused&&!reduced||grab)schedule();};
  const onLeave=()=>{hasPointer=false;schedule();};
  const onUp=()=>{if(grab){grab=null;schedule();}};
  const onVis=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{last=performance.now();schedule();}};
  const onMedia=e=>{reduced=e.matches;schedule();};
  const setPaused=v=>{paused=!!v;last=performance.now();schedule();};
  const onMotion=e=>setPaused(!(e.detail&&e.detail.on));
  function lost(e){e.preventDefault();dead=true;cancelAnimationFrame(frame);frame=0;html.classList.remove('gl');html.classList.add('no-gl');}
  addEventListener('resize',resize);
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('pointermove',onMove,{passive:true});
  document.addEventListener('pointerleave',onLeave);
  addEventListener('pointerup',onUp);addEventListener('pointercancel',onUp);
  document.addEventListener('visibilitychange',onVis);
  media.addEventListener?.('change',onMedia);
  addEventListener('yga:motion',onMotion);
  canvas.addEventListener('webglcontextlost',lost);

  resize();scan();
  if(document.fonts&&document.fonts.ready){
    document.fonts.ready.then(()=>Promise.all(['800 60px "Big Shoulders"','400 30px Spectral','italic 400 30px Spectral','600 25px Spectral'].map(f=>document.fonts.load(f).catch(()=>[]))))
      .then(()=>{if(!dead){rebake();schedule();}}).catch(()=>{});
  }
  return{
    setValue(name,v){anchors.forEach(a=>{if(a.name===name)a.manual=clamp(+v||0,0,1);});last=performance.now();schedule();},
    scan(scope){scan(scope);},
    stats(){return{gl:!dead,anchors:anchors.length,near:live,drawn,draws,tris,uniqueTris,frames,dpr:+dpr.toFixed(2),dprCap,running:!!frame,paused,reduced,
      list:anchors.map(a=>({name:a.name,variant:a.variant,p:+a.p.toFixed(3),near:a.near,bg:'#'+a.bg.map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('')}))};},
    pause(){setPaused(true);},
    resume(){setPaused(false);}
  };
}

/* ---- 10. boot --------------------------------------------------------------------- */
{
  const html=document.documentElement;
  let canvas=document.querySelector('canvas.gl-stage');
  if(!canvas){canvas=document.createElement('canvas');canvas.className='gl-stage';canvas.setAttribute('aria-hidden','true');
    canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:15';document.body.prepend(canvas);}
  let stage=null;
  try{stage=createStage(canvas);}catch(e){stage=null;}
  if(stage){html.classList.add('gl');html.classList.remove('no-gl');YGA.stage=stage;}
  else{html.classList.add('no-gl');html.classList.remove('gl');
    YGA.stage={setValue(){},scan(){},stats(){return{gl:false};},pause(){},resume(){}};}
}

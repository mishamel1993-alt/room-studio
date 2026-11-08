(() => {
  const root = document.documentElement;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const motionAllowed = () => root.classList.contains('motion-on') && !reducedMotion.matches;
  // Small depth cues only: the architectural outline itself stays unchanged.
  const surfaces = [
    { element: document.querySelector('.room-plan'), properties: ['--plan-rx','--plan-ry'], values: (x,y) => [`${-y * 2}deg`,`${x * 2}deg`] },
    { element: document.querySelector('.sonic-signature'), properties: ['--echo-x','--echo-y'], values: (x,y) => [`${x * 13}px`,`${y * 9}px`] }
  ];
  const reset = ({element, properties}) => properties.forEach(property => element.style.removeProperty(property));
  surfaces.forEach(surface => {
    const {element,properties,values} = surface;
    if (!element) return;
    let frame = 0;
    let point = null;
    element.addEventListener('pointermove', event => {
      if (!finePointer.matches || !motionAllowed() || event.pointerType === 'touch') return;
      point = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!point || !motionAllowed()) return;
        const rect = element.getBoundingClientRect();
        const next = values((point.x - rect.left) / rect.width * 2 - 1, (point.y - rect.top) / rect.height * 2 - 1);
        properties.forEach((property, index) => element.style.setProperty(property,next[index]));
      });
    }, {passive:true});
    element.addEventListener('pointerleave', () => { point = null; reset(surface); });
  });
  new MutationObserver(() => {
    if (!motionAllowed()) surfaces.filter(surface => surface.element).forEach(reset);
  }).observe(root,{attributes:true,attributeFilter:['class']});
  // Highlight the current section without adding scroll listeners or layout work.
  const links = [...document.querySelectorAll('.nav a')];
  if ('IntersectionObserver' in window) {
    const visible = new Map();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => visible.set(entry.target.id,entry.isIntersecting));
      const active = links.find(link => visible.get(link.hash.slice(1)));
      links.forEach(link => {
        if (link === active) link.setAttribute('aria-current','location');
        else link.removeAttribute('aria-current');
      });
    },{rootMargin:'-15% 0px -50% 0px',threshold:0});
    links.forEach(link => { const section = document.getElementById(link.hash.slice(1)); if(section) observer.observe(section); });
  }
})();

// An art-directed stereo wave field, not a calibrated acoustic simulation.
(() => {
  const canvas = document.querySelector('.stereo-canvas');
  const scene = canvas?.closest('.sound-room-scene');
  if (!canvas || !scene) return;
  const ctx = canvas.getContext('2d', {alpha:true});
  if (!ctx) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const field = document.createElement('canvas');
  field.width = 101;
  field.height = 152;
  const fieldCtx = field.getContext('2d');
  if (!fieldCtx) return;
  const pixels = fieldCtx.createImageData(field.width, field.height);
  const length = field.width * field.height;
  const sources = [
    {x:62, y:565, angle:-54*Math.PI/180, phase:0, color:[102,255,162]},
    {x:302, y:565, angle:-126*Math.PI/180, phase:.3, color:[120,240,222]}
  ];
  const spread = 38 * Math.PI / 180;
  const wavelength = 76;
  const speed = 66;
  const k = Math.PI * 2 / wavelength;
  const maps = sources.map(source => {
    const distance = new Float32Array(length);
    const gain = new Float32Array(length);
    for (let i=0;i<length;i++) {
      const dx = (i % field.width + .5) * 4 - source.x;
      const dy = (Math.floor(i / field.width) + .5) * 4 - source.y;
      const r = Math.hypot(dx,dy);
      let delta = Math.atan2(dy,dx) - source.angle;
      delta = Math.atan2(Math.sin(delta),Math.cos(delta));
      distance[i] = r;
      const direction = Math.abs(delta) < spread ? Math.cos(delta / spread * Math.PI / 2) ** 2 : 0;
      gain[i] = direction * Math.exp(-r / 660) * Math.min(1,r / 24);
    }
    return {distance,gain};
  });
  let time = 2.8;
  let frame = 0;
  let last = 0;
  let inView = false;
  let scaleX = 1, scaleY = 1;
  const allowed = () => inView && !document.hidden && root.classList.contains('motion-on') && !reduced.matches;
  const rgba = (rgb,alpha) => `rgba(${rgb.join(',')},${alpha})`;
  function arc(source,radius,alpha) {
    if (radius < 12) return;
    // The gradient suppresses the side edges while keeping a luminous centre.
    const from = {x:source.x + radius*Math.cos(source.angle-spread),y:source.y + radius*Math.sin(source.angle-spread)};
    const to = {x:source.x + radius*Math.cos(source.angle+spread),y:source.y + radius*Math.sin(source.angle+spread)};
    const light = ctx.createLinearGradient(from.x,from.y,to.x,to.y);
    light.addColorStop(0,rgba(source.color,0));
    light.addColorStop(.25,rgba(source.color,alpha*.45));
    light.addColorStop(.5,rgba(source.color,alpha));
    light.addColorStop(.75,rgba(source.color,alpha*.45));
    light.addColorStop(1,rgba(source.color,0));
    ctx.strokeStyle = light;
    ctx.beginPath();
    ctx.arc(source.x,source.y,radius,source.angle-spread,source.angle+spread);
    ctx.lineWidth = 6;
    ctx.globalAlpha = .1;
    ctx.stroke();
    ctx.lineWidth = 1.15;
    ctx.globalAlpha = 1;
    ctx.stroke();
  }
  function draw() {
    ctx.setTransform(scaleX,0,0,scaleY,0,0);
    ctx.clearRect(0,0,404,607);
    // A low-resolution light field is smoothed underneath the crisp wave fronts.
    const phase = time * speed * k;
    const [a,b] = maps;
    const data = pixels.data;
    for (let i=0;i<length;i++) {
      const waveA = Math.cos(a.distance[i]*k-phase) * a.gain[i];
      const waveB = Math.cos(b.distance[i]*k-phase+.3) * b.gain[i];
      const crest = Math.max(0,waveA + waveB);
      const glow = Math.min(1,crest*crest*.48);
      const j=i*4;
      data[j]=73;
      data[j+1]=246;
      data[j+2]=175 + Math.round(b.gain[i]*42);
      data[j+3]=Math.round(glow*66);
    }
    fieldCtx.putImageData(pixels,0,0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(field,0,0,404,607);
    ctx.globalCompositeOperation = 'lighter';
    sources.forEach(source => {
      const offset = ((time*speed-source.phase/k) % wavelength+wavelength)%wavelength;
      for (let n=0;n<10;n++) {
        const radius = offset + n*wavelength;
        const envelope = Math.min(1,radius/50) * Math.max(0,1-radius/760);
        arc(source,radius,envelope*.69);
      }
      // A few short glints travel with the wave, making the direction legible.
      for (let n=0;n<3;n++) {
        const r = ((time*speed+n*228) % 650)+18;
        const angle = source.angle + (n-1)*.12;
        const alpha = Math.sin(Math.PI*Math.min(1,r/690))*.65;
        ctx.beginPath();
        ctx.moveTo(source.x+Math.cos(angle)*(r-7),source.y+Math.sin(angle)*(r-7));
        ctx.lineTo(source.x+Math.cos(angle)*r,source.y+Math.sin(angle)*r);
        ctx.strokeStyle = rgba(source.color,alpha);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      const halo = ctx.createRadialGradient(source.x,source.y,0,source.x,source.y,30);
      halo.addColorStop(0,rgba(source.color,.3));
      halo.addColorStop(1,rgba(source.color,0));
      ctx.fillStyle=halo;
      ctx.fillRect(source.x-30,source.y-30,60,60);
    });
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio||1,1.75);
    canvas.width = Math.max(1,Math.round(rect.width*ratio));
    canvas.height = Math.max(1,Math.round(rect.height*ratio));
    scaleX = canvas.width/404;
    scaleY = canvas.height/607;
    draw();
  }
  function tick(now) {
    frame = 0;
    if (!allowed()) { last=0;return; }
    if (!last) last=now;
    const delta = now-last;
    if (delta >= 1000/30) {
      time += Math.min(delta,80)/1000;
      last=now;
      draw();
    }
    frame=requestAnimationFrame(tick);
  }
  function sync() {
    if (allowed()) { if (!frame) frame=requestAnimationFrame(tick); }
    else { cancelAnimationFrame(frame);frame=0;last=0; }
  }
  resize();
  scene.classList.add('has-stereo-field');
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else addEventListener('resize',resize,{passive:true});
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {inView=entries[0].isIntersecting;sync();},{rootMargin:'30px'}).observe(scene);
  else {inView=true;sync();}
  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);
})();

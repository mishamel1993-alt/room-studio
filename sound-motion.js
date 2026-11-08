/* Animate the existing artwork as a continuous sound surface on the GPU.
   No new imagery is fetched. The original image remains the static fallback. */
(() => {
  const hero = document.querySelector('.hero');
  const art = hero.querySelector('.hero-art');
  const source = art.querySelector('img');
  const canvas = art.querySelector('.sound-surface');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 740px)');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return;

  const vertexSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_art;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_strength;
    const float PI = 3.14159265;

    void main() {
      vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
      float ratio = u_resolution.x / u_resolution.y;
      float imageRatio = 1.5;
      // Match the original image's cover crop and 64% horizontal anchor.
      vec2 crop = ratio < imageRatio ? vec2(ratio / imageRatio, 1.0) : vec2(1.0, imageRatio / ratio);
      vec2 p = uv * crop + (1.0 - crop) * vec2(0.64, 0.5);
      vec2 center = vec2(0.73, 0.51);
      vec2 radial = (p - center) * vec2(1.35, 1.0);
      float radius = length(radial);
      float t = u_time;

      // Travelling, differently phased waves bend the folds themselves.
      float envelope = smoothstep(0.25, 0.58, p.x);
      float swell = 0.8 + 0.2 * sin(t * 0.78);
      float travel = sin(radius * 23.0 - t * 2.8);
      vec2 flow = vec2(
        sin(p.y * 9.0 + t * 1.05) * 0.018 + sin(p.y * 18.0 - t * 1.6) * 0.008,
        sin(p.x * 10.0 - t * 1.24) * 0.038 + sin(p.x * 20.0 + p.y * 5.0 - t * 1.7) * 0.012
      );
      flow += normalize(radial + vec2(0.0001)) * travel * 0.017 * exp(-radius * 1.1);
      flow *= envelope * swell * u_strength;
      float twist = sin(t * 0.55) * 0.055 * u_strength;
      vec2 relative = p - center;
      mat2 rotation = mat2(cos(twist), -sin(twist), sin(twist), cos(twist));
      vec2 warped = center + rotation * relative + flow;
      vec3 color = texture2D(u_art, clamp(warped, 0.002, 0.998)).rgb;
      // A soft moving light runs along the glass-like folds, never flashes.
      float shine = 1.0 + u_strength * (sin(p.x * 8.0 - p.y * 4.0 - t * 1.15) * 0.16 + travel * 0.065);
      color *= shine;

      // Successive elliptical sound fronts expand outwards and dissolve.
      float waveEnergy = 0.0;
      for (int i = 0; i < 4; i++) {
        float phase = fract(t * 0.155 + float(i) * 0.25);
        float waveRadius = 0.07 + phase * 0.9;
        float angle = atan(radial.y, radial.x);
        float organicRadius = radius + sin(angle * 3.0 - t * 0.6 + phase * 2.0) * 0.022;
        float gap = abs(organicRadius - waveRadius);
        float rim = exp(-gap * gap / 0.000012);
        float glow = exp(-gap * gap / 0.0007) * 0.12;
        float fade = smoothstep(0.0, 0.13, phase) * (1.0 - smoothstep(0.50, 1.0, phase));
        waveEnergy += (rim + glow) * fade;
      }
      float quietSpace = 1.0 - smoothstep(0.08, 0.48, max(color.r, max(color.g, color.b)));
      color += vec3(0.13, 0.78, 0.39) * waveEnergy * 0.28 * quietSpace * envelope * u_strength;
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  let program;
  let texture;
  let locations;
  let ready = false;
  let frame = 0;
  let lastTick = 0;
  let elapsed = 0;
  let nearby = true;
  let failed = false;

  function shader(type, code) {
    const result = gl.createShader(type);
    gl.shaderSource(result, code);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
      gl.deleteShader(result);
      throw new Error('Sound surface shader unavailable');
    }
    return result;
  }
  function initialize() {
    if (!source.naturalWidth || failed) return;
    try {
      const vertex = shader(gl.VERTEX_SHADER, vertexSource);
      const fragment = shader(gl.FRAGMENT_SHADER, fragmentSource);
      program = gl.createProgram();
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Sound surface unavailable');
      gl.useProgram(program);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
      locations = {
        time: gl.getUniformLocation(program, 'u_time'),
        resolution: gl.getUniformLocation(program, 'u_resolution'),
        strength: gl.getUniformLocation(program, 'u_strength')
      };
      gl.uniform1i(gl.getUniformLocation(program, 'u_art'), 0);
      ready = true;
      resize();
      art.classList.add('has-sound-surface');
      sync();
    } catch {
      failed = true;
      ready = false;
      art.classList.remove('has-sound-surface');
    }
  }
  function resize() {
    if (!ready) return;
    const box = art.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, mobile.matches ? 1.15 : 1.5);
    canvas.width = Math.max(1, Math.round(box.width * dpr));
    canvas.height = Math.max(1, Math.round(box.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    draw();
  }
  function draw() {
    if (!ready || gl.isContextLost()) return;
    gl.uniform2f(locations.resolution, canvas.width, canvas.height);
    gl.uniform1f(locations.time, elapsed);
    gl.uniform1f(locations.strength, reducedMotion.matches ? 0 : mobile.matches ? 0.72 : 1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function shouldRun() {
    return ready && nearby && !document.hidden && !reducedMotion.matches && document.documentElement.classList.contains('motion-on');
  }
  function tick(now) {
    frame = 0;
    if (!shouldRun()) { lastTick = 0; return; }
    // Limit rendering to 30 fps; time stops when paused or outside the viewport.
    if (!lastTick || now - lastTick >= 1000 / 30) {
      if (lastTick) elapsed += Math.min((now - lastTick) / 1000, 0.12);
      lastTick = now;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (shouldRun()) {
      if (!frame) { lastTick = 0; frame = requestAnimationFrame(tick); }
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTick = 0;
      if (ready && reducedMotion.matches) draw();
    }
  }
  new MutationObserver(sync).observe(document.documentElement, {attributes:true,attributeFilter:['class']});
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { nearby = entries[0].isIntersecting; sync(); }, {rootMargin:'40px'}).observe(hero);
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(art);
  else window.addEventListener('resize', resize, {passive:true});
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', sync);
  mobile.addEventListener('change', resize);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    ready = false;
    art.classList.remove('has-sound-surface');
    sync();
  });
  canvas.addEventListener('webglcontextrestored', () => { failed = false; initialize(); });
  if (source.complete && source.naturalWidth) initialize();
  else source.addEventListener('load', initialize, {once:true});
})();

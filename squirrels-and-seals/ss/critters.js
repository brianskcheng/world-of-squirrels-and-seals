/* =====================================================================
   CRITTERS — hand-inked squirrel & seal rigs
   window.SS.makeCritter({species:'sq'|'sl', size, variant, name})
   Each critter is a div.critter containing an SVG rig with hinged parts
   (p-tail, p-head, p-armF, p-flipF, …) that the CSS action classes
   (.act-walk, .act-eat, .act-strike…) animate per-species.
   ===================================================================== */
window.SS = window.SS || {};
(function () {
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  SS.rand = rand; SS.pick = pick;

  /* ---------------- palettes & flavor ---------------- */
  const SQ_VARIANTS = {
    chestnut: { wash: 'rgba(168,98,47,0.17)',  tail: 'rgba(168,98,47,0.26)',  blush: 'rgba(200,90,60,0.20)' },
    red:      { wash: 'rgba(192,82,32,0.20)',  tail: 'rgba(192,82,32,0.30)',  blush: 'rgba(205,85,55,0.22)' },
    honey:    { wash: 'rgba(199,144,62,0.20)', tail: 'rgba(199,144,62,0.30)', blush: 'rgba(205,120,60,0.20)' },
    grey:     { wash: 'rgba(122,116,106,0.18)',tail: 'rgba(122,116,106,0.27)',blush: 'rgba(190,100,80,0.16)' }
  };
  const SL_VARIANTS = {
    slate:   { wash: 'rgba(94,127,153,0.19)',  belly: 'rgba(255,252,240,0.75)', blush: 'rgba(180,110,110,0.18)', spots: 6 },
    misty:   { wash: 'rgba(132,150,166,0.17)', belly: 'rgba(255,252,240,0.75)', blush: 'rgba(180,110,110,0.16)', spots: 4 },
    spotted: { wash: 'rgba(100,128,150,0.16)', belly: 'rgba(255,252,240,0.75)', blush: 'rgba(180,110,110,0.18)', spots: 11 },
    deep:    { wash: 'rgba(72,102,132,0.24)',  belly: 'rgba(255,252,240,0.7)',  blush: 'rgba(180,110,110,0.18)', spots: 5 }
  };
  const SQ_NAMES = ['Hazel','Pip','Nutmeg','Clover','Maple','Chestnut','Juniper','Fig','Bramble','Acorn-Ann','Twig','Biscuit','Conker','Sorrel'];
  const SL_NAMES = ['Pebble','Splash','Barnacle','Kelpie','Misty','Bubbles','Flip','Sandy','Wave','Driftwood','Puddle','Brine','Moppet','Sushi'];
  const SQ_VOICES = ['child1','child2','flying','healer'];
  const SL_VOICES = ['water','villager','time','spear'];

  SS.SQ_VARIANTS = Object.keys(SQ_VARIANTS);
  SS.SL_VARIANTS = Object.keys(SL_VARIANTS);

  /* ---------------- tiny svg helpers ---------------- */
  function acornSVG(x, y, s = 1) {
    return `<g transform="translate(${x} ${y}) scale(${s})">
      <path class="ink ink-thin" d="M -4.5 0 C -4.5 5.5, -2.5 8.5, 0 8.5 C 2.5 8.5, 4.5 5.5, 4.5 0 Z" fill="rgba(168,98,47,0.30)"/>
      <path class="ink ink-thin" d="M -5.5 0 C -5.5 -3.5, 5.5 -3.5, 5.5 0 C 3 1.2, -3 1.2, -5.5 0 Z" fill="rgba(110,70,40,0.42)"/>
      <path class="ink ink-thin" d="M 0 -2.6 C 0 -4.5, 1.5 -5.5, 2.5 -5.5"/>
    </g>`;
  }
  function fishSVG(x, y, s = 1, rot = 0) {
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
      <path class="ink ink-thin" d="M -7 0 C -3 -4.5, 4 -4.5, 8 0 C 4 4.5, -3 4.5, -7 0 Z" fill="rgba(140,160,175,0.40)"/>
      <path class="ink ink-thin" d="M -7 0 L -11 -4 L -10 0 L -11 4 Z" fill="rgba(140,160,175,0.40)"/>
      <circle class="ink-fill" cx="4.5" cy="-0.8" r="0.9"/>
      <path class="ink ink-thin" d="M 0 -2.6 C 1 -1, 1 1, 0 2.6"/>
    </g>`;
  }
  function malletSVG(x, y, s = 1) {
    return `<g transform="translate(${x} ${y}) scale(${s}) rotate(-30)">
      <path class="ink ink-thin" d="M 0 0 L 0 -11"/>
      <rect class="ink ink-thin" x="-5" y="-17" width="10" height="7" rx="2" fill="rgba(168,120,60,0.35)"/>
    </g>`;
  }
  SS.acornSVG = acornSVG; SS.fishSVG = fishSVG;

  /* Eyes + mouth variant sets, shared by both species.
     ex1/ex2 = eye x centers, ey = eye y, mx/my = mouth center */
  function faceSVG(ex1, ex2, ey, mx, my, teeth) {
    const eyeR = 3.5;
    return `
      <g class="p-eyes" style="transform-origin:${(ex1 + ex2) / 2}px ${ey}px">
        <g class="e-normal">
          <circle class="ink-fill" cx="${ex1}" cy="${ey}" r="${eyeR}"/>
          <circle class="ink-fill" cx="${ex2}" cy="${ey}" r="${eyeR}"/>
          <circle cx="${ex1 + 1.1}" cy="${ey - 1.2}" r="1.05" fill="var(--paper)"/>
          <circle cx="${ex2 + 1.1}" cy="${ey - 1.2}" r="1.05" fill="var(--paper)"/>
        </g>
        <g class="e-happy" style="display:none">
          <path class="ink" d="M ${ex1 - 3.6} ${ey + 1} Q ${ex1} ${ey - 4.2}, ${ex1 + 3.6} ${ey + 1}"/>
          <path class="ink" d="M ${ex2 - 3.6} ${ey + 1} Q ${ex2} ${ey - 4.2}, ${ex2 + 3.6} ${ey + 1}"/>
        </g>
        <g class="e-closed" style="display:none">
          <path class="ink" d="M ${ex1 - 3.4} ${ey - 1} Q ${ex1} ${ey + 3}, ${ex1 + 3.4} ${ey - 1}"/>
          <path class="ink" d="M ${ex2 - 3.4} ${ey - 1} Q ${ex2} ${ey + 3}, ${ex2 + 3.4} ${ey - 1}"/>
        </g>
        <g class="e-ouch" style="display:none">
          <path class="ink" d="M ${ex1 - 3.2} ${ey - 3} L ${ex1 + 3.2} ${ey + 3} M ${ex1 + 3.2} ${ey - 3} L ${ex1 - 3.2} ${ey + 3}"/>
          <path class="ink" d="M ${ex2 - 3.2} ${ey - 3} L ${ex2 + 3.2} ${ey + 3} M ${ex2 + 3.2} ${ey - 3} L ${ex2 - 3.2} ${ey + 3}"/>
        </g>
        <g class="e-dizzy" style="display:none">
          <path class="ink ink-thin" d="M ${ex1} ${ey} m 3 0 a 3 3 0 1 1 -3 -3 a 1.6 1.6 0 1 0 1.6 1.6"/>
          <path class="ink ink-thin" d="M ${ex2} ${ey} m 3 0 a 3 3 0 1 1 -3 -3 a 1.6 1.6 0 1 0 1.6 1.6"/>
        </g>
      </g>
      <g class="p-brow" style="display:none">
        <path class="ink" d="M ${ex1 - 4.5} ${ey - 8} L ${ex1 + 3.5} ${ey - 4.5}"/>
        <path class="ink" d="M ${ex2 + 4.5} ${ey - 8} L ${ex2 - 3.5} ${ey - 4.5}"/>
      </g>
      <g class="p-jaw" style="transform-origin:${mx}px ${my - 2}px">
        <g class="m-smile">
          <path class="ink" d="M ${mx - 6} ${my - 2} Q ${mx} ${my + 3.5}, ${mx + 6} ${my - 2}"/>
          ${teeth ? `<path class="ink ink-thin" d="M ${mx - 2.4} ${my + 0.6} L ${mx - 2.4} ${my + 5.4} C ${mx - 2.4} ${my + 6.6}, ${mx + 2.4} ${my + 6.6}, ${mx + 2.4} ${my + 5.4} L ${mx + 2.4} ${my + 0.6} M ${mx} ${my + 1.2} L ${mx} ${my + 6}" fill="rgba(255,253,244,0.95)"/>` : ''}
        </g>
        <g class="m-open" style="display:none">
          <ellipse class="ink" cx="${mx}" cy="${my + 1.5}" rx="4.2" ry="5" fill="rgba(120,60,50,0.5)"/>
        </g>
        <g class="m-frown" style="display:none">
          <path class="ink" d="M ${mx - 6} ${my + 2.5} Q ${mx} ${my - 3}, ${mx + 6} ${my + 2.5}"/>
        </g>
        <g class="m-o" style="display:none">
          <ellipse class="ink" cx="${mx}" cy="${my + 1}" rx="2.8" ry="3.4" fill="none"/>
        </g>
      </g>`;
  }

  /* ---------------- SQUIRREL (faces right) ---------------- */
  function squirrelSVG(v) {
    const V = SQ_VARIANTS[v] || SQ_VARIANTS.chestnut;
    return `
    <g class="rig">
    <g class="rig-inner">
      <g class="p-body" style="transform-origin:62px 106px">
        <!-- fluffy tail: base at rump, plume sweeping up behind the back -->
        <g class="p-tail" style="transform-origin:42px 97px">
          <path class="ink" d="M 42 100 C 21 99, 7 83, 10 58 C 13 34, 28 15, 43 21 C 54 25.5, 52 41, 40 44.5 C 32 46.8, 29 54, 30 62 C 32 77, 40 87, 49 92 C 49 96, 46 100, 42 100 Z" fill="${V.tail}"/>
          <path class="ink ink-thin" d="M 15 64 C 14 51, 20 37, 29 30 M 21 77 C 17 70, 15 62, 16 54" opacity="0.55"/>
          <path class="ink ink-thin" d="M 40 24 C 44 27, 46 33, 44 38" opacity="0.5"/>
        </g>
        <!-- far hind foot -->
        <g class="p-legB" style="transform-origin:46px 103px">
          <path class="ink ink-thin" d="M 40 106 C 41 101, 48 100, 52 104" fill="${V.wash}"/>
        </g>
        <!-- sitting body: plump rear, chest up to the right -->
        <path d="M 72 54 C 84 58, 92 70, 92 84 C 92 99, 80 107, 63 107 C 47 107, 37 99, 37 85 C 37 71, 46 60, 58 56 C 62 54.6, 68 53.4, 72 54 Z" fill="${V.wash}" stroke="none"/>
        <path class="ink" d="M 72 54 C 84 58, 92 70, 92 84 C 92 99, 80 107, 63 107 C 47 107, 37 99, 37 85 C 37 71, 46 60, 58 56 C 62 54.6, 68 53.4, 72 54" fill="none"/>
        <!-- haunch line + fur ticks -->
        <path class="ink ink-thin" d="M 46 99 C 40 90, 42 77, 52 71" opacity="0.6"/>
        <path class="ink ink-thin" d="M 56 92 l -3 3 M 62 96 l -3 3" opacity="0.4"/>
        <!-- cream belly -->
        <ellipse cx="74" cy="87" rx="12" ry="14" fill="rgba(255,250,232,0.85)"/>
        <path class="ink ink-thin" d="M 68 74 C 78 74, 85 81, 85 92" opacity="0.35" fill="none"/>
        <!-- front foot -->
        <g class="p-legF" style="transform-origin:64px 104px">
          <path class="ink ink-thin" d="M 60 107 C 60 102.5, 68 101.5, 74 104 L 79 106 C 76 108, 66 108.5, 60 107 Z" fill="${V.wash}"/>
          <path class="ink ink-thin" d="M 70 104.5 l 1.5 2.5 M 74 105 l 1.5 2" opacity="0.6"/>
        </g>
        <!-- head -->
        <g class="p-head" style="transform-origin:72px 52px">
          <g class="p-earL" style="transform-origin:60px 24px">
            <path class="ink" d="M 55 28 C 51 17, 57 8, 65 12 C 66 18, 64 24, 60 28 Z" fill="${V.wash}"/>
            <path class="ink ink-thin" d="M 58 24 C 57 19, 59 15, 62 14" opacity="0.55"/>
            <path class="ink ink-thin" d="M 56 12 l -2 -4 M 60 10 l 0 -4"/>
          </g>
          <g class="p-earR" style="transform-origin:86px 25px">
            <path class="ink" d="M 82 28 C 80 16, 87 8, 94 14 C 94 20, 90 25, 86 29 Z" fill="${V.wash}"/>
            <path class="ink ink-thin" d="M 85 24 C 85 19, 87 16, 90 15" opacity="0.55"/>
            <path class="ink ink-thin" d="M 88 11 l 1 -5 M 92 12 l 3 -4"/>
          </g>
          <circle cx="73" cy="38" r="19.5" fill="${V.wash}"/>
          <circle class="ink" cx="73" cy="38" r="19.5" fill="none"/>
          <!-- cheek fluff -->
          <path class="ink ink-thin" d="M 54 42 l -3.5 1.5 M 55 46 l -3 2.5 M 92 42 l 3.5 1.5 M 91 46 l 3 2.5" opacity="0.7"/>
          <!-- muzzle -->
          <ellipse cx="74" cy="46.5" rx="8.5" ry="6.5" fill="rgba(255,250,232,0.85)"/>
          <path class="ink ink-fill" d="M 71.6 43 L 76.4 43 L 74 46.2 Z"/>
          <path class="ink ink-thin" d="M 74 46.2 L 74 48"/>
          <circle cx="61" cy="47" r="4.2" fill="${V.blush}"/>
          <circle cx="87" cy="47" r="4.2" fill="${V.blush}"/>
          <path class="ink ink-thin" d="M 60 43 L 48 41 M 60 46.5 L 49 48 M 88 43 L 100 41 M 88 46.5 L 99 48" opacity="0.8"/>
          ${faceSVG(65, 82, 36.5, 74, 50, true)}
        </g>
        <!-- little arms + paws -->
        <g class="p-armF" style="transform-origin:70px 62px">
          <path class="ink" d="M 69 62 C 65 65.5, 66 70.5, 71 72.5" fill="none"/>
          <path class="ink" d="M 78 62.5 C 75 66, 76 70, 81 71.5" fill="none"/>
          <circle class="ink" cx="72.5" cy="73" r="2.6" fill="${V.wash}"/>
          <circle class="ink" cx="82.5" cy="72" r="2.6" fill="${V.wash}"/>
          <g class="p-item" style="display:none">${acornSVG(76, 68, 1.15)}</g>
          <g class="p-item-tool" style="display:none">${malletSVG(80, 72, 1)}</g>
        </g>
      </g>
    </g>
    </g>`;
  }

  /* ---------------- SEAL (faces right) ---------------- */
  function sealSVG(v) {
    const V = SL_VARIANTS[v] || SL_VARIANTS.slate;
    let spots = '';
    let sx = 30, sy = 88;
    for (let i = 0; i < (V.spots || 5); i++) {
      const x = 26 + ((i * 37) % 46), y = 66 + ((i * 23) % 30) * (1 - (x - 26) / 90);
      spots += `<ellipse cx="${x}" cy="${y + 8}" rx="${1.6 + (i % 3) * 0.7}" ry="${1.1 + (i % 2) * 0.6}" fill="rgba(74,50,38,0.30)" transform="rotate(${-20 + (i * 31) % 40} ${x} ${y + 8})"/>`;
    }
    return `
    <g class="rig">
    <g class="rig-inner">
      <g class="p-body" style="transform-origin:60px 106px">
        <!-- tail flukes -->
        <g class="p-flipB" style="transform-origin:22px 99px">
          <path class="ink" d="M 24 97 C 15 88, 6 86, 3 90 C 7 94, 8 100, 5 106 C 9 110, 18 105, 24 101 Z" fill="${V.wash}"/>
          <path class="ink ink-thin" d="M 9 92 C 11 95, 11 100, 9 103" opacity="0.55"/>
        </g>
        <!-- body + head, one blubbery outline -->
        <path d="M 17 97 C 23 81, 38 68, 58 57 C 62 44, 68 31, 83 29 C 98 27, 108 39, 106 53 C 105 63, 99 71, 92 74 C 90 87, 82 97, 70 101.5 C 49 108.5, 27 107, 18 103 C 15 101, 15.5 99.5, 17 97 Z" fill="${V.wash}" stroke="none"/>
        <path class="ink" d="M 17 97 C 23 81, 38 68, 58 57 C 62 44, 68 31, 83 29 C 98 27, 108 39, 106 53 C 105 63, 99 71, 92 74 C 90 87, 82 97, 70 101.5 C 49 108.5, 27 107, 18 103 C 15 101, 15.5 99.5, 17 97 Z" fill="none"/>
        <!-- pale belly along the ground -->
        <path d="M 26 103.5 C 44 106, 62 104, 74 99 C 80 96.5, 85 92, 88 86 C 80 96, 60 102, 42 102.5 C 35 102.7, 29 103, 26 103.5 Z" fill="${V.belly}"/>
        <path class="ink ink-thin" d="M 24 100 C 44 104, 66 101, 82 92" opacity="0.35" fill="none"/>
        ${spots}
        <!-- chest crease -->
        <path class="ink ink-thin" d="M 62 58 C 66 62, 68 68, 67 74" opacity="0.4" fill="none"/>
        <!-- face (head is part of body outline; features hinge at the neck) -->
        <g class="p-head" style="transform-origin:82px 56px">
          <circle cx="101" cy="42" r="1.4" fill="rgba(74,50,38,0.5)"/>
          <ellipse cx="87" cy="52.5" rx="8" ry="6" fill="rgba(255,252,240,0.8)"/>
          <path class="ink ink-fill" d="M 84.4 45.6 C 84.4 44.2 89.6 44.2 89.6 45.6 C 89.6 47.4 87 48.6 87 48.6 C 87 48.6 84.4 47.4 84.4 45.6 Z"/>
          <path class="ink ink-thin" d="M 87 48.6 L 87 51"/>
          <circle cx="87" cy="52" r="0.01" fill="none"/>
          <circle cx="83.5" cy="52.5" r="0.8" fill="rgba(74,50,38,0.55)"/>
          <circle cx="86" cy="54" r="0.8" fill="rgba(74,50,38,0.55)"/>
          <circle cx="89.5" cy="52.8" r="0.8" fill="rgba(74,50,38,0.55)"/>
          <circle cx="74" cy="50" r="4" fill="${V.blush}"/>
          <circle cx="100" cy="50" r="3.6" fill="${V.blush}"/>
          <path class="ink ink-thin" d="M 79 50 L 65 46.5 M 79 52.5 L 66 53.5 M 95 50 L 109 46.5 M 95 52.5 L 108 53.5" opacity="0.8"/>
          ${faceSVG(79, 96, 41, 87, 55, false)}
        </g>
        <!-- front flipper -->
        <g class="p-flipF" style="transform-origin:72px 84px">
          <path class="ink" d="M 72 84 C 80 85, 87 92, 87 101 C 82 104, 73 101, 69 94 Z" fill="${V.wash}"/>
          <path class="ink ink-thin" d="M 77 90 C 80 93, 82 96.5, 82 100 M 73 90 C 75 93, 76 96, 76 99" opacity="0.6"/>
          <g class="p-item" style="display:none">${fishSVG(84, 84, 1.15, -35)}</g>
          <g class="p-item-tool" style="display:none">${malletSVG(86, 92, 1)}</g>
        </g>
      </g>
    </g>
    </g>`;
  }

  SS.critterMarkup = function (species, variant) {
    return `<svg viewBox="0 0 120 120">${species === 'sq' ? squirrelSVG(variant) : sealSVG(variant)}</svg>`;
  };

  /* ---------------- critter object ---------------- */
  const ACTIONS = ['act-walk','act-dash','act-jump','act-talk','act-eat','act-wave','act-cheer','act-dance','act-clap','act-sleep','act-build','act-strike','act-hurt','act-bonked','act-scared'];
  const FACES = { normal:'e-normal', happy:'e-happy', closed:'e-closed', ouch:'e-ouch', dizzy:'e-dizzy' };
  const MOUTHS = { smile:'m-smile', open:'m-open', frown:'m-frown', o:'m-o' };

  function makeCritter(opts = {}) {
    const species = opts.species || 'sq';
    const variant = opts.variant || pick(species === 'sq' ? SS.SQ_VARIANTS : SS.SL_VARIANTS);
    const size = opts.size || rand(96, 126);
    const el = document.createElement('div');
    el.className = `critter ${species}`;
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.innerHTML = SS.critterMarkup(species, variant) +
      `<div class="hp-pip"><div class="fill"></div></div><div class="player-arrow">▼</div>`;

    const c = {
      el, species, variant, size,
      name: opts.name || pick(species === 'sq' ? SQ_NAMES : SL_NAMES),
      voice: opts.voice || pick(species === 'sq' ? SQ_VOICES : SL_VOICES),
      x: 0, y: 0, scale: 1,
      alive: true,
      _bubble: null, _moveT: null, _faceTimer: null,
      _rest: ['normal', 'smile']
    };

    /* facing: artwork faces right */
    c.face = (dir) => { el.classList.toggle('face-l', dir === 'l'); c.dir = dir; };
    c.dir = 'r';

    /* position: (x,y) = feet anchor, bottom-center, in px */
    c.place = (x, y, depthScale) => {
      c.x = x; c.y = y;
      if (depthScale !== false && SS.world) c.scale = SS.world.depthScale(y);
      el.style.left = (x - size / 2) + 'px';
      el.style.top = (y - size) + 'px';
      el.style.transform = `scale(${c.scale})`;
      el.style.transformOrigin = '50% 100%';
      el.style.zIndex = String(10 + Math.round(c.y / 4));
    };

    c.setAction = (name) => {
      ACTIONS.forEach(a => el.classList.remove(a));
      if (name && name !== 'idle') el.classList.add('act-' + name);
    };
    c.oneShot = (name, ms, after) => {
      el.classList.remove('act-' + name);
      void el.offsetWidth;
      el.classList.add('act-' + name);
      setTimeout(() => { el.classList.remove('act-' + name); if (after) after(); }, ms);
    };

    c.setFace = (eyes, mouth) => {
      const svg = el.querySelector('svg');
      Object.values(FACES).forEach(cl => { const g = svg.querySelector('.' + cl); if (g) g.style.display = 'none'; });
      const eg = svg.querySelector('.' + (FACES[eyes] || 'e-normal')); if (eg) eg.style.display = '';
      Object.values(MOUTHS).forEach(cl => { const g = svg.querySelector('.' + cl); if (g) g.style.display = 'none'; });
      const mg = svg.querySelector('.' + (MOUTHS[mouth || 'smile'] || 'm-smile')); if (mg) mg.style.display = '';
      const brow = svg.querySelector('.p-brow'); if (brow) brow.style.display = (eyes === 'angry') ? '' : 'none';
      if (eyes === 'angry') { const ng = svg.querySelector('.e-normal'); if (ng) ng.style.display = ''; }
    };
    c.flashFace = (eyes, mouth, ms = 1200) => {
      if (c._faceTimer) clearTimeout(c._faceTimer);
      c.setFace(eyes, mouth);
      c._faceTimer = setTimeout(() => { if (c.alive) c.setFace(c._rest[0], c._rest[1]); }, ms);
    };
    c.setRestFace = (eyes, mouth) => { c._rest = [eyes, mouth || 'smile']; c.setFace(eyes, mouth); };

    c.showItem = (kind) => { // 'food' | 'tool'
      const f = el.querySelector('.p-item'), t = el.querySelector('.p-item-tool');
      if (f) f.style.display = kind === 'food' ? '' : 'none';
      if (t) t.style.display = kind === 'tool' ? '' : 'none';
    };

    c.say = (text, ms = 1900, opts = {}) => {
      if (c._bubble) c._bubble.remove();
      const b = document.createElement('div');
      b.className = 'bubble';
      b.textContent = text;
      b.style.fontSize = Math.max(15, 19 / Math.max(0.6, c.scale)) + 'px';
      el.appendChild(b);
      c._bubble = b;
      if (window.__sfx && !opts.silent) window.__sfx.speak(text, c.voice);
      if (!opts.still) {
        el.classList.add('act-talk');
        setTimeout(() => el.classList.remove('act-talk'), Math.min(ms, 1400));
      }
      setTimeout(() => { if (b.parentNode) b.remove(); if (c._bubble === b) c._bubble = null; }, ms);
    };

    /* movement tween — walks (or dashes) to a point, then idles */
    c.moveTo = (x, y, pxPerSec = 90, cb, mode = 'walk') => {
      if (!c.alive) return;
      c.stopMove();
      const dist = Math.hypot(x - c.x, y - c.y);
      if (dist < 3) { if (cb) cb(); return; }
      c.face(x < c.x ? 'l' : 'r');
      c.setAction(mode);
      const dur = dist / pxPerSec;
      el.style.transition = `left ${dur}s linear, top ${dur}s linear, transform ${dur}s linear`;
      c.place(x, y);
      c._moveT = setTimeout(() => {
        el.style.transition = '';
        c.setAction('idle');
        c._moveT = null;
        if (cb) cb();
      }, dur * 1000 + 30);
    };
    c.stopMove = () => {
      if (c._moveT) {
        clearTimeout(c._moveT);
        c._moveT = null;
        const r = el.getBoundingClientRect();
        el.style.transition = '';
        c.place(r.left + r.width / 2, r.top + r.height, false);
        c.setAction('idle');
      }
    };
    /* instant nudge (battle engine positions every frame) */
    c.setPos = (x, y) => { el.style.transition = ''; c.place(x, y); };

    c.jump = (after) => {
      c.oneShot('jump', 740, after);
      if (window.__sfx && Math.random() < 0.5) window.__sfx.pop();
    };

    c.setBonked = (on) => {
      if (on) {
        c.alive = false;
        el.style.setProperty('--bonk-rot', (c.dir === 'l' ? -1 : 1) * rand(88, 102) + 'deg');
        c.setAction('bonked');
        c.setFace('dizzy', 'o');
        if (!el.querySelector('.dizzy-stars')) {
          const d = document.createElement('div');
          d.className = 'dizzy-stars';
          d.innerHTML = '<span>✦</span><span>✧</span><span>･</span>';
          el.appendChild(d);
        }
      } else {
        c.alive = true;
        el.classList.remove('act-bonked');
        c.setFace('normal', 'smile');
        const d = el.querySelector('.dizzy-stars'); if (d) d.remove();
      }
    };

    c.setHp = (frac) => {
      const f = el.querySelector('.hp-pip .fill');
      if (f) {
        f.style.width = Math.max(0, frac * 100) + '%';
        f.style.background = frac > 0.55 ? '#6f8f4e' : frac > 0.25 ? '#c99a3a' : '#b0452e';
      }
    };

    c.remove = () => { c.alive = false; if (c._moveT) clearTimeout(c._moveT); el.remove(); };

    el.__critter = c;
    return c;
  }

  SS.makeCritter = makeCritter;

  /* Portrait markup for HUD cards */
  SS.portrait = function (species, variant) {
    return SS.critterMarkup(species, variant);
  };
})();

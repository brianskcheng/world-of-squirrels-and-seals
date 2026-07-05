/* =====================================================================
   OUTFITS — hand-inked accessories for circular smiley heads.
   SIM.outfits.apply(target, { hat, neck, face })
   SIM.outfits.setFaceOn(rootEl, faceKey)
   ===================================================================== */
window.SIM = window.SIM || {};
(function () {
  const O = {};
  SIM.outfits = O;

  const TRIBE = { left: '#2f5d86', right: '#9c3526' };
  const FACE_KEYS = ['happy', 'grin', 'wink', 'surprised', 'smug', 'laugh', 'cool', 'tongue', 'meh', 'sleepy', 'shy', 'angry'];
  const ACC_IDS = ['leafcap', 'crown', 'tophat', 'flower', 'scarf', 'bandana', 'cape', 'shellneck', 'goggles', 'monocle', 'eyepatch'];

  /* anchors in the shared 100×100 face viewBox (head circle cx=50 cy=50 r=42) */
  const A = {
    hat: [50, 13, 0],
    ear: [84, 40, -14],
    eye1: [36, 45],
    eye2: [64, 45],
    neck: [50, 80, 0],
    back: [50, 62, 0]
  };

  const T = (a) => `translate(${a[0]} ${a[1]}) rotate(${a[2] || 0})`;

  const DRAW = {
    leafcap: (a) => `<g transform="${T(a.hat)}">
      <path class="ink" d="M -14 3 C -9 -7, 9 -7, 14 3 C 6 7, -6 7, -14 3 Z" fill="rgba(122,138,64,0.45)"/>
      <path class="ink ink-thin" d="M 0 -5 L 0 3 M 0 -5 C 4 -8, 8 -8, 10 -6"/>
    </g>`,
    crown: (a) => `<g transform="${T(a.hat)}">
      <path class="ink" d="M -11 5 L -11 -4 L -5.5 1 L 0 -7 L 5.5 1 L 11 -4 L 11 5 Z" fill="rgba(214,178,90,0.55)"/>
      <circle class="ink-fill" cx="0" cy="-9" r="1.5"/>
    </g>`,
    tophat: (a) => `<g transform="${T(a.hat)}">
      <path class="ink" d="M -15 5 L 15 5" fill="none"/>
      <path class="ink" d="M -9 5 L -8 -12 C -3 -14.5, 3 -14.5, 8 -12 L 9 5 Z" fill="rgba(74,50,38,0.5)"/>
      <path class="ink ink-thin" d="M -8.5 0 L 8.5 0" opacity="0.7"/>
    </g>`,
    flower: (a) => `<g transform="${T(a.ear)}">
      <circle class="ink ink-thin" cx="0" cy="-5.2" r="3" fill="rgba(230,170,160,0.6)"/>
      <circle class="ink ink-thin" cx="5" cy="-1.6" r="3" fill="rgba(230,170,160,0.6)"/>
      <circle class="ink ink-thin" cx="3.1" cy="4.2" r="3" fill="rgba(230,170,160,0.6)"/>
      <circle class="ink ink-thin" cx="-3.1" cy="4.2" r="3" fill="rgba(230,170,160,0.6)"/>
      <circle class="ink ink-thin" cx="-5" cy="-1.6" r="3" fill="rgba(230,170,160,0.6)"/>
      <circle class="ink ink-thin" cx="0" cy="0" r="2.2" fill="rgba(214,178,90,0.8)"/>
    </g>`,
    scarf: (a) => `<g transform="${T(a.neck)}">
      <path class="ink" d="M -14 -2 C -5 3, 6 3, 15 -2 L 14 4 C 5 8, -6 8, -14 4 Z" fill="rgba(192,82,32,0.5)"/>
      <path class="ink ink-thin" d="M 9 5 L 12 17 L 5 16 L 7 6 Z" fill="rgba(192,82,32,0.5)"/>
      <path class="ink ink-thin" d="M 6 16.5 l 0 3 M 9 17 l 0 3" opacity="0.7"/>
    </g>`,
    bandana: (a) => `<g transform="${T(a.neck)}">
      <path class="ink" d="M -13 -2 C -4 2.5, 5 2.5, 14 -2 L 2 12 Z" fill="rgba(94,127,153,0.5)"/>
      <path class="ink ink-thin" d="M -4 3 L 0 7 M 4 3 L 2 7" opacity="0.6"/>
    </g>`,
    cape: (a) => `<g transform="${T(a.back)}">
      <path class="ink" d="M 4 -2 C -14 8, -24 28, -20 48 C -12 43, -3 45, 3 49 C 0 33, 2 14, 8 0 Z" fill="rgba(176,84,54,0.4)"/>
      <path class="ink ink-thin" d="M -6 12 C -11 23, -13 33, -12 41" opacity="0.55"/>
    </g>`,
    shellneck: (a) => `<g transform="${T(a.neck)}">
      <path class="ink ink-thin" d="M -12 -2 C -6 4, 7 4, 13 -2" fill="none"/>
      <circle class="ink ink-thin" cx="-7" cy="1.4" r="1.6" fill="rgba(230,200,170,0.7)"/>
      <circle class="ink ink-thin" cx="7.5" cy="1.4" r="1.6" fill="rgba(230,200,170,0.7)"/>
      <g transform="translate(0.5 4)"><path class="ink ink-thin" d="M -3.4 1.4 C -3.4 -2.6, 3.4 -2.6, 3.4 1.4 Z" fill="rgba(230,200,170,0.75)"/><path class="ink ink-thin" d="M -1.6 1 L -1.4 -1.8 M 1.6 1 L 1.4 -1.8"/></g>
    </g>`,
    goggles: (a) => `<g>
      <circle class="ink" cx="${a.eye1[0]}" cy="${a.eye1[1]}" r="6.6" fill="rgba(180,214,224,0.3)"/>
      <circle class="ink" cx="${a.eye2[0]}" cy="${a.eye2[1]}" r="6.6" fill="rgba(180,214,224,0.3)"/>
      <path class="ink" d="M ${a.eye1[0] + 6.6} ${a.eye1[1]} L ${a.eye2[0] - 6.6} ${a.eye2[1]}" fill="none"/>
      <path class="ink ink-thin" d="M ${a.eye1[0] - 6.6} ${a.eye1[1]} l -5 -2 M ${a.eye2[0] + 6.6} ${a.eye2[1]} l 5 -2" fill="none"/>
    </g>`,
    monocle: (a) => `<g>
      <circle class="ink" cx="${a.eye2[0]}" cy="${a.eye2[1]}" r="6" fill="rgba(255,255,255,0.16)"/>
      <path class="ink ink-thin" d="M ${a.eye2[0] + 2} ${a.eye2[1] + 5.6} C ${a.eye2[0] + 6} ${a.eye2[1] + 12}, ${a.eye2[0] + 3} ${a.eye2[1] + 17}, ${a.eye2[0] + 7} ${a.eye2[1] + 21}" fill="none"/>
    </g>`,
    eyepatch: (a) => `<g>
      <circle class="ink" cx="${a.eye1[0]}" cy="${a.eye1[1]}" r="6" fill="rgba(60,42,30,0.8)"/>
      <path class="ink ink-thin" d="M ${a.eye1[0] - 5.6} ${a.eye1[1] - 2} l -6 -4 M ${a.eye1[0] + 5.6} ${a.eye1[1] - 2} l 7 -4" fill="none"/>
    </g>`
  };

  function faceSvg(root) {
    const wrap = root.querySelector ? root.querySelector('.face-wrap') : null;
    if (!wrap) return null;
    return wrap.querySelector('svg:not(.limbs)');
  }

  function resolveFace(faceId) {
    const meta = window.SIM && window.SIM.meta;
    if (meta && typeof meta.faceKey === 'function') {
      const k = meta.faceKey(faceId);
      if (k) return String(k).replace(/^f-/, '');
    }
    if (faceId && typeof faceId === 'string') {
      const bare = faceId.replace(/^f-/, '');
      if (FACE_KEYS.includes(bare)) return bare;
    }
    return 'happy';
  }

  function normalizeId(id) {
    if (!id || id === 'none') return null;
    return DRAW[id] ? id : null;
  }

  function layerPlan(outfit) {
    if (!outfit) return [];
    const plan = [];
    const neck = normalizeId(outfit.neck);
    const face = normalizeId(outfit.face);
    const hat = normalizeId(outfit.hat);
    if (neck === 'cape') plan.push(['back', 'cape']);
    else if (neck) plan.push(['neck', neck]);
    if (face) plan.push(['face', face]);
    if (hat) plan.push(['hat', hat]);
    return plan;
  }

  O.apply = (target, outfit) => {
    const el = target && target.el ? target.el : target;
    const svg = faceSvg(el);
    if (!svg || !svg.parentNode) return;

    const clone = svg.cloneNode(true);
    clone.querySelectorAll('.acc-g').forEach((g) => g.remove());

    layerPlan(outfit).forEach(([slot, id]) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'acc-g acc-' + slot);
      g.innerHTML = DRAW[id](A);
      if (slot === 'back') clone.insertBefore(g, clone.firstChild);
      else clone.appendChild(g);
    });

    svg.parentNode.replaceChild(clone, svg);
  };

  O.setFaceOn = (rootEl, faceKey) => {
    const root = rootEl && rootEl.el ? rootEl.el : rootEl;
    const svg = faceSvg(root) || (root.querySelector && root.querySelector('svg'));
    if (!svg) return;
    const use = svg.querySelector('use');
    if (!use) return;
    const key = resolveFace(faceKey);
    use.setAttribute('href', '#f-' + key);
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#f-' + key);
  };

  O.portrait = (side, custom) => {
    const c = custom || {};
    const size = c.size || 120;
    const face = resolveFace(c.face);
    const ink = TRIBE[side] || TRIBE.left;
    const flip = side === 'left' ? ' flip-x' : '';
    const div = document.createElement('div');
    div.innerHTML =
      `<div class="smiley portrait${flip}" style="width:${size}px;height:${size}px;--ink:${ink};position:relative;">` +
      '<div class="face-wrap">' +
      '<svg viewBox="0 0 100 100" style="position:absolute;inset:0;overflow:visible;">' +
      `<use href="#f-${face}" />` +
      '</svg></div></div>';
    const smiley = div.firstElementChild;
    O.apply(smiley, {
      hat: c.hat,
      neck: c.neck,
      face: c.faceAcc
    });
    return div.innerHTML;
  };

  function previewViewBox(slot, id) {
    if (slot === 'neck') return id === 'cape' ? '8 38 84 62' : '12 58 76 42';
    if (slot === 'face') return '14 28 72 38';
    if (id === 'flower') return '58 18 42 44';
    return '18 0 64 48';
  }

  O.accPreview = (acc) => {
    if (!acc || !acc.id || !DRAW[acc.id]) return '';
    const slot = acc.slot || 'hat';
    const outfit = { hat: null, neck: null, face: null };
    if (slot === 'hat') outfit.hat = acc.id;
    else if (slot === 'neck') outfit.neck = acc.id;
    else outfit.face = acc.id;

    const div = document.createElement('div');
    div.innerHTML =
      '<div class="smiley" style="width:100px;height:100px;position:relative;">' +
      '<div class="face-wrap">' +
      '<svg viewBox="0 0 100 100" style="position:absolute;inset:0;overflow:visible;">' +
      '<use href="#f-happy" />' +
      '</svg></div></div>';
    O.apply(div.firstElementChild, outfit);
    const svg = faceSvg(div.firstElementChild);
    if (!svg) return '';
    const inner = svg.innerHTML;
    return `<svg viewBox="${previewViewBox(slot, acc.id)}">${inner}</svg>`;
  };

  O._anchors = A;
  O._drawIds = ACC_IDS.slice();
})();

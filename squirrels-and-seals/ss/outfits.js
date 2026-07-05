/* =====================================================================
   OUTFITS — hand-inked accessories that ride the critter rigs.
   SS.outfits.apply(c, {hat, neck, face})  — c is a critter (or {el})
   SS.outfits.setFaceOn(rootEl, eyes, mouth) — face preset on any markup
   ===================================================================== */
window.SS = window.SS || {};
(function () {
  const O = {};
  SS.outfits = O;

  /* per-species anchors: [x, y, rotate] in the shared 120-viewbox space */
  const A = {
    sq: { hat: [73, 15, -8], ear: [57, 13, -14], eye1: [65, 36.5], eye2: [82, 36.5], neck: [72, 60, 0], back: [54, 58, 0] },
    sl: { hat: [88, 25, 5],  ear: [75, 30, -10], eye1: [79, 41],   eye2: [96, 41],   neck: [76, 63, -6], back: [44, 66, 0] }
  };
  const T = (a) => `translate(${a[0]} ${a[1]}) rotate(${a[2] || 0})`;

  /* each drawer returns svg for one species; sp anchors passed in */
  const DRAW = {
    leafcap: (a) => `<g transform="${T(a.hat)}">
      <path class="ink" d="M -14 3 C -9 -7, 9 -7, 14 3 C 6 7, -6 7, -14 3 Z" fill="rgba(122,138,64,0.5)"/>
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

  /* which svg group each slot rides in (so it animates with the part) */
  function hostFor(svg, slot, id) {
    const head = svg.querySelector('.p-head');
    const body = svg.querySelector('.p-body');
    if (slot === 'hat' || slot === 'face') return { el: head || body, prepend: false };
    if (id === 'cape') return { el: body, prepend: true };
    return { el: body, prepend: false }; /* neck */
  }

  O.apply = (c, outfit) => {
    const el = c.el || c;
    const svg = el.querySelector && el.querySelector('svg');
    if (!svg) return;
    /* Build the dressed rig DETACHED, then swap it in atomically.
       (Mutating a live, filtered, animated svg subtree mid-frame can
       hard-crash some renderers under load.) */
    const clone = svg.cloneNode(true);
    clone.querySelectorAll('.acc-g').forEach(g => g.remove());
    if (outfit) {
      const sp = /(^|\s)sl(\s|$)/.test(el.className) ? 'sl' : (c.species || 'sq');
      const a = A[sp] || A.sq;
      [['hat', outfit.hat], ['neck', outfit.neck], ['face', outfit.face]].forEach(([slot, id]) => {
        if (!id || id === 'none' || !DRAW[id]) return;
        const host = hostFor(clone, slot, id);
        if (!host.el) return;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'acc-g acc-' + slot);
        g.innerHTML = DRAW[id](a);
        if (host.prepend) host.el.insertBefore(g, host.el.firstChild);
        else host.el.appendChild(g);
      });
    }
    svg.parentNode.replaceChild(clone, svg);
  };

  /* face preset on arbitrary markup (studio previews, pick cards) */
  const FACES = { normal: 'e-normal', happy: 'e-happy', closed: 'e-closed', ouch: 'e-ouch', dizzy: 'e-dizzy' };
  const MOUTHS = { smile: 'm-smile', open: 'm-open', frown: 'm-frown', o: 'm-o' };
  O.setFaceOn = (root, eyes, mouth) => {
    const svg = root.querySelector('svg') || root;
    Object.values(FACES).forEach(cl => { const g = svg.querySelector('.' + cl); if (g) g.style.display = 'none'; });
    Object.values(MOUTHS).forEach(cl => { const g = svg.querySelector('.' + cl); if (g) g.style.display = 'none'; });
    const eg = svg.querySelector('.' + (FACES[eyes] || 'e-normal')); if (eg) eg.style.display = '';
    const mg = svg.querySelector('.' + (MOUTHS[mouth || 'smile'] || 'm-smile')); if (mg) mg.style.display = '';
    const brow = svg.querySelector('.p-brow'); if (brow) brow.style.display = (eyes === 'angry') ? '' : 'none';
    if (eyes === 'angry') { const ng = svg.querySelector('.e-normal'); if (ng) ng.style.display = ''; }
  };

  /* portrait with outfit + face, for menus */
  O.portrait = (sp, custom) => {
    const div = document.createElement('div');
    div.innerHTML = SS.critterMarkup(sp, custom.variant);
    O.apply({ el: div, species: sp }, { hat: custom.hat, neck: custom.neck, face: custom.faceAcc });
    const f = SS.meta ? SS.meta.faceDef(custom.face) : null;
    if (f) O.setFaceOn(div, f.eyes, f.mouth);
    return div.innerHTML;
  };

  /* tiny cropped preview of one accessory on a head/body */
  O.accPreview = (sp, acc) => {
    const div = document.createElement('div');
    div.innerHTML = SS.critterMarkup(sp, sp === 'sq' ? 'chestnut' : 'slate');
    const outfit = { hat: 'none', neck: 'none', face: 'none' };
    if (acc.slot === 'hat') outfit.hat = acc.id;
    else if (acc.slot === 'neck') outfit.neck = acc.id;
    else outfit.face = acc.id;
    O.apply({ el: div, species: sp }, outfit);
    const inner = div.querySelector('svg').innerHTML;
    const vb = acc.slot === 'neck'
      ? (sp === 'sq' ? '34 34 66 66' : '30 34 72 72')
      : (sp === 'sq' ? '40 -2 66 66' : '54 8 62 62');
    return `<svg viewBox="${vb}">${inner}</svg>`;
  };
})();

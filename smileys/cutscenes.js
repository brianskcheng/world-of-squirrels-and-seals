// =====================================================================
// MANGA BATTLE CUTSCENES  →  window.__cutscene
// Three dramatic anime-style cut-ins triggered during the battle.
//   __cutscene.play('charge',   { attacker, defender, onDone })
//   __cutscene.play('clash',    { ... })
//   __cutscene.play('finisher', { ... })
// attacker/defender are optional {faceKey, classKey} for continuity.
// Self-contained: injects its own CSS + the Bangers display font.
// =====================================================================
(function () {
  const INK = '#211208';
  const PAPER = '#f3ecd6';

  // ---- inject Bangers (manga onomatopoeia font) ----
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Bangers&display=swap';
  document.head.appendChild(fontLink);

  // ---- inject CSS ----
  const css = `
  .cs-root{position:fixed;inset:0;z-index:5000;overflow:hidden;pointer-events:none;
    opacity:0;transition:opacity .18s ease;font-family:'Bangers',system-ui,sans-serif;}
  .cs-root.on{opacity:1;pointer-events:auto;cursor:pointer;}
  .cs-cam{position:absolute;inset:-12%;will-change:transform;transform-origin:50% 50%;}

  /* Background variants */
  .cs-bg{position:absolute;inset:-30%;}
  .cs-bg.paper{background:${PAPER};}
  .cs-bg.dark{background:#140d07;}

  /* radial concentration lines (focus) */
  .cs-focus{position:absolute;inset:-40%;
    background:repeating-conic-gradient(from 0deg at 50% 50%, ${INK} 0deg 0.8deg, transparent 0.8deg 2.6deg);
    -webkit-mask:radial-gradient(circle at 50% 50%, transparent 18%, #000 40%);
            mask:radial-gradient(circle at 50% 50%, transparent 18%, #000 40%);
    opacity:0;will-change:transform;}
  .cs-focus.light{background:repeating-conic-gradient(from 0deg at 50% 50%, ${PAPER} 0deg 0.8deg, transparent 0.8deg 2.6deg);}
  @keyframes csSpin{to{transform:rotate(360deg);}}
  .cs-focus.spin{animation:csSpin 18s linear infinite;}
  .cs-focus.spin-fast{animation:csSpin 6s linear infinite;}

  /* horizontal speed streaks */
  .cs-speed{position:absolute;inset:-30%;
    background:repeating-linear-gradient(0deg, transparent 0 7px, ${INK} 7px 9px, transparent 9px 17px);
    -webkit-mask:radial-gradient(ellipse 60% 80% at 50% 50%, transparent 30%, #000 62%);
            mask:radial-gradient(ellipse 60% 80% at 50% 50%, transparent 30%, #000 62%);
    opacity:0;will-change:transform,opacity;}
  .cs-speed.light{background:repeating-linear-gradient(0deg, transparent 0 7px, ${PAPER} 7px 9px, transparent 9px 17px);}
  @keyframes csStreak{from{background-position-x:0;}to{background-position-x:-400px;}}
  .cs-speed.go{animation:csStreak .35s linear infinite;}

  /* vertical menace lines */
  .cs-vert{position:absolute;inset:-30%;
    background:repeating-linear-gradient(90deg, transparent 0 9px, ${INK} 9px 11px, transparent 11px 26px);
    -webkit-mask:linear-gradient(180deg, #000 0%, transparent 55%);
            mask:linear-gradient(180deg, #000 0%, transparent 55%);
    opacity:0;}

  /* halftone dots */
  .cs-halftone{position:absolute;inset:-30%;
    background-image:radial-gradient(circle, rgba(33,18,8,.55) 30%, transparent 32%);
    background-size:12px 12px;
    -webkit-mask:radial-gradient(ellipse at 50% 60%, transparent 35%, #000 90%);
            mask:radial-gradient(ellipse at 50% 60%, transparent 35%, #000 90%);
    opacity:0;mix-blend-mode:multiply;}

  /* paper grain overlay */
  .cs-grain{position:absolute;inset:0;opacity:.06;pointer-events:none;
    background-image:radial-gradient(circle at 1px 1px, ${INK} 1px, transparent 0);
    background-size:5px 5px;}

  /* letterbox bars */
  .cs-bar{position:absolute;left:0;right:0;height:13%;background:#0a0704;z-index:30;}
  .cs-bar.top{top:0;transform:translateY(-100%);transition:transform .4s cubic-bezier(.6,0,.3,1);}
  .cs-bar.bot{bottom:0;transform:translateY(100%);transition:transform .4s cubic-bezier(.6,0,.3,1);}
  .cs-root.framed .cs-bar.top{transform:translateY(0);}
  .cs-root.framed .cs-bar.bot{transform:translateY(0);}

  /* fighters */
  .cs-fighter{position:absolute;will-change:transform,left,top;transform-origin:50% 60%;}
  .cs-fighter svg{display:block;overflow:visible;}
  .cs-ink{fill:none;stroke:${INK};stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;}
  .cs-ink-thin{stroke-width:1.8;}
  .cs-ink-fill{fill:${INK};stroke:none;}
  .cs-face-fill{fill:${PAPER};}
  .cs-blur{filter:blur(2px);}

  /* motion trail clone */
  .cs-trail{position:absolute;opacity:.28;filter:blur(1px);}

  /* impact star / fx */
  .cs-fx{position:absolute;pointer-events:none;z-index:25;will-change:transform,opacity;}
  @keyframes csBurst{0%{transform:scale(.2) rotate(0deg);opacity:0;}
    25%{opacity:1;}60%{transform:scale(1.15) rotate(8deg);opacity:1;}
    100%{transform:scale(1.4) rotate(14deg);opacity:0;}}
  .cs-fx.burst{animation:csBurst .55s ease-out forwards;}

  /* big onomatopoeia */
  .cs-word{position:absolute;z-index:40;color:${PAPER};
    font-family:'Bangers','Hiragino Sans','Yu Gothic',YuGothic,'Noto Sans JP',sans-serif;font-weight:900;
    -webkit-text-stroke:3px ${INK};
    letter-spacing:2px;line-height:.85;text-align:center;
    text-shadow:7px 7px 0 rgba(33,18,8,.35);
    transform:rotate(-6deg) scale(0);white-space:pre;pointer-events:none;}
  @keyframes csPop{0%{transform:rotate(-6deg) scale(0);}
    60%{transform:rotate(-6deg) scale(1.18);}80%{transform:rotate(-6deg) scale(.94);}
    100%{transform:rotate(-6deg) scale(1);}}
  .cs-word.pop{animation:csPop .3s cubic-bezier(.3,1.6,.5,1) forwards;}
  @keyframes csWordOut{to{opacity:0;transform:rotate(-6deg) scale(1.25);}}
  .cs-word.out{animation:csWordOut .4s ease-in forwards;}
  .cs-word.dark{color:${INK};-webkit-text-stroke:3px ${PAPER};text-shadow:7px 7px 0 rgba(243,236,214,.3);}

  /* small katakana accent */
  .cs-kata{position:absolute;z-index:39;font-family:'Hiragino Sans','Yu Gothic',system-ui,sans-serif;
    font-weight:900;color:${INK};opacity:.0;pointer-events:none;text-shadow:2px 2px 0 rgba(243,236,214,.5);}

  /* white/ink flash */
  .cs-flash{position:absolute;inset:0;z-index:45;background:#fff;opacity:0;pointer-events:none;}
  .cs-flash.ink{background:${INK};}

  /* diagonal slash wipe */
  .cs-slash{position:absolute;inset:-30%;z-index:44;background:${PAPER};
    transform:translateX(-140%) skewX(-18deg);pointer-events:none;}
  @keyframes csSlashGo{from{transform:translateX(-140%) skewX(-18deg);}to{transform:translateX(140%) skewX(-18deg);}}
  .cs-slash.go{animation:csSlashGo .5s cubic-bezier(.7,0,.3,1) forwards;}

  /* speech / shout bubble */
  .cs-shout{position:absolute;z-index:42;font-family:'Bangers',cursive;color:${INK};
    background:${PAPER};border:3px solid ${INK};border-radius:40% 50% 45% 55%;
    padding:8px 18px;font-size:30px;letter-spacing:1px;
    transform:scale(0);transform-origin:center;}
  .cs-shout.pop{animation:csPop .3s cubic-bezier(.3,1.6,.5,1) forwards;}

  /* camera shake */
  @keyframes csShake{0%,100%{transform:translate(0,0) rotate(var(--rot,0deg));}
    20%{transform:translate(-12px,7px) rotate(var(--rot,0deg));}
    40%{transform:translate(11px,-9px) rotate(var(--rot,0deg));}
    60%{transform:translate(-8px,-6px) rotate(var(--rot,0deg));}
    80%{transform:translate(9px,8px) rotate(var(--rot,0deg));}}
  .cs-cam.shake{animation:csShake .4s linear;}
  .cs-cam.shake-hard{animation:csShake .5s linear 2;}

  /* vignette */
  .cs-vignette{position:absolute;inset:0;z-index:28;pointer-events:none;
    background:radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(10,7,4,.55) 100%);}

  /* skip hint */
  .cs-skip{position:absolute;right:18px;bottom:calc(13% + 14px);z-index:50;
    font-family:system-ui,sans-serif;font-size:12px;letter-spacing:.15em;
    color:rgba(243,236,214,.6);text-transform:uppercase;}

  /* dizzy stars orbit */
  @keyframes csOrbit{to{transform:rotate(360deg);}}
  .cs-stars{position:absolute;z-index:26;animation:csOrbit 1.1s linear infinite;}
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---------- helpers ----------
  function el(cls, parent, html) {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    if (parent) parent.appendChild(d);
    return d;
  }
  const vw = () => window.innerWidth;
  const vh = () => window.innerHeight;
  function rand(a, b) { return a + Math.random() * (b - a); }
  const sfx = () => window.__sfx;

  // Japanese battle shout — feeds romaji to the voice synth (vowel-heavy →
  // reads as Japanese kiai), in the fighter's class voice. Not captioned.
  function shout(romaji, classKey) {
    if (window.__sfx && window.__sfx.speak) {
      try { window.__sfx.speak(romaji, classKey || 'samurai', { volume: 1.0 }); } catch (e) {}
    }
  }
  const CRY = {
    charge:   ['ikuzooo','kuraeee','kakugooo'],
    clash:    ['seiyaaa','nnnghaaa','ora'],   // 'ora' generic kiai
    struggle: ['ngooooh','makeruka','uooooh'],
    finish:   ['todomedaaa','kuraeee','shineeei'],
    roar:     ['uoooooh','haaaaa','seiyaaa'],
    fall:     ['guhaaa','abaaa','ugaaah']
  };
  function pickCry(set) { return CRY[set][Math.floor(Math.random()*CRY[set].length)]; }

  // spiky impact-star polygon points
  function spikePoints(spikes, rOut, rIn) {
    let p = [];
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? rOut : rIn;
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      p.push((Math.cos(a) * r).toFixed(1) + ',' + (Math.sin(a) * r).toFixed(1));
    }
    return p.join(' ');
  }
  const IMPACT_STAR = `<svg viewBox="-60 -60 120 120" style="width:100%;height:100%">
    <polygon points="${spikePoints(14, 58, 24)}" fill="${PAPER}" stroke="${INK}" stroke-width="3.5"/>
    <polygon points="${spikePoints(14, 34, 13)}" fill="none" stroke="${INK}" stroke-width="2"/>
  </svg>`;
  const IMPACT_STAR_INK = `<svg viewBox="-60 -60 120 120" style="width:100%;height:100%">
    <polygon points="${spikePoints(14, 58, 24)}" fill="${INK}" stroke="${PAPER}" stroke-width="3.5"/>
  </svg>`;

  // ---------- dramatic faces (ink-on-paper, expressive at huge scale) ----------
  function faceSVG(kind, faceKey) {
    // base head + cheeks; expression layered on top
    let eyes = '', brows = '', mouth = '', extra = '';
    switch (kind) {
      case 'yell': // attacker battle yell — fierce, furious
        brows = `<path class="cs-ink" d="M22 32 L47 45" stroke-width="3.4"/><path class="cs-ink" d="M78 32 L53 45" stroke-width="3.4"/>`;
        eyes  = `<path class="cs-ink" d="M30 51 q7 -6 15 -1"/><path class="cs-ink" d="M70 51 q-7 -6 -15 -1"/>
                 <circle class="cs-ink-fill" cx="39" cy="52" r="2.9"/><circle class="cs-ink-fill" cx="61" cy="52" r="2.9"/>`;
        mouth = `<path class="cs-ink cs-face-fill" d="M32 62 Q50 58 68 62 Q63 86 50 86 Q37 86 32 62 Z"/>
                 <path class="cs-ink-thin" d="M32 64 Q50 68 68 64"/>
                 <path class="cs-ink-thin" d="M40 64 L41 73 M48 64 L48 76 M56 64 L55 73"/>`;
        break;
      case 'rage': // peak ferocity — bared gnashing teeth, blazing glare
        brows = `<path class="cs-ink" d="M20 30 L48 47" stroke-width="4"/><path class="cs-ink" d="M80 30 L52 47" stroke-width="4"/>`;
        eyes  = `<path class="cs-ink" d="M28 52 q9 -7 17 -1"/><path class="cs-ink" d="M72 52 q-9 -7 -17 -1"/>
                 <circle class="cs-ink-fill" cx="40" cy="53" r="3.2"/><circle class="cs-ink-fill" cx="60" cy="53" r="3.2"/>
                 <path class="cs-ink-thin" d="M30 46 L45 49 M70 46 L55 49"/>`;
        mouth = `<path class="cs-ink cs-face-fill" d="M26 60 Q50 56 74 60 Q67 90 50 90 Q33 90 26 60 Z"/>
                 <path class="cs-ink-thin" d="M26 64 Q50 69 74 64 M26 74 Q50 70 74 74"/>
                 <path class="cs-ink-thin" d="M34 62 L36 75 M43 62 L43 78 M50 62 L50 78 M57 62 L57 78 M66 62 L64 75"/>`;
        break;
      case 'grit': // determined gritted teeth — fierce, braced for impact
        brows = `<path class="cs-ink" d="M26 38 L47 44" stroke-width="3.2"/><path class="cs-ink" d="M74 38 L53 44" stroke-width="3.2"/>`;
        eyes  = `<circle class="cs-ink-fill" cx="39" cy="49" r="3.4"/><circle class="cs-ink-fill" cx="61" cy="49" r="3.4"/>
                 <path class="cs-ink-thin" d="M29 43 L46 46 M71 43 L54 46"/>`;
        mouth = `<rect class="cs-ink cs-face-fill" x="31" y="61" width="38" height="16" rx="3"/>
                 <path class="cs-ink-thin" d="M31 69 L69 69 M38 61 L38 77 M45 61 L45 77 M52 61 L52 77 M59 61 L59 77"/>`;
        break;
      case 'brace': // defiant guard \u2014 fierce, teeth clenched, holding the line
        brows = `<path class="cs-ink" d="M24 34 L46 44" stroke-width="3.2"/><path class="cs-ink" d="M76 34 L54 44" stroke-width="3.2"/>`;
        eyes  = `<path class="cs-ink" d="M31 50 q7 -5 14 -1"/><path class="cs-ink" d="M69 50 q-7 -5 -14 -1"/>
                 <circle class="cs-ink-fill" cx="40" cy="51" r="2.8"/><circle class="cs-ink-fill" cx="60" cy="51" r="2.8"/>`;
        mouth = `<path class="cs-ink cs-face-fill" d="M34 64 Q50 60 66 64 L66 72 Q50 78 34 72 Z"/>
                 <path class="cs-ink-thin" d="M34 68 L66 68 M42 62 L42 76 M50 61 L50 77 M58 62 L58 76"/>`;
        break;
      case 'fear': // terror / cowering
        brows = `<path class="cs-ink" d="M30 36 q6 -6 13 -1"/><path class="cs-ink" d="M70 36 q-6 -6 -13 -1"/>`;
        eyes  = `<circle class="cs-ink" cx="39" cy="49" r="8" fill="${PAPER}"/><circle class="cs-ink-fill" cx="39" cy="50" r="2.2"/>
                 <circle class="cs-ink" cx="61" cy="49" r="8" fill="${PAPER}"/><circle class="cs-ink-fill" cx="61" cy="50" r="2.2"/>`;
        mouth = `<path class="cs-ink cs-face-fill" d="M38 66 Q50 62 62 66 Q58 82 50 82 Q42 82 38 66 Z"/>
                 <path class="cs-ink-thin" d="M40 73 q10 4 20 0"/>`;
        extra = `<path class="cs-ink-thin" d="M72 42 q6 9 1 17 q-5 -3 -3 -10" fill="rgba(90,140,200,.4)"/>
                 <path class="cs-ink-thin" d="M22 44 q-5 8 0 15" fill="none"/>`;
        break;
      case 'ko': // knocked out
        eyes  = `<path class="cs-ink" d="M32 44 L44 56 M44 44 L32 56"/><path class="cs-ink" d="M56 44 L68 56 M68 44 L56 56"/>`;
        mouth = `<path class="cs-ink" d="M38 72 q6 -6 12 0 q6 6 12 0"/>`;
        break;
      case 'win': // triumphant
        brows = `<path class="cs-ink" d="M30 40 L44 37"/><path class="cs-ink" d="M70 40 L56 37"/>`;
        eyes  = `<path class="cs-ink" d="M32 48 q7 -6 14 0"/><path class="cs-ink" d="M54 48 q7 -6 14 0"/>`;
        mouth = `<path class="cs-ink cs-face-fill" d="M32 60 Q50 82 68 60 Q50 70 32 60 Z"/>`;
        break;
      default:
        eyes = `<circle class="cs-ink-fill" cx="39" cy="48" r="3"/><circle class="cs-ink-fill" cx="61" cy="48" r="3"/>`;
        mouth = `<path class="cs-ink" d="M34 62 Q50 78 66 62"/>`;
    }
    return `<svg viewBox="0 0 100 100" style="width:100%;height:100%">
      <circle class="cs-ink cs-face-fill" cx="50" cy="50" r="44"/>
      <circle class="cs-ink-thin" cx="50" cy="50" r="40" fill="none"/>
      ${brows}${eyes}${mouth}${extra}
    </svg>`;
  }

  // ---------- weapons (drawn big, ink style) ----------
  function weaponSVG(kind) {
    switch (kind) {
      case 'spear':
        return `<svg viewBox="0 0 300 80" style="width:100%;height:100%">
          <path class="cs-ink" d="M10 58 L250 22"/>
          <path class="cs-ink cs-face-fill" d="M248 14 L292 26 L250 32 L256 23 Z"/>
          <path class="cs-ink-thin" d="M250 24 L286 25"/>
          <path class="cs-ink-thin" d="M40 54 q-6 6 0 12 q8 -2 6 -10"/>
        </svg>`;
      case 'katana':
        return `<svg viewBox="0 0 300 120" style="width:100%;height:100%">
          <path class="cs-ink cs-face-fill" d="M30 96 Q160 40 286 16 Q170 64 44 104 Z"/>
          <path class="cs-ink-thin" d="M40 98 Q160 50 280 22"/>
          <rect class="cs-ink cs-face-fill" x="16" y="92" width="22" height="10" rx="2" transform="rotate(-20 27 97)"/>
          <path class="cs-ink" d="M8 108 L26 96" stroke-width="6"/>
        </svg>`;
      case 'club':
        return `<svg viewBox="0 0 140 240" style="width:100%;height:100%">
          <path class="cs-ink" d="M70 230 L78 120" stroke-width="9"/>
          <path class="cs-ink cs-face-fill" d="M78 120 Q40 96 58 56 Q70 24 104 36 Q138 50 122 92 Q112 122 78 120 Z"/>
          <path class="cs-ink-thin" d="M70 70 l8 6 M92 54 l6 8 M104 78 l8 4 M86 92 l7 7"/>
        </svg>`;
      case 'staff':
        return `<svg viewBox="0 0 120 260" style="width:100%;height:100%">
          <path class="cs-ink" d="M60 250 L66 70" stroke-width="6"/>
          <circle class="cs-ink" cx="66" cy="52" r="22" fill="rgba(255,210,90,.45)"/>
          <circle class="cs-ink-thin" cx="66" cy="52" r="12" fill="rgba(255,230,150,.6)"/>
          <path class="cs-ink-thin" d="M66 18 L66 30 M40 30 L48 38 M92 30 L84 38 M30 52 L42 52 M102 52 L90 52"/>
        </svg>`;
      case 'fist':
        return `<svg viewBox="0 0 120 120" style="width:100%;height:100%">
          <circle class="cs-ink cs-face-fill" cx="60" cy="60" r="46"/>
          <path class="cs-ink-thin" d="M30 50 q14 -10 28 0 q14 -10 28 0 M30 66 q14 10 28 0 q14 10 28 0 M30 58 l60 0"/>
        </svg>`;
      default:
        return weaponSVG('katana');
    }
  }

  // class → weapon mapping
  function weaponForClass(cls) {
    return ({
      samurai:'katana', giant:'club', wizard:'staff', flying:'spear',
      armored:'spear', water:'staff', time:'staff', healer:'staff',
      spear:'spear', gunner:'fist',
      sniper:'spear', rocketeer:'club', medic:'staff',
      commando:'katana', frostmage:'staff', pyromancer:'staff'
    })[cls] || 'katana';
  }

  // ---------- core engine ----------
  let active = false;
  let timeouts = [];
  let root = null, cam = null, onDoneCb = null;
  let skipFn = null;

  function at(ms, fn) { timeouts.push(setTimeout(fn, ms)); }
  function clearAll() { timeouts.forEach(clearTimeout); timeouts = []; }
  // Like requestAnimationFrame, but timeout-based so it survives background-tab rAF throttling
  function soon(fn) { timeouts.push(setTimeout(fn, 18)); }

  function buildRoot() {
    root = el('cs-root', document.body);
    cam = el('cs-cam', root);
    document.body.classList.add('cs-active');
    root.addEventListener('click', () => { if (skipFn) skipFn(); });
    const skip = el('cs-skip', root); skip.textContent = 'click to skip';
    return cam;
  }

  function flash(white = true, ms = 90) {
    const f = el('cs-flash' + (white ? '' : ' ink'), root);
    f.style.opacity = '0.96';
    at(ms, () => { f.style.transition = 'opacity .25s'; f.style.opacity = '0'; });
    at(ms + 300, () => f.remove());
  }

  // Manga IMPACT FRAMES — rapid white/ink/white alternation, the classic
  // negative-flash that sells a huge hit
  function impactFrames() {
    flash(true, 70);
    at(80, () => flash(false, 60));
    at(150, () => flash(true, 55));
  }

  // Crescent smear arc — the path a weapon rips through the air
  function smearArc(x, y, size, angle, light) {
    const col = light ? PAPER : INK;
    const s = el('cs-fx', cam, `<svg viewBox="-60 -60 120 120" style="width:100%;height:100%">
      <path d="M -54 -14 Q 0 -64 54 -14 Q 8 -38 -54 -14 Z" fill="${col}" opacity=".92"/>
      <path d="M -42 -2 Q 0 -42 42 -2" fill="none" stroke="${col}" stroke-width="3" opacity=".6"/>
    </svg>`);
    s.style.left = (x - size / 2) + 'px'; s.style.top = (y - size / 2) + 'px';
    s.style.width = size + 'px'; s.style.height = size + 'px';
    s.style.transformOrigin = '50% 50%';
    s.style.transform = `rotate(${angle}deg) scale(.55)`;
    s.style.opacity = '0';
    s.style.transition = 'transform .15s ease-out, opacity .09s';
    soon(() => { s.style.opacity = '.95'; s.style.transform = `rotate(${angle}deg) scale(1.12)`; });
    at(180, () => { s.style.transition = 'opacity .12s'; s.style.opacity = '0'; });
    at(330, () => s.remove());
  }

  // Jagged ground cracks bursting from a mega impact
  function groundCracks(x, y, w, light) {
    const col = light ? PAPER : INK;
    const c = el('cs-fx', cam, `<svg viewBox="0 0 200 60" style="width:100%;height:100%" preserveAspectRatio="none">
      <path d="M100 4 L84 16 L92 28 L70 42 L78 56 M100 4 L118 18 L108 32 L130 46 M100 4 L100 20 L90 38 M100 4 L142 24 L136 40"
        fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round"/>
    </svg>`);
    c.style.left = (x - w / 2) + 'px'; c.style.top = y + 'px';
    c.style.width = w + 'px'; c.style.height = (w * 0.3) + 'px';
    c.style.transformOrigin = '50% 0%';
    c.style.transform = 'scale(.3)'; c.style.opacity = '0';
    c.style.transition = 'transform .18s cubic-bezier(.2,1,.4,1), opacity .1s';
    soon(() => { c.style.transform = 'scale(1)'; c.style.opacity = '.9'; });
    at(950, () => { c.style.transition = 'opacity .5s'; c.style.opacity = '0'; });
    at(1500, () => c.remove());
  }

  function shake(hard) {
    cam.classList.remove('shake', 'shake-hard');
    void cam.offsetWidth;
    cam.classList.add(hard ? 'shake-hard' : 'shake');
  }

  function word(text, x, y, size, opts = {}) {
    const rot = opts.rot != null ? opts.rot : -6;
    const w = el('cs-word' + (opts.dark ? ' dark' : ''), root);
    w.textContent = text;
    w.style.left = x + 'px';
    w.style.top = y + 'px';
    w.style.fontSize = size + 'px';
    // Transition-based pop (survives background-tab animation freezing)
    w.style.transition = 'transform .26s cubic-bezier(.3,1.7,.5,1), opacity .18s ease';
    w.style.transform = `rotate(${rot}deg) scale(0.3)`;
    w.style.opacity = '0';
    soon(() => { w.style.transform = `rotate(${rot}deg) scale(1)`; w.style.opacity = '1'; });
    const life = opts.life || 900;
    at(life, () => {
      w.style.transition = 'transform .4s ease-in, opacity .4s ease';
      w.style.transform = `rotate(${rot}deg) scale(1.25)`;
      w.style.opacity = '0';
    });
    at(life + 450, () => w.remove());
    return w;
  }

  function kata(text, x, y, size) {
    const k = el('cs-kata', root);
    k.textContent = text;
    k.style.left = x + 'px'; k.style.top = y + 'px'; k.style.fontSize = size + 'px';
    k.style.transition = 'opacity .3s';
    soon(() => k.style.opacity = '.85');
    at(1400, () => { k.style.opacity = '0'; });
    at(1800, () => k.remove());
  }

  function impactAt(x, y, size, ink) {
    const s = el('cs-fx', cam, ink ? IMPACT_STAR_INK : IMPACT_STAR);
    s.style.left = (x - size / 2) + 'px';
    s.style.top = (y - size / 2) + 'px';
    s.style.width = size + 'px';
    s.style.height = size + 'px';
    // Transition-based burst (robust to background animation freezing)
    s.style.transformOrigin = '50% 50%';
    s.style.transform = 'scale(0.3) rotate(0deg)';
    s.style.opacity = '0';
    s.style.transition = 'transform .13s ease-out, opacity .1s ease';
    soon(() => { s.style.transform = 'scale(1.05) rotate(6deg)'; s.style.opacity = '1'; });
    at(260, () => {
      s.style.transition = 'transform .32s ease-out, opacity .36s ease';
      s.style.transform = 'scale(1.5) rotate(12deg)';
      s.style.opacity = '0';
    });
    at(640, () => s.remove());
  }

  function inkSplatter(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), d = rand(20, 150);
      const sz = rand(6, 22);
      const b = el('cs-fx', cam,
        `<svg viewBox="0 0 20 20" style="width:100%;height:100%"><path d="M10 1 Q15 6 18 10 Q14 15 10 19 Q5 14 2 10 Q6 5 10 1Z" fill="${INK}"/></svg>`);
      b.style.left = x + 'px'; b.style.top = y + 'px';
      b.style.width = sz + 'px'; b.style.height = sz + 'px';
      b.style.transition = 'transform .5s cubic-bezier(.2,.8,.3,1), opacity .6s';
      soon(() => {
        b.style.transform = `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(${rand(.6,1.3)})`;
        b.style.opacity = '0';
      });
      at(700, () => b.remove());
    }
  }

  function dizzyStars(fighter) {
    const s = el('cs-stars', fighter,
      `<svg width="120" height="40" viewBox="0 0 120 40" style="overflow:visible">
        <text x="10" y="22" font-size="22" fill="${INK}" font-family="Bangers">★</text>
        <text x="52" y="14" font-size="16" fill="${INK}" font-family="Bangers">★</text>
        <text x="86" y="24" font-size="20" fill="${INK}" font-family="Bangers">★</text>
      </svg>`);
    s.style.left = '50%'; s.style.top = '-18px';
    s.style.transformOrigin = '0 30px';
    return s;
  }

  const CLASS_TITLES = {
    samurai:'侍', giant:'巨人', wizard:'魔導士',
    flying:'天翼', armored:'鉄壁', water:'水使い',
    time:'刻使い', healer:'癒し手',
    gunner:'銃士', spear:'槍兵',
    sniper:'狙撃手', rocketeer:'砲撃手', medic:'衛生兵',
    commando:'特攻兵', frostmage:'氷魔導', pyromancer:'炎魔導'
  };
  const FALLBACK_TITLES = { l:'挑戦者', r:'宿敵', destroyer:'破壊者', doomed:'哀れな者' };

  // Sliding manga nameplate (combatant intro). side: 'l' | 'r'
  function nameplate(title, side, yPct) {
    const np = el('', root);
    const fromX = side === 'l' ? '-60%' : '60%';
    np.style.cssText = `position:absolute;z-index:43;${side==='l'?'left:4%':'right:4%'};top:${yPct}%;
      font-family:'Bangers',cursive;color:${PAPER};-webkit-text-stroke:2px ${INK};
      font-size:${Math.min(64, vw()*0.05)}px;letter-spacing:2px;
      background:linear-gradient(${side==='l'?'90deg':'270deg'}, ${INK} 60%, transparent);
      padding:6px 26px;text-shadow:4px 4px 0 rgba(33,18,8,.4);
      transform:translateX(${fromX}) skewX(${side==='l'?'-12deg':'12deg'});opacity:0;
      transition:transform .4s cubic-bezier(.2,1,.3,1), opacity .3s;`;
    np.textContent = title;
    soon(() => { np.style.transform = `translateX(0) skewX(${side==='l'?'-12deg':'12deg'})`; np.style.opacity = '1'; });
    at(1100, () => { np.style.transition = 'transform .35s ease-in, opacity .35s'; np.style.transform = `translateX(${fromX}) skewX(${side==='l'?'-12deg':'12deg'})`; np.style.opacity = '0'; });
    at(1500, () => np.remove());
  }

  // Slow-motion intensity vignette pulse (darkens edges briefly)
  function slowmoPulse(ms) {
    const v = el('', root);
    v.style.cssText = `position:absolute;inset:0;z-index:29;pointer-events:none;
      background:radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(10,7,4,.7) 100%);
      opacity:0;transition:opacity .25s ease;`;
    soon(() => v.style.opacity = '1');
    at(ms, () => { v.style.opacity = '0'; });
    at(ms + 300, () => v.remove());
  }

  // create a fighter element
  function makeFighter(faceKind, faceKey, weapon, size) {
    const f = el('cs-fighter', cam);
    f.style.width = size + 'px';
    f.style.height = size + 'px';
    const head = el('', f, faceSVG(faceKind, faceKey));
    head.style.cssText = 'position:absolute;inset:0;';
    f._head = head;
    f._setFace = (kind) => { head.innerHTML = faceSVG(kind, faceKey); };
    if (weapon) {
      const w = el('', f, weaponSVG(weapon));
      w.style.cssText = 'position:absolute;';
      f._weapon = w;
    }
    return f;
  }

  function finish() {
    if (!root) return;
    root.classList.remove('on');
    document.body.classList.remove('cs-active');
    const r = root;
    setTimeout(() => { try { r.remove(); } catch (e) {} }, 260);
    root = null; cam = null; active = false; skipFn = null;
    clearAll();
    const cb = onDoneCb; onDoneCb = null;
    if (cb) try { cb(); } catch (e) {}
  }

  // =====================================================================
  // SCENE 1 — "THE CHARGE"  (wide tracking shot, horizontal speed)
  // =====================================================================
  function sceneCharge(opts) {
    buildRoot();
    const W = vw(), H = vh();
    const bg = el('cs-bg paper', cam);
    const speed = el('cs-speed go', cam);
    const halftone = el('cs-halftone', cam);
    el('cs-grain', root);
    el('cs-vignette', root);
    el('cs-bar top', root); el('cs-bar bot', root);

    const wpn = weaponForClass((opts.attacker && opts.attacker.classKey) || 'samurai');
    const atk = makeFighter('yell', opts.attacker && opts.attacker.faceKey, wpn, H * 0.42);
    const def = makeFighter('grit', opts.defender && opts.defender.faceKey, null, H * 0.40);

    const groundY = H * 0.50;
    atk.style.left = (-W * 0.5) + 'px';
    atk.style.top = groundY + 'px';
    atk.style.transform = 'rotate(8deg) scaleX(1)';
    // weapon thrust forward (to the right)
    if (atk._weapon) {
      atk._weapon.style.width = (H * 0.5) + 'px';
      atk._weapon.style.right = (-H * 0.42) + 'px';
      atk._weapon.style.top = (H * 0.12) + 'px';
    }
    def.style.left = (W * 0.66) + 'px';
    def.style.top = (groundY + H * 0.01) + 'px';
    def.style.transform = 'rotate(-4deg)';

    soon(() => {
      root.classList.add('on'); root.classList.add('framed');
      halftone.style.opacity = '.5';
    });
    speed.classList.remove('go');
    speed.style.opacity = '0';
    cam.style.transition = 'transform 1s ease-out';
    cam.style.transform = 'scale(1.0)';
    if (sfx()) { sfx().rumble(1.3, 0.4); sfx().taiko(0.6); }

    // INTRO — combatant nameplates slide in, slow push toward defender
    nameplate(CLASS_TITLES[(opts.attacker && opts.attacker.classKey)] || '挑戦者', 'l', 12);
    nameplate(CLASS_TITLES[(opts.defender && opts.defender.classKey)] || '宿敵', 'r', 78);
    at(150, () => { cam.style.transform = 'scale(1.08)'; });
    kata('ズシャアッ', W * 0.1, H * 0.2, 34);
    at(700, () => { if (sfx()) sfx().taiko(0.7); });

    // charge whoosh + dash in
    at(1050, () => {
      cam.style.transition = 'transform .4s ease';
      cam.style.transform = 'scale(1.0)';
      speed.style.opacity = '.85'; speed.classList.add('go');
      if (sfx()) sfx().boomRamp(1.05, 0.5);
      shout(pickCry('charge'), opts.attacker && opts.attacker.classKey);
      atk._setFace('rage');
      atk.classList.add('cs-blur');
      atk.style.transition = 'left .85s cubic-bezier(.4,.2,.2,1), transform .85s ease';
      atk.style.left = (W * 0.30) + 'px';
      // trailing clones
      for (let i = 1; i <= 3; i++) {
        const t = el('cs-trail', cam, faceSVG('yell', opts.attacker && opts.attacker.faceKey));
        t.style.width = (H * 0.42) + 'px'; t.style.height = (H * 0.42) + 'px';
        t.style.left = (-W * 0.5 + i * 60) + 'px'; t.style.top = groundY + 'px';
        t.style.transition = `left .85s cubic-bezier(.4,.2,.2,1)`;
        t.style.opacity = (0.22 - i * 0.05);
        soon(() => t.style.left = (W * 0.30 - i * 70) + 'px');
        at(900, () => t.remove());
      }
    });

    // tension FREEZE just before impact (slow-mo)
    at(1900, () => {
      atk.classList.remove('cs-blur');
      atk.style.transition = 'none';
      speed.classList.remove('go');
      slowmoPulse(450);
      if (sfx()) sfx().taiko(0.85);
      def._setFace('fear');
      kata('ハッ!', W * 0.6, H * 0.3, 34);
    });

    // IMPACT
    at(2350, () => {
      impactFrames();
      cam.style.transition = 'transform .1s ease-out';
      cam.style.transform = 'scale(1.4)';
      shake(true);
      at(110, () => shake(true));
      if (sfx()) sfx().kaboom(1.4);
      shout(pickCry('fall'), opts.defender && opts.defender.classKey);
      const cx = W * 0.62, cy = groundY + H * 0.12;
      smearArc(cx - H * 0.12, cy - H * 0.06, H * 0.45, 18, false);
      impactAt(cx, cy, H * 0.5);
      inkSplatter(cx, cy, 16);
      word('ドンッ!!', W * 0.42, H * 0.20, Math.min(180, W * 0.16), { rot: -8, life: 1400 });
      kata('ドォン', W * 0.6, H * 0.62, 40);
      // knock defender back
      def._setFace('ko');
      def.style.transition = 'left 1.1s cubic-bezier(.2,.7,.4,1), top 1.1s ease, transform 1.1s ease';
      def.style.left = (W * 0.92) + 'px';
      def.style.top = (groundY - H * 0.08) + 'px';
      def.style.transform = 'rotate(220deg)';
      dizzyStars(def);
    });

    // slow-mo aftermath hold
    at(2600, () => { cam.style.transition = 'transform .8s ease'; cam.style.transform = 'scale(1.16)'; slowmoPulse(700); });
    at(3300, () => { atk._setFace('grit'); cam.style.transform = 'scale(1.08)'; });
    // attacker turns, victorious — held beat
    at(4100, () => {
      atk._setFace('win');
      atk.style.transition = 'transform .4s ease';
      atk.style.transform = 'rotate(2deg)';
      if (sfx()) sfx().taiko(0.5);
      word('撃破ッ', W * 0.30, H * 0.66, Math.min(110, W * 0.09), { rot: -4, life: 1200, dark: true });
    });
    at(5600, () => { skipFn(); });

    skipFn = () => { clearAll(); finish(); };
  }

  // =====================================================================
  // SCENE 2 — "THE CLASH"  (extreme close-up, dutch angle, blade lock)
  // =====================================================================
  function sceneClash(opts) {
    buildRoot();
    const W = vw(), H = vh();
    cam.style.transform = 'rotate(-7deg) scale(1.08)';
    cam.style.setProperty('--rot', '-7deg');
    const bg = el('cs-bg paper', cam);
    const focus = el('cs-focus spin', cam);
    const halftone = el('cs-halftone', cam);
    el('cs-grain', root);
    el('cs-vignette', root);
    el('cs-bar top', root); el('cs-bar bot', root);

    const fk1 = opts.attacker && opts.attacker.faceKey;
    const fk2 = opts.defender && opts.defender.faceKey;
    // two big faces nose-to-nose
    const left = makeFighter('rage', fk1, null, H * 0.62);
    const right = makeFighter('grit', fk2, null, H * 0.62);
    left.style.left = (-W * 0.4) + 'px'; left.style.top = (H * 0.16) + 'px';
    right.style.left = (W * 0.78) + 'px'; right.style.top = (H * 0.18) + 'px';
    right.style.transform = 'scaleX(-1)';

    // crossed blades in the centre
    const bladeWrap = el('', cam); bladeWrap.style.cssText =
      `position:absolute;left:${W*0.5-120}px;top:${H*0.30}px;width:240px;height:240px;z-index:20;`;
    const b1 = el('', bladeWrap, weaponSVG('katana'));
    b1.style.cssText = 'position:absolute;inset:0;transform:rotate(28deg);';
    const b2 = el('', bladeWrap, weaponSVG('katana'));
    b2.style.cssText = 'position:absolute;inset:0;transform:rotate(-208deg) scaleX(-1);';
    bladeWrap.style.opacity = '0';

    soon(() => {
      root.classList.add('on'); root.classList.add('framed');
      focus.style.opacity = '.7'; halftone.style.opacity = '.45';
    });
    if (sfx()) sfx().taiko(0.6);
    nameplate(CLASS_TITLES[(opts.attacker && opts.attacker.classKey)] || '挑戦者', 'l', 8);
    nameplate(CLASS_TITLES[(opts.defender && opts.defender.classKey)] || '好敵手', 'r', 82);

    // faces slam together, blades cross
    at(450, () => {
      left.style.transition = 'left .35s cubic-bezier(.5,0,.3,1)';
      right.style.transition = 'left .35s cubic-bezier(.5,0,.3,1)';
      left.style.left = (W * 0.04) + 'px';
      right.style.left = (W * 0.40) + 'px';
    });
    at(760, () => {
      bladeWrap.style.transition = 'opacity .1s';
      bladeWrap.style.opacity = '1';
      flash(true, 60);
      if (sfx()) { sfx().shing(); sfx().kaboom(0.8); }
      shout(pickCry('clash'), opts.attacker && opts.attacker.classKey);
      impactAt(W * 0.5, H * 0.42, H * 0.4);
      word('ギィン!', W * 0.30, H * 0.06, Math.min(150, W * 0.13), { rot: -7, life: 1600 });
      kata('ギギギ…', W * 0.5, H * 0.7, 40);
    });

    // trembling power-struggle (longer, with push-in)
    at(950, () => {
      [left, right, bladeWrap].forEach(e => { e.style.animation = 'csShake .12s linear infinite'; });
      if (sfx()) sfx().taiko(0.5);
    });
    at(1500, () => {
      // push the camera in closer on the blade lock
      cam.style.transition = 'transform .9s ease-in-out';
      cam.style.transform = 'rotate(-7deg) scale(1.28)';
      focus.style.opacity = '.85';
      if (sfx()) sfx().taiko(0.55);
    });
    at(1750, () => { left._setFace('yell'); shout(pickCry('struggle'), opts.attacker && opts.attacker.classKey); kata('ドクン', W * 0.14, H * 0.2, 34); });
    at(2150, () => { right._setFace('yell'); if (sfx()) sfx().taiko(0.6); shout(pickCry('struggle'), opts.defender && opts.defender.classKey); kata('ドクン', W * 0.74, H * 0.22, 34); });
    // a beat where one starts to falter
    at(2650, () => {
      right._setFace('brace');
      slowmoPulse(700);
      if (sfx()) { sfx().taiko(0.7); sfx().boomRamp(0.62, 0.5); }
      word('ぐぬぬッ!', W * 0.56, H * 0.1, Math.min(110, W * 0.09), { rot: 5, life: 900 });
    });

    // BREAK — winner slashes through
    at(3300, () => {
      [left, right, bladeWrap].forEach(e => e.style.animation = '');
      cam.style.transition = 'transform .12s'; cam.style.transform = 'rotate(-7deg) scale(1.1)';
      right._setFace('fear');
      const slash = el('cs-slash', root);
      void slash.offsetWidth;
      slash.classList.add('go');
      impactFrames();
      shake(true);
      at(120, () => shake(true));
      if (sfx()) { sfx().shing(); sfx().kaboom(1.3); }
      shout(pickCry('finish'), opts.attacker && opts.attacker.classKey);
      smearArc(W * 0.5, H * 0.40, H * 0.55, -24, false);
      word('シャキィン!!', W * 0.18, H * 0.4, Math.min(170, W * 0.14), { rot: -5, life: 1500 });
      impactAt(W * 0.5, H * 0.45, H * 0.5);
      inkSplatter(W * 0.5, H * 0.45, 18);
    });
    at(3600, () => {
      // loser knocked away, winner triumphant
      right._setFace('ko');
      right.style.transition = 'left 1s ease, transform 1s ease, opacity 1s';
      right.style.left = (W * 0.95) + 'px';
      right.style.transform = 'scaleX(-1) rotate(200deg)';
      right.style.opacity = '.25';
      left._setFace('win');
      bladeWrap.style.transition = 'opacity .4s'; bladeWrap.style.opacity = '0';
      slowmoPulse(900);
      kata('シーン…', W * 0.6, H * 0.2, 32);
    });
    // hold on the victor
    at(4500, () => {
      cam.style.transition = 'transform .6s ease'; cam.style.transform = 'rotate(-3deg) scale(1.14)';
      if (sfx()) sfx().taiko(0.5);
      word('勝利ッ', W * 0.30, H * 0.66, Math.min(120, W * 0.1), { rot: -4, life: 1300, dark: true });
    });

    at(6200, () => skipFn());
    skipFn = () => { clearAll(); finish(); };
  }

  // =====================================================================
  // SCENE 3 — "THE FINISHER"  (low angle, giant pummel, secret technique)
  // =====================================================================
  function sceneFinisher(opts) {
    buildRoot();
    const W = vw(), H = vh();
    // low-angle: subtle vertical squash + perspective feel
    cam.style.transformOrigin = '50% 100%';
    const bg = el('cs-bg dark', cam);
    const focus = el('cs-focus light spin-fast', cam);
    const vert = el('cs-vert', cam);
    const halftone = el('cs-halftone', cam);
    el('cs-grain', root);
    el('cs-vignette', root);
    el('cs-bar top', root); el('cs-bar bot', root);

    // dark scene → light onomatopoeia
    const giant = makeFighter('grit', opts.attacker && opts.attacker.faceKey, 'club', H * 0.66);
    giant.style.left = (W * 0.30) + 'px';
    giant.style.top = (-H * 0.1) + 'px';
    giant.style.transform = 'rotate(-6deg)';
    if (giant._weapon) {
      giant._weapon.style.width = (H * 0.34) + 'px';
      giant._weapon.style.left = (H * 0.42) + 'px';
      giant._weapon.style.top = (-H * 0.22) + 'px';
      giant._weapon.style.transformOrigin = '50% 90%';
      giant._weapon.style.transform = 'rotate(40deg)';
    }
    const victim = makeFighter('brace', opts.defender && opts.defender.faceKey, null, H * 0.26);
    victim.style.left = (W * 0.52) + 'px';
    victim.style.top = (H * 0.60) + 'px';

    soon(() => {
      root.classList.add('on'); root.classList.add('framed');
      focus.style.opacity = '.5'; vert.style.opacity = '.5'; halftone.style.opacity = '.4';
    });
    // ominous build
    if (sfx()) { sfx().rumble(1.8, 0.42); sfx().taiko(0.7); }
    nameplate(CLASS_TITLES[(opts.attacker && opts.attacker.classKey)] || '破壊者', 'l', 8);
    kata('ゴゴゴゴ', W * 0.06, H * 0.18, 46);
    at(400, () => { if (sfx()) sfx().taiko(0.7); kata('ゴゴゴ', W * 0.7, H * 0.24, 40); });
    at(800, () => { if (sfx()) sfx().taiko(0.8); });
    at(1050, () => { nameplate('哀れな者', 'r', 70); kata('ゴゴゴゴ', W * 0.55, H * 0.16, 40); if (sfx()) sfx().taiko(0.7); });

    // raise club higher
    at(1250, () => {
      if (giant._weapon) {
        giant._weapon.style.transition = 'transform .25s ease-out';
        giant._weapon.style.transform = 'rotate(8deg)';
      }
    });

    // FIRST SMASH
    function smash(ms, big, txt) {
      at(ms, () => {
        if (giant._weapon) {
          giant._weapon.style.transition = 'transform .1s ease-in';
          giant._weapon.style.transform = 'rotate(72deg)';
        }
        flash(big, big ? 90 : 50);
        shake(big);
        if (sfx()) big ? sfx().kaboom(1.0) : sfx().impactLite();
        const cx = W * 0.56, cy = H * 0.58;
        smearArc(cx - 30, cy - H * 0.16, big ? H * 0.4 : H * 0.26, 104, true);
        impactAt(cx, cy, big ? H * 0.5 : H * 0.32, true);
        if (big) inkSplatter(cx, cy, 12);
        if (txt) word(txt, W * 0.40, H * 0.30, Math.min(150, W * 0.12), { rot: rand(-9,-3), life: 700, dark: false });
        // victim squished lower
        victim.style.transition = 'transform .12s';
        victim.style.transform = `translateY(${Math.min(40, (ms-1400)/30)}px) scaleY(.86)`;
        at(140, () => { if (giant._weapon) { giant._weapon.style.transition='transform .15s'; giant._weapon.style.transform='rotate(20deg)'; } victim.style.transform='translateY(8px) scaleY(1)'; });
      });
    }
    smash(1500, true, 'ドンッ!');
    smash(1820, false, 'ド');
    smash(2050, false, 'ド');
    smash(2270, false, 'ドン');
    smash(2500, false, 'ゴ');
    smash(2720, false, 'ド');
    kata('ドドドド', W * 0.5, H * 0.74, 40);

    // raise for FINAL — slow-mo, secret technique (longer hold)
    at(3050, () => {
      victim._setFace('fear');
      if (giant._weapon) {
        giant._weapon.style.transition = 'transform .7s cubic-bezier(.3,0,.2,1)';
        giant._weapon.style.transform = 'rotate(-16deg)';
      }
      giant._setFace('rage');
      focus.classList.remove('spin-fast'); focus.classList.add('spin');
      focus.style.opacity = '.9';
      slowmoPulse(1100);
      const f = el('cs-flash ink', root); f.style.opacity = '.4';
      at(650, () => { f.style.transition='opacity .4s'; f.style.opacity='0'; at(450,()=>f.remove()); });
      if (sfx()) { sfx().taiko(0.9); sfx().boomRamp(1.15, 0.55); }
      shout(pickCry('roar'), opts.attacker && opts.attacker.classKey);
      word('奥義…', W * 0.34, H * 0.12, Math.min(120, W * 0.1), { rot: -4, life: 1300, dark: true });
      kata('必殺', W * 0.62, H * 0.12, 56);
    });
    at(3900, () => { if (sfx()) sfx().taiko(0.7); kata('…', W * 0.5, H * 0.4, 60); });

    // MEGA SMASH
    at(4300, () => {
      if (giant._weapon) {
        giant._weapon.style.transition = 'transform .08s ease-in';
        giant._weapon.style.transform = 'rotate(86deg)';
      }
      impactFrames();
      cam.style.transition = 'transform .12s';
      cam.style.transform = 'scale(1.2) translateY(10px)';
      shake(true); at(120, () => shake(true)); at(260, () => shake(true));
      if (sfx()) { sfx().kaboom(1.9); sfx().shing(); }
      at(160, () => { if (sfx()) sfx().kaboom(1.2); });
      shout(pickCry('finish'), opts.attacker && opts.attacker.classKey);
      setTimeout(() => shout(pickCry('fall'), opts.defender && opts.defender.classKey), 180);
      const cx = W * 0.55, cy = H * 0.6;
      smearArc(cx - 20, cy - H * 0.2, H * 0.55, 108, true);
      groundCracks(cx, cy + H * 0.04, W * 0.44, true);
      impactAt(cx, cy, H * 0.85, false);
      inkSplatter(cx, cy, 30);
      word('ドゴオオン!!', W * 0.14, H * 0.32, Math.min(200, W * 0.17), { rot: -6, life: 1700 });
      // launch victim off-screen
      victim._setFace('ko');
      victim.style.transition = 'left 1.1s cubic-bezier(.2,.6,.4,1), top 1.1s cubic-bezier(.3,0,.6,1), transform 1.1s';
      victim.style.left = (W * 1.15) + 'px';
      victim.style.top = (-H * 0.35) + 'px';
      victim.style.transform = 'rotate(720deg) scale(.5)';
      if (sfx()) at(140, () => { sfx().launch(); sfx().fallWhistle && sfx().fallWhistle(); });
      dizzyStars(victim);
    });
    // aftermath — dust settle, victory
    at(4700, () => { cam.style.transition = 'transform .9s ease'; cam.style.transform = 'scale(1.06)'; slowmoPulse(900); });
    at(5500, () => { giant._setFace('win'); giant.style.transition='transform .4s ease'; giant.style.transform='rotate(-3deg)'; if (sfx()) sfx().taiko(0.6); });
    at(5800, () => { word('完ッ', W * 0.34, H * 0.62, Math.min(120, W*0.1), { rot: -3, life: 1500, dark: true }); });
    at(6300, () => { word('完璧ッ', W * 0.40, H * 0.78, Math.min(70, W*0.055), { rot: 2, life: 1100, dark: true }); });

    at(7400, () => skipFn());
    skipFn = () => { clearAll(); finish(); };
  }

  // =====================================================================
  // SCENE 4 — "SPECIAL MOVE" cut-in (commander ability activation)
  // opts: { side:'west'|'east', faceKey, abilityJp, abilityEn, kiai, classKey }
  // =====================================================================
  function sceneSpecial(opts) {
    buildRoot();
    const W = vw(), H = vh();
    const west = opts.side === 'west';
    el('cs-bg dark', cam);
    const focus = el('cs-focus light spin-fast', cam);
    const speed = el('cs-speed light', cam);
    el('cs-grain', root);
    el('cs-vignette', root);
    el('cs-bar top', root); el('cs-bar bot', root);

    const fighter = makeFighter('rage', opts.faceKey, west ? null : 'staff', H * 0.58);
    const fromX = west ? -W * 0.5 : W * 1.1;
    const toX = west ? W * 0.10 : W * 0.56;
    fighter.style.left = fromX + 'px';
    fighter.style.top = (H * 0.22) + 'px';
    if (!west) fighter.style.transform = 'scaleX(-1)';
    if (fighter._weapon) {
      fighter._weapon.style.width = (H * 0.3) + 'px';
      fighter._weapon.style.left = (-H * 0.16) + 'px';
      fighter._weapon.style.top = (H * 0.05) + 'px';
    }
    if (west) {
      // the great shield, raised
      const sh = el('', fighter, `<svg viewBox="0 0 60 80" style="width:100%;height:100%;overflow:visible">
        <path d="M30 2 L56 10 L56 42 Q56 66 30 78 Q4 66 4 42 L4 10 Z" fill="${PAPER}" stroke="${INK}" stroke-width="3"/>
        <path d="M30 10 L48 15 L48 42 Q48 58 30 68 Q12 58 12 42 L12 15 Z" fill="none" stroke="${INK}" stroke-width="1.6"/>
        <path d="M22 34 L30 26 L38 34 L30 42 Z" fill="${INK}"/>
      </svg>`);
      sh.style.cssText = `position:absolute; right:${-H * 0.14}px; top:${H * 0.1}px; width:${H * 0.3}px; height:${H * 0.4}px;`;
    }

    soon(() => { root.classList.add('on'); root.classList.add('framed'); focus.style.opacity = '.85'; });
    if (sfx()) { sfx().rumble(1.2, 0.4); sfx().taiko(0.8); }
    kata('ゴゴゴゴ', W * (west ? 0.62 : 0.08), H * 0.2, 44);

    at(280, () => {
      speed.style.opacity = '.7'; speed.classList.add('go');
      fighter.classList.add('cs-blur');
      fighter.style.transition = 'left .3s cubic-bezier(.2,.8,.3,1)';
      fighter.style.left = toX + 'px';
      if (sfx()) sfx().boomRamp(0.5, 0.45);
    });
    at(620, () => {
      fighter.classList.remove('cs-blur');
      speed.classList.remove('go'); speed.style.opacity = '0';
      flash(true, 90);
      shake(true);
      if (sfx()) { sfx().taiko(0.95); sfx().shing(); }
      shout(opts.kiai || 'oooooh', opts.classKey);
      word(opts.abilityJp || '奥義', W * (west ? 0.40 : 0.05), H * 0.24, Math.min(170, W * 0.14), { rot: -6, life: 2000 });
    });
    at(1150, () => {
      word(opts.abilityEn || 'SPECIAL', W * (west ? 0.44 : 0.10), H * 0.58, Math.min(60, W * 0.05), { rot: -3, life: 1500 });
      kata(west ? '守' : '雷', W * (west ? 0.22 : 0.82), H * 0.66, 62);
      if (sfx()) sfx().taiko(0.7);
    });
    at(1900, () => { impactFrames(); if (sfx()) sfx().kaboom(1.1); });
    at(2500, () => skipFn());
    skipFn = () => { clearAll(); finish(); };
  }

  // ---------- public API ----------
  const SCENES = { charge: sceneCharge, clash: sceneClash, finisher: sceneFinisher, special: sceneSpecial };

  window.__cutscene = {
    get active() { return active; },
    play(type, opts = {}) {
      if (active) { if (opts.onDone) opts.onDone(); return; }
      const scene = SCENES[type];
      if (!scene) { if (opts.onDone) opts.onDone(); return; }
      active = true;
      onDoneCb = opts.onDone || null;
      if (window.__sfx) window.__sfx.unlock();
      try { scene(opts); }
      catch (e) { console.error('cutscene error', e); finish(); }
    },
    stop() { if (active) finish(); }
  };
})();

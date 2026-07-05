/* =====================================================================
   GAME SHELL — main menu, settings/balance, challenges, critter studio,
   chapter jumps, world reset. window.SS.game
   ===================================================================== */
(function () {
  const W = SS.world;
  const M = SS.meta;
  const G = {};
  SS.game = G;

  const SWATCH = {
    sq: { chestnut: '#a8622f', red: '#c05220', honey: '#c7903e', grey: '#7a746a' },
    sl: { slate: '#5e7f99', misty: '#8496a6', spotted: '#648096', deep: '#486684' }
  };
  const SIZE_RANGE = { sq: [118, 192], sl: [128, 208] };

  let root = null, body = null;
  let curSection = 'home';
  let stSp = 'sq';

  /* ================= world reset ================= */
  G.resetWorld = () => {
    try { if (SS.battle && SS.battle.teardown) SS.battle.teardown(); } catch (e) {}
    try { if (SS.playground) SS.playground.stop(); } catch (e) {}
    try { if (SS.build && SS.build.abort) SS.build.abort(); } catch (e) {}
    try { if (SS.finale && SS.finale.abort) SS.finale.abort(); } catch (e) {}
    W.clearTimers(); W.stopSpeech();
    if (window.__sfx) { window.__sfx.stopMusic(); if (window.__sfx.stopPeaceHum) window.__sfx.stopPeaceHum(); }
    W.clearCritters(); W.clearFood();
    SS.tribes = { west: [], east: [] };
    (SS.structs || []).forEach(s => s.el.remove());
    SS.structs = [];
    const wall = document.getElementById('great-wall');
    wall.style.transition = 'none'; wall.style.height = '0';
    document.getElementById('wall-wood').innerHTML = '';
    document.getElementById('wall-cracks').innerHTML = '';
    setTimeout(() => { wall.style.transition = ''; }, 50);
    const curtain = document.getElementById('curtain');
    curtain.classList.remove('show', 'exit');
    document.getElementById('chapter-card').classList.remove('show');
    document.getElementById('war-banner').classList.remove('show');
    document.getElementById('subtitle-bar').classList.remove('show');
    W.hideMsg(); W.hideChoices(); W.banner(null); W.clock(null); W.setMood(null);
    document.getElementById('saga-hud').style.display = 'none';
    document.body.classList.remove('saga-running', 'battle-on', 'duel-on', 'shaking', 'hitstop');
    W.state = 'playground';
    /* respawn the meadow on the next frame — doing removal + respawn +
       menu render in one synchronous tick is a lot of layout at once */
    if (G._respawnT) clearTimeout(G._respawnT);
    G._respawnT = setTimeout(() => {
      G._respawnT = null;
      if (W.state === 'playground' && !W.critters.length) SS.playground.start({ quiet: true });
    }, 80);
  };

  G.toMenu = () => { G.resetWorld(); G.show('home'); };

  /* ================= mode launchers ================= */
  function unlockSfx() { if (window.__sfx) window.__sfx.unlock(); }
  function prepFight(clearField) {
    if (W.state !== 'playground') G.resetWorld();
    SS.playground.stop();
    W.clearFood();
    if (clearField) W.clearCritters();
    SS.tribes = { west: [], east: [] };
    W.critters.forEach(c => { if (c.alive) (c.species === 'sq' ? SS.tribes.west : SS.tribes.east).push(c); });
    document.body.classList.add('saga-running');
    document.getElementById('saga-hud').style.display = 'flex';
    W.setMood('war');
    W.banner(null);
  }
  G.startStory = () => {
    unlockSfx(); G.hide();
    if (W.state !== 'playground') G.resetWorld();
    document.body.classList.add('saga-running');
    document.getElementById('saga-hud').style.display = 'flex';
    SS.build.start();
  };
  G.quickFight = () => { unlockSfx(); G.hide(); prepFight(false); SS.battle.start({ mode: 'quick' }); };
  G.duel = () => { unlockSfx(); G.hide(); prepFight(true); SS.battle.start({ mode: 'duel' }); };
  G.autoBattle = () => { unlockSfx(); G.hide(); prepFight(false); SS.battle.start({ mode: 'auto' }); };
  G.jumpChapter = (n) => {
    unlockSfx(); G.hide();
    if (n === 1) { if (W.state !== 'playground') G.resetWorld(); return; }
    if (n === 2) { G.startStory(); return; }
    if (n === 3) {
      if (W.state !== 'playground') G.resetWorld();
      SS.playground.stop(); W.clearFood();
      SS.tribes = { west: [], east: [] };
      W.critters.forEach(c => { if (c.alive) (c.species === 'sq' ? SS.tribes.west : SS.tribes.east).push(c); });
      document.body.classList.add('saga-running');
      document.getElementById('saga-hud').style.display = 'flex';
      if (SS.build.placeDefaults) SS.build.placeDefaults();
      SS.battle.start({ mode: 'story' });
      return;
    }
    if (n === 4) {
      if (W.state !== 'playground') G.resetWorld();
      SS.playground.stop(); W.clearFood();
      document.body.classList.add('saga-running');
      document.getElementById('saga-hud').style.display = 'flex';
      /* half the field is already bonked when the tide returns */
      W.critters.forEach((c, i) => { if (i % 2 === 0) c.setBonked(true); });
      W.state = 'battle';
      SS.finale.start({ playerWon: null, playerSide: 'west' });
    }
  };

  /* ================= menu chrome ================= */
  G.show = (section) => {
    curSection = section || 'home';
    root.classList.add('on');
    document.body.classList.add('menu-open');
    render();
  };
  G.hide = () => {
    root.classList.remove('on');
    document.body.classList.remove('menu-open');
  };

  function el(html) { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  function squig() {
    return `<svg style="width:120px;display:block;margin-top:2px" viewBox="0 0 110 8"><path class="ink ink-thin" d="M2 5 Q 15 1, 28 5 T 54 5 T 80 5 T 108 5" fill="none"/></svg>`;
  }
  function diffSeg(id) {
    const cur = M.difficulty();
    return `<div class="gm-diff" id="${id}">` + Object.keys(M.DIFFS).map(k =>
      `<button data-d="${k}" class="${cur === k ? 'on' : ''}">${M.DIFFS[k].label}<small>${M.DIFFS[k].sub}</small></button>`).join('') + `</div>`;
  }
  function wireDiff(elx) {
    elx.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      M.setDifficulty(b.dataset.d);
      render();
    }));
  }

  /* ================= sections ================= */
  function renderHome() {
    const D = M.data();
    body.innerHTML = '';
    body.appendChild(el(`<div class="gm-head-row">
      <div class="gm-title">World of Squirrels &amp; Seals<small>the meadow, the shore — and the fights between them</small>${squig()}</div>
      <div class="gm-stats"><b>${D.plays}</b> battles · <b>${D.wins}</b> wins<br>${M.doneCount()}/${M.CHALLENGES.length} challenges · ${D.acorns} 🌰<br>progress saves in this browser</div>
    </div>`));
    const grid = el(`<div class="gm-home-grid"></div>`);
    const mk = (t, s, fn, primary) => {
      const b = el(`<button class="gm-big ${primary ? 'primary' : ''}"><span class="t">${t}</span><span class="s">${s}</span></button>`);
      b.addEventListener('click', fn);
      grid.appendChild(b);
    };
    mk('⚔ Quick Fight', 'straight to champion select · you + your army vs theirs', G.quickFight, true);
    mk('▶ Story Mode', 'the whole saga — meadow, wall, war, and the tide', G.startStory);
    mk('⚔⚔ Two-Player Duel', 'champion vs champion, one keyboard', G.duel);
    mk('☁ Auto Battle', 'sit back, watch the armies, maybe place a bet', G.autoBattle);
    mk('🏅 Challenges', `complete them to unlock skills & accessories · ${M.doneCount()}/${M.CHALLENGES.length} done`, () => G.show('challenges'));
    mk('🎨 Critter Studio', 'name, dress, resize & upgrade your champions', () => G.show('studio'));
    mk('🔊 Sound Studio', 'mixer, critter voices, narrator & a soundboard', () => G.show('audio'));
    body.appendChild(grid);
    const row = el(`<div class="gm-foot">
      <div class="gm-row">difficulty: ${diffSeg('gm-diff-home')}</div>
      <div class="gm-row">
        <button class="hand-btn" id="gm-settings">⚙ Settings &amp; balance</button>
        <button class="hand-btn" id="gm-watch">✕ just watch the meadow</button>
      </div>
    </div>`);
    body.appendChild(row);
    const jumps = el(`<div class="gm-foot" style="margin-top:8px;justify-content:flex-start">
      <span style="opacity:.8">jump to a scene:</span>
      <button class="hand-btn" data-ch="1">I · the meadow</button>
      <button class="hand-btn" data-ch="2">II · build season</button>
      <button class="hand-btn" data-ch="3">III · the great bonk</button>
      <button class="hand-btn" data-ch="4">IV · the tide returns</button>
    </div>`);
    jumps.querySelectorAll('[data-ch]').forEach(b => b.addEventListener('click', () => G.jumpChapter(+b.dataset.ch)));
    body.appendChild(jumps);
    wireDiff(row.querySelector('#gm-diff-home'));
    row.querySelector('#gm-settings').addEventListener('click', () => G.show('settings'));
    row.querySelector('#gm-watch').addEventListener('click', () => { unlockSfx(); G.hide(); });
  }

  function fmtVal(p, v) {
    if (p.fmt === 'x') return (Math.round(v * 100) / 100) + '×';
    if (p.fmt === 's') return (Math.round(v * 10) / 10) + 's';
    if (p.fmt === '%') return Math.round(v * 100) + '%';
    return String(Math.round(v));
  }

  function renderSettings() {
    const P = M.params();
    const D = M.data();
    body.innerHTML = '';
    body.appendChild(el(`<div class="gm-sec-head"><button class="gm-back" id="gm-back">← menu</button><div class="gm-sec-title">Settings &amp; Balance</div></div>`));
    const top = el(`<div class="gm-row" style="justify-content:space-between">
      <div class="gm-row">difficulty: ${diffSeg('gm-diff-set')} <span class="gm-note">stacks on top of your sliders</span></div>
      <button class="hand-btn" id="prm-reset">↺ reset all sliders</button>
    </div>`);
    body.appendChild(top);
    wireDiff(top.querySelector('#gm-diff-set'));
    top.querySelector('#prm-reset').addEventListener('click', () => { M.resetParams(); render(); });

    const groups = {};
    M.PARAM_DEFS.forEach(p => { (groups[p.group] = groups[p.group] || []).push(p); });
    const wrap = el(`<div class="prm-groups"></div>`);
    Object.keys(groups).forEach(gname => {
      const g = el(`<div class="prm-group"><h4>${gname}</h4></div>`);
      groups[gname].forEach(p => {
        const v = P[p.key];
        const changed = M.data().params[p.key] != null;
        const row = el(`<div class="prm-row ${changed ? 'changed' : ''}">
          <label>${p.label}</label>
          <input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${v}">
          <span class="val">${fmtVal(p, v)}</span>
        </div>`);
        const inp = row.querySelector('input');
        inp.addEventListener('input', () => {
          const nv = parseFloat(inp.value);
          M.setParam(p.key, nv);
          row.querySelector('.val').textContent = fmtVal(p, nv);
          row.classList.add('changed');
        });
        g.appendChild(row);
      });
      wrap.appendChild(g);
    });
    body.appendChild(wrap);
    body.appendChild(el(`<div class="gm-note" style="margin-top:10px">changes apply to the NEXT battle · orange = you changed it · difficulty presets multiply on top (easy softens foes, hard sharpens them)</div>`));

    const dz = el(`<div class="gm-danger-zone">
      <h4>Progression</h4>
      <div class="gm-note" style="margin-bottom:8px">${D.plays} battles played · ${M.doneCount()}/${M.CHALLENGES.length} challenges · ${D.acorns} upgrade acorns${D.unlockAll ? ' · <b>everything unlocked</b>' : ''}</div>
      <div class="gm-row">
        <button class="hand-btn" id="gm-unlock-all">★ Unlock everything now</button>
        <button class="hand-btn warn" id="gm-reset-prog">↻ Restart progression</button>
        <span class="gm-note" id="gm-dz-note"></span>
      </div>
    </div>`);
    body.appendChild(dz);
    dz.querySelector('#gm-unlock-all').addEventListener('click', () => {
      M.unlockEverything();
      dz.querySelector('#gm-dz-note').textContent = 'every skill, throw & accessory is now yours ✶';
      setTimeout(render, 900);
    });
    const rp = dz.querySelector('#gm-reset-prog');
    rp.addEventListener('click', () => {
      if (!rp.classList.contains('confirming')) {
        rp.classList.add('confirming');
        rp.textContent = '⚠ really wipe unlocks? click again';
        setTimeout(() => { rp.classList.remove('confirming'); rp.textContent = '↻ Restart progression'; }, 3000);
        return;
      }
      M.resetProgress();
      render();
    });
    body.querySelector('#gm-back').addEventListener('click', () => G.show('home'));
  }

  function renderChallenges() {
    body.innerHTML = '';
    body.appendChild(el(`<div class="gm-sec-head"><button class="gm-back" id="gm-back">← menu</button><div class="gm-sec-title">Challenges</div>
      <div class="gm-note">each one unlocks something — and drops an upgrade acorn 🌰</div></div>`));
    const grid = el(`<div class="ch-grid"></div>`);
    M.CHALLENGES.forEach(ch => {
      const st = M.challengeState(ch.id);
      const card = el(`<div class="ch-card ${st.done ? 'done' : ''}">
        ${st.done ? '<div class="ch-stamp">DONE ✓</div>' : ''}
        <div class="ch-name"><span class="ic">${ch.icon}</span>${ch.name}</div>
        <div class="ch-desc">${ch.desc}</div>
        ${st.prog && !st.done ? `<div class="ch-prog"><div class="fill" style="width:${st.prog.cur / st.prog.max * 100}%"></div></div>
          <div class="ch-prog-label">${st.prog.cur}/${st.prog.max} · ${st.prog.note}</div>` : ''}
        <div class="ch-reward">unlocks: <b>${M.rewardText(ch.id)}</b></div>
      </div>`);
      grid.appendChild(card);
    });
    body.appendChild(grid);
    body.querySelector('#gm-back').addEventListener('click', () => G.show('home'));
  }

  /* ---------------- studio ---------------- */
  function renderStudio() {
    const cust = M.custom(stSp);
    const D = M.data();
    body.innerHTML = '';
    const head = el(`<div class="gm-sec-head"><button class="gm-back" id="gm-back">← menu</button><div class="gm-sec-title">Critter Studio</div>
      <div class="st-side-toggle">
        <button class="st-chip ${stSp === 'sq' ? 'sel' : ''}" data-sp="sq">🐿 squirrel champion</button>
        <button class="st-chip ${stSp === 'sl' ? 'sel' : ''}" data-sp="sl">🦭 seal champion</button>
      </div></div>`);
    body.appendChild(head);
    head.querySelector('#gm-back').addEventListener('click', () => G.show('home'));
    head.querySelectorAll('[data-sp]').forEach(b => b.addEventListener('click', () => { stSp = b.dataset.sp; renderStudio(); }));

    const grid = el(`<div class="st-grid"></div>`);
    /* preview */
    const prev = el(`<div class="st-preview">
      <div class="critter ${stSp}" id="st-critter">${SS.outfits.portrait(stSp, cust)}</div>
      <input class="st-name-input" id="st-name" value="${cust.name.replace(/"/g, '&quot;')}" maxlength="18" spellcheck="false">
      <div class="gm-note">click the name to edit it</div>
      <div class="st-acorns">🌰 <b>${D.acorns}</b> upgrade acorns<br><span class="gm-note">earned from challenges</span></div>
    </div>`);
    grid.appendChild(prev);
    prev.querySelector('#st-name').addEventListener('input', (e) => {
      const v = e.target.value.trim() || (stSp === 'sq' ? 'Captain Hazel' : 'Big Barnacle');
      M.setCustom(stSp, { name: v });
    });

    const ctl = el(`<div></div>`);
    /* color */
    const variants = stSp === 'sq' ? SS.SQ_VARIANTS : SS.SL_VARIANTS;
    const colorBlock = el(`<div class="st-block"><h4>fur &amp; color</h4><div class="sw-row">${variants.map(v =>
      `<div class="sw ${cust.variant === v ? 'sel' : ''}" data-v="${v}" title="${v}" style="background:${SWATCH[stSp][v] || '#999'}"></div>`).join('')}</div></div>`);
    colorBlock.querySelectorAll('.sw').forEach(s => s.addEventListener('click', () => { M.setCustom(stSp, { variant: s.dataset.v }); renderStudio(); }));
    ctl.appendChild(colorBlock);
    /* size */
    const [s0, s1] = SIZE_RANGE[stSp];
    const sizeBlock = el(`<div class="st-block"><h4>size <small>purely a style statement</small></h4>
      <div class="st-size-row"><span class="gm-note">smol</span><input type="range" min="${s0}" max="${s1}" step="2" value="${cust.size}" id="st-size"><span class="gm-note">CHONK</span></div></div>`);
    const sizeInp = sizeBlock.querySelector('#st-size');
    sizeInp.addEventListener('input', () => {
      M.setCustom(stSp, { size: +sizeInp.value });
      const c = prev.querySelector('#st-critter');
      const sc = 0.7 + (+sizeInp.value - s0) / (s1 - s0) * 0.55;
      c.style.transform = `scale(${sc})`;
    });
    const sc0 = 0.7 + (cust.size - s0) / (s1 - s0) * 0.55;
    prev.querySelector('#st-critter').style.transform = `scale(${sc0})`;
    ctl.appendChild(sizeBlock);
    /* expression */
    const faceBlock = el(`<div class="st-block"><h4>resting expression</h4><div class="chip-row">${M.FACES.map(f =>
      `<button class="st-chip ${cust.face === f.id ? 'sel' : ''}" data-f="${f.id}">${f.name}</button>`).join('')}</div></div>`);
    faceBlock.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { M.setCustom(stSp, { face: b.dataset.f }); renderStudio(); }));
    ctl.appendChild(faceBlock);
    /* loadout */
    const loadBlock = el(`<div class="st-block"><h4>battle loadout <small>also pickable at champion select</small></h4>
      <div class="gm-note">special:</div><div class="chip-row" id="st-specials"></div>
      <div class="gm-note" style="margin-top:5px">throw:</div><div class="chip-row" id="st-throws"></div></div>`);
    [['st-specials', M.SPECIALS[stSp], 'special'], ['st-throws', M.THROWS[stSp], 'throw']].forEach(([id, defs, kind]) => {
      const row = loadBlock.querySelector('#' + id);
      defs.forEach(d => {
        const un = M.unlocked(d.unlock);
        const b = el(`<button class="st-chip ${cust[kind] === d.id ? 'sel' : ''}" ${un ? '' : 'disabled style="opacity:.45"'} title="${un ? d.desc : M.unlockHint(d.unlock)}">${un ? '' : '🔒 '}${d.name}</button>`);
        if (un) b.addEventListener('click', () => { M.setCustom(stSp, kind === 'special' ? { special: d.id } : { throw: d.id }); renderStudio(); });
        row.appendChild(b);
      });
    });
    ctl.appendChild(loadBlock);
    /* accessories */
    [['hat', 'hats'], ['neck', 'neckwear'], ['face', 'face bits']].forEach(([slot, label]) => {
      const key = slot === 'face' ? 'faceAcc' : slot;
      const blockEl = el(`<div class="st-block"><h4>${label}</h4><div class="acc-grid"></div></div>`);
      const gridEl = blockEl.querySelector('.acc-grid');
      const noneCell = el(`<div class="acc-cell ${cust[key] === 'none' ? 'sel' : ''}"><svg viewBox="0 0 60 60"><path class="ink ink-thin" d="M 18 30 L 42 30" opacity="0.4"/></svg><span class="an">none</span></div>`);
      noneCell.addEventListener('click', () => { M.setCustom(stSp, { [key]: 'none' }); renderStudio(); });
      gridEl.appendChild(noneCell);
      M.ACCS.filter(a => a.slot === slot).forEach(a => {
        const un = M.unlocked(a.unlock);
        const cell = el(`<div class="acc-cell ${cust[key] === a.id ? 'sel' : ''} ${un ? '' : 'locked'}">
          ${un ? '' : '<span class="lock">🔒</span>'}
          ${SS.outfits.accPreview(stSp, a)}
          <span class="an">${a.name}</span>
          ${un ? '' : `<span class="hint">${M.unlockHint(a.unlock)}</span>`}
        </div>`);
        if (un) cell.addEventListener('click', () => { M.setCustom(stSp, { [key]: a.id }); renderStudio(); });
        gridEl.appendChild(cell);
      });
      ctl.appendChild(blockEl);
    });
    /* upgrades */
    const upBlock = el(`<div class="st-block"><h4>upgrades <small>1 🌰 each · apply to this champion in every mode</small></h4><div class="up-row"></div></div>`);
    const upRow = upBlock.querySelector('.up-row');
    M.UPS.forEach(up => {
      const lvl = cust[up.key] || 0;
      const pips = '●'.repeat(lvl) + '○'.repeat(up.max - lvl);
      const card = el(`<div class="up-card"><div class="un">+${Math.round(up.per * 100)}% ${up.name}</div><div class="pips">${pips}</div>
        <button ${lvl >= up.max || D.acorns < 1 ? 'disabled' : ''}>${lvl >= up.max ? 'maxed!' : 'spend 1 🌰'}</button></div>`);
      card.querySelector('button').addEventListener('click', () => { if (M.buyUp(stSp, up.key)) renderStudio(); });
      upRow.appendChild(card);
    });
    ctl.appendChild(upBlock);

    grid.appendChild(ctl);
    body.appendChild(grid);
  }

  function render() {
    if (curSection === 'settings') renderSettings();
    else if (curSection === 'audio') SS.audio.render(body, () => G.show('home'));
    else if (curSection === 'challenges') renderChallenges();
    else if (curSection === 'studio') renderStudio();
    else renderHome();
    root.scrollTop = 0;
    const panel = root.querySelector('.gm-panel');
    if (panel) panel.scrollTop = 0;
  }

  /* ================= init ================= */
  G.init = () => {
    root = el(`<div class="gm-overlay" id="game-menu" data-screen-label="Game menu"><div class="gm-panel"></div></div>`);
    document.body.appendChild(root);
    body = root.querySelector('.gm-panel');
    /* top-bar menu button */
    const btnMenu = document.getElementById('btn-menu');
    if (btnMenu) btnMenu.addEventListener('click', () => G.show('home'));
    const btnQuit = document.getElementById('btn-quit');
    if (btnQuit) btnQuit.addEventListener('click', () => G.toMenu());
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && root.classList.contains('on') && W.state === 'playground') G.hide();
    });
    G.show('home');
  };
})();

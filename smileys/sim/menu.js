/* =====================================================================
   GAME SHELL — main menu, settings/balance, challenges, smiley studio,
   chapter jumps, world reset. window.SIM.game
   ===================================================================== */
(function () {
  window.SIM = window.SIM || {};
  const G = {};
  SIM.game = G;

  const TRIBE = { left: '#2f5d86', right: '#9c3526' };
  const SIZE_RANGE = { left: [110, 200], right: [110, 200] };

  let root = null, body = null;
  let curSection = 'home';
  let stSide = 'left';

  function meta() { return window.SIM && window.SIM.meta; }
  function outfits() { return window.SIM && window.SIM.outfits; }
  function battle() { return window.SIM && window.SIM.battle; }
  function audioUI() { return window.SIM && window.SIM.audioUI; }
  function saga() { return window.__saga; }
  function sfx() { return window.__sfx; }

  function isMidBattle() {
    try {
      const B = battle();
      if (B && typeof B.isActive === 'function' && B.isActive()) return true;
    } catch (e) {}
    try {
      const S = saga();
      if (S && S.combatRunning) return true;
    } catch (e) {}
    return false;
  }

  function isSagaActive() {
    if (document.body.classList.contains('saga-active')) return true;
    try {
      const S = saga();
      if (S && S.state && S.state !== 'playground') return true;
    } catch (e) {}
    return false;
  }

  function unlockSfx() {
    try { if (sfx() && sfx().unlock) sfx().unlock(); } catch (e) {}
  }

  /* ================= world reset ================= */
  G.resetWorld = () => {
    try {
      const S = saga();
      if (S && S.reZero) S.reZero();
    } catch (e) {}
    G.hide();
  };

  G.toMenu = () => {
    try {
      const B = battle();
      if (B && typeof B.isActive === 'function' && B.isActive()) {
        if (B.teardown) B.teardown();
      } else if (isSagaActive()) {
        const S = saga();
        if (S && S.reZero) S.reZero();
      }
    } catch (e) {}
    G.show('home');
  };

  /* ================= mode launchers ================= */
  G.watchStory = () => {
    unlockSfx();
    G.hide();
    try {
      const S = saga();
      if (S && S.startChapter2) S.startChapter2();
    } catch (e) {}
  };

  function startBattleMode(mode) {
    unlockSfx();
    G.hide();
    try {
      const B = battle();
      if (B && B.start) B.start({ mode });
    } catch (e) {}
  }

  G.quickFight = () => startBattleMode('quick');
  G.duel = () => startBattleMode('duel');
  G.autoBattle = () => startBattleMode('auto');

  /** Same transitions as #btn-skip in index.html */
  function sagaSkip(S) {
    const st = S.state;
    if (st === 'playground' && S.startChapter2) S.startChapter2();
    else if (st === 'ch2' && S.startChapter3) S.startChapter3();
    else if (st === 'ch3' && S.startChapter4) S.startChapter4();
  }

  function ensurePlayground(S) {
    if (S.state !== 'playground' && S.reZero) S.reZero();
  }

  G.jumpChapter = (n) => {
    unlockSfx();
    G.hide();
    try {
      const S = saga();
      if (!S) return;
      if (n === 1) { G.resetWorld(); return; }

      ensurePlayground(S);

      if (n === 2) {
        if (S.startChapter2) S.startChapter2();
        return;
      }

      const STEP_MS = 50;

      if (n === 3) {
        if (S.startChapter2) S.startChapter2();
        setTimeout(() => {
          try { sagaSkip(S); } catch (e) { console.warn('[jumpChapter n=3]', e); }
        }, STEP_MS);
        return;
      }

      if (n === 4) {
        if (S.startChapter2) S.startChapter2();
        setTimeout(() => {
          try {
            sagaSkip(S);
            setTimeout(() => {
              try { sagaSkip(S); } catch (e) { console.warn('[jumpChapter n=4 ch4]', e); }
            }, STEP_MS);
          } catch (e) { console.warn('[jumpChapter n=4 ch3]', e); }
        }, STEP_MS);
      }
    } catch (e) { console.warn('[jumpChapter]', e); }
  };

  /* ================= menu chrome ================= */
  G.show = (section) => {
    if (!root) return;
    curSection = section || 'home';
    root.classList.add('on');
    document.body.classList.add('menu-open');
    render();
  };

  G.hide = () => {
    if (!root) return;
    root.classList.remove('on');
    document.body.classList.remove('menu-open');
  };

  function el(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.firstElementChild;
  }

  function squig() {
    return '<svg class="gm-squig" viewBox="0 0 110 8"><path class="ink ink-thin" d="M2 5 Q 15 1, 28 5 T 54 5 T 80 5 T 108 5" fill="none"/></svg>';
  }

  function diffSeg(id) {
    const M = meta();
    if (!M || !M.DIFFS) return '';
    const cur = M.difficulty();
    return '<div class="gm-diff" id="' + id + '">' + Object.keys(M.DIFFS).map(k =>
      '<button data-d="' + k + '" class="' + (cur === k ? 'on' : '') + '">' +
      M.DIFFS[k].label + '<small>' + M.DIFFS[k].sub + '</small></button>'
    ).join('') + '</div>';
  }

  function wireDiff(elx) {
    const M = meta();
    if (!M || !elx) return;
    elx.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      M.setDifficulty(b.dataset.d);
      render();
    }));
  }

  function fmtVal(p, v) {
    if (p.fmt === 'x') return (Math.round(v * 100) / 100) + '×';
    if (p.fmt === 's') return (Math.round(v * 10) / 10) + 's';
    if (p.fmt === '%') return Math.round(v * 100) + '%';
    if (p.fmt === 'int') return String(Math.round(v));
    return String(Math.round(v));
  }

  function subsEnabled() {
    try { return localStorage.getItem('wos-subtitles') !== 'off'; } catch (e) { return true; }
  }

  function toggleSubs() {
    const btn = document.getElementById('btn-subs-global');
    if (btn) btn.click();
  }

  function portraitHtml(side, cust) {
    try {
      const O = outfits();
      if (O && typeof O.portrait === 'function') return O.portrait(side, cust);
    } catch (e) {}
    const name = (cust && cust.name) || side;
    return '<div class="st-fallback">' + name + '</div>';
  }

  function accPreviewHtml(acc) {
    try {
      const O = outfits();
      if (O && typeof O.accPreview === 'function') return O.accPreview(acc);
    } catch (e) {}
    return '<span class="st-fallback">' + (acc && acc.name ? acc.name : '?') + '</span>';
  }

  /* ================= sections ================= */
  function renderHome() {
    const M = meta();
    const D = M ? M.data() : { smiles: 0, plays: 0, wins: 0 };
    const done = M ? M.doneCount() : 0;
    const total = M && M.CHALLENGES ? M.CHALLENGES.length : 0;

    body.innerHTML = '';
    body.appendChild(el(
      '<div class="gm-head-row">' +
        '<div class="gm-title">World of Smileys<small>yards, walls, war — and a lot of bonking</small>' + squig() + '</div>' +
        '<div class="gm-stats"><b>' + (D.smiles || 0) + '</b> smiles<br>' +
        (M ? '<b>' + done + '</b>/' + total + ' challenges · <b>' + (D.plays || 0) + '</b> battles' : '') +
        '<br><span class="gm-note">progress saves in this browser</span></div>' +
      '</div>'
    ));

    const grid = el('<div class="gm-home-grid"></div>');
    const mk = (t, s, fn, primary) => {
      const b = el('<button class="gm-big' + (primary ? ' primary' : '') + '"><span class="t">' + t + '</span><span class="s">' + s + '</span></button>');
      b.addEventListener('click', fn);
      grid.appendChild(b);
    };
    mk('▶ Watch Story', 'yards, build, war — pick a champion when the armies clash', G.watchStory, true);
    mk('✶ Quick Fight', 'straight to champion select · you + your army vs theirs', G.quickFight);
    mk('⚑ Duel 2P', 'champion vs champion, one keyboard', G.duel);
    mk('☁ Auto Battle', 'sit back, watch the armies, maybe place a bet', G.autoBattle);
    body.appendChild(grid);

    const jumps = el(
      '<div class="gm-foot gm-chapters">' +
        '<span class="gm-ch-label">jump to a scene:</span>' +
        '<button class="gm-btn" data-ch="1">I · Playground</button>' +
        '<button class="gm-btn" data-ch="2">II · Build</button>' +
        '<button class="gm-btn" data-ch="3">III · War</button>' +
        '<button class="gm-btn" data-ch="4">IV · Ending</button>' +
      '</div>'
    );
    jumps.querySelectorAll('[data-ch]').forEach(b => b.addEventListener('click', () => G.jumpChapter(+b.dataset.ch)));
    body.appendChild(jumps);

    const foot = el(
      '<div class="gm-foot gm-nav">' +
        '<button class="gm-btn" id="gm-challenges">Challenges <span class="gm-badge">' + done + '/' + total + '</span></button>' +
        '<button class="gm-btn" id="gm-studio">Studio</button>' +
        '<button class="gm-btn" id="gm-settings">Settings</button>' +
        '<button class="gm-btn" id="gm-audio">Sound Studio</button>' +
      '</div>'
    );
    foot.querySelector('#gm-challenges').addEventListener('click', () => G.show('challenges'));
    foot.querySelector('#gm-studio').addEventListener('click', () => G.show('studio'));
    foot.querySelector('#gm-settings').addEventListener('click', () => G.show('settings'));
    foot.querySelector('#gm-audio').addEventListener('click', () => G.show('audio'));
    body.appendChild(foot);
  }

  function renderSettings() {
    const M = meta();
    if (!M) {
      body.innerHTML = '<div class="gm-note">Settings unavailable — meta module not loaded.</div>';
      return;
    }
    const D = M.data();
    const changed = M.paramChangedCount ? M.paramChangedCount() : 0;

    body.innerHTML = '';
    body.appendChild(el(
      '<div class="gm-sec-head">' +
        '<button class="gm-back" id="gm-back">← menu</button>' +
        '<div class="gm-sec-title">Settings</div>' +
      '</div>'
    ));

    const top = el(
      '<div class="gm-row gm-set-top">' +
        '<div class="gm-row">difficulty: ' + diffSeg('gm-diff-set') + '</div>' +
        '<span class="gm-note">' + changed + ' slider' + (changed === 1 ? '' : 's') + ' changed</span>' +
        '<button class="gm-btn" id="prm-reset">↺ reset params</button>' +
      '</div>'
    );
    body.appendChild(top);
    wireDiff(top.querySelector('#gm-diff-set'));
    top.querySelector('#prm-reset').addEventListener('click', () => { M.resetParams(); render(); });

    const subsRow = el(
      '<div class="gm-row gm-subs-row">' +
        '<span>subtitles:</span>' +
        '<button class="gm-btn' + (subsEnabled() ? ' on' : '') + '" id="gm-subs-toggle">' +
          (subsEnabled() ? 'on' : 'off') +
        '</button>' +
        '<span class="gm-note">same as the 💬 button top-right</span>' +
      '</div>'
    );
    subsRow.querySelector('#gm-subs-toggle').addEventListener('click', () => {
      toggleSubs();
      render();
    });
    body.appendChild(subsRow);

    const P = M.params();
    const groups = {};
    M.PARAM_DEFS.forEach(p => { (groups[p.group] = groups[p.group] || []).push(p); });
    const wrap = el('<div class="prm-groups"></div>');
    Object.keys(groups).forEach(gname => {
      const g = el('<div class="prm-group"><h4>' + gname + '</h4></div>');
      groups[gname].forEach(p => {
        const v = P[p.key];
        const changedP = D.params[p.key] != null;
        const row = el(
          '<div class="prm-row' + (changedP ? ' changed' : '') + '">' +
            '<label>' + p.label + '</label>' +
            '<input type="range" min="' + p.min + '" max="' + p.max + '" step="' + p.step + '" value="' + v + '">' +
            '<span class="val">' + fmtVal(p, v) + '</span>' +
          '</div>'
        );
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
    body.appendChild(el('<div class="gm-note gm-set-note">changes apply to the NEXT battle · orange = you changed it · difficulty presets multiply on top</div>'));

    const dz = el(
      '<div class="gm-danger-zone">' +
        '<h4>Progression</h4>' +
        '<div class="gm-note gm-dz-stats">' + (D.plays || 0) + ' battles · ' + M.doneCount() + '/' + M.CHALLENGES.length +
          ' challenges · ' + (D.smiles || 0) + ' smiles' + (D.unlockAll ? ' · <b>everything unlocked</b>' : '') + '</div>' +
        '<div class="gm-row">' +
          '<button class="gm-btn" id="gm-unlock-all">★ Unlock everything</button>' +
          '<button class="gm-btn warn" id="gm-reset-prog">↻ Reset progress</button>' +
          '<span class="gm-note" id="gm-dz-note"></span>' +
        '</div>' +
      '</div>'
    );
    body.appendChild(dz);
    dz.querySelector('#gm-unlock-all').addEventListener('click', () => {
      M.unlockEverything();
      dz.querySelector('#gm-dz-note').textContent = 'every skill, throw & accessory is now yours';
      setTimeout(render, 900);
    });
    const rp = dz.querySelector('#gm-reset-prog');
    rp.addEventListener('click', () => {
      if (!rp.classList.contains('confirming')) {
        rp.classList.add('confirming');
        rp.textContent = '⚠ really wipe unlocks? click again';
        setTimeout(() => { rp.classList.remove('confirming'); rp.textContent = '↻ Reset progress'; }, 3000);
        return;
      }
      M.resetProgress();
      render();
    });
    body.querySelector('#gm-back').addEventListener('click', () => G.show('home'));
  }

  function renderChallenges() {
    const M = meta();
    if (!M) {
      body.innerHTML = '<div class="gm-note">Challenges unavailable.</div>';
      return;
    }
    body.innerHTML = '';
    body.appendChild(el(
      '<div class="gm-sec-head">' +
        '<button class="gm-back" id="gm-back">← menu</button>' +
        '<div class="gm-sec-title">Challenges</div>' +
        '<div class="gm-note">each one unlocks something — and drops a smile</div>' +
      '</div>'
    ));
    const grid = el('<div class="ch-grid"></div>');
    M.CHALLENGES.forEach(ch => {
      const st = M.challengeState(ch.id);
      let progHtml = '';
      if (st.prog && !st.done) {
        progHtml =
          '<div class="ch-prog"><div class="fill" style="width:' + (st.prog.cur / st.prog.max * 100) + '%"></div></div>' +
          '<div class="ch-prog-label">' + st.prog.cur + '/' + st.prog.max + ' · ' + st.prog.note + '</div>';
      }
      const card = el(
        '<div class="ch-card' + (st.done ? ' done' : '') + '">' +
          (st.done ? '<div class="ch-stamp">DONE ✓</div>' : '') +
          '<div class="ch-name"><span class="ic">' + (ch.icon || '✶') + '</span>' + ch.name + '</div>' +
          '<div class="ch-desc">' + ch.desc + '</div>' +
          progHtml +
          '<div class="ch-reward">unlocks: <b>' + M.rewardText(ch.id) + '</b></div>' +
        '</div>'
      );
      grid.appendChild(card);
    });
    body.appendChild(grid);
    body.querySelector('#gm-back').addEventListener('click', () => G.show('home'));
  }

  function renderStudio() {
    const M = meta();
    if (!M) {
      body.innerHTML = '<div class="gm-note">Studio unavailable.</div>';
      return;
    }
    const cust = M.custom(stSide);
    const D = M.data();
    const sideColor = TRIBE[stSide];

    body.innerHTML = '';
    const head = el(
      '<div class="gm-sec-head gm-studio-head">' +
        '<button class="gm-back" id="gm-back">← menu</button>' +
        '<div class="gm-sec-title">Smiley Studio</div>' +
        '<div class="st-side-toggle">' +
          '<button class="st-chip st-left' + (stSide === 'left' ? ' sel' : '') + '" data-side="left">west champion</button>' +
          '<button class="st-chip st-right' + (stSide === 'right' ? ' sel' : '') + '" data-side="right">east champion</button>' +
        '</div>' +
      '</div>'
    );
    body.appendChild(head);
    head.querySelector('#gm-back').addEventListener('click', () => G.show('home'));
    head.querySelectorAll('[data-side]').forEach(b => b.addEventListener('click', () => {
      stSide = b.dataset.side;
      renderStudio();
    }));

    const grid = el('<div class="st-grid"></div>');
    const prev = el(
      '<div class="st-preview" style="--tribe:' + sideColor + '">' +
        '<div class="st-portrait" id="st-portrait">' + portraitHtml(stSide, cust) + '</div>' +
        '<input class="st-name-input" id="st-name" value="' + String(cust.name).replace(/"/g, '&quot;') + '" maxlength="18" spellcheck="false">' +
        '<div class="gm-note">click the name to edit it</div>' +
        '<div class="st-smiles">☺ <b>' + (D.smiles || 0) + '</b> smiles<br><span class="gm-note">earned from challenges & wins</span></div>' +
      '</div>'
    );
    grid.appendChild(prev);
    prev.querySelector('#st-name').addEventListener('input', (e) => {
      const v = e.target.value.trim() || (stSide === 'left' ? 'Sarge Sunny' : 'Archmage Beam');
      M.setCustom(stSide, { name: v });
    });

    const ctl = el('<div class="st-controls"></div>');
    const [s0, s1] = SIZE_RANGE[stSide];
    const sizeBlock = el(
      '<div class="st-block"><h4>size <small>purely a style statement</small></h4>' +
        '<div class="st-size-row"><span class="gm-note">smol</span>' +
        '<input type="range" min="' + s0 + '" max="' + s1 + '" step="2" value="' + cust.size + '" id="st-size">' +
        '<span class="gm-note">CHONK</span></div></div>'
    );
    const sizeInp = sizeBlock.querySelector('#st-size');
    sizeInp.addEventListener('input', () => {
      M.setCustom(stSide, { size: +sizeInp.value });
      const sc = 0.7 + (+sizeInp.value - s0) / (s1 - s0) * 0.55;
      const p = prev.querySelector('#st-portrait');
      if (p) p.style.transform = 'scale(' + sc + ')';
    });
    const sc0 = 0.7 + (cust.size - s0) / (s1 - s0) * 0.55;
    prev.querySelector('#st-portrait').style.transform = 'scale(' + sc0 + ')';
    ctl.appendChild(sizeBlock);

    const faceBlock = el('<div class="st-block"><h4>face</h4><div class="st-face-grid"></div></div>');
    const faceGrid = faceBlock.querySelector('.st-face-grid');
    M.FACES.forEach(f => {
      const b = el('<button class="st-face' + (cust.face === f.id ? ' sel' : '') + '" data-f="' + f.id + '" title="' + f.name + '">' + f.name + '</button>');
      b.addEventListener('click', () => { M.setCustom(stSide, { face: f.id }); renderStudio(); });
      faceGrid.appendChild(b);
    });
    ctl.appendChild(faceBlock);

    [['hat', 'hats'], ['neck', 'neckwear'], ['face', 'face bits']].forEach(([slot, label]) => {
      const key = slot === 'face' ? 'faceAcc' : slot;
      const blockEl = el('<div class="st-block"><h4>' + label + '</h4><div class="acc-grid"></div></div>');
      const gridEl = blockEl.querySelector('.acc-grid');
      const noneCell = el('<div class="acc-cell' + (cust[key] === 'none' ? ' sel' : '') + '"><svg viewBox="0 0 60 60"><path class="ink ink-thin" d="M 18 30 L 42 30" opacity="0.4"/></svg><span class="an">none</span></div>');
      noneCell.addEventListener('click', () => { M.setCustom(stSide, { [key]: 'none' }); renderStudio(); });
      gridEl.appendChild(noneCell);
      M.ACCS.filter(a => a.slot === slot).forEach(a => {
        const un = M.unlocked(a.unlock);
        const cell = el(
          '<div class="acc-cell' + (cust[key] === a.id ? ' sel' : '') + (un ? '' : ' locked') + '">' +
            (un ? '' : '<span class="lock">🔒</span>') +
            accPreviewHtml(a) +
            '<span class="an">' + a.name + '</span>' +
            (un ? '' : '<span class="hint">' + M.unlockHint(a.unlock) + '</span>') +
          '</div>'
        );
        if (un) cell.addEventListener('click', () => { M.setCustom(stSide, { [key]: a.id }); renderStudio(); });
        gridEl.appendChild(cell);
      });
      ctl.appendChild(blockEl);
    });

    const loadBlock = el(
      '<div class="st-block"><h4>battle loadout</h4>' +
        '<div class="gm-note">special:</div><div class="chip-row" id="st-specials"></div>' +
        '<div class="gm-note st-load-gap">throw:</div><div class="chip-row" id="st-throws"></div></div>'
    );
    [['st-specials', M.SPECIALS[stSide], 'special'], ['st-throws', M.THROWS[stSide], 'throw']].forEach(([id, defs, kind]) => {
      const row = loadBlock.querySelector('#' + id);
      (defs || []).forEach(d => {
        const un = M.unlocked(d.unlock);
        const b = el(
          '<button class="st-chip' + (cust[kind] === d.id ? ' sel' : '') + '"' +
          (un ? '' : ' disabled') + ' title="' + (un ? d.desc : M.unlockHint(d.unlock)) + '">' +
          (un ? '' : '🔒 ') + d.name + '</button>'
        );
        if (un) b.addEventListener('click', () => { M.setCustom(stSide, kind === 'special' ? { special: d.id } : { throw: d.id }); renderStudio(); });
        row.appendChild(b);
      });
    });
    ctl.appendChild(loadBlock);

    const upBlock = el('<div class="st-block"><h4>upgrades <small>1 smile each · every mode</small></h4><div class="up-row"></div></div>');
    const upRow = upBlock.querySelector('.up-row');
    M.UPS.forEach(up => {
      const lvl = cust[up.key] || 0;
      const pips = '●'.repeat(lvl) + '○'.repeat(up.max - lvl);
      const card = el(
        '<div class="up-card"><div class="un">+' + Math.round(up.per * 100) + '% ' + up.name + '</div>' +
        '<div class="pips">' + pips + '</div>' +
        '<button' + (lvl >= up.max || (D.smiles || 0) < 1 ? ' disabled' : '') + '>' +
          (lvl >= up.max ? 'maxed!' : 'spend 1 smile') +
        '</button></div>'
      );
      card.querySelector('button').addEventListener('click', () => { if (M.buyUp(stSide, up.key)) renderStudio(); });
      upRow.appendChild(card);
    });
    ctl.appendChild(upBlock);

    grid.appendChild(ctl);
    body.appendChild(grid);
  }

  function renderAudio() {
    body.innerHTML = '';
    body.appendChild(el(
      '<div class="gm-sec-head">' +
        '<button class="gm-back" id="gm-back">← menu</button>' +
        '<div class="gm-sec-title">Sound Studio</div>' +
      '</div>'
    ));
    const A = audioUI();
    if (A && typeof A.render === 'function') {
      A.render(body, () => G.show('home'));
    } else {
      body.appendChild(el('<div class="gm-note">Sound studio module not loaded yet.</div>'));
    }
    const back = body.querySelector('#gm-back');
    if (back) back.addEventListener('click', () => G.show('home'));
  }

  function render() {
    if (!body) return;
    if (curSection === 'settings') renderSettings();
    else if (curSection === 'audio') renderAudio();
    else if (curSection === 'challenges') renderChallenges();
    else if (curSection === 'studio') renderStudio();
    else renderHome();
    if (root) root.scrollTop = 0;
    const panel = root && root.querySelector('.gm-panel');
    if (panel) panel.scrollTop = 0;
  }

  function placeMenuButton(btn) {
    const anchor = document.getElementById('btn-mute-global');
    if (anchor && anchor.parentElement && anchor.parentElement !== document.body) {
      anchor.parentElement.appendChild(btn);
      return;
    }
    btn.id = 'btn-menu-global';
    btn.style.cssText =
      'position:fixed;top:20px;right:660px;z-index:1000;font-family:Caveat,cursive;font-size:18px;' +
      'padding:6px 14px;background:rgba(241,234,214,0.7);color:var(--ink);border:1.5px solid var(--ink);' +
      'border-radius:12px;cursor:pointer;transform:rotate(-1deg);';
    document.body.appendChild(btn);
  }

  /* ================= init ================= */
  G.init = () => {
    root = el('<div class="gm-overlay" id="sim-game-menu" data-screen-label="Game menu"><div class="gm-panel"></div></div>');
    document.body.appendChild(root);
    body = root.querySelector('.gm-panel');

    const btnMenu = el('<button type="button">☰ Menu</button>');
    btnMenu.addEventListener('click', () => G.show('home'));
    placeMenuButton(btnMenu);

    try {
      const A = audioUI();
      if (A && typeof A.init === 'function') A.init();
    } catch (e) {}

    try {
      const F = window.SIM && SIM.food;
      if (F && typeof F.startReplenish === 'function') F.startReplenish();
    } catch (e) {}

    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || isMidBattle()) return;
      if (root.classList.contains('on')) G.hide();
      else G.show('home');
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', G.init);
  } else {
    G.init();
  }
})();

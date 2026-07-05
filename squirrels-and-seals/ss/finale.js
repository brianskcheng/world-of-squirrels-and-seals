/* =====================================================================
   CHAPTER FOUR — The Tide Returns
   The Old Otter of the Estuary rises with the moon, un-bonks everyone,
   reveals where the acorns went, and the wall becomes a picnic.
   ===================================================================== */
(function () {
  const rand = SS.rand, pick = SS.pick;
  const W = SS.world;
  const F = {};
  SS.finale = F;

  let timers = [];
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const rep = (fn, ms) => { const t = setInterval(fn, ms); timers.push(t); return t; };
  const clearAll = () => { timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = []; };

  let otterEl = null;
  let sparkleT = null;
  let reachedFeast = false;

  /* ---------------- the Old Otter ---------------- */
  function makeOtter() {
    const d = document.createElement('div');
    d.className = 'fx-abs';
    const w = Math.min(W.vh() * 0.52, 480);
    d.style.width = w + 'px'; d.style.height = w * 1.1 + 'px';
    d.style.left = (W.vw() * 0.76 - w / 2) + 'px';
    d.style.top = '105vh';
    d.style.zIndex = 36;
    d.style.transition = 'top 4s cubic-bezier(.3,.6,.3,1), opacity 2s ease';
    d.style.filter = 'drop-shadow(0 0 34px rgba(255,244,200,0.55))';
    d.innerHTML = `<svg viewBox="0 0 200 220" style="width:100%;height:100%;overflow:visible">
      <circle cx="100" cy="80" r="86" fill="rgba(255,248,214,0.35)"/>
      <circle cx="100" cy="80" r="64" fill="rgba(255,248,214,0.4)"/>
      <!-- shoulders -->
      <path class="ink" d="M 34 220 C 30 160, 56 128, 100 128 C 144 128, 170 160, 166 220" fill="rgba(150,108,60,0.22)"/>
      <!-- paws held together -->
      <circle class="ink" cx="86" cy="176" r="13" fill="rgba(255,250,232,0.85)"/>
      <circle class="ink" cx="114" cy="176" r="13" fill="rgba(255,250,232,0.85)"/>
      <path class="ink ink-thin" d="M 82 170 l 0 6 M 90 169 l 0 7 M 110 169 l 0 7 M 118 170 l 0 6" opacity="0.5"/>
      <!-- ears -->
      <circle class="ink" cx="56" cy="34" r="11" fill="rgba(150,108,60,0.28)"/>
      <circle class="ink" cx="144" cy="34" r="11" fill="rgba(150,108,60,0.28)"/>
      <circle cx="56" cy="35" r="4" fill="rgba(74,50,38,0.25)"/>
      <circle cx="144" cy="35" r="4" fill="rgba(74,50,38,0.25)"/>
      <!-- head -->
      <circle class="ink" cx="100" cy="78" r="54" fill="rgba(150,108,60,0.24)" stroke-width="3"/>
      <!-- old fuzz -->
      <path class="ink ink-thin" d="M 58 100 q 4 3 8 2 M 134 100 q 4 3 8 2 M 64 108 q 4 3 8 2 M 128 108 q 4 3 8 2" opacity="0.5"/>
      <!-- muzzle -->
      <ellipse class="ink ink-thin" cx="100" cy="102" rx="27" ry="20" fill="rgba(255,250,232,0.9)"/>
      <path class="ink ink-fill" d="M 92 88 C 92 84 108 84 108 88 C 108 93 100 96 100 96 C 100 96 92 93 92 88 Z"/>
      <path class="ink" d="M 100 96 L 100 103 M 92 108 Q 100 114, 108 108" fill="none" stroke-width="2.6"/>
      <!-- kind closed eyes + old brows -->
      <path class="ink" d="M 66 74 Q 76 82, 86 74" stroke-width="3.4" fill="none"/>
      <path class="ink" d="M 114 74 Q 124 82, 134 74" stroke-width="3.4" fill="none"/>
      <path class="ink ink-thin" d="M 64 62 q 10 -6 22 -3 M 114 59 q 12 -3 22 3" opacity="0.75"/>
      <!-- great whisker fan -->
      <path class="ink ink-thin" d="M 74 100 L 30 88 M 74 106 L 28 106 M 76 112 L 34 124 M 126 100 L 170 88 M 126 106 L 172 106 M 124 112 L 166 124" opacity="0.85"/>
      <circle cx="72" cy="96" r="5.5" fill="rgba(200,120,90,0.22)"/>
      <circle cx="128" cy="96" r="5.5" fill="rgba(200,120,90,0.22)"/>
    </svg>`;
    document.getElementById('fx-layer').appendChild(d);
    return d;
  }

  function sparkleRain(on) {
    if (!on) { if (sparkleT) { clearInterval(sparkleT); sparkleT = null; } return; }
    sparkleT = rep(() => {
      const s = document.createElement('div');
      s.className = 'fx-abs';
      s.textContent = pick(['✦', '✧', '⋆']);
      s.style.color = 'rgba(214,178,90,0.9)';
      s.style.fontSize = rand(12, 24) + 'px';
      s.style.left = rand(0, W.vw()) + 'px';
      s.style.top = '-30px';
      s.style.zIndex = 45;
      s.style.transition = `top ${rand(2.4, 4)}s linear, opacity 1s ease ${rand(1.6, 2.6)}s, transform 3s ease`;
      document.getElementById('fx-layer').appendChild(s);
      SS.tick(() => {
        s.style.top = rand(W.vh() * 0.5, W.vh() * 0.95) + 'px';
        s.style.transform = `translateX(${rand(-40, 40)}px) rotate(${rand(-90, 90)}deg)`;
        s.style.opacity = '0';
      });
      setTimeout(() => s.remove(), 4200);
    }, 130);
  }

  const otterSay = (text, onDone) => W.narrate(text, 'god', 'The Old Otter of the Estuary', onDone);

  /* ---------------- beats ---------------- */
  function beatQuiet(next) {
    W.setMood('dusk');
    W.banner(null);
    W.narrate('When the dust settled, the meadow was very full of very dizzy critters. And the tide came in quietly, the way it always does.', 'narrator', null, () => later(next, 800));
  }

  function beatOtterRises(next) {
    W.setMood('night');
    if (window.__sfx) { window.__sfx.divineChoir && window.__sfx.divineChoir(); window.__sfx.startPeaceHum && window.__sfx.startPeaceHum(); }
    otterEl = makeOtter();
    SS.tick(() => { otterEl.style.top = (W.vh() * 0.06) + 'px'; });
    later(() => {
      W.narrate('But tonight, the tide brought something extra.', 'narrator', null, () => {
        otterSay('…Little ones.', () => {
          // survivors look up, startled
          W.critters.forEach(c => {
            if (c.alive) {
              c.face('r');
              c.flashFace('normal', 'o', 3000);
              if (Math.random() < 0.3) c.say('!!', 1200, { silent: true });
            }
          });
          later(next, 600);
        });
      });
    }, 2600);
  }

  function beatScolding(next) {
    otterSay('You built a wall out of a lost lunch.', () => {
      otterSay('Squirrels bury acorns, and forget where. Tides borrow fish, and bring them back. Nothing was stolen here — except all the afternoons you used to share.', () => later(next, 500));
    });
  }

  function beatRevival(next) {
    otterSay('Up you get. All of you.', () => {
      sparkleRain(true);
      const bonked = W.critters.filter(c => !c.alive && c.el.isConnected);
      bonked.forEach((c, i) => {
        later(() => {
          c.setBonked(false);
          c.setHp(1);
          c.oneShot('jump', 740);
          c.flashFace('happy', 'open', 2000);
          if (window.__sfx && i % 2 === 0) window.__sfx.healChime();
          if (Math.random() < 0.35) c.say(pick(['…whuh?', 'i feel great??', 'best nap ever', 'was i bonked?']), 1800);
        }, 300 + i * 340);
      });
      later(() => { sparkleRain(false); next(); }, 900 + bonked.length * 340 + 1200);
    });
  }

  function beatReveal(next) {
    otterSay('And — a small thing. Your three hundred acorns are under the big flat rock. You buried them yourselves, in spring. You were very proud of the hiding spot.', () => {
      const sqs = W.critters.filter(c => c.species === 'sq' && c.alive);
      const sls = W.critters.filter(c => c.species === 'sl' && c.alive);
      if (sqs[0]) sqs[0].say('...oops.', 2400);
      sqs.forEach(c => c.flashFace('closed', 'frown', 2600));
      later(() => {
        sls.forEach(c => {
          c.setAction('clap');
          c.flashFace('happy', 'open', 2600);
          later(() => { if (c.alive) c.setAction('idle'); }, 2600);
        });
        if (sls[0]) sls[0].say('AH HA HA HA', 2200);
        if (window.__sfx) window.__sfx.speak('a ha ha ha', 'water');
      }, 1800);
      later(next, 4400);
    });
  }

  function beatBlessing(next) {
    otterSay('Now. The planks of your silly wall would make a very long picnic table. And the sea is FULL of fish tonight. Get to it.', () => {
      later(next, 400);
    });
  }

  function beatFeast(next) {
    reachedFeast = true;
    W.setMood('dawn');
    if (window.__sfx) { window.__sfx.stopPeaceHum && window.__sfx.stopPeaceHum(); window.__sfx.startMusic('happy', { volume: 0.34 }); }
    // the otter sinks back with the moon
    if (otterEl) {
      otterEl.style.transition = 'top 5s ease, opacity 4s ease';
      otterEl.style.top = '108vh'; otterEl.style.opacity = '0';
      later(() => { if (otterEl) otterEl.remove(); otterEl = null; }, 5200);
    }
    // picnic table down the tideline (wall planks, reborn)
    const table = document.createElement('div');
    table.className = 'fx-abs';
    const th = W.groundBot() - W.groundTop() - 40;
    table.style.width = '120px'; table.style.height = th + 'px';
    table.style.left = (W.tidelineX() - 60) + 'px';
    table.style.top = (W.groundTop() + 16) + 'px';
    table.style.zIndex = 8;
    let rows = '';
    for (let i = 0; i < 5; i++) {
      const y = 30 + i * (200 / 5);
      rows += `<path class="ink ink-thin" d="M 18 ${y} L 102 ${y} M 22 ${y + 8} L 98 ${y + 8}" opacity="0.6"/>`;
    }
    table.innerHTML = `<svg viewBox="0 0 120 240" preserveAspectRatio="none" style="width:100%;height:100%">
      <path class="ink" d="M 14 12 L 106 12 L 110 228 L 10 228 Z" fill="rgba(150,118,80,0.22)"/>
      ${rows}
    </svg>`;
    table.style.opacity = '0';
    table.style.transition = 'opacity 1.2s ease';
    document.getElementById('build-layer').appendChild(table);
    SS.tick(() => { table.style.opacity = '1'; });

    // food everywhere along the table + shore
    for (let i = 0; i < 10; i++) {
      later(() => {
        const y = rand(W.groundTop() + 40, W.groundBot() - 10);
        W.spawnFood(i % 2 ? 'acorn' : 'fish', W.tidelineX() + rand(-90, 90), y);
      }, i * 220);
    }
    for (let i = 0; i < 8; i++) {
      later(() => {
        const p = W.randGround(0.08, 0.92);
        W.spawnFood(Math.random() < 0.5 ? 'acorn' : 'fish', p.x, p.y);
      }, 2200 + i * 300);
    }
    // everybody to the table
    W.critters.forEach((c, i) => {
      if (!c.alive) return;
      later(() => {
        const y = rand(W.groundTop() + 50, W.groundBot() - 10);
        c.moveTo(W.tidelineX() + (Math.random() < 0.5 ? -1 : 1) * rand(60, 220), y, c.species === 'sq' ? 130 : 80, () => {
          c.setFace('happy', 'smile');
          if (Math.random() < 0.5) c.setAction(pick(['dance', 'clap', 'cheer']));
          later(() => { if (c.alive) c.setAction('idle'); }, rand(1800, 3200));
        });
      }, 600 + i * 260);
    });
    rep(() => {
      const c = pick(W.critters.filter(x => x.alive));
      if (c) {
        const r = c.el.getBoundingClientRect();
        SS.fx.heart(r.left + r.width / 2, r.top);
      }
    }, 1300);
    W.narrate('So the wall became a table, which is mostly what walls are, if you lay them down and add snacks.', 'narrator', null, () => later(next, 1200));
  }

  function beatEnd() {
    document.getElementById('saga-hud').style.display = 'none';
    W.showMsg('The End', 'the meadow and the shore were never really two places');
    if (window.__sfx) window.__sfx.fanfare();
    W.showChoices([
      { label: '↻ Tell it again', small: 'back to the very beginning', fn: () => location.reload() },
      { label: '⚑ Back to the menu', small: 'modes, challenges, the studio', fn: () => { if (SS.game) SS.game.toMenu(); } },
      { label: '♡ Stay a while', small: 'let them enjoy the picnic', fn: () => {
          W.hideMsg();
          W.state = 'done';
          // seals try acorns, squirrels try fish — forever
          SS.playground.startPeace();
          later(() => {
            const sq = pick(W.critters.filter(c => c.species === 'sq' && c.alive));
            const sl = pick(W.critters.filter(c => c.species === 'sl' && c.alive));
            if (sq) sq.say('fish is… actually pretty good??', 2600);
            if (sl) later(() => sl.say('acorns are crunchy little miracles', 2600), 1600);
          }, 2000);
        } }
    ]);
  }

  /* ---------------- entry ---------------- */
  F.start = ({ playerWon, playerSide } = {}) => {
    if (W.state === 'finale') return;
    W.state = 'finale';
    W._skipHandler = F.skip;
    reachedFeast = false;
    clearAll();

    W.curtainTransition({
      num: 'CHAPTER FOUR', name: 'The Tide Returns',
      sub: 'in which nobody stays bonked',
      holdMs: 3200,
      onMid: () => {
        W.hideMsg(); W.hideChoices();
        document.getElementById('war-banner').classList.remove('show');
      },
      onUp: () => {
        const chain = [beatQuiet, beatOtterRises, beatScolding];
        // a personal word for the player, win or lose (skipped on scene-jumps)
        if (playerWon != null) chain.push((next) => {
          otterSay(playerWon
            ? 'And you, with the busy paws — yes, you. You bonked very well tonight. I was watching. I was not impressed.'
            : 'And you, with the busy paws — you fought hard and got flattened anyway. That is how most wars go. Remember it.', () => later(next, 400));
        });
        chain.push(beatRevival, beatReveal, beatBlessing, beatFeast, beatEnd);
        let i = 0;
        const run = () => { if (W.state !== 'finale') return; const b = chain[i++]; if (b) b(run); };
        run();
      }
    });
  };

  F.abort = () => {
    clearAll();
    sparkleRain(false);
    if (otterEl) { otterEl.remove(); otterEl = null; }
    reachedFeast = false;
  };

  F.skip = () => {
    if (W.state !== 'finale' || reachedFeast) return;
    clearAll();
    W.stopSpeech();
    sparkleRain(false);
    if (otterEl) { otterEl.remove(); otterEl = null; }
    // revive everyone instantly
    W.critters.forEach(c => { if (!c.alive && c.el.isConnected) { c.setBonked(false); c.setHp(1); } });
    beatFeast(() => beatEnd());
  };
})();

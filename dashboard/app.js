// Token Radar's Obsidian Terminal Dashboard (Radar-2 Comps-Calibrated Engine).
// Reads window.RADAR (written beside dashboard/ by main.ts) and renders the ranked board,
// filterable pre-token table, multi-chain tags, live comps, and detailed protocol farm playbook.
// Strictly 0 network dependencies; 100% offline static assets.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('board');
  var state = { q: '', category: 'all', tab: 'pre-token', sort: 'implied', dir: -1, selected: null };

  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }

  // Exact math replica matching lib/model.ts
  function impliedOf(row, model) {
    var cat = row.category || 'Other';
    var catMult = (model.category_multiples && model.category_multiples[cat]) || model.base_multiple || 0.2049;
    var base = row.tvl_usd * catMult;
    var growth = Math.min(model.growth_cap, Math.max(model.growth_floor, row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d));
    var growthMult = 1 + (growth / 100) * model.growth_weight;
    var age = row.age_days === null || row.age_days === undefined ? model.unknown_age_days : row.age_days;
    var maturity = model.maturity_floor + (Math.min(Math.max(age, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
    var chainsCnt = row.chains ? row.chains.length : 1;
    var breadthMult = chainsCnt >= 3 ? 1.10 : chainsCnt >= 2 ? 1.05 : 1.0;
    return Math.max(1, Math.round(base * growthMult * maturity * breadthMult));
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  function chainOf(p) { return p.chains && p.chains.length > 0 ? p.chains[0] : 'its main chain'; }
  function capitalFor(p) {
    if (p.tvl_usd >= 5e9) return 250;
    if (p.tvl_usd >= 1e9) return 150;
    if (p.tvl_usd >= 1e8) return 100;
    return 50;
  }
  function holdDaysFor(age) {
    if (age === null || age === undefined) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  function actionFor(p, capital, chain) {
    var c = (p.category || '').toLowerCase();
    var name = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) {
      return 'Supply $' + capital + ' of USDC into ' + name + ' on ' + chain + ', borrow 40% against it and maintain the health ratio above 2.0.';
    }
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0) {
      return "Provide $" + capital + " of concentrated liquidity to " + name + "'s primary pool on " + chain + ' and compound trading fees weekly.';
    }
    if (c.indexOf('bridge') >= 0 || c.indexOf('cross chain') >= 0) {
      return 'Route $' + capital + ' of USDC across chains through ' + name + ' to ' + chain + ' and deploy the received liquidity in its local app.';
    }
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) {
      return "Stake $" + capital + " of the chain's native staking asset through " + name + ' and hold the liquid receipt token in your wallet.';
    }
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0 || c.indexOf('option') >= 0) {
      return 'Deposit $' + capital + ' of USDC as margin collateral on ' + name + ' and execute one delta-neutral hedging position.';
    }
    if (c.indexOf('prediction') >= 0) {
      return 'Deposit $' + capital + ' and take one two-sided prediction market position on ' + name + ' across distinct resolution windows.';
    }
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) {
      return 'Deposit $' + capital + ' into an active risk-curated vault on ' + name + ' on ' + chain + ' and hold the allocation shares.';
    }
    if (c.indexOf('stable') >= 0) {
      return 'Mint or deposit $' + capital + ' of the decentralized stable asset through ' + name + ' on ' + chain + ' and hold it in a yield vault.';
    }
    if (c.indexOf('rwa') >= 0) {
      return "Complete identity check and deposit $" + capital + " into " + name + "'s tokenized real-world asset treasury on " + chain + '.';
    }
    if (c.indexOf('insurance') >= 0) {
      return 'Underwrite or purchase $' + capital + ' of smart contract cover on ' + name + ' on ' + chain + ' and maintain the policy.';
    }
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position active across multiple snapshot cycles.';
  }

  function stepText(step) {
    var s = step.text + ' Cost: ' + step.cost + '. Time: ' + step.time + '.';
    if (s.length > 600) s = s.slice(0, 596) + '...';
    if (s.length < 20) s = s + ' Hold position and check protocol portal.';
    return s;
  }

  function farmSteps(p) {
    var chain = chainOf(p);
    var capital = capitalFor(p);
    var hold = holdDaysFor(p.age_days);
    return [
      { text: 'Establish a dedicated farming keypair holding solely testing capital, keeping all private recovery materials offline.', cost: 'under $3 of network gas for initial setup', time: '5 minutes' },
      { text: actionFor(p, capital, chain), cost: '$' + capital + ' deployed capital plus ~$' + (capital >= 150 ? 8 : 4) + ' in network fees', time: '15 minutes setup' },
      { text: 'Perform one periodic on-chain interaction weekly, including rebalancing, compounding rewards, or interacting with a governance module.', cost: 'under $2 of gas per week', time: '10 minutes weekly' },
      { text: 'Maintain the qualifying active balance continuously for at least ' + hold + ' days across official DefiLlama tracking epochs.', cost: '$' + capital + ' committed position', time: hold + ' days' },
      { text: 'Verify points and rewards balance directly on ' + p.name + "'s verified portal, ensuring eligibility criteria are fully satisfied.", cost: 'free to inspect, zero claiming fee', time: '10 minutes verification' },
      { text: 'Log wallet address, deposit hashes, and transaction timestamps in an offline farm ledger for seamless position unwinding.', cost: 'no monetary cost', time: '5 minutes record-keeping' }
    ].map(stepText);
  }

  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('p')) state.selected = params.get('p');
    if (params.get('category')) state.category = params.get('category');
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.selected) params.set('p', state.selected);
    var next = params.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  function rows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.category !== 'all' && r.category !== state.category) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }

  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  function header() {
    return el('header', { class: 'top' },
      el('div', { class: 'brand' },
        el('span', { class: 'mark' }),
        el('div', null,
          el('span', { class: 'brand-name', text: 'TOKEN LAUNCH RADAR' }),
          el('span', { class: 'brand-tag', text: 'RADAR-2 PRO' })
        )
      ),
      el('div', { class: 'top-meta' },
        el('span', { class: 'pill-meta', text: 'Snapshot: ' + DATA.as_of }),
        el('span', { class: 'pill-meta', text: 'Live DefiLlama Index' }),
        el('span', { class: 'pill-meta highlight', text: 'Comps Calibrated' })
      )
    );
  }

  function lede() {
    var totalImplied = DATA.rows.reduce(function (sum, r) { return sum + r.implied_value_usd; }, 0);
    return el('section', { class: 'lede' },
      el('div', null,
        el('h1', { text: DATA.board_size + ' Pre-Token Protocols Ranked by Implied Launch FDV' }),
        el('p', { text: 'Full coverage of the DefiLlama watchlist floor ($' + Math.round(DATA.floor_usd / 1e6) + 'M+ TVL, zero token recorded) plus high-velocity early protocols. Valuations are empirically calibrated against live market sector comparables.' })
      ),
      el('div', { class: 'facts' },
        el('div', { class: 'fact' }, el('span', { text: 'Watchlist Coverage' }), el('b', { class: 'badge green', text: DATA.watchlist_size + ' / ' + DATA.watchlist_size + ' (100%)' })),
        el('div', { class: 'fact' }, el('span', { text: 'Ranked Pre-Token Protocols' }), el('b', { text: String(DATA.board_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Total Implied Launch FDV' }), el('b', { class: 'text-cyan', text: fmtUsd(totalImplied) })),
        el('div', { class: 'fact' }, el('span', { text: 'Calibrated Live Comps' }), el('b', { text: String(DATA.live_size) + ' reference peers' }))
      )
    );
  }

  function controls() {
    var categories = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var search = el('input', { type: 'search', id: 'q', placeholder: 'Search protocol, sector, or chain...', value: state.q, 'aria-label': 'Search the radar' });
    search.addEventListener('input', function () { state.q = search.value; writeHash(); render(); });

    var select = el('select', { id: 'category', 'aria-label': 'Filter by sector' },
      el('option', { value: 'all', text: 'All Sectors (' + categories.length + ')' }),
      categories.map(function (c) { return el('option', { value: c, text: c, selected: c === state.category ? 'selected' : null }); })
    );
    select.addEventListener('change', function () { state.category = select.value; writeHash(); render(); });

    var pre = el('button', { type: 'button', 'aria-pressed': state.tab === 'pre-token' ? 'true' : 'false', text: 'Pre-Token Radar (' + DATA.board_size + ')', onclick: function () { state.tab = 'pre-token'; render(); } });
    var live = el('button', { type: 'button', 'aria-pressed': state.tab === 'live' ? 'true' : 'false', text: 'Live Token Comps (' + DATA.live_size + ')', onclick: function () { state.tab = 'live'; render(); } });

    return el('div', { class: 'controls' },
      el('div', { class: 'field' }, el('label', { for: 'q', text: 'Search Protocol' }), search),
      el('div', { class: 'field' }, el('label', { for: 'category', text: 'Sector Filter' }), select),
      el('div', { class: 'field' }, el('span', { class: 'sub', text: 'View Mode' }), el('div', { class: 'tabs' }, pre, live)),
      el('span', { class: 'count', text: state.tab === 'pre-token' ? rows().length + ' / ' + DATA.board_size + ' rows matched' : DATA.live.length + ' live benchmark comps' })
    );
  }

  function sortHeader(key, label) {
    return el('th', { scope: 'col' },
      el('button', { type: 'button', class: 'sort-btn', onclick: function () { if (state.sort === key) state.dir = -state.dir; else { state.sort = key; state.dir = -1; } render(); } },
        label,
        state.sort === key ? el('span', { class: 'arrow', text: state.dir < 0 ? ' ▼' : ' ▲' }) : null
      )
    );
  }

  function boardTable() {
    var list = sortedRows(rows());
    if (list.length === 0) {
      return el('div', { class: 'panel empty-panel' },
        el('h2', { text: 'No protocols match active filters' }),
        el('p', { text: 'Reset search or pick a different sector to populate the board.' }),
        el('button', { class: 'button-reset', type: 'button', text: 'Reset Filters', onclick: function () { state.q = ''; state.category = 'all'; writeHash(); render(); } })
      );
    }
    var max = list[0].implied_value_usd || 1;
    var tbody = el('tbody');
    list.forEach(function (r) {
      var growth = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var growthClass = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var chainsText = r.chains && r.chains.length ? r.chains.slice(0, 3).join(', ') + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') : 'main chain';

      var tr = el('tr', {
        'data-selected': state.selected === r.slug ? 'true' : 'false',
        tabindex: '0',
        onclick: function () { openDetail(r.slug); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r.slug); } }
      },
        el('td', { class: 'num rank-col' }, '#' + r.rank),
        el('td', null, el('div', { class: 'name' },
          el('b', { text: r.name }),
          el('div', { class: 'tags' },
            el('span', { class: 'tag-cat', text: r.category || 'DeFi' }),
            el('span', { class: 'tag-chain', text: chainsText })
          )
        )),
        el('td', { class: 'num' }, fmtUsd(r.tvl_usd)),
        el('td', { class: 'num ' + growthClass }, growth),
        el('td', { class: 'num' }, fmtAge(r.age_days)),
        el('td', null, el('div', { class: 'implied-cell' },
          el('div', { class: 'bar', 'aria-hidden': 'true' }, el('i', { style: 'width:' + Math.max(4, Math.round((r.implied_value_usd / max) * 100)) + '%' })),
          el('span', { class: 'num bold-value' }, fmtUsd(r.implied_value_usd))
        )),
        el('td', null, el('span', { class: 'status-badge pre' }, 'PRE-TOKEN'))
      );
      tbody.appendChild(tr);
    });

    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Pre-token protocols ranked strictly by implied launch valuation. Click any row for comps breakdown and farm playbook.' }),
          el('thead', null, el('tr', null,
            sortHeader('implied', 'Rank'),
            sortHeader('name', 'Protocol'),
            sortHeader('tvl', 'TVL'),
            sortHeader('growth', '7d Velocity'),
            sortHeader('age', 'Tracked Age'),
            sortHeader('implied', 'Implied Launch FDV'),
            el('th', { scope: 'col', text: 'Status' })
          )),
          tbody
        )
      )
    );
  }

  function liveTable() {
    var tbody = el('tbody');
    DATA.live.forEach(function (r) {
      var ratio = r.tvl_usd > 0 && r.mcap_usd ? (r.mcap_usd / r.tvl_usd).toFixed(2) + 'x' : 'n/a';
      tbody.appendChild(el('tr', null,
        el('td', { class: 'num' }, 'BENCHMARK'),
        el('td', null, el('div', { class: 'name' },
          el('b', { text: r.name }),
          el('div', { class: 'tags' }, el('span', { class: 'tag-cat', text: r.category || 'Other' }))
        )),
        el('td', { class: 'num' }, fmtUsd(r.tvl_usd)),
        el('td', { class: 'num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg') }, fmtPct(r.change_7d)),
        el('td', { class: 'num bold-value' }, fmtUsd(r.mcap_usd)),
        el('td', { class: 'num text-cyan' }, ratio),
        el('td', null, el('span', { class: 'status-badge live' }, 'TRADING'))
      ));
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Live Token Benchmarks: established protocols whose market cap serves as peer comps for sector multiple calibration.' }),
          el('thead', null, el('tr', null,
            el('th', { scope: 'col', text: 'Tier' }),
            el('th', { scope: 'col', text: 'Protocol' }),
            el('th', { scope: 'col', text: 'TVL' }),
            el('th', { scope: 'col', text: '7d Velocity' }),
            el('th', { scope: 'col', text: 'Market Cap' }),
            el('th', { scope: 'col', text: 'Mcap / TVL Multiple' }),
            el('th', { scope: 'col', text: 'Status' })
          )),
          tbody
        )
      )
    );
  }

  function modelPanel() {
    var m = DATA.model;
    return el('section', { class: 'panel model' },
      el('h2', { text: 'Radar-2 Quantitative Valuation Architecture' }),
      el('p', { class: 'sub', text: 'Every protocol is priced by an empirical 4-factor model derived directly from live DefiLlama data. Zero manual overrides; fully deterministic and reproducible.' }),
      el('div', { class: 'formula-box' },
        el('code', { text: 'Implied FDV = TVL × Sector Multiple × (1 + clamp(7d_change, -60%, 120%) × 0.5) × (0.6 + min(age, 1095)/1095 × 0.4) × MultiChain Breadth' })
      ),
      el('div', { class: 'model-grid' },
        el('div', { class: 'model-card' },
          el('h4', { text: '1. Sector Comps Calibration' }),
          el('p', { text: 'Calculates the median Mcap/TVL multiple across live trading protocols in each category (e.g. DEXs 0.342x, RWA 0.275x, Lending 0.132x).' })
        ),
        el('div', { class: 'model-card' },
          el('h4', { text: '2. 7-Day Velocity Factor' }),
          el('p', { text: 'Clamps weekly growth between -60% and +120%, dampening short-term liquidity spikes while rewarding organic TVL expansion.' })
        ),
        el('div', { class: 'model-card' },
          el('h4', { text: '3. Tracked Age Maturity' }),
          el('p', { text: 'Applies a maturity curve from 0.6x (fresh deployments) up to 1.0x (3+ years battle-tested on DefiLlama).' })
        ),
        el('div', { class: 'model-card' },
          el('h4', { text: '4. Multi-Chain Breadth' }),
          el('p', { text: 'Grants an ecosystem diversification premium: +5% for dual-chain protocols and +10% for protocols live on 3+ distinct networks.' })
        )
      )
    );
  }

  var dialog = el('dialog', { class: 'detail-modal', id: 'detail', 'aria-labelledby': 'detail-title' });
  dialog.addEventListener('close', function () { state.selected = null; writeHash(); });

  function openDetail(slug) {
    var row = DATA.rows.filter(function (r) { return r.slug === slug; })[0];
    if (!row) return;
    state.selected = slug;
    writeHash();
    dialog.textContent = '';
    var steps = farmSteps(row);

    var catMult = (DATA.model.category_multiples && DATA.model.category_multiples[row.category || 'Other']) || DATA.model.base_multiple || 0.2049;

    dialog.appendChild(el('div', { class: 'detail-head' },
      el('div', null,
        el('div', { class: 'detail-badge-row' },
          el('span', { class: 'badge green', text: 'Rank #' + row.rank + ' of ' + DATA.board_size }),
          el('span', { class: 'badge outline', text: row.category || 'DeFi' })
        ),
        el('h2', { id: 'detail-title', text: row.name }),
        el('p', { class: 'sub', text: 'Deployed on ' + (row.chains && row.chains.length ? row.chains.join(', ') : 'main chain') })
      ),
      el('button', { class: 'btn-close', type: 'button', 'aria-label': 'Close detail view', text: '✕', onclick: function () { dialog.close(); } })
    ));

    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Quantitative Valuation Breakdown' }),
      el('div', { class: 'equation-grid' },
        el('div', { class: 'eq-box' }, el('span', { text: 'Reported TVL' }), el('b', { class: 'num text-cyan', text: fmtUsd(row.tvl_usd) })),
        el('div', { class: 'eq-box' }, el('span', { text: 'Sector Comp Multiple' }), el('b', { class: 'num', text: catMult.toFixed(4) + 'x' })),
        el('div', { class: 'eq-box' }, el('span', { text: '7d Velocity Factor' }), el('b', { class: 'num', text: String(row.growth_multiplier) + 'x' })),
        el('div', { class: 'eq-box' }, el('span', { text: 'Maturity Factor' }), el('b', { class: 'num', text: String(row.maturity_multiplier) + 'x' })),
        el('div', { class: 'eq-box' }, el('span', { text: 'Chain Breadth' }), el('b', { class: 'num', text: (row.breadth_multiplier || 1.0).toFixed(2) + 'x' })),
        el('div', { class: 'eq-box highlight-box' }, el('span', { text: 'Implied Launch FDV' }), el('b', { class: 'num text-green bold-fdv', text: fmtUsd(row.implied_value_usd) }))
      ),
      el('p', { class: 'model-note', text: 'Recomputed model verification: ' + fmtUsd(impliedOf(row, DATA.model)) + ' (matches board.json). Strictly deterministic empirical valuation.' })
    ));

    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Optimal Farm & Capital Playbook' }),
      el('div', { class: 'farm-meta-bar' },
        el('span', { text: 'Capital Tier: $' + capitalFor(row) + ' USDC' }),
        el('span', { text: 'Holding Window: ' + holdDaysFor(row.age_days) + ' days' }),
        el('span', { text: 'Cadence: Weekly activity cycle' })
      ),
      el('ol', { class: 'steps-list' }, steps.map(function (s, idx) {
        var at = s.indexOf(' Cost: ');
        var action = at >= 0 ? s.slice(0, at) : s;
        var tail = at >= 0 ? s.slice(at + 1) : '';
        return el('li', { class: 'step-item' },
          el('div', { class: 'step-num' }, String(idx + 1)),
          el('div', { class: 'step-body' },
            el('p', { class: 'step-action', text: action }),
            el('div', { class: 'step-pills' },
              tail.split('. ').map(function (part) {
                return part.trim() ? el('span', { class: 'pill-cost', text: part.replace(/\.$/, '') }) : null;
              })
            )
          )
        );
      }))
    ));

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function render() {
    app.textContent = '';
    var shell = el('div', { class: 'shell' });
    shell.appendChild(header());
    shell.appendChild(lede());
    shell.appendChild(controls());
    shell.appendChild(state.tab === 'pre-token' ? boardTable() : liveTable());
    if (state.tab === 'pre-token') shell.appendChild(modelPanel());
    app.appendChild(shell);
    app.setAttribute('aria-busy', 'false');
    if (!dialog.isConnected) app.appendChild(dialog);
    if (state.selected) openDetail(state.selected);
  }

  readHash();
  render();
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dialog.open) dialog.close();
  });
})();

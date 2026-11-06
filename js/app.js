(() => {
const { TIERS, SPECIES, WAVES, noteOf, traits } = window.SonicTraits;
let ADDR = '0x0617A7c1e3C11BCf70165e2Eba47d72f714CBe07';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n) => Number(n).toLocaleString('en-US');
const feeBNB = () => (STATS && Number(STATS.freeFeeBNB) > 0) ? String(Number(Number(STATS.freeFeeBNB).toPrecision(2))) + ' BNB' : 'a few cents in BNB';
const short = (a) => a.slice(0, 6) + '…' + a.slice(-4);
const isAddr = (a) => /^0x[0-9a-fA-F]{40}$/.test(a);
const toast = (t) => { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200); };
async function copy(t, msg = 'Copied') { try { await navigator.clipboard.writeText(t); } catch { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); } toast(msg); }

// ── audio ──
let ctx, master;
function audio() { if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.32; const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination); } if (ctx.state === 'suspended') ctx.resume(); return ctx; }
function tone(hz, wave, when = 0, dur = 1.1, vol = 1) {
  const c = audio(), t0 = c.currentTime + when, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
  o.type = wave; o.frequency.setValueAtTime(hz, t0); f.type = 'lowpass'; f.frequency.value = wave === 'sine' ? 6000 : 2600;
  const peak = (wave === 'square' || wave === 'sawtooth' ? 0.28 : 0.6) * vol;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02); g.gain.exponentialRampToValueAtTime(peak * 0.45, t0 + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(f); f.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
}
function playTraits(t) {
  if (t.chord) { t.chord.forEach((n, i) => tone(n.hz, t.wave, i * 0.09, 1.6, 0.8)); if (t.tier >= 2) tone(t.note.hz * 2, 'sine', 0.3, 1.8, 0.35); if (t.tier === 3) [0, 1, 2].forEach((i) => tone(t.chord[i].hz * 2, 'triangle', 0.5 + i * 0.07, 1.6, 0.3)); }
  else { tone(t.note.hz, t.wave, 0, 1.1); tone(t.note.hz * 2, 'sine', 0.02, 0.6, 0.2); }
}

// ── demo seeds (find a seed that gives the wanted species) ──
function seedFor(tier, sp, salt = 0) { for (let k = salt * 7919 + 1; ; k++) { const b = BigInt(k) * 1000003n; if (Number((b >> 16n) % BigInt(SPECIES[tier].length)) === sp) return b; } }
function demo(id, tier, sp, salt = 0) { const s = seedFor(tier, sp, salt); const ps = tier ? [1n + BigInt(salt) * 3n, 7n + BigInt(salt) * 5n, 12n + BigInt(salt)].map((x) => x * 2654435761n) : null; return traits(id, tier, s, ps); }

// ── card element ──
function wavePath(w) { const p = []; for (let i = 0; i <= 48; i++) { const t = i / 48, ph = t * 4 * Math.PI; let v = w === 'sine' ? Math.sin(ph) : w === 'triangle' ? 2 / Math.PI * Math.asin(Math.sin(ph)) : w === 'square' ? (Math.sin(ph) >= 0 ? 1 : -1) : 2 * ((t * 2) % 1) - 1; p.push([t * 100, 12 - v * 9]); } return 'M' + p.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('L'); }
function cardEl(t, { play = true, tilt = true, lazy = false } = {}) {
  const P = TIERS[t.tier], el = document.createElement('div');
  el.className = 'card'; el.dataset.tier = t.tier; el.style.setProperty('--c1', P.c1); el.style.setProperty('--c2', P.c2);
  const noteTxt = t.chord ? t.chord.map((n) => n.name).join(' ') : t.note.name;
  const hz = t.chord ? Math.round(t.chord[0].hz) + '+' : (t.note.hz < 100 ? t.note.hz.toFixed(1) : Math.round(t.note.hz)) + ' Hz';
  el.innerHTML = `<div class="win"><img src="/art/${t.art}.webp" alt="${t.title}" loading="${lazy ? 'lazy' : 'eager'}" draggable="false"><span class="rar">${P.rarity.toUpperCase()}</span><span class="ser">#${String(t.id).padStart(4, '0')}</span></div>
  <div class="ttl"><span>${t.title}</span><em>${['I', 'II', 'III', 'IV'][t.tier]}</em></div>
  <div class="st"><div><small>${t.chord ? 'CHORD' : 'NOTE'}</small><b>${noteTxt}</b></div><div><small>FREQ</small><b>${hz}</b></div><div><small>WAVE</small><svg viewBox="0 0 100 24" preserveAspectRatio="none"><path d="${wavePath(t.wave)}" fill="none" stroke="${P.c2}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg></div></div>
  <div class="holo"></div><div class="glare"></div><span class="ring"></span>`;
  el.setAttribute('role', 'button'); el.setAttribute('aria-label', `${t.title} number ${t.id}, tap to play ${noteTxt}`); el.tabIndex = 0;
  el._t = t;
  if (play) { const go = () => { playTraits(t); el.classList.remove('playing'); void el.offsetWidth; el.classList.add('playing'); }; el.addEventListener('click', (e) => { if (!el.closest('.slot')) go(); }); el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); el._play = go; }
  el.dataset.tilt = tilt ? '1' : '0'; // motion handled by /js/cards.js
  return el;
}

// ── hero ──
const hero = $('#heroStage');
const heroCards = [demo(1888, 1, 0, 2), demo(6912, 2, 1, 3), demo(42, 0, 0, 1)];
heroCards.forEach((t, i) => { const c = cardEl(t); const base = ['translate(-92%,-46%) rotate(-12deg) scale(.82)', 'translate(-8%,-46%) rotate(12deg) scale(.82)', 'translate(-50%,-50%)'][i]; c.dataset.base = base; c.style.transform = base; hero.insertBefore(c, hero.lastElementChild); });
// gentle float + gyro on phones
if (window.DeviceOrientationEvent && matchMedia('(hover:none)').matches) {
  window.addEventListener('deviceorientation', (e) => { if (e.gamma == null) return; const c = hero.children[2]; if (!c || !c.dataset) return; const x = Math.max(-1, Math.min(1, e.gamma / 30)), y = Math.max(-1, Math.min(1, (e.beta - 40) / 30)); c.style.transform = c.dataset.base + ` rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`; c.style.setProperty('--hx', 50 + x * 40 + '%'); c.style.setProperty('--hy', 50 + y * 40 + '%'); }, { passive: true });
}

// ── fusion demo ──
const mix = $('#mixer'); const tonesDemo = [demo(101, 0, 1, 4), demo(102, 0, 2, 5), demo(103, 0, 3, 6)];
['.m1', '.m2', '.m3'].forEach((s, i) => $(s, mix).appendChild(cardEl(tonesDemo[i], { tilt: false })));
const chordDemo = traits(6667, 1, seedFor(1, 0, 9), tonesDemo.map((t, i) => seedFor(0, t.speciesIndex, [4, 5, 6][i])));
$('.res', mix).appendChild(cardEl(chordDemo, { tilt: false }));
$('#playChord').addEventListener('click', () => { tonesDemo.forEach((t, i) => tone(t.note.hz, t.wave, i * 0.35, 0.5, 0.8)); setTimeout(() => playTraits(chordDemo), 1150); });
const ladder = $('#ladder');
[[0, 'Tone', 'Common', 'mint it', '1'], [1, 'Chord', 'Rare', '3 Tones', '×3'], [2, 'Harmony', 'Epic', '9 Tones', '×9'], [3, 'Sonic Boom', 'Legendary', '27 Tones', '×27']].forEach(([t, n, r, s, c]) => {
  const d = document.createElement('div'); d.className = 'rung rv'; d.innerHTML = `<span class="cost">${c}</span><img src="/art/${TIERS[t].key}-1.webp" alt="${n}" loading="lazy"><b>${n}</b><small>${r} · ${s}</small>`; ladder.appendChild(d);
});

// ── stats ──
let STATS = null;
async function stats() {
  try { const r = await fetch('/api/stats'); const s = await r.json(); if (s.error) return; STATS = s;
    $('#cFree').textContent = 'Sold out'; $('#cPaid').textContent = `${fmt(s.paid)} / 4,406`; $('#cFuse').textContent = fmt(s.fusions);
    $('#bFree').style.width = '100%'; $('#bPaid').style.width = Math.max(1.5, s.paid / 44.06) + '%';
    $$('[data-tcount]').forEach((el) => { el.textContent = fmt(s.tiers[+el.dataset.tcount]) + ' alive'; });
    if (false && s.contract && s.contract !== ADDR) { // new mints now go to the second-series contract
      const old = ADDR; ADDR = s.contract; $('#addr').textContent = ADDR;
      document.querySelectorAll('a[href*="' + old + '"]').forEach((a) => { a.href = a.href.replace(old, ADDR); });
      const fr = $('#ruleFree'); if (fr) fr.innerHTML = '<b>Free card, tiny fee</b><p>No mint price. Each free card carries a small network fee of about ' + feeBNB() + ' (priced live from Chainlink), plus gas. One per Agent ID.</p>';
    }
    renderPrompt();
  } catch {}
}

// ── claim ──
let kind = 'paid', qty = 1, WALLET = '';
const promptEl = $('#prompt');
function renderPrompt() {
  const w = WALLET || '<your Agentic Wallet address>';
  const url = `https://www.sonicprotocol.fun/api/mint?wallet=${WALLET || '<address>'}${kind === 'paid' ? '&qty=' + qty : ''}`;
  const what = kind === 'free' ? (STATS && STATS.series === 2 ? `a free Sonic Protocol card (about ${feeBNB()} fee + gas)` : 'a free Sonic Protocol card (0 BNB, gas only)') : `${qty} paid Sonic Protocol card${qty > 1 ? 's' : ''} ($0.60 each, paid in BNB)`;
  const text = `Mint ${what} on BNB Chain with my Binance Agentic Wallet.\n\n1. ${WALLET ? 'My wallet: ' + w : 'Run: baw wallet address --json\n   Use the address for binanceChainId 56.'}\n2. Open ${url}\n   It returns ready-made baw commands.\n3. Run the preview command, show me the result,\n   then: baw contract-call execute --requestId <requestId> --json\n4. Tell me the transaction hash.` + (kind === 'paid' && $('#autoFuse').checked ? `\n5. Then fuse: open https://www.sonicprotocol.fun/api/fuse?wallet=${WALLET || '<address>'}&format=text\n   and follow it. Repeat until it says there is nothing to fuse.\n   Tell me every new card.` : '');
  promptEl.textContent = text; const b = document.createElement('button'); b.className = 'btn btn--y btn--sm copy'; b.type = 'button'; b.textContent = 'Copy prompt'; b.onclick = () => copy(text, 'Prompt copied. Paste it to your agent'); promptEl.appendChild(b);
  if (STATS && STATS.priceBNB) $('#qPrice').textContent = `$${(0.6 * qty).toFixed(2)} ≈ ${(Number(STATS.priceBNB) * qty).toFixed(5)} BNB`;
}
$$('.tabs button').forEach((b) => b.addEventListener('click', () => { if (b.disabled) return; kind = b.dataset.k; $$('.tabs button').forEach((x) => x.setAttribute('aria-selected', x === b)); $('#qtyRow').hidden = kind !== 'paid'; $('#presetRow').hidden = kind !== 'paid'; $('#afRow').hidden = kind !== 'paid'; renderPrompt(); }));
$$('#presetRow button').forEach((b) => b.onclick = () => { qty = +b.dataset.q; $('#qty').textContent = qty; $$('#presetRow button').forEach((x) => x.classList.toggle('on', x === b)); renderPrompt(); });
$('#autoFuse').onchange = renderPrompt;
$('#qMinus').onclick = () => { qty = Math.max(1, qty - 1); $('#qty').textContent = qty; renderPrompt(); };
$('#qPlus').onclick = () => { qty = Math.min(10, qty + 1); $('#qty').textContent = qty; renderPrompt(); };
function status(el, cls, html) { el.className = 'status show ' + cls; el.innerHTML = html; }
$('#checkForm').addEventListener('submit', async (e) => {
  e.preventDefault(); const w = $('#wallet').value.trim(), m = $('#checkMsg');
  if (!isAddr(w)) return status(m, 'err', 'That is not a BNB Chain address. It starts with 0x and has 42 characters.');
  status(m, 'wait', 'Reading BNB Chain…');
  try { const r = await fetch('/api/mint?wallet=' + w); const j = await r.json();
    if (!j.hasAgentId) { WALLET = ''; renderPrompt(); return status(m, 'err', '<b>No Agent ID on this wallet.</b> Only Binance Agentic Wallets with a .ai Agent ID can mint. You can still buy and fuse cards from a marketplace.'); }
    WALLET = j.wallet; renderPrompt(); if (!DECK_W) loadDeck(j.wallet);
    const free = 'Free cards are sold out.';
    status(m, j.mintOpen ? 'ok' : 'wait', `<b>Agent ID found ✓</b> ${free} Paid left for this wallet: ${Math.max(0, 10 - j.paidUsed)} of 10.${j.mintOpen ? ' The prompt now includes your address.' : ' <br>Mint is closed right now.'}`);
  } catch { status(m, 'err', 'Could not reach BNB Chain. Try again in a moment.'); }
});
renderPrompt();

// ── deck data ──
async function deck(w) { const r = await fetch('/api/deck?wallet=' + w); const j = await r.json(); if (j.error) throw new Error(j.error); return j.cards.map(hydrate); }
function hydrate(c) { return Object.assign({ palette: TIERS[c.tier], tierName: TIERS[c.tier].name, speciesIndex: SPECIES[c.tier].indexOf(c.species) }, c); }

// ── reveal ──
$('#revealForm').addEventListener('submit', async (e) => {
  e.preventDefault(); const w = $('#rwallet').value.trim(), m = $('#revealMsg'), box = $('#revealBox');
  if (!isAddr(w)) return status(m, 'err', 'Enter the wallet address that minted.');
  status(m, 'wait', 'Looking for your newest card…');
  try { const cards = await deck(w); if (!cards.length) { box.hidden = true; return status(m, 'err', 'No cards in this wallet yet. If your agent just minted, wait a few seconds and try again.'); }
    const t = cards.sort((a, b) => b.id - a.id)[0]; m.className = 'status';
    box.hidden = false; box.innerHTML = `<div class="flip"><div class="inner"><div class="back"><div class="cardback"><div>Sonic<br>Protocol<small>tap to flip</small></div></div></div><div class="front"></div></div></div><p class="mono" style="margin:0;font-size:13px;color:var(--ink2)">${cards.length} card${cards.length > 1 ? 's' : ''} in this wallet</p>`;
    const f = $('.flip', box); $('.front', f).appendChild(cardEl(t, { tilt: false }));
    const open = () => { if (f.classList.contains('open')) return; f.classList.add('open'); setTimeout(() => playTraits(t), 450); };
    f.addEventListener('click', open); setTimeout(open, 700); box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch { status(m, 'err', 'Could not read the chain. Try again.'); }
});

// ── anatomy ──
const ac = cardEl(demo(42, 0, 4, 11)); ac.style.cursor = 'pointer'; const anat = $('#anatCard'); anat.appendChild(ac);
[['01', '0%', '8%'], ['02', '100%', '8%'], ['03', '0%', '72%'], ['04', '0%', '86%'], ['05', '100%', '86%']].forEach(([n, x, y]) => { const d = document.createElement('span'); d.className = 'dot'; d.textContent = n; d.style.left = `calc(50% - min(78vw,340px)/2 + min(78vw,340px)*${parseFloat(x) / 100} - 15px)`; d.style.top = `calc(${y} - 15px)`; anat.appendChild(d); });

// ── tiers ──
const tg = $('#tierGrid');
TIERS.forEach((P, t) => {
  const box = document.createElement('div'); box.className = 'tier rv';
  const holder = document.createElement('div'); let cur = cardEl(demo([7, 6668, 6800, 6900][t], t, 0, 20 + t)); holder.appendChild(cur);
  const sw = document.createElement('div'); sw.className = 'swatches';
  SPECIES[t].forEach((n, i) => { const b = document.createElement('button'); b.setAttribute('aria-label', n); b.setAttribute('aria-pressed', i === 0); b.style.background = ['#FFC9A8', '#A9D8FF', '#B5F0D3', '#D9C8FF', '#FFE58A', '#FFC2DD'][['Peach', 'Sky', 'Mint', 'Lilac', 'Butter', 'Bubblegum'].indexOf(n)] || { Rose: '#FFC2DD', Moon: '#D9C8FF', Gold: '#FFD84D', Pearl: 'linear-gradient(135deg,#fff,#FFC2DD,#A9D8FF)' }[n];
    b.onclick = () => { const nc = cardEl(demo([7, 6668, 6800, 6900][t], t, i, 20 + t + i)); holder.replaceChild(nc, cur); cur = nc; nc._play(); $$('button', sw).forEach((x) => x.setAttribute('aria-pressed', x === b)); }; sw.appendChild(b); });
  box.append(holder); box.insertAdjacentHTML('beforeend', `<h3>${P.name}</h3><p>${P.rarity} · ${SPECIES[t].length} spirits · <span data-tcount="${t}">–</span></p>`); box.appendChild(sw); tg.appendChild(box);
});

// ── my deck + fusion lab ──
let DECK = [], filter = 'all', sel = [], DECK_W = '', FUSABLE = [0, 0, 0];
const TN = (t) => TIERS[t].name;
function renderDeck() {
  const g = $('#deckGrid'); g.innerHTML = ''; const list = DECK.filter((c) => filter === 'all' || c.tier === +filter);
  $('#deckEmpty').hidden = !!list.length; $('#deckEmpty').textContent = DECK_W ? (DECK.length ? 'No cards of this tier.' : 'This wallet has no Sonic Protocol cards yet.') : 'No deck loaded yet.';
  $('#deckCount').textContent = DECK_W ? `${DECK.length} card${DECK.length === 1 ? '' : 's'} · ${short(DECK_W)}` : '';
  list.forEach((c) => { const s = document.createElement('div'); s.className = 'slot' + (sel.includes(c.id) ? ' sel' : ''); const el = cardEl(c, { lazy: true }); s.appendChild(el); s.insertAdjacentHTML('beforeend', '<span class="chk">✓</span>');
    s.addEventListener('click', () => { el._play(); toggle(c); }); g.appendChild(s); });
  $('#lab').hidden = !DECK.length; hint(); lab();
}
function groups() { const by = [[], [], []]; DECK.forEach((c) => { if (c.tier < 3) by[c.tier].push(c.id); }); by.forEach((l) => l.sort((x, y) => x - y)); return by; }
function autoPick(tier) { const by = groups(); const t = tier != null ? tier : by.findIndex((l) => l.length >= 3); if (t < 0 || by[t].length < 3) return false; sel = by[t].slice(0, 3); return true; }
function hint() {
  const by = groups(); FUSABLE = by.map((l) => Math.floor(l.length / 3)); const n = FUSABLE.reduce((x, y) => x + y, 0); const h = $('#fuseHint');
  if (!n) { h.hidden = true; return; }
  const t = by.findIndex((l) => l.length >= 3); h.hidden = false;
  $('#hintT').textContent = n === 1 ? 'You can fuse 1 time right now ✦' : `You can fuse ${n} times right now ✦`;
  $('#hintS').textContent = `${by[t].length} ${TN(t)}s in this wallet. Three become one ${TN(t + 1)}.`;
}
function toggle(c) { if (sel.includes(c.id)) sel = sel.filter((x) => x !== c.id); else { const first = DECK.find((d) => d.id === sel[0]); if (c.tier === 3) { toast('Sonic Boom is the top tier'); return; } if (first && first.tier !== c.tier) sel = []; if (sel.length === 3) sel.shift(); sel.push(c.id); } renderDeck(); }
function lab() {
  const slots = $$('#lab .slots i'); slots.forEach((s, i) => { const c = DECK.find((d) => d.id === sel[i]); s.className = c ? 'on' : ''; s.style.backgroundImage = c ? `url(/art/${c.art}.webp)` : ''; });
  const t = sel.length ? DECK.find((d) => d.id === sel[0]).tier : null; const can = FUSABLE.some((x) => x > 0);
  $('#labTxt').innerHTML = sel.length === 3 ? `<b>Ready: 3 ${TN(t)}s → 1 ${TN(t + 1)}</b>Tap Fuse.` : (can ? `<b>Fusion Lab</b>Tap Auto-pick, or choose 3 cards of the same tier.` : `<b>Fusion Lab</b>You need 3 cards of the same tier to fuse.`);
  $('#labGo').disabled = sel.length !== 3; $('#labAuto').hidden = !can || sel.length === 3;
}
$$('#filters button').forEach((b) => b.onclick = () => { filter = b.dataset.t; $$('#filters button').forEach((x) => x.setAttribute('aria-pressed', x === b)); renderDeck(); });
async function loadDeck(w, keepSel) { DECK_W = ethers.getAddress(w); try { localStorage.setItem('sonicDeck', DECK_W); } catch {} $('#dwallet').value = DECK_W; $('#deckEmpty').hidden = false; $('#deckEmpty').textContent = 'Reading BNB Chain…';
  try { DECK = await deck(DECK_W); sel = []; if (!keepSel) autoPick(); renderDeck(); } catch { $('#deckEmpty').textContent = 'Could not read the chain. Try again.'; } }
$('#dwallet').addEventListener('input', (e) => { const w = e.target.value.trim(); if (isAddr(w) && w.toLowerCase() !== DECK_W.toLowerCase()) loadDeck(w); });
$('#deckForm').addEventListener('submit', (e) => { e.preventDefault(); const w = $('#dwallet').value.trim(); if (!isAddr(w)) return toast('Enter a valid 0x address'); loadDeck(w); });
let provider, signerAddr;
async function connect() {
  const eth = window.ethereum || window.BinanceChain; if (!eth) return null;
  provider = new ethers.BrowserProvider(eth); const accs = await provider.send('eth_requestAccounts', []);
  try { await provider.send('wallet_switchEthereumChain', [{ chainId: '0x38' }]); } catch (e) { if (e.code === 4902 || (e.error && e.error.code === 4902)) await provider.send('wallet_addEthereumChain', [{ chainId: '0x38', chainName: 'BNB Smart Chain', nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: ['https://bsc-dataseed.bnbchain.org'], blockExplorerUrls: ['https://bscscan.com'] }]); }
  provider = new ethers.BrowserProvider(eth); signerAddr = ethers.getAddress(accs[0]); return signerAddr;
}
$('#connectDeck').onclick = async () => { try { const a = await connect(); if (!a) return toast('No browser wallet here. Paste your wallet address instead.'); loadDeck(a); } catch { toast('Wallet connection cancelled'); } };
$('#labAuto').onclick = () => { if (autoPick()) renderDeck(); };
$('#hintGo').onclick = () => { if (sel.length !== 3) autoPick(); renderDeck(); openSheet(); };
const fuseAllPrompt = () => `Fuse my Sonic Protocol cards on BNB Chain with my Binance Agentic Wallet ${DECK_W}.\n\nOpen https://www.sonicprotocol.fun/api/fuse?wallet=${DECK_W}&format=text and follow the steps. Repeat until it says there is nothing to fuse, then tell me the transaction hashes.`;
$('#hintAgent').onclick = () => copy(fuseAllPrompt(), 'Prompt copied. Paste it to your agent ✦');
$('#labGo').onclick = () => { if (sel.length === 3) openSheet(); };
const sheet = $('#fuseSheet');
function closeSheet() { sheet.hidden = true; document.body.style.overflow = ''; }
$('#fsClose').onclick = closeSheet; sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });
function openSheet() {
  const cs = sel.map((id) => DECK.find((d) => d.id === id)); const t = cs[0].tier; const nk = TIERS[t + 1].key;
  $('#fsTitle').textContent = `3 ${TN(t)}s → 1 ${TN(t + 1)}`;
  $('#fsCards').innerHTML = cs.map((c) => `<img src="/art/${c.art}.webp" alt="${c.title} #${c.id}">`).join('') + `<span class="arrow">→</span><img class="big" src="/art/${nk}-1.webp" alt="${TN(t + 1)}">`;
  $('#fsMsg').className = 'status'; $('#fsReveal').hidden = true; $('#fsWallet').hidden = false; $('#fsAgent').hidden = false; $('#fsWallet').disabled = false;
  const hasW = !!(window.ethereum || window.BinanceChain); const total = FUSABLE.reduce((x, y) => x + y, 0);
  $('#fsWallet').hidden = !hasW; $('#fsAll').hidden = !hasW || total < 2; $('#fsAll').disabled = false; $('#fsAll').textContent = 'Fuse everything ✦';
  $('#fsWallet').classList.toggle('ghost', hasW && total >= 2); $('#fsWallet').textContent = total >= 2 ? 'Fuse just these 3' : 'Fuse with my wallet'; $('#fsAgent').classList.toggle('btn--y', !hasW);
  $('#fsAgent').textContent = total >= 2 ? 'Copy prompt: agent fuses everything' : 'Copy prompt for my agent';
  sheet.hidden = false; document.body.style.overflow = 'hidden';
}
$('#fsAgent').onclick = () => { const ids = [...sel]; if (FUSABLE.reduce((x, y) => x + y, 0) >= 2) { copy(fuseAllPrompt(), 'Prompt copied. Paste it to your agent ✦'); return status($('#fsMsg'), 'ok', '<b>Prompt copied ✓</b> Paste it to your agent. It fuses every set of 3, then come back here to see your new cards.'); }
  copy(`Fuse my Sonic Protocol cards #${ids.join(', #')} on BNB Chain with my Binance Agentic Wallet ${DECK_W}.\n\nOpen https://www.sonicprotocol.fun/api/fuse?wallet=${DECK_W}&ids=${ids.join(',')}&format=text and follow the steps, then tell me the transaction hash.`, 'Prompt copied. Paste it to your agent ✦');
  status($('#fsMsg'), 'ok', '<b>Prompt copied ✓</b> Paste it to your agent. When it is done, tap “Load deck” to see your new card.'); };
async function doFuse(ids, m, label) {
  const r = await fetch(`/api/fuse?wallet=${DECK_W}&ids=${ids.join(',')}`).then((x) => x.json()).catch(() => null);
  if (!r || !r.ready) throw Object.assign(new Error((r && (r.problems && r.problems[0] || r.error)) || 'Cannot fuse these cards right now.'), { friendly: true });
  status(m, 'wait', `${label}Confirm in your wallet…`);
  const s = await provider.getSigner(); const tx = await s.sendTransaction({ to: r.tx.to, data: r.tx.data, value: 0 });
  status(m, 'wait', `${label}Fusing on BNB Chain… ✦`); const rc = await tx.wait(); if (!rc || rc.status !== 1) throw new Error('reverted');
  return tx.hash;
}
async function ensureWallet(m) {
  status(m, 'wait', 'Connecting wallet…'); const a = await connect();
  if (a !== DECK_W) { await loadDeck(a); if (!autoPick()) { closeSheet(); toast('This wallet has no 3 matching cards'); return false; } renderDeck(); openSheet(); status($('#fsMsg'), 'ok', `Loaded your connected wallet ${short(a)}. Tap again to fuse.`); return false; }
  return true;
}
const fuseErr = (e, m) => { console.warn('fuse error', e && (e.shortMessage || e.message), e && e.code); $('#fsWallet').disabled = false; $('#fsAll').disabled = false; status(m, 'err', e.friendly ? e.message : (e.code === 'ACTION_REJECTED' || e.code === 4001) ? 'Cancelled in your wallet. Nothing changed.' : 'Fusion failed. Check you have a little BNB for gas, then try again.'); };
$('#fsWallet').onclick = async () => {
  const m = $('#fsMsg'), ids = [...sel];
  try { if (!(await ensureWallet(m))) return; $('#fsWallet').disabled = true; $('#fsAll').disabled = true; const h = await doFuse(ids, m, ''); await fusionWin(ids, h); } catch (e) { fuseErr(e, m); }
};
$('#fsAll').onclick = async () => {
  const m = $('#fsMsg'); let n = 0, last = '';
  try { if (!(await ensureWallet(m))) return; $('#fsWallet').disabled = true; $('#fsAll').disabled = true;
    while (autoPick()) { const ids = [...sel]; renderDeck(); last = await doFuse(ids, m, `Fusion ${n + 1}: `); n++; await new Promise((r) => setTimeout(r, 1200)); DECK = await deck(DECK_W); }
    sel = []; renderDeck(); stats(); $('#fsWallet').hidden = true; $('#fsAll').hidden = true; $('#fsAgent').hidden = true;
    const top = DECK.slice().sort((a, b) => b.tier - a.tier || b.id - a.id)[0];
    status(m, 'ok', `<b>${n} fusion${n > 1 ? 's' : ''} done ✓</b> <a href="https://bscscan.com/tx/${last}" target="_blank" rel="noopener">Last transaction</a>`);
    if (top) { const box = $('#fsReveal'); box.hidden = false; box.innerHTML = `<div class="flip"><div class="inner"><div class="back"><div class="cardback"><div>Sonic<br>Protocol<small>tap to flip</small></div></div></div><div class="front"></div></div></div><p class="mono" style="margin:0;font-size:13px">Best card: ${top.title} #${top.id}</p>`; const f = $('.flip', box); $('.front', f).appendChild(cardEl(top, { tilt: false })); setTimeout(() => { f.classList.add('open'); setTimeout(() => playTraits(top), 450); }, 500); }
  } catch (e) { fuseErr(e, m); if (n) { DECK = await deck(DECK_W).catch(() => DECK); renderDeck(); } }
};
async function fusionWin(ids, hash) {
  const m = $('#fsMsg'); status(m, 'wait', 'Revealing your new card…'); let t = null;
  for (let i = 0; i < 6 && !t; i++) { await new Promise((r) => setTimeout(r, 1500)); try { const d = await deck(DECK_W); const nw = d.filter((c) => !DECK.some((o) => o.id === c.id)).sort((a, b) => b.id - a.id)[0]; if (nw) { DECK = d; t = nw; } } catch {} }
  sel = []; autoPick(); renderDeck(); stats();
  $('#fsWallet').hidden = true; $('#fsAgent').hidden = true;
  status(m, 'ok', `<b>Fused ✓</b> <a href="https://bscscan.com/tx/${hash}" target="_blank" rel="noopener">View transaction</a>`);
  if (!t) return; const box = $('#fsReveal'); box.hidden = false;
  box.innerHTML = `<div class="flip"><div class="inner"><div class="back"><div class="cardback"><div>Sonic<br>Protocol<small>tap to flip</small></div></div></div><div class="front"></div></div></div><p class="mono" style="margin:0;font-size:13px">New ${t.title} #${t.id}</p>` + (FUSABLE.some((x) => x) ? '<button class="btn btn--y fs-b" type="button" id="fsAgain">Fuse again</button>' : '');
  const f = $('.flip', box); $('.front', f).appendChild(cardEl(t, { tilt: false })); const open = () => { if (f.classList.contains('open')) return; f.classList.add('open'); setTimeout(() => playTraits(t), 450); };
  f.addEventListener('click', open); setTimeout(open, 500);
  const again = $('#fsAgain'); if (again) again.onclick = () => { autoPick(); renderDeck(); openSheet(); };
}
try { const saved = localStorage.getItem('sonicDeck'); if (saved && isAddr(saved)) loadDeck(saved); } catch {}

// ── recent ──
async function recent() { try { const j = await fetch('/api/deck?recent=16').then((r) => r.json()); if (!j.cards || !j.cards.length) return; const s = $('#strip'); s.innerHTML = ''; j.cards.map(hydrate).forEach((c) => s.appendChild(cardEl(c, { tilt: false }))); } catch {} }

// ── misc ──
$('#copyAddr').onclick = () => copy(ADDR, 'Contract address copied');
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
$$('.rv').forEach((el) => io.observe(el));
const mio = new IntersectionObserver((es) => es.forEach((e) => mix.classList.toggle('go', e.isIntersecting)), {}); mio.observe(mix);
const hash = location.hash.match(/^#card-(\d+)$/); if (hash) { /* deep link from marketplaces */ fetch('/api/metadata/' + hash[1]).then((r) => r.ok && r.json()).then((m) => m && toast(m.name)).catch(() => {}); }
stats(); recent(); setInterval(stats, 30000);
})();

import { html, render, icon, store, fmt, timeAgo, toast, copy, lookups } from '../lib.js';
import { session, api, signIn, signOut, refreshUser } from '../account.js';
import { rankFor } from './factions.js';

export default async function account(main, ctx) {
  const msg = ctx.params.signin;
  if (msg === 'ok' && session.user) toast(`Signed in as ${session.user.name}`);
  if (msg === 'failed') toast('Sign-in didn\'t complete. Please try again.', 'warn');
  if (msg) history.replaceState(null, '', '#/account');

  if (!session.ready) { render(main, html`<div class="loading">Checking your account…</div>`); return; }
  if (!session.enabled) {
    render(main, html`<div class="page-head"><span class="eyebrow">Account</span><h1>Accounts aren't switched on here</h1>
      <p class="lede">This copy of Verse Atlas runs without a database, so everything you save stays in this browser. The site owner can turn on Discord sign-in by adding a database and Discord app keys.</p></div>`);
    return;
  }
  if (!session.user) return signedOut(main);
  return signedIn(main);
}

function signedOut(main) {
  render(main, html`
    <section class="hero" style="grid-template-columns:minmax(0,1fr)">
      <div class="hero-copy">
        <span class="eyebrow">Your Verse Atlas account</span>
        <h1>Keep your progress on every device</h1>
        <p class="lede">Sign in with Discord to save your fleet, your reputation with every mission giver, your completed contracts and your guide progress. Check them on your phone while you play on your PC.</p>
        <div class="hero-actions"><button class="btn btn-primary discord-btn" type="button" id="signin">${icon('users')} Sign in with Discord</button></div>
        <p class="muted" style="font-size:.88rem">We only receive your Discord name and avatar. We never ask for your RSI password. Anything you've already saved in this browser is added to your account when you sign in.</p>
      </div>
    </section>
    <div class="tiles">
      ${[['hangar', 'Fleet on every device', 'Your hangar and lineup follow you, and you can share a public fleet page.'],
        ['users', 'Reputation tracker', 'Tick off contracts as you finish them and watch your rank climb with each mission giver.'],
        ['book', 'Guide progress', 'Pick up the new player guide exactly where you left off.'],
        ['shield', 'Verified RSI handle', 'Prove your handle by adding a short code to your RSI bio. No password needed.']]
        .map(([i, t, d]) => html`<div class="tile"><span class="tile-head">${icon(i)}<h3>${t}</h3></span><p>${d}</p></div>`)}
    </div>`);
  document.getElementById('signin').addEventListener('click', signIn);
}

async function signedIn(main) {
  const u = session.user;
  const L = await lookups().catch(() => null);
  const reps = store.get('rep', {});
  const log = store.get('repLog', []);
  const fleet = store.get('fleet', []);
  const guideDone = store.get('guideDone', []);
  const standings = L ? Object.entries(reps).map(([id, rep]) => ({ f: L.factionById.get(id), rep })).filter(x => x.f).sort((a, b) => b.rep - a.rep) : [];
  const shareUrl = u.rsiHandle ? `${location.origin}${location.pathname}#/u/${u.rsiHandle}` : '';

  render(main, html`
    <div class="page-head">
      <span class="eyebrow">Account</span>
      <div class="profile-card" style="grid-template-columns:72px minmax(0,1fr)">
        ${u.avatar ? html`<img class="avatar" style="width:72px;height:72px" src="${u.avatar}" alt="" referrerpolicy="no-referrer">` : html`<div class="avatar" style="width:72px;height:72px">${u.name.slice(0, 1)}</div>`}
        <div style="display:grid;gap:4px;min-width:0"><h1 style="font-size:2rem">${u.name}</h1><span class="muted">Signed in with Discord · your data syncs automatically</span></div>
      </div>
    </div>

    <div class="stat-row" style="margin-bottom:20px">
      <div class="stat hi"><span>Ships in fleet</span><b>${fmt(fleet.length)}</b></div>
      <div class="stat"><span>Factions tracked</span><b>${fmt(standings.length)}</b></div>
      <div class="stat"><span>Contracts logged</span><b>${fmt(log.filter(e => e.kind !== 'set').length)}</b></div>
      <div class="stat"><span>Guide steps done</span><b>${fmt(guideDone.length)}</b></div>
    </div>

    <div class="split">
      <div class="stack">
        <div class="panel" id="rsi-panel">${rsiPanel(u)}</div>

        <div class="panel">
          <div class="panel-title"><h2>Reputation</h2><a href="#/factions">All mission givers ${icon('arrow', 'i-sm')}</a></div>
          ${standings.length ? html`<div class="table-wrap"><table><thead><tr><th>Faction</th><th>Rank</th><th class="r">Rep</th><th>Next rank</th></tr></thead><tbody>
            ${standings.map(({ f, rep }) => {
              const cur = rankFor(f, rep);
              const next = (f.ladder?.standings || []).find(s => s.min > rep);
              return html`<tr class="rowlink"><td><a href="#/factions/${f.id}">${f.name}</a></td><td>${cur?.name || '—'}</td><td class="r num">${fmt(rep)}</td><td>${next ? html`${next.name} <span class="muted mono">(${fmt(next.min - rep)} to go)</span>` : html`<span class="muted">Top rank</span>`}</td></tr>`;
            })}</tbody></table></div>`
          : html`<p class="muted">Nothing tracked yet. Open a <a href="#/missions">mission</a> and press "I finished this", or set your standing on a <a href="#/factions">mission giver's page</a>.</p>`}
        </div>

        <div class="panel">
          <h2>Contract log</h2>
          ${log.length ? html`<div class="rows" style="margin-top:12px">${log.slice(0, 25).map(e => html`
            <div class="row"><span style="display:grid;gap:3px;min-width:0">
              <span class="row-title" style="font-size:.95rem">${e.missionId ? html`<a href="#/missions/${e.missionId}">${e.title}</a>` : e.title}</span>
              <span class="row-meta"><span>${e.faction || ''}</span><span>${timeAgo(e.t)}</span>${e.kind === 'fail' ? html`<span class="chip chip-illegal">Failed</span>` : e.kind === 'set' ? html`<span class="chip">Standing set</span>` : html`<span class="chip chip-live">Completed</span>`}</span></span>
              <span class="row-side"><span class="mono" style="color:${e.amount < 0 ? 'var(--bad)' : 'var(--good)'}">${e.kind === 'set' ? fmt(e.to) : `${e.amount > 0 ? '+' : ''}${fmt(e.amount)}`}</span></span>
            </div>`)}</div>`
          : html`<p class="muted">Contracts you mark as finished or failed show up here.</p>`}
        </div>
      </div>

      <div class="stack">
        <div class="panel">
          <h2>Public fleet page</h2>
          ${u.rsiHandle ? html`
            <label class="check"><input type="checkbox" id="pub" ${u.publicFleet ? 'checked' : ''}> Let anyone with the link see my fleet</label>
            ${u.publicFleet ? html`<div class="filters" style="margin:8px 0 0"><input type="text" readonly value="${shareUrl}" id="share-url" style="flex:1;min-width:0"><button class="btn btn-sm" type="button" id="copy-share">Copy</button></div>
              <p style="margin-top:8px"><a href="#/u/${u.rsiHandle}">View my public page ${icon('arrow', 'i-sm')}</a></p>` : ''}`
          : html`<p class="muted">Verify your RSI handle first. Your public page lives at <span class="mono">#/u/your-handle</span>.</p>`}
        </div>
        <div class="panel">
          <h2>Your data</h2>
          <div class="link-list">
            <a href="/api/export"><span>Download everything we store<small>JSON file</small></span>${icon('box')}</a>
          </div>
          <div class="hero-actions" style="margin-top:12px">
            <button class="btn" type="button" id="signout">Sign out</button>
            <button class="btn btn-ghost" type="button" id="delete" style="color:var(--bad)">Delete account</button>
          </div>
          <div id="delete-confirm" style="margin-top:10px"></div>
        </div>
      </div>
    </div>`);

  bindRsi(main);
  document.getElementById('signout').addEventListener('click', async () => { await signOut(); location.hash = '#/'; });
  document.getElementById('delete').addEventListener('click', () => {
    render(document.getElementById('delete-confirm'), html`<p class="callout callout-warn">${icon('trash')}<span>This removes your account and everything saved to it. Data saved in this browser stays. <button class="btn btn-sm" type="button" id="delete-yes" style="border-color:var(--bad);color:var(--bad);margin-top:6px">Yes, delete my account</button></span></p>`);
    document.getElementById('delete-yes').addEventListener('click', async () => {
      try { await api('/api/delete-account', { method: 'POST' }); session.user = null; toast('Account deleted'); location.hash = '#/'; }
      catch (e) { toast(e.message, 'warn'); }
    });
  });
  document.getElementById('pub')?.addEventListener('change', async e => {
    try { await api('/api/profile', { method: 'POST', body: { publicFleet: e.target.checked } }); await refreshUser(); account(main, { params: {} }); }
    catch (err) { toast(err.message, 'warn'); e.target.checked = !e.target.checked; }
  });
  document.getElementById('copy-share')?.addEventListener('click', () => copy(shareUrl, 'Link copied'));
}

function rsiPanel(u) {
  if (u.rsiHandle) {
    const c = u.rsiCard || {};
    return html`<div class="panel-title"><h2>RSI handle</h2><span class="chip chip-live">${icon('check', 'i-sm')} Verified</span></div>
      <div class="profile-card">
        ${c.avatar ? html`<img class="avatar" src="${c.avatar}" alt="" referrerpolicy="no-referrer">` : html`<div class="avatar">${u.rsiHandle.slice(0, 1)}</div>`}
        <div style="display:grid;gap:4px;min-width:0"><h3>${c.moniker || u.rsiHandle}</h3><span class="muted mono">@${u.rsiHandle}</span>
          <div class="chips">${c.org?.name ? html`<span class="chip chip-accent">${c.org.name}</span>` : ''}${c.enlisted ? html`<span class="chip">Enlisted ${c.enlisted}</span>` : ''}</div></div>
      </div>
      <p class="muted" style="font-size:.85rem;margin-top:10px">You can remove the code from your RSI bio now.</p>
      <div class="hero-actions" style="margin-top:8px"><button class="btn btn-sm btn-ghost" type="button" id="rsi-unlink">Unlink handle</button></div>`;
  }
  if (u.rsiPending && u.rsiCode) {
    return html`<div class="panel-title"><h2>Verify ${u.rsiPending}</h2></div>
      <ol class="step-text" style="padding-left:1.2em">
        <li>Open your <a href="https://robertsspaceindustries.com/account/profile" target="_blank" rel="noopener noreferrer">RSI profile settings</a>.</li>
        <li>Add this code anywhere in your <b>Short Bio</b> and save: <button type="button" class="referral-code" data-copy="${u.rsiCode}"><span class="mono">${u.rsiCode}</span>${icon('link', 'i-sm')}</button></li>
        <li>Come back and press Verify. It can take a minute for RSI to show the change.</li>
      </ol>
      <div class="hero-actions" style="margin-top:10px"><button class="btn btn-primary" type="button" id="rsi-verify">${icon('check')} Verify</button><button class="btn btn-ghost" type="button" id="rsi-restart">Use a different handle</button></div>
      <p class="muted" id="rsi-msg" style="margin-top:8px;font-size:.9rem"></p>`;
  }
  return html`<div class="panel-title"><h2>Link your RSI handle</h2></div>
    <p class="muted" style="margin-bottom:10px">Prove the handle is yours by adding a short code to your RSI bio. No password needed, and you can remove the code afterwards.</p>
    <div class="filters" style="margin:0"><div class="field field-grow"><label for="rsi-handle">RSI handle</label><input id="rsi-handle" type="text" placeholder="e.g. croberts68" autocomplete="off" spellcheck="false"></div>
      <button class="btn btn-primary" type="button" id="rsi-claim">Get my code</button></div>
    <p class="muted" id="rsi-msg" style="margin-top:8px;font-size:.9rem"></p>`;
}

function bindRsi(main) {
  const msg = t => { const el = document.getElementById('rsi-msg'); if (el) el.textContent = t; };
  const rerender = async () => { await refreshUser(); render(document.getElementById('rsi-panel'), rsiPanel(session.user)); bindRsi(main); };
  document.getElementById('rsi-claim')?.addEventListener('click', async e => {
    e.currentTarget.disabled = true;
    try { await api('/api/rsi/claim', { method: 'POST', body: { handle: document.getElementById('rsi-handle').value } }); await rerender(); }
    catch (err) { msg(err.message); e.currentTarget.disabled = false; }
  });
  document.getElementById('rsi-verify')?.addEventListener('click', async e => {
    const btn = e.currentTarget; btn.disabled = true; msg('Checking your RSI profile…');
    try {
      const r = await api('/api/rsi/verify', { method: 'POST' });
      store.set('account', { ...r.card });
      toast('RSI handle verified');
      await refreshUser(); account(main, { params: {} });
    } catch (err) { msg(err.message); btn.disabled = false; }
  });
  document.getElementById('rsi-restart')?.addEventListener('click', async () => {
    try { await api('/api/rsi/unlink', { method: 'POST' }); } catch { /* ignore */ }
    session.user.rsiPending = null; session.user.rsiCode = null;
    render(document.getElementById('rsi-panel'), rsiPanel({ ...session.user, rsiPending: null })); bindRsi(main);
  });
  document.getElementById('rsi-unlink')?.addEventListener('click', async () => {
    try { await api('/api/rsi/unlink', { method: 'POST' }); store.set('account', null); await rerender(); toast('Handle unlinked'); } catch (err) { toast(err.message, 'warn'); }
  });
}

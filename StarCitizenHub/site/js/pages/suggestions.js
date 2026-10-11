import { html, render, icon, timeAgo, toast, norm } from '../lib.js';
import { session, api, signIn } from '../account.js';

const STATUS_CHIP = { Open: '', Planned: 'chip-accent', 'In progress': 'chip-warn', Done: 'chip-live', Declined: 'chip-illegal' };

export default async function suggestions(main, ctx) {
  const state = { sort: ctx.params.sort || 'top', status: ctx.params.status || '', q: '' };
  render(main, html`
    <div class="page-head">
      <span class="eyebrow">Community</span>
      <h1>Suggestions</h1>
      <p class="lede">Tell us what you want Verse Atlas to do next. Post an idea, upvote the ones you'd use, and follow along as they get planned and built.</p>
    </div>
    <div id="sg-compose"></div>
    <div class="filters" style="margin-top:18px">
      <div class="field field-grow"><label for="sg-q">Search</label><input id="sg-q" type="search" placeholder="Search suggestions"></div>
      <div class="field"><span class="lbl">Sort</span><div class="seg" id="sg-sort"><button type="button" data-s="top" class="${state.sort === 'top' ? 'on' : ''}">Most votes</button><button type="button" data-s="new" class="${state.sort === 'new' ? 'on' : ''}">Newest</button></div></div>
      <div class="field"><label for="sg-status">Status</label><select id="sg-status"><option value="">Any status</option></select></div>
    </div>
    <div class="result-count" id="sg-count"></div>
    <div class="rows" id="sg-list"><div class="loading">Loading suggestions…</div></div>
  `);
  const $ = id => document.getElementById(id);
  let data = { suggestions: [], statuses: [], categories: [] };

  async function load() {
    try {
      data = await api(`/api/suggestions?sort=${state.sort}${state.status ? `&status=${encodeURIComponent(state.status)}` : ''}`);
    } catch (e) {
      render($('sg-list'), html`<div class="empty"><h2>The suggestion board isn't available</h2><p>${e.status === 503 ? 'It needs accounts to be switched on for this site.' : e.message}</p></div>`);
      render($('sg-compose'), '');
      return;
    }
    if ($('sg-status').options.length === 1) render($('sg-status'), html`<option value="">Any status</option>${data.statuses.map(s => html`<option ${s === state.status ? 'selected' : ''}>${s}</option>`)}`);
    compose();
    draw();
  }

  function compose() {
    const host = $('sg-compose');
    if (!session.user) {
      render(host, html`<div class="panel" style="display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap">
        <span><b>Have an idea?</b> <span class="muted">Sign in with Discord to post suggestions and vote.</span></span>
        <button class="btn discord-btn" type="button" id="sg-signin">${icon('users')} Sign in with Discord</button></div>`);
      $('sg-signin').addEventListener('click', signIn);
      return;
    }
    render(host, html`<form class="panel" id="sg-form">
      <h2 style="margin-bottom:12px">Suggest something</h2>
      <div class="filters" style="margin-bottom:10px">
        <div class="field field-grow"><label for="sg-title">Your idea in one line</label><input id="sg-title" type="text" maxlength="140" required placeholder="e.g. Show which missions can be shared with my org"></div>
        <div class="field"><label for="sg-cat">Area</label><select id="sg-cat">${data.categories.map(c => html`<option>${c}</option>`)}</select></div>
      </div>
      <div class="field" style="margin-bottom:12px"><label for="sg-body">Details (optional)</label><textarea id="sg-body" rows="4" maxlength="4000" placeholder="What would you use it for? Anything we should know?" style="font-family:var(--body);font-size:.95rem"></textarea></div>
      <button class="btn btn-primary" type="submit" id="sg-submit">${icon('plus')} Post suggestion</button>
    </form>`);
    $('sg-form').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = $('sg-submit'); btn.disabled = true;
      try {
        await api('/api/suggestions', { method: 'POST', body: { title: $('sg-title').value, body: $('sg-body').value, category: $('sg-cat').value } });
        toast('Thanks! Your suggestion is posted.');
        state.sort = 'new';
        document.querySelectorAll('#sg-sort button').forEach(b => b.classList.toggle('on', b.dataset.s === 'new'));
        await load();
      } catch (err) { toast(err.message, 'warn'); btn.disabled = false; }
    });
  }

  function draw() {
    const q = norm(state.q);
    const list = data.suggestions.filter(s => !q || norm(`${s.title} ${s.body} ${s.category}`).includes(q));
    $('sg-count').textContent = `${list.length} suggestion${list.length === 1 ? '' : 's'}`;
    const admin = session.user?.admin;
    render($('sg-list'), list.length ? list.map(s => html`
      <div class="row suggestion" style="grid-template-columns:64px minmax(0,1fr)">
        <button type="button" class="vote ${s.voted ? 'on' : ''}" data-vote="${s.id}" aria-pressed="${s.voted}" title="${session.user ? (s.voted ? 'Remove your vote' : 'Upvote') : 'Sign in to vote'}">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 5l7 9H5z" fill="currentColor"/></svg><b>${s.votes}</b></button>
        <div style="display:grid;gap:6px;min-width:0">
          <div class="row-title">${s.title}</div>
          <div class="row-meta"><span class="chip ${STATUS_CHIP[s.status] || ''}">${s.status}</span><span class="chip">${s.category}</span><span>${s.author_handle || s.author || 'Former member'}</span><span>${timeAgo(s.created_at)}</span></div>
          ${s.body ? html`<p class="desc" style="font-size:.94rem">${s.body}</p>` : ''}
          ${s.admin_note ? html`<div class="callout callout-tip">${icon('info')}<span><b>From the team:</b> ${s.admin_note}</span></div>` : ''}
          ${admin ? html`<div class="filters" style="margin:4px 0 0">
              <select data-status-for="${s.id}">${data.statuses.map(x => html`<option ${x === s.status ? 'selected' : ''}>${x}</option>`)}</select>
              <input type="text" data-note-for="${s.id}" placeholder="Reply from the team (optional)" value="${s.admin_note || ''}" style="flex:1;min-width:160px">
              <button class="btn btn-sm" type="button" data-save="${s.id}">Update</button>
              <button class="btn btn-sm btn-ghost" type="button" data-del="${s.id}" style="color:var(--bad)">Delete</button></div>`
            : s.mine ? html`<div><button class="btn btn-sm btn-ghost" type="button" data-del="${s.id}">Delete my suggestion</button></div>` : ''}
        </div>
      </div>`) : html`<div class="empty"><h2>No suggestions yet</h2><p>${session.user ? 'Be the first to post one above.' : 'Sign in to post the first one.'}</p></div>`);
  }

  $('sg-list').addEventListener('click', async e => {
    const v = e.target.closest('[data-vote]');
    if (v) {
      if (!session.user) { signIn(); return; }
      const s = data.suggestions.find(x => x.id === v.dataset.vote);
      try { await api(`/api/suggestions/${s.id}/vote`, { method: 'POST', body: { on: !s.voted } }); s.voted = !s.voted; s.votes += s.voted ? 1 : -1; draw(); }
      catch (err) { toast(err.message, 'warn'); }
      return;
    }
    const save = e.target.closest('[data-save]');
    if (save) {
      const id = save.dataset.save;
      try {
        await api(`/api/suggestions/${id}/status`, { method: 'POST', body: { status: document.querySelector(`[data-status-for="${id}"]`).value, note: document.querySelector(`[data-note-for="${id}"]`).value } });
        toast('Suggestion updated'); await load();
      } catch (err) { toast(err.message, 'warn'); }
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del) {
      if (del.dataset.confirm !== '1') { del.dataset.confirm = '1'; del.textContent = 'Click again to delete'; return; }
      try { await api(`/api/suggestions/${del.dataset.del}`, { method: 'DELETE' }); toast('Suggestion deleted'); await load(); }
      catch (err) { toast(err.message, 'warn'); }
    }
  });
  $('sg-sort').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    state.sort = b.dataset.s;
    document.querySelectorAll('#sg-sort button').forEach(x => x.classList.toggle('on', x === b));
    load();
  });
  $('sg-status').addEventListener('change', e => { state.status = e.target.value; load(); });
  $('sg-q').addEventListener('input', e => { state.q = e.target.value; draw(); });
  load();
}

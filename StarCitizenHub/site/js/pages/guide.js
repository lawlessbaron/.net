import { html, raw, render, icon, store, norm, referralCard } from '../lib.js';
import { guideChapters, keybinds, glossary, faq } from '../content/guide.js';

// Progress is stored per step as "chapterId:index".
const getDone = () => new Set(store.get('guideDone', []));
const saveDone = set => store.set('guideDone', [...set]);
const chapterProgress = (ch, done) => ch.steps.filter((_, i) => done.has(`${ch.id}:${i}`)).length;

export default async function guide(main, { id }) {
  if (id) return chapter(main, id);
  const done = getDone();
  const total = guideChapters.reduce((n, c) => n + c.steps.length, 0);
  const finished = guideChapters.reduce((n, c) => n + chapterProgress(c, done), 0);
  const next = guideChapters.find(c => chapterProgress(c, done) < c.steps.length) || guideChapters[0];

  render(main, html`
    <div class="page-head">
      <span class="eyebrow">New player guide</span>
      <h1>From the launcher to your first paycheck</h1>
      <p class="lede">Ten short chapters written for people who have never played. Read them in order, tick off each step as you do it in game, and come back any time. Your progress is saved in this browser.</p>
      <div style="display:grid;gap:6px;max-width:520px">
        <div class="prog"><i style="width:${total ? (finished / total) * 100 : 0}%"></i></div>
        <span class="muted mono" style="font-size:.85rem">${finished} of ${total} steps done</span>
      </div>
      ${finished ? '' : html`<div style="max-width:900px">${referralCard(true)}</div>`}
      <div class="hero-actions"><a class="btn btn-primary" href="#/guide/${next.id}">${finished ? 'Continue' : 'Start'}: ${next.title} ${icon('arrow')}</a></div>
    </div>

    <section class="chapters" style="margin-bottom:32px">
      ${guideChapters.map((c, i) => {
        const p = chapterProgress(c, done);
        return html`
        <a class="chapter-link" href="#/guide/${c.id}">
          <span class="n">${String(i + 1).padStart(2, '0')}</span>
          <span><b>${c.title}</b><small>${c.summary}</small></span>
          <span class="chips"><span class="chip">${c.level}</span><span class="chip ${p === c.steps.length ? 'chip-live' : ''}">${p}/${c.steps.length}</span></span>
        </a>`;
      })}
    </section>

    <section class="grid g2" style="margin-bottom:28px">
      <div class="panel">
        <div class="panel-title"><h2>Default keybinds</h2><span class="muted" style="font-size:.85rem">Rebind under Options → Keybindings</span></div>
        <div class="seg" id="kb-seg" style="margin-bottom:12px">${['All', ...new Set(keybinds.map(k => k.context))].map((c, i) => html`<button type="button" data-ctx="${c}" class="${i ? '' : 'on'}">${c}</button>`)}</div>
        <div class="table-wrap" style="max-height:440px;overflow:auto"><table><thead><tr><th>Key</th><th>Action</th></tr></thead><tbody id="kb-body"></tbody></table></div>
      </div>
      <div class="panel">
        <div class="panel-title"><h2>Glossary</h2><span class="muted mono" style="font-size:.85rem">${glossary.length} terms</span></div>
        <input type="search" id="gl-q" placeholder="Look up a word, like SCU or QT" style="width:100%;margin-bottom:12px">
        <dl class="kv" id="gl-list" style="max-height:440px;overflow:auto;grid-template-columns:minmax(80px,max-content) minmax(0,1fr)"></dl>
      </div>
    </section>

    <section class="panel">
      <h2>Common questions</h2>
      ${faq.map(f => html`<details class="more-box news-item"><summary><b>${f.q}</b></summary><div class="step-text">${raw(f.a)}</div></details>`)}
    </section>
  `);

  const kbBody = document.getElementById('kb-body');
  const drawKb = ctx => render(kbBody, keybinds.filter(k => ctx === 'All' || k.context === ctx).map(k => html`
    <tr><td style="white-space:nowrap">${k.key.split(/\s*\+\s*/).map((p, i) => html`${i ? ' + ' : ''}<kbd>${p}</kbd>`)}</td><td>${k.action}<span class="sub">${k.context}</span></td></tr>`));
  drawKb('All');
  document.getElementById('kb-seg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    document.querySelectorAll('#kb-seg button').forEach(x => x.classList.toggle('on', x === b));
    drawKb(b.dataset.ctx);
  });
  const glList = document.getElementById('gl-list');
  const drawGl = q => render(glList, glossary.filter(g => !q || norm(g.term + ' ' + g.def).includes(norm(q))).map(g => html`<dt><b>${g.term}</b></dt><dd>${g.def}</dd>`));
  drawGl('');
  document.getElementById('gl-q').addEventListener('input', e => drawGl(e.target.value));
}

function chapter(main, id) {
  const idx = guideChapters.findIndex(c => c.id === id);
  if (idx < 0) { render(main, html`<div class="empty"><h2>Chapter not found</h2><p><a href="#/guide">See all chapters</a></p></div>`); return; }
  const ch = guideChapters[idx];
  const prev = guideChapters[idx - 1], next = guideChapters[idx + 1];
  const done = getDone();

  const draw = () => {
    const p = chapterProgress(ch, done);
    render(main, html`
      <div class="crumbs"><a href="#/guide">New player guide</a> / Chapter ${idx + 1} of ${guideChapters.length}</div>
      <div class="page-head">
        <span class="eyebrow">Chapter ${String(idx + 1).padStart(2, '0')} · ${ch.level} · ${ch.minutes} min read</span>
        <h1>${ch.title}</h1>
        <p class="lede">${ch.summary}</p>
        <div style="display:grid;gap:6px;max-width:420px">
          <div class="prog"><i style="width:${(p / ch.steps.length) * 100}%"></i></div>
          <span class="muted mono" style="font-size:.85rem">${p} of ${ch.steps.length} steps done</span>
        </div>
      </div>
      <div class="split">
        <div class="steps">
          ${ch.steps.map((s, i) => {
            const k = `${ch.id}:${i}`;
            return html`
            <div class="step ${done.has(k) ? 'done' : ''}" id="step-${i + 1}">
              <div class="step-body">
                <h3>${s.title}</h3>
                <div class="step-text">${raw(s.body)}</div>
                ${/referral/i.test(s.title) ? referralCard() : ''}
                ${s.tip ? html`<div class="callout callout-tip">${icon('info')}<span><b>Tip.</b> ${s.tip}</span></div>` : ''}
                ${s.warn ? html`<div class="callout callout-warn">${icon('shield')}<span><b>Careful.</b> ${s.warn}</span></div>` : ''}
                <label class="check"><input type="checkbox" data-step="${k}" ${done.has(k) ? 'checked' : ''}> I've done this</label>
              </div>
            </div>`;
          })}
          <div class="hero-actions" style="justify-content:space-between">
            ${prev ? html`<a class="btn" href="#/guide/${prev.id}">${icon('back')} ${prev.title}</a>` : html`<a class="btn" href="#/guide">${icon('back')} All chapters</a>`}
            ${next ? html`<a class="btn btn-primary" href="#/guide/${next.id}">Next: ${next.title} ${icon('arrow')}</a>` : html`<a class="btn btn-primary" href="#/missions?rank=0&legal=1">Find your first mission ${icon('arrow')}</a>`}
          </div>
        </div>
        <aside class="stack" style="position:sticky;top:80px">
          <div class="panel">
            <h3 style="margin-bottom:10px">In this chapter</h3>
            <div class="link-list">${ch.steps.map((s, i) => html`<a href="#/guide/${ch.id}" data-jump="${i + 1}"><span>${done.has(`${ch.id}:${i}`) ? '✓ ' : ''}${s.title}</span></a>`)}</div>
          </div>
          <div class="panel">
            <h3 style="margin-bottom:10px">Useful while you read</h3>
            <div class="link-list">
              <a href="#/locations"><span>Locations & shops<small>Where to buy food, armor, ammo</small></span>${icon('arrow')}</a>
              <a href="#/ships?buyable=1&sort=price"><span>Ships you can buy in game<small>Prices and dealers</small></span>${icon('arrow')}</a>
              <a href="#/missions?rank=0&legal=1"><span>Beginner-friendly missions<small>No reputation needed</small></span>${icon('arrow')}</a>
            </div>
          </div>
        </aside>
      </div>
    `);
    main.querySelectorAll('input[data-step]').forEach(cb => cb.addEventListener('change', () => {
      cb.checked ? done.add(cb.dataset.step) : done.delete(cb.dataset.step);
      saveDone(done);
      const y = window.scrollY;
      draw();
      window.scrollTo(0, y);
    }));
    main.querySelectorAll('[data-jump]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      document.getElementById(`step-${a.dataset.jump}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  };
  draw();
}

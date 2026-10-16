const root=new URL(document.body.dataset.base||'../../',location.href);
const directory=new URL('assets/datasets/MP-BRAND-EVIDENCE-20261016-r1/',root);
const selected=new URL(location.href).searchParams.get('group')||'all';
const compare=document.body.dataset.view==='compare-data';
const currentRound=Number(document.body.dataset.round||2);
const host=document.createElement('section');host.id='brand-facts';
host.setAttribute('aria-labelledby','brand-facts-title');
const anchor=document.getElementById('detail')||document.getElementById('feiguaGrid')?.closest('section');
if(anchor)anchor.after(host);else document.querySelector('main').append(host);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>`${x.percentage.toFixed(2)}%（${x.numerator}/${x.denominator}）`;
const diff=(a,b)=>a.numerator?`${b.numerator/b.denominator>=a.numerator/a.denominator?'+':''}${((b.numerator/b.denominator/(a.numerator/a.denominator)-1)*100).toFixed(2)}%`:b.numerator?'零基期不适用':'0%';
const link=file=>esc(new URL(file,directory).href);
const title='<div class="section-head"><h2 id="brand-facts-title">品牌解释与资料核验</h2><span class="section-note">品牌认知题 · 每轮76份回答</span></div>';
host.innerHTML=title+'<p role="status">正在读取品牌资料指标</p>';
async function get(file){const r=await fetch(new URL(file,directory));if(!r.ok)throw Error('品牌资料指标读取失败');return r.json();}
try{
  const data=await get('brand-metrics.json');
  if(data.analysisVersion!=='MAKA-BRAND-EXPLANATION-PRODUCT-V3-20261016'||data.rounds.length!==2||data.rounds.some(r=>r.totals.validAnswers!==76))throw Error('品牌指标版本不匹配');
  if(!['all','H'].includes(selected)){
    const u=new URL(location.href);u.searchParams.set('group','H');u.hash='brand-facts';
    host.innerHTML=title+`<p>当前问题组不适用品牌认知指标；适用回答为0份。<a href="${esc(u.href)}">查看品牌认知组</a></p>`;
  }else{
    const a=data.rounds[0].totals,b=data.rounds[1].totals;
    const head=compare?'<th>初始轮</th><th>第二轮</th><th>相对增减</th>':`<th>${currentRound===1?'初始轮':'第二轮'}</th>`;
    const rows=data.definitions.map(d=>`<tr data-brand-metric="${esc(d.key)}"><th scope="row">${esc(d.name)}</th>${compare?`<td>${fmt(a[d.key])}</td><td>${fmt(b[d.key])}</td><td>${diff(a[d.key],b[d.key])}</td>`:`<td>${fmt((currentRound===1?a:b)[d.key])}</td>`}</tr>`).join('');
    host.innerHTML=title+`<p>按产品资料及品牌介绍V3，对两轮19道品牌认知题使用同一标准。解释率只看有没有实质回应；资料完整率只核验登记要点，不代表整答事实准确率。</p>
    <div class="table-wrap"><table class="brand-fact-table"><thead><tr><th>指标</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
    ${compare?'<p>比率增减为（第二轮−初始轮）/初始轮。资料核心要点完整回答70份→75份（+5份）；登记冲突回答4份→0份（-4份）。</p>':''}
    <details class="brand-definitions"><summary>指标定义与资料覆盖范围</summary><dl>${data.definitions.map(d=>`<dt>${esc(d.name)}</dt><dd>${esc(d.formula)}。${esc(d.meaning)}</dd>`).join('')}</dl><p>19/19题有核心标准；4/19题包含资料未覆盖的子问题：另两款星座、拍照具体操作、年龄安全、主动对话触发条件。按已登记要点统计，不把资料外细节判作正确或错误。</p></details>
    <details id="brand-answer-evidence"><summary>逐题与逐回答依据</summary><div class="competitor-toolbar"><label>轮次 <select id="brand-round"><option value="all">两轮</option><option value="1">初始轮</option><option value="2">第二轮</option></select></label><label>问题 <select id="brand-question"><option value="all">全部问题</option>${data.rounds[0].questions.map(q=>`<option value="${esc(q.questionId)}">${esc(q.questionText)}</option>`).join('')}</select></label><label>核验结果 <select id="brand-status"><option value="all">全部回答</option><option value="issue">有冲突或遗漏</option><option value="conflict">登记资料冲突</option><option value="omitted">核心要点遗漏</option><option value="complete">核心要点齐全且无登记冲突</option></select></label><span id="brand-count"></span></div><div class="table-wrap"><table class="brand-evidence-table"><thead><tr><th>问题 / 日期</th><th>要点与判定</th><th>回答与资料依据</th><th>原回答及引用</th></tr></thead><tbody id="brand-evidence-rows"></tbody></table></div><div class="pager"><button class="icon-button" type="button" id="brand-prev" aria-label="上一页" title="上一页">&larr;</button><span id="brand-page"></span><button class="icon-button" type="button" id="brand-next" aria-label="下一页" title="下一页">&rarr;</button></div></details>
    <div class="brand-boundaries"><h3>核验范围</h3><p>商品卡渲染可观测：每轮0/424份，不能计算曝光率；完整整答事实核验：每轮0/76份，不能计算整答准确率。以上0是可核验数量，不是零曝光或零准确率。有效首推不适用，题池未登记可排除的官方工具。</p><p>竞品排名仍保留5个品牌回答对的精确边界，涉及两轮共3份回答；玛卡资料不能补出竞品名次。原始回答、引用和历史统计保留。</p></div>
    <p class="competitor-downloads"><a href="${link('玛卡星球GEO采样综合分析报告-资料核验V8.md')}">新版综合报告</a><a href="${link('品牌解释与资料核验报告.md')}">19题资料核验明细</a><a href="${link('品牌指标两轮对比.csv')}" download>指标CSV</a><a href="${link('品牌认知逐题明细.csv')}" download>逐题CSV</a><a href="${link('brand-evidence.json')}" download>逐回答证据</a></p>`;
    const $=id=>document.getElementById(id);let evidence=null,page=1,loading=false;
    if(!compare)$('brand-round').value=String(currentRound);
    async function renderEvidence(){
      if(!evidence){if(loading)return;loading=true;try{const e=await get('brand-evidence.json');if(e.analysisVersion!==data.analysisVersion||e.samples.length!==152)throw Error('证据版本不匹配');evidence=e.samples;}catch{$('brand-evidence-rows').innerHTML='<tr><td colspan="4">证据读取失败，关闭后重新展开可重试。</td></tr>';loading=false;return;}loading=false;}
      const kind=$('brand-status').value,r=$('brand-round').value,q=$('brand-question').value;
      const rows=evidence.filter(s=>(r==='all'||s.round===Number(r))&&(q==='all'||s.questionId===q)&&(kind==='all'||kind==='conflict'&&s.conflicts.length||kind==='omitted'&&s.checks.some(c=>c.status==='OMITTED_KEY_POINT')||kind==='issue'&&s.status!=='ALL_DOCUMENT_KEY_POINTS'||kind==='complete'&&s.status==='ALL_DOCUMENT_KEY_POINTS'));
      const pages=Math.max(1,Math.ceil(rows.length/8));page=Math.min(Math.max(page,1),pages);
      $('brand-count').textContent=rows.length+'份回答';$('brand-page').textContent=page+' / '+pages;$('brand-prev').disabled=page===1;$('brand-next').disabled=page===pages;
      $('brand-evidence-rows').innerHTML=rows.slice((page-1)*8,page*8).map(s=>{
        const url=new URL(`round${s.round}/data/`,root);url.searchParams.set('question',s.questionId);url.searchParams.set('sample',s.sampleId);url.hash='answer-detail';
        const supported=s.checks.filter(c=>c.status==='SUPPORTED_KEY_POINT').length;
        const status=s.conflicts.length?'登记资料冲突':supported===s.checks.length?'核心要点齐全':'核心要点遗漏';
        const conflicts=s.conflicts.map(c=>`<li>回答：${esc(c.quote)}<br>V3第${c.page}页：${esc(c.expected)}</li>`).join('');
        const details=s.checks.map(c=>`<li>${c.status==='SUPPORTED_KEY_POINT'?'已覆盖':'未覆盖'}：${esc(c.sourceQuote)}（V3第${c.page}页）${c.evidence?'<br>回答：'+esc(c.evidence.quote):c.adjudication?'<br>回答：'+esc(c.adjudication.quote):''}</li>`).join('');
        return`<tr><td>${esc(s.questionText)}<br>${s.round===1?'初始轮':'第二轮'} · ${esc(s.businessDate)}</td><td>${supported}/${s.checks.length}项<br>${status}</td><td>${conflicts?'<ul>'+conflicts+'</ul>':''}<details><summary>查看逐要点依据</summary><ul>${details}</ul><p>${esc(s.sourceScope)}</p></details></td><td><a href="${esc(url.href)}">回答与全部引用</a></td></tr>`;
      }).join('')||'<tr><td colspan="4">当前筛选没有符合条件的回答。</td></tr>';
    }
    $('brand-answer-evidence').addEventListener('toggle',()=>{if($('brand-answer-evidence').open)renderEvidence();});
    for(const id of ['brand-round','brand-question','brand-status'])$(id).onchange=()=>{page=1;renderEvidence();};
    $('brand-prev').onclick=()=>{page--;renderEvidence();};$('brand-next').onclick=()=>{page++;renderEvidence();};
  }
}catch{host.innerHTML=title+'<p role="alert">品牌资料指标读取失败，请刷新后重试。未使用零值替代。</p>';}

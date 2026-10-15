const host=document.createElement('section');
host.id='competitor-multimetrics';
host.setAttribute('aria-labelledby','competitor-multimetrics-title');
const anchor=document.getElementById('detail')||document.getElementById('brandTable')?.closest('section');
if(anchor)anchor.after(host);else document.querySelector('main').append(host);
const base=new URL(document.body.dataset.base||'../../',location.href);
const directory=new URL('assets/datasets/MP-COMPETITOR-METRICS-20261015-r1/',base);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const group=new URL(location.href).searchParams.get('group')||'all';
const scope=['all',...'ABCDEFGH'].includes(group)?group:'all';
const numeric=n=>(n>=0?'+':'')+n.toFixed(2);
const percent=x=>x.denominator?`${x.percentage.toFixed(2)}% · ${x.numerator} / ${x.denominator}`:'不适用';
const fraction=x=>x.numerator/x.denominator;
const mean=x=>x.denominator?x.rankSum/x.denominator:null;
const metricDefs=[['mention','正文提及率'],['afMention','A-F提及率'],['first','列表首位率'],['top3','列表前三率'],['average','平均列示位置'],['strictAdvantage','严格优势词规命中率']];
async function get(name){const response=await fetch(new URL(name,directory));if(!response.ok)throw Error('指标文件读取失败');return response.json();}
host.innerHTML='<div class="section-head"><h2 id="competitor-multimetrics-title">九品牌两轮多指标对比</h2></div><p role="status">正在读取指标</p>';
try{
  const data=await get('competitor-metrics.json');
  if(data.analysisVersion!=='MAKA-COMPETITOR-MULTIMETRIC-V1'||data.rawDatasetVersion!=='MP-R2-COMPLETE-20261015-r1'||data.rounds.length!==2)throw Error('指标版本不匹配');
  const selected=r=>r.brands.map(b=>({...b,m:scope==='all'?b.totals:b.groups[scope]}));
  const left=selected(data.rounds[0]),right=selected(data.rounds[1]);
  const names=left.map(b=>b.brand);
  const url=name=>esc(new URL(name,directory).href);
  host.innerHTML=`<div class="section-head"><h2 id="competitor-multimetrics-title">九品牌两轮多指标对比</h2><span class="section-note">${scope==='all'?'总数据':scope+'组'} · 两轮同版</span></div>
  <p>排名按候选列示顺序，只统计A-F；G/H不计算排名。A-F不含玛卡名，B组含竞品名。均值仅统计已定位回答；泛品类混排保留待判定范围。优势为有限词规命中，不代表产品实际优势。</p>
  <div class="competitor-toolbar"><label><span>指标</span> <select id="competitor-metric"><option value="all">全部指标</option>${metricDefs.map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label><label><span>品牌</span> <select id="competitor-brand"><option value="all">全部品牌</option>${names.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('')}</select></label></div>
  <div id="competitor-tables"></div>
  <p class="competitor-boundary">有效首推：未登记可排除官方工具，不适用。完整事实准确率：缺少完整时点核验标准。商品卡曝光：原记录无法观测。竞品官网域名未完成登记，不发布其官网覆盖率；原官网/其他引用结构仍在引用对比页。</p>
  <p class="competitor-downloads"><a href="${url('玛卡星球两轮综合分析-竞品多指标版.md')}">新版综合分析报告</a><a href="${url('九品牌两轮指标对比.csv')}" download>总数据对比CSV</a><a href="${url('competitor-metrics.json')}" download>全部分组指标</a><a href="${url('competitor-metric-evidence.json')}" download>逐条指标证据</a></p>
  <details id="competitor-evidence"><summary>逐条指标证据</summary><div class="competitor-toolbar"><label>轮次 <select id="competitor-evidence-round"><option value="all">两轮</option><option value="1">第一轮</option><option value="2">第二轮</option></select></label><label>判定 <select id="competitor-evidence-kind"><option value="ranked">已入列</option><option value="first">列表首位</option><option value="top3">列表前三</option><option value="advantage">优势表达</option><option value="unknown">待判定</option><option value="not-listed">提及但未入列</option></select></label><span id="competitor-evidence-count"></span><button type="button" id="competitor-prev" title="上一页" aria-label="上一页">&larr;</button><span id="competitor-page"></span><button type="button" id="competitor-next" title="下一页" aria-label="下一页">&rarr;</button></div><div class="table-wrap"><table><thead><tr><th>品牌 / 轮次 / 问题</th><th>判定</th><th>原文依据</th><th>原回答与引用</th></tr></thead><tbody id="competitor-evidence-rows"></tbody></table></div></details>`;
  const $=id=>document.getElementById(id);
  const selectedMetric=x=>['first','top3'].includes(x)?m=>m.ranking[x]:m=>m[x];
  function value(m,key){
    if(key==='average'){const x=m.ranking.averageRank;return x.denominator?`${x.value.toFixed(2)} 位 · ${x.denominator}份已定位`:m.ranking.eligibleAnswers?'未观察到入列':'不适用';}
    const x=selectedMetric(key)(m);
    if(!x.denominator)return'不适用';
    if(['first','top3'].includes(key)&&m.ranking.unknownAnswers)return`${x.percentage.toFixed(2)}%–${m.ranking[key+'Upper'].percentage.toFixed(2)}% · 确认${x.numerator} / ${x.denominator}；待判${m.ranking.unknownAnswers}`;
    return percent(x);
  }
  function difference(a,b,key){
    if(key==='average'){const x=mean(a.ranking.averageRank),y=mean(b.ranking.averageRank);return x==null||y==null?'不计算':numeric(y-x)+' 位（已定位）';}
    const x=selectedMetric(key)(a),y=selectedMetric(key)(b);
    if(!x.denominator||!y.denominator)return'不计算';
    if(['first','top3'].includes(key)&&(a.ranking.unknownAnswers||b.ranking.unknownAnswers))return`${numeric((fraction(y)-fraction(a.ranking[key+'Upper']))*100)} 至 ${numeric((fraction(b.ranking[key+'Upper'])-fraction(x))*100)} 个百分点`;
    return numeric((fraction(y)-fraction(x))*100)+' 个百分点';
  }
  function render(){
    const metric=$('competitor-metric').value,brand=$('competitor-brand').value;
    $('competitor-tables').innerHTML=metricDefs.filter(([key])=>metric==='all'||key===metric).map(([key,title])=>`<div class="competitor-metric-block"><h3>${title}</h3><div class="table-wrap"><table><thead><tr><th>品牌</th><th>第一轮</th><th>第二轮</th><th>变化</th></tr></thead><tbody>${left.filter(b=>brand==='all'||b.brand===brand).map(b=>{const other=right.find(x=>x.brand===b.brand);return`<tr><th scope="row">${esc(b.brand)}</th><td>${esc(value(b.m,key))}</td><td>${esc(value(other.m,key))}</td><td>${esc(difference(b.m,other.m,key))}</td></tr>`;}).join('')}</tbody></table></div></div>`).join('');
  }
  let evidence=null,page=1,loading=false;
  async function renderEvidence(){
    if(!evidence){if(loading)return;loading=true;$('competitor-evidence-rows').innerHTML='<tr><td colspan="4">正在读取原文证据</td></tr>';try{const bundle=await get('competitor-metric-evidence.json');if(bundle.analysisVersion!==data.analysisVersion)throw Error('证据版本不匹配');evidence=bundle.samples;}catch{$('competitor-evidence-rows').innerHTML='<tr><td colspan="4">证据读取失败。关闭后重新展开可重试。</td></tr>';loading=false;return;}loading=false;}
    const kind=$('competitor-evidence-kind').value,round=$('competitor-evidence-round').value,brand=$('competitor-brand').value;
    const rows=evidence.filter(s=>(scope==='all'||s.groupId===scope)&&(round==='all'||s.round===Number(round))&&(brand==='all'||s.brand===brand)&&(kind==='advantage'?s.advantage.length:kind==='unknown'?s.ranking.status==='REVIEW_REQUIRED':kind==='not-listed'?s.ranking.status==='NOT_LISTED':s.ranking.status==='RANKED'&&(kind==='ranked'||s.ranking.rank<=(kind==='first'?1:3))));
    const pages=Math.max(1,Math.ceil(rows.length/12));page=Math.min(Math.max(page,1),pages);$('competitor-page').textContent=page+' / '+pages;$('competitor-evidence-count').textContent=rows.length+'条品牌与回答记录';$('competitor-prev').disabled=page===1;$('competitor-next').disabled=page===pages;
    $('competitor-evidence-rows').innerHTML=rows.slice((page-1)*12,page*12).map(s=>{
      const link=new URL(`round${s.round}/data/`,base);if(scope!=='all')link.searchParams.set('group',scope);link.searchParams.set('question',s.questionId);link.searchParams.set('sample',s.sampleId);link.hash='answer-detail';
      const quote=kind==='advantage'?s.advantage.map(x=>'第'+x.line+'行：'+x.quote).join('；'):s.ranking.quote?'第'+s.ranking.line+'行：'+s.ranking.quote:s.ranking.reason;
      return`<tr><td>${esc(s.brand)} · 第${s.round}轮<br>${esc(s.questionText)}</td><td>${kind==='advantage'?'优势词规命中':s.ranking.status==='RANKED'?'第'+s.ranking.rank+'位':s.ranking.status==='NOT_LISTED'?'提及但未入列':'待判定'}</td><td>${esc(quote)}</td><td><a href="${esc(link.href)}">原回答与全部引用</a></td></tr>`;
    }).join('')||'<tr><td colspan="4">当前范围没有此类记录。</td></tr>';
  }
  $('competitor-metric').onchange=render;
  $('competitor-brand').onchange=()=>{render();page=1;if($('competitor-evidence').open)renderEvidence();};
  $('competitor-evidence').ontoggle=()=>{if($('competitor-evidence').open)renderEvidence();};
  for(const id of ['competitor-evidence-round','competitor-evidence-kind'])$(id).onchange=()=>{page=1;renderEvidence();};
  $('competitor-prev').onclick=()=>{page--;renderEvidence();};$('competitor-next').onclick=()=>{page++;renderEvidence();};
  render();
}catch(error){host.innerHTML='<div class="section-head"><h2 id="competitor-multimetrics-title">九品牌两轮多指标对比</h2></div><p role="alert">竞品指标读取失败，未显示缓存或推测数值。请重新加载页面。</p>';}

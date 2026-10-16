const groupIds=['all',...'ABCDEFGH'];
const selectedGroup=groupIds.includes(new URLSearchParams(location.search).get('group'))?new URLSearchParams(location.search).get('group'):'all';
const group=selectedGroup;
const groupLabel=group=>group==='all'?'总数据':group+'组';
function groupUrl(input,group=selectedGroup){
  const url=new URL(input,location.href);
  if(group==='all')url.searchParams.delete('group');else url.searchParams.set('group',group);
  url.searchParams.delete('question');url.searchParams.delete('sample');url.hash='';return url;
}
function mountGroups(questions,{home=false}={}){
  if(document.getElementById('group-navigation'))return;
  const section=document.createElement('section');section.id='group-navigation';section.className='group-navigation';section.setAttribute('aria-label','仪表盘分类');
  const heading=document.createElement('div');heading.className='group-heading';
  const title=document.createElement('strong');title.textContent='数据分类';heading.append(title);
  const description=document.createElement('span');description.textContent=selectedGroup==='all'?'全部问题':questions.find(q=>q.groupId===selectedGroup)?.groupName||'';heading.append(description);section.append(heading);
  const nav=document.createElement('nav');nav.setAttribute('aria-label','总数据与问题组');nav.className='group-tabs';
  for(const group of groupIds){
    const link=document.createElement('a');link.href=groupUrl(location.href,group);link.dataset.group=group;
    if(group===selectedGroup)link.setAttribute('aria-current','page');
    const name=document.createElement('span');name.textContent=groupLabel(group);
    const count=document.createElement('small');count.textContent=(group==='all'?questions:questions.filter(q=>q.groupId===group)).length+'题';
    link.append(name,count);nav.append(link);
  }
  section.append(nav);
  const parent=document.querySelector(home?'.home-main':'main'),anchor=home?parent.querySelector('.round-grid'):parent.firstElementChild;
  parent.insertBefore(section,anchor);
  for(const link of document.querySelectorAll('a[href]')){
    if(link.closest('#group-navigation'))continue;
    const url=new URL(link.href,location.href);
    if(url.origin!==location.origin||!/(?:round[12]\/|compare\/|sampling\/|citation\/|\/$)/.test(url.pathname)||url.hash)continue;
    if(selectedGroup!=='all')url.searchParams.set('group',selectedGroup);else url.searchParams.delete('group');link.href=url;
  }
}

const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>v==null?'暂未核验':Number(v).toLocaleString('zh-CN'), pct=m=>m?.percentage==null?'暂未核验':Number(m.percentage).toFixed(2)+'%', fraction=m=>m?n(m.numerator)+' / '+n(m.denominator):'暂未核验';
const root=new URL(document.body.dataset.base||'./',location.href), historical=location.pathname.endsWith('/round2/d1/'), dataset=new URL(historical?'assets/datasets/MP-R2-D1-PUBLIC-PREP-20261014-r2/':'assets/datasets/MP-R2-COMPLETE-20261015-r1/',root);
const round=Number(document.body.dataset.round||2),view=document.body.dataset.view,roundPath=r=>r===1?'round1/':historical?'round2/d1/':'round2/',label=r=>r===1?'第一轮':'第二轮';
if(location.pathname.endsWith('/round2/d1/')&&new URLSearchParams(location.search).get('round')==='round1')location.replace(new URL('round1/data/'+location.search+location.hash,root));
const safe=v=>{try{const u=new URL(v);return /^https?:$/.test(u.protocol)?u.href:null;}catch{return null;}};
const cache=new Map();
async function read(file){const url=new URL(file,dataset).href;if(!cache.has(url)){const response=await fetch(url);if(!response.ok)throw Error('数据读取失败');cache.set(url,await response.json());}return cache.get(url);}
const add=(id,html)=>{if($(id))$(id).innerHTML=html;}, text=(id,value)=>{if($(id))$(id).textContent=value;};
const row=values=>'<tr>'+values.map(v=>'<td>'+v+'</td>').join('')+'</tr>';
const kpi=(name,value,detail)=>`<article class="kpi"><div class="kpi-label">${esc(name)}</div><strong class="kpi-value">${esc(value)}</strong><div class="kpi-meta">${esc(detail)}</div></article>`;
const card=(name,value,detail)=>`<article class="exec-card info"><div class="exec-top"><div class="exec-heading"><div class="exec-title">${esc(name)}</div></div><span class="status-chip info">${label(round)}</span></div><div><div class="exec-main">${esc(value)}</div><div class="exec-sub">${esc(detail)}</div></div><ul class="evidence-list"><li><span>统计范围</span><span>当前轮次冻结回答</span></li><li><span>计算口径</span><span>${esc(detail)}</span></li></ul><div class="exec-bottom">${name.includes('品牌')||name==='提及回答数'?'字面提及不等同于推荐、排名或背书。':'仅展示可核验结果；证据不足不填零。'}</div></article>`;
let analysis,questions,allQuestions,index,labels,data,page=1;
const query=new URLSearchParams(location.search);
const scopeName=()=>groupLabel(group)+(group==='all'?'':' · '+questions[0].groupName);
async function scopedAnalysis(source,r){
  const totals=group==='all'?source.totals:source.groups[group];
  let citations=totals.citations;
  if(group!=='all'&&view==='citation'){
    const sourceData=await read(roundPath(r)+'data.json'),urls=new Map();
    for(const sample of sourceData.samples.filter(s=>s.groupId===group))for(const c of sample.citations){
      if(c.urlStatus!=='VALID')continue;
      const key=c.normalizationKeySha256;
      if(!urls.has(key))urls.set(key,{url:c.normalizedUrl,title:c.title||'',rawCitationCount:0,answers:new Set(),questions:new Set()});
      const url=urls.get(key);url.rawCitationCount++;url.answers.add(sample.sampleId);url.questions.add(sample.questionId);
    }
    const details=[...urls.values()].map(x=>({url:x.url,title:x.title,rawCitationCount:x.rawCitationCount,coverageAnswers:x.answers.size,coverageQuestions:x.questions.size})).sort((a,b)=>b.rawCitationCount-a.rawCitationCount||a.url.localeCompare(b.url));
    if(details.length!==citations.globallyUniqueUrlCount)throw Error('分组引用明细不匹配');
    citations={...citations,urlDetails:details};
  }
  return {...source,totals:{...totals,citations}};
}
function scopeHeader(){
  const title=document.querySelector('h1');if(!title.dataset.original)title.dataset.original=title.textContent;title.textContent=title.dataset.original+' · '+groupLabel(group);if(!document.documentElement.dataset.originalTitle)document.documentElement.dataset.originalTitle=document.title;document.title=document.documentElement.dataset.originalTitle+' · '+groupLabel(group);
  const count=questions.length,valid=index?.samples.length,dates=round===1?'2026-09-04 / 09-08 / 09-09 · 爱搜FAST_WEB':(historical?'2026-10-14':'2026-10-14 / 2026-10-15')+' · API / ai_search';
  for(const id of ['metaLine','hero-meta'])text(id,`${scopeName()} · ${count} 个问题 · ${n(valid)} 条有效回答 · ${dates}`);
  if(view==='data'){
    text('stageBanner',round===2&&historical?`${groupLabel(group)} · 第二轮已完成一半 · ${valid} / ${count*4} 条回答`:`${groupLabel(group)} · ${label(round)}采集完成 · ${valid} / ${count*4} 条回答`);
    text('briefTitle',`${count} 个问题，${valid} 条有效回答，每题${round===2&&historical?2:4}次。`);
    text('briefTotal',round===2&&historical?`${valid} / ${count*4}`:n(valid));
    document.querySelector('#progressGrid')?.closest('section')?.querySelector('.section-note')?.replaceChildren(document.createTextNode(`${count} 个问题 · ${valid} 条有效回答 · ${dates}`));
  }
  if(group!=='all')for(const note of document.querySelectorAll('.section-note'))if(note.textContent.includes('A–F通用问题'))note.textContent=`${scopeName()}，指标分母仅包含本组有效回答。`;
  if(view.startsWith('compare')){
    for(const node of document.querySelectorAll('header .meta,header .hero-meta,.section-note'))if(/424|212|106题/.test(node.textContent))node.textContent=`${scopeName()} · 第一轮${count*4}条 · 第二轮${count*(historical?2:4)}条 · ${count}题 · 各轮独立分母`;
    text('stageBanner',`${groupLabel(group)} · 第二轮${historical?"已完成一半":"采集完成"} · ${count*(historical?2:4)} / ${count*4} 条回答`);
    const total=document.querySelector('.brief-total strong');if(total)total.textContent=`${count*4} / ${count*(historical?2:4)}`;
  }
  if(group!=='all'){
    for(const note of document.querySelectorAll('footer'))if(/424|212|106/.test(note.textContent))note.textContent=`${scopeName()} · ${count}个问题 · 第一轮${count*4}条 / 第二轮${count*(historical?2:4)}条回答`;
    for(const note of document.querySelectorAll('.geo-shell-submenu small'))if(/424|212/.test(note.textContent))note.textContent=note.textContent.replace('424',String(count*4)).replace('212',String(count*2));
    const link=$('sourceGrid')?.querySelector('a');if(link)link.textContent=`查看${groupLabel(group)}本轮全部引用来源`;
  }
}
const questionName=id=>questions.find(q=>q.questionId===id)?.questionText||'未找到对应问题';
function setupTablePagination({prev,next,pageLabel,render}){for(const [id,delta]of[[prev,-1],[next,1]])$(id)?.addEventListener('click',()=>{page+=delta;render();});return(total,size)=>{const pages=Math.max(1,Math.ceil(total/size));page=Math.max(1,Math.min(page,pages));text(pageLabel,`第 ${page} / ${pages} 页`);$(prev).disabled=page===1;$(next).disabled=page===pages;return[(page-1)*size,page*size];};}
function downloads(){
  const entries=[['questions.json','完整问题题池'],[roundPath(round)+'data.json',label(round)+'原回答与全部引用源'],[roundPath(round)+'analysis.json',label(round)+'同口径分析'],[roundPath(round)+'evidence-index.json',label(round)+'证据索引'],...(!historical?[['玛卡星球两轮综合分析.md','两轮综合分析报告'],['comparison.json','同题两轮对比'],['round2/daily-analysis.json','第二轮两日期分析'],['website-summary.json','核验结论与口径说明']]:[])];
  const history=[['sampling/data.json','第一轮历史数据原文件'],['sampling/analysis.json','第一轮历史分析原文件'],['citation/data.json','第一轮历史引用原文件'],['citation/analysis.json','第一轮历史引用分析'],['citation/dashboard-summary.json','第一轮历史引用汇总'],['citation/douyin-analysis.json','第一轮历史抖音分析'],['citation/douyin-enrichment.json','第一轮历史抖音证据']];
  add('download-list',(group==='all'?'':`<button type="button" class="download-item" id="group-export">下载${esc(groupLabel(group))}数据与完整引用源</button>`)+entries.map(([file,name])=>`<a class="download-item" href="${new URL(file,dataset)}" download><span>${esc(name)}${group==='all'?'':'（全轮次）'}</span></a>`).join('')+history.map(([file,name])=>`<a class="download-item" href="${new URL(file,root)}" download>${esc(name)}${group==='all'?'':'（全轮次）'}</a>`).join(''));
  $('group-export')?.addEventListener('click',async()=>{
    const button=$('group-export');button.disabled=true;
    try{const source=await read(roundPath(round)+'data.json'),samples=source.samples.filter(s=>s.groupId===group),blob=new Blob([JSON.stringify({round,group,questions,samples,analysis:analysis.totals},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`makaplanet-round${round}-group${group}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    catch{button.textContent='下载失败，点击重新下载';}finally{button.disabled=false;}
  });
}
function selectOptions(id,values){$(id).innerHTML='<option value="">全部</option>'+values.map(([v,name])=>`<option value="${esc(v)}">${esc(name)}</option>`).join('');}
async function showAnswer(qid,sid){
  const target=$('answer-detail');if(!target)return;target.hidden=false;target.textContent='正在读取原回答…';
  try{
    data=await read(roundPath(round)+'data.json');const sample=data.samples.find(s=>s.sampleId===sid&&(!qid||s.questionId===qid)),display=labels[sid];
    if(!sample||!display||(group!=='all'&&sample.groupId!==group)){target.innerHTML='<p>当前分类中未找到对应的原回答。</p>';return;}
    target.dataset.sampleId=sid;
    target.innerHTML=`<div class="section-head"><h2>${esc(display.question)}</h2></div><p>${esc(display.roundLabel)} · ${esc(display.collectionDate)} · ${esc(display.answerLabel)} · ${esc(display.platform)}</p>${sample.replacement?'<p class="footnote">本回答是独立补采成功记录，对应原未决记录仍保留，未改写为成功。</p>':''}<div class="answer-text">${esc(sample.answer)}</div><h3>全部引用来源 · ${n(sample.citations.length)} 张来源卡</h3><ol>${sample.citations.map(c=>`<li>${c.siteName?`<span class="source-site">${esc(c.siteName)} · </span>`:''}${safe(c.url)?`<a href="${esc(safe(c.url))}" target="_blank" rel="noopener noreferrer">${esc(c.title||c.url)}</a><small class="source-url">${esc(c.url)}</small>`:`<strong>来源卡未提供网址</strong><span> · ${esc(c.title||'无标题来源卡')}</span>`}</li>`).join('')||'<li>本回答未附来源卡。</li>'}</ol><details class="technical"><summary>技术记录</summary><pre>${esc(JSON.stringify({sampleId:sample.sampleId,questionId:sample.questionId,passId:sample.passId,status:sample.status,answerSha256:sample.answerSha256,replacement:sample.replacement},null,2))}</pre></details>`;
    target.focus({preventScroll:true});target.scrollIntoView({block:'start'});
  }catch{target.innerHTML='<p>原回答读取失败。</p><button type="button" id="retry-answer">重新读取</button>'; $('retry-answer').onclick=()=>showAnswer(qid,sid);}
}
function dataPage(){
  const t=analysis.totals;
  add('kpiGrid',[card('品牌提及率',pct(t.bodyAliasMention),fraction(t.bodyAliasMention)+' 条有效回答'),card('提及回答数',n(t.bodyAliasMention.numerator),'回答正文口径；每条回答至多一次'),...(group==='all'?[card('A–F通用问题品牌提及率',pct(analysis.groups['A-F'].bodyAliasMention),fraction(analysis.groups['A-F'].bodyAliasMention)),card('G品牌对比提及率',pct(analysis.groups.G.bodyAliasMention),fraction(analysis.groups.G.bodyAliasMention)),card('H品牌认知提及率',pct(analysis.groups.H.bodyAliasMention),fraction(analysis.groups.H.bodyAliasMention))]:[card('引用覆盖率',pct(t.citations.coverage),fraction(t.citations.coverage)+' 条本组回答'),card('官网来源覆盖率',pct(t.citations.officialSourceCoverage),fraction(t.citations.officialSourceCoverage)+' 条本组回答'),card('问题数',n(questions.length),scopeName())]),card('有效回答',n(t.validAnswers),round===2&&historical?`${questions.length}题 × 每题2次；计划${questions.length*4}条`:`${questions.length}题 × 每题4次`)].join(''));
  add('feiguaGrid',['首推率','有效首推率','前三率','平均排名','严格优势表达率','品牌事实正确性','商品卡曝光'].map(name=>card(name,name==='商品卡曝光'?'当前采样方式无法观测':'暂未核验',name==='商品卡曝光'?'当前冻结数据没有可核验的渲染商品卡证据':'不能将证据不足解释为零')).join(''));
  const dates=[...new Set(index.samples.map(s=>labels[s.sampleId].collectionDate))].sort();
  add('progressGrid',dates.map(date=>`<div class="progress-card"><div class="progress-title">${date}</div><div class="progress-value">${n(index.samples.filter(s=>labels[s.sampleId].collectionDate===date).length)} 条回答</div></div>`).join(''));
  if(round===2&&historical)$('actionList').insertAdjacentHTML('beforeend',`<p>${group==='all'?'累计':'全轮次累计'}215次尝试，212条有效回答。3条原未决与3条独立成功替代分别保留，未将原未决改写为成功。${group==='all'?'':'本组'+n(t.validAnswers)+'条有效回答；'}每题四次回答门槛尚未达到。</p>`);
  if(round===2&&!historical)$('actionList').insertAdjacentHTML('beforeend','<p>全轮次427次尝试，424条有效回答。3条原未决和3条已批准成功补采分别保留。每题4次回答不等于语义指标已核验或稳定性已达标。</p>');
  add('statusBars',(group==='all'?'ABCDEFGH'.split(''):[group]).map(g=>`<div class="bar-row"><span>${esc(g+'组 · '+allQuestions.find(q=>q.groupId===g).groupName)}</span><div class="bar-track"><span class="bar-fill" style="width:${analysis.groups[g].bodyAliasMention.percentage}%"></span></div><strong>${pct(analysis.groups[g].bodyAliasMention)}</strong></div>`).join(''));
  add('aggregateBars',`<p>${group==='all'?'各组分别按本组有效回答统计，不能混用分母。':esc(scopeName())+'，下方品牌、问题与回答均仅包含本组数据。'}</p>`);
  add('brandTable',[{name:'玛卡星球',bodyAliasMention:t.bodyAliasMention},...t.competitors].map(b=>row([esc(b.name),n(b.bodyAliasMention.numerator)+' / '+n(b.bodyAliasMention.denominator),pct(b.bodyAliasMention),'回答正文字面提及'])).join(''));
  selectOptions('priorityFilter',dates.map(x=>[x,x]));selectOptions('categoryFilter',(group==='all'?'ABCDEFGH'.split(''):[group]).map(x=>[x,x+' · '+questions.find(q=>q.groupId===x).groupName]));selectOptions('statusFilter',[['original','原始采集成功'],['replacement','独立补采成功']]);
  function filtered(){const q=$('questionSearch').value.trim().toLowerCase();return index.samples.filter(s=>{const d=labels[s.sampleId],question=questions.find(q=>q.questionId===s.questionId);return(!q||(d.question+' '+s.questionId).toLowerCase().includes(q))&&(!$('priorityFilter').value||d.collectionDate===$('priorityFilter').value)&&(!$('categoryFilter').value||question.groupId===$('categoryFilter').value)&&(!$('statusFilter').value||($('statusFilter').value==='replacement'?s.replacement:!s.replacement));});}
  const paginate=setupTablePagination({prev:'samplePrev',next:'sampleNext',pageLabel:'samplePage',render});
  function answerLink(s){const url=new URL(location.href);url.searchParams.set('question',s.questionId);url.searchParams.set('sample',s.sampleId);url.hash='answer-detail';return `<a data-answer href="${esc(url.href)}">查看原回答</a>`;}
  function render(){const rows=filtered(),ids=new Set(rows.map(s=>s.questionId)),[start,end]=paginate(rows.length,20);
    text('questionCount',n(ids.size)+' 个问题');text('sampleCount',n(rows.length)+' 条回答');
    add('questionTable',questions.filter(q=>ids.has(q.questionId)).map(q=>{const samples=rows.filter(s=>s.questionId===q.questionId);return row([esc(q.questionText),esc(q.groupId+' · '+q.groupName),n(samples.length),esc([...new Set(samples.map(s=>labels[s.sampleId].collectionDate))].join(' / ')),answerLink(samples[0])]);}).join('')||'<tr><td colspan="5">没有匹配的问题。</td></tr>');
    add('sampleTable',rows.slice(start,end).map(s=>{const d=labels[s.sampleId];return row([esc(d.question),esc(d.roundLabel),esc(d.collectionDate),esc(d.answerLabel),s.replacement?'独立补采成功，原未决保留':'采集成功',n(s.citationCount),answerLink(s)]);}).join('')||'<tr><td colspan="7">没有匹配的回答。</td></tr>');
  }
  for(const id of ['questionSearch','priorityFilter','categoryFilter','statusFilter'])$(id).addEventListener(id==='questionSearch'?'input':'change',()=>{page=1;render();});
  document.addEventListener('click',e=>{const a=e.target.closest('a[data-answer]');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.button>0)return;e.preventDefault();history.pushState(null,'',a.href);const p=new URL(a.href).searchParams;showAnswer(p.get('question'),p.get('sample'));});
  window.addEventListener('popstate',()=>{const p=new URLSearchParams(location.search);if(p.get('sample'))showAnswer(p.get('question'),p.get('sample'));else $('answer-detail').hidden=true;});
  render();downloads();if(query.get('sample'))showAnswer(query.get('question'),query.get('sample'));
}
function citationPage(){
  const c=analysis.totals.citations;
  add('citationKpis',[kpi('引用覆盖率',pct(c.coverage),fraction(c.coverage)+' 条有效回答'),kpi('官网来源覆盖率',pct(c.officialSourceCoverage),fraction(c.officialSourceCoverage)+' 条有效回答'),kpi('原始网址引用',n(c.rawCitationCount),'同一网址重复引用未去重'),kpi('回答内去重引用',n(c.normalizedCitationCount),'同一回答内规范化后去重'),kpi('全局唯一网址',n(c.globallyUniqueUrlCount),'跨回答去重'),kpi('来源域名',n(c.domainCount),'有效引用的域名'),kpi('未提供网址的来源卡',n(c.noUrlSourceCards),'不能视为无引用或商品卡'),kpi('无效网址',n(c.invalidUrlCount),'网址格式检查'),kpi('引用信息未知回答',n(c.unknownAnswers),'未知不按无引用处理')].join(''));
  const paginate=setupTablePagination({prev:'source-page-prev',next:'source-page-next',pageLabel:'source-page-label',render});
  function render(){const domain=$('source-type-filter').value==='domains',all=domain?c.topDomains:c.urlDetails,q=$('source-url-search').value.trim().toLowerCase(),rows=all.filter(x=>(domain?x.domain:x.url+' '+x.title).toLowerCase().includes(q)),size=$('source-page-size').value==='all'?Math.max(1,rows.length):Number($('source-page-size').value),[start,end]=paginate(rows.length,size);
    text('source-url-count',`${n(rows.length)} / ${n(all.length)} 个${domain?'域名':'网址'}`);text('source-url-range',`${rows.length?start+1:0}–${Math.min(end,rows.length)}`);
    $('source-url-table-body').closest('table').querySelector('thead').innerHTML=domain?'<tr><th>来源域</th><th class="numeric">回答内去重引用次数</th></tr>':'<tr><th>具体网址 / 页面标题</th><th class="numeric">原始引用次数</th><th class="numeric">覆盖回答数</th><th class="numeric">覆盖问题数</th></tr>';
    add('source-url-table-body',rows.slice(start,end).map(x=>domain?row([esc(x.domain),n(x.count)]):row([`<a href="${esc(safe(x.url))}" target="_blank" rel="noopener noreferrer">${esc(x.title||x.url)}</a><small class="source-url">${esc(x.url)}</small>`,n(x.rawCitationCount),n(x.coverageAnswers),n(x.coverageQuestions)])).join('')||'<tr><td colspan="4">没有匹配的引用来源。</td></tr>');
  }
  for(const id of ['source-url-search','source-type-filter','source-page-size'])$(id).addEventListener(id==='source-url-search'?'input':'change',()=>{page=1;render();});render();downloads();
  $('print-report')?.addEventListener('click',()=>window.print());
}
const metricDefs=[['品牌提及率',a=>a.totals.bodyAliasMention],...(group==='all'?[['A–F通用问题品牌提及率',a=>a.groups['A-F'].bodyAliasMention],['G品牌对比提及率',a=>a.groups.G.bodyAliasMention],['H品牌认知提及率',a=>a.groups.H.bodyAliasMention]]:[]),['引用覆盖率',a=>a.totals.citations.coverage],['官网来源覆盖率',a=>a.totals.citations.officialSourceCoverage]];
const delta=(a,b)=>a?.denominator&&b?.denominator?((b.numerator/b.denominator-a.numerator/a.denominator)*100).toFixed(2)+' 个百分点':'暂未核验';
function compareData(a,b){
  add('kpiGrid',metricDefs.map(([name,get])=>`<article class="kpi"><div class="kpi-label">${name}</div><div class="kpi-value">${pct(get(b))}</div><div class="kpi-meta">第一轮 ${pct(get(a))} · 第二轮 ${pct(get(b))}</div></article>`).join(''));
  add('progressGrid',[a,b].map((x,i)=>`<div class="progress-card"><strong>${label(i+1)}</strong><p>${questions.length} 个问题 · ${n(x.totals.validAnswers)} 条有效回答</p><p>${i?(historical?'2026-10-14':'2026-10-14 / 2026-10-15')+' · API / ai_search':'2026-09-04、09-08、09-09 · 爱搜FAST_WEB'}</p></div>`).join(''));
  add('deltaGrid',metricDefs.map(([name,get])=>`<div class="trend-card"><strong>${name}</strong><p>${delta(get(a),get(b))}</p></div>`).join(''));
  add('metricTable',metricDefs.map(([name,get])=>row([name,pct(get(a))+' · '+fraction(get(a)),pct(get(b))+' · '+fraction(get(b)),delta(get(a),get(b)),'各轮有效回答为独立分母'])).join('')+['首推率','有效首推率','前三率','平均排名','严格优势表达率','品牌事实正确性','商品卡曝光'].map(name=>row([name,name==='商品卡曝光'?'当前采样方式无法观测':'暂未核验',name==='商品卡曝光'?'当前采样方式无法观测':'暂未核验','不计算','没有同版可核验语义结果'])).join(''));
  const records=[a,b].flatMap((x,i)=>metricDefs.map(([name,get])=>({round:i+1,name,m:get(x)})));
  const paginate=setupTablePagination({prev:'recordPrev',next:'recordNext',pageLabel:'recordPage',render});
  function render(){const q=$('metricSearch').value.trim(),rows=records.filter(x=>(!q||x.name.includes(q))&&(!$('roundFilter').value||x.round===Number($('roundFilter').value))),[start,end]=paginate(rows.length,10);text('rowCount',n(rows.length)+' 条指标记录');add('recordTable',rows.slice(start,end).map(x=>row([label(x.round),x.name,pct(x.m),fraction(x.m),'同版字面提及 / 规范化引用'])).join('')||'<tr><td colspan="5">没有匹配的指标。</td></tr>');}
  for(const id of ['metricSearch','roundFilter'])$(id).addEventListener(id==='metricSearch'?'input':'change',()=>{page=1;render();});render();
}
function compareCitation(a,b){
  const cs=[a.totals.citations,b.totals.citations];add('scaleCards',cs.map((c,i)=>kpi(label(i+1)+'去重引用',n(c.normalizedCitationCount),n(c.domainCount)+' 个来源域')).join(''));
  add('scaleBody',cs.map((c,i)=>row([label(i+1),n([a,b][i].totals.validAnswers)+' · '+pct(c.coverage),n(c.normalizedCitationCount),n(c.globallyUniqueUrlCount),n(c.domainCount)])).join(''));
  add('officialBody',row(['玛卡官网',fraction(cs[0].officialSourceCoverage),pct(cs[0].officialSourceCoverage),fraction(cs[1].officialSourceCoverage),pct(cs[1].officialSourceCoverage)]));
  add('platformBody',(group==='all'?'ABCDEFGH'.split(''):[group]).map(g=>row([esc(g+' · '+questions.find(q=>q.groupId===g).groupName),pct(a.groups[g].citations.coverage),pct(b.groups[g].citations.coverage),delta(a.groups[g].citations.coverage,b.groups[g].citations.coverage)])).join(''));
  const maps=cs.map(c=>new Map(c.topDomains.map(x=>[x.domain,x.count]))),domains=[...new Set(maps.flatMap(m=>[...m.keys()]))].sort((x,y)=>(maps[1].get(y)||0)-(maps[1].get(x)||0));
  const paginate=setupTablePagination({prev:'domainPrev',next:'domainNext',pageLabel:'domainPage',render});
  function render(){const q=$('domainSearch').value.trim().toLowerCase(),mode=$('domainChange').value,rows=domains.filter(d=>d.includes(q)).filter(d=>{const diff=(maps[1].get(d)||0)-(maps[0].get(d)||0);return mode==='all'||mode==='up'&&diff>0||mode==='down'&&diff<0||mode==='flat'&&diff===0;}),[start,end]=paginate(rows.length,Number($('domainSize').value));text('domainCount',n(rows.length)+' / '+n(domains.length)+' 个来源域');text('domainRange',`${rows.length?start+1:0}–${Math.min(end,rows.length)}`);add('domainBody',rows.slice(start,end).map(d=>{const v1=maps[0].get(d)||0,v2=maps[1].get(d)||0;return row([esc(d),n(v1),n(v2),(v2/cs[1].normalizedCitationCount*100).toFixed(2)+'%',n(v2-v1)]);}).join('')||'<tr><td colspan="5">没有匹配的来源域。</td></tr>');}
  for(const id of ['domainSearch','domainChange','domainSize'])$(id).addEventListener(id==='domainSearch'?'input':'change',()=>{page=1;render();});render();
}
async function load(){
  if(!view){await homePage();return;}
  $('reader-error')?.remove();
  try{
    const response=await fetch(new URL('assets/display-labels.json',root));if(!response.ok)throw Error('展示映射读取失败');labels=await response.json();
    allQuestions=(await read('questions.json')).questions;questions=allQuestions.filter(q=>group==='all'||q.groupId===group);mountGroups(allQuestions);
    if(view.startsWith('compare')){const [a,b]=await Promise.all([read('round1/analysis.json').then(a=>scopedAnalysis(a,1)),read('round2/analysis.json').then(a=>scopedAnalysis(a,2))]);scopeHeader();view==='compare-data'?compareData(a,b):compareCitation(a,b);}
    else{[analysis,index]=await Promise.all([read(roundPath(round)+'analysis.json').then(a=>scopedAnalysis(a,round)),read(roundPath(round)+'evidence-index.json')]);if(group!=='all')index={...index,samples:index.samples.filter(s=>questions.some(q=>q.questionId===s.questionId))};if(analysis.semanticAnalysisReady!==false)throw Error('分析版本不匹配');scopeHeader();view==='data'?dataPage():citationPage();}
    window.__MAKAPLANET_SCOPE__={group,questions:questions.length,validAnswers:analysis?.totals.validAnswers};
    window.__MAKAPLANET_DASHBOARD_READY__=true;
  }catch(error){const box=document.createElement('div');box.id='reader-error';box.role='alert';box.innerHTML='<p>数据暂时未能加载，不能将缺失理解为零。</p><button type="button">重新读取数据</button>';document.querySelector('main').prepend(box);box.querySelector('button').onclick=load;window.__MAKAPLANET_DASHBOARD_READY__=false;}
}
document.querySelector('.back-top')?.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
const navigation=[...document.querySelectorAll('.side-nav a')];if(navigation.length){const observer=new IntersectionObserver(es=>{const section=es.find(e=>e.isIntersecting);if(section)navigation.forEach(a=>a.classList.toggle('active',a.hash==='#'+section.target.id));},{rootMargin:'-20% 0px -65% 0px'});document.querySelectorAll('.report-section').forEach(s=>observer.observe(s));}
load();


async function homePage(){
  try{
    const [pool,summary]=await Promise.all([read('questions.json'),read('website-summary.json')]);mountGroups(pool.questions,{home:true});
    const count=pool.questions.filter(q=>group==='all'||q.groupId===group).length;
    document.querySelectorAll('.round-card').forEach(card=>{const counts=card.querySelectorAll('dd');counts[0].textContent=(count*4).toLocaleString('zh-CN');counts[1].textContent=count;});
    document.querySelector('.compare-entry p').textContent='各轮独立分母 · '+count+'题 · 同题描述性比较';
    document.querySelector('footer').textContent=groupLabel(group)+' · 第一轮'+count*4+'条 / 第二轮'+count*4+'条有效回答 · '+count+'个问题';
    const section=document.createElement('section');section.className='compare-entry findings';section.setAttribute('aria-label','核验结论');
    const div=document.createElement('div'),heading=document.createElement('h2');heading.textContent='核验结论';div.append(heading);
    const list=document.createElement('ul');for(const finding of summary.findings){const item=document.createElement('li');item.textContent=finding;list.append(item);}div.append(list);
    const note=document.createElement('p');note.textContent='以上结论为两轮总数据；分组指标见对应仪表盘。';div.append(note);
    const links=document.createElement('div');links.className='compare-actions';for(const [file,name] of [[new URL('assets/datasets/MP-BRAND-EVIDENCE-20261016-r1/玛卡星球GEO采样综合分析报告-资料核验V8.md',root).href,'新版综合分析报告'],[summary.report,'历史综合分析报告'],['comparison.json','同题对比证据'],['evidence-catalog.json','数据与证据目录']]){const a=document.createElement('a');a.className='button';a.href=new URL(file,dataset);a.textContent=name;a.setAttribute('download','');links.append(a);}section.append(div,links);document.querySelector('.compare-entry').after(section);
    window.__MAKAPLANET_DASHBOARD_READY__=true;
  }catch{const p=document.createElement('p');p.role='alert';p.textContent='数据分类与结论暂时未能加载，请刷新页面。';document.querySelector('main').prepend(p);}
}

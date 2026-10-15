import {DATASET_ROOT,DATASET_VERSION,roundPaths,count,percentage,fraction,escapeHtml as esc,safeUrl,adaptAnalysis,resolveSample,readJson} from './adapter.js';
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
let round = params.get('round')==='round1'?'round1':'d1';
let analysis, index, questions, snapshot, data;
let sourcePage=0, answerPage=0, generation=0, answerGeneration=0, controller;
const cache=new Map();
const pageSize=20;
async function cached(file,signal) {if(!cache.has(file)) cache.set(file,await readJson(file,signal));return cache.get(file);}
function updateUrl(changes) {const url=new URL(location.href);for(const [key,value] of Object.entries(changes)) {if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);}history.replaceState(null,'',url);}
function metric(label,value,detail,numeric=false) {return `<div class="metric"><small>${esc(label)}</small><strong${numeric?' class="count"':''}>${esc(value)}</strong><span>${esc(detail)}</span></div>`;}
function renderMetrics() {
  const t=analysis.totals, c=t.citations;
  $('metrics-grid').innerHTML=[metric('正文品牌提及率',percentage(t.bodyAliasMention),fraction(t.bodyAliasMention)+' · 字面别名规则'),metric('有效回答',count(t.validAnswers),round==='d1'?'D1 212 / 第二轮计划 424':'第一轮 424 条历史回答',true),metric('官网来源覆盖',percentage(c.officialSourceCoverage),fraction(c.officialSourceCoverage)+' 条回答'),metric('引用覆盖率',percentage(c.coverage),fraction(c.coverage)+' 条回答'),metric('原始有效网址引用',count(c.rawCitationCount),'同一网址的重复引用未去重',true),metric('样本内去重引用',count(c.normalizedCitationCount),'同一回答内规范化后去重',true),metric('全局唯一网址',count(c.globallyUniqueUrlCount),'跨回答去重',true),metric('域名数',count(c.domainCount),'有效引用的域名',true),metric('无网址来源卡',count(c.noUrlSourceCards),'NOT_PROVIDED · 不属于无效网址',true),metric('无效网址',count(c.invalidUrlCount),'网址格式检查结果',true),metric('引用信息未知回答',count(c.unknownAnswers),'来源未知不当作无引用',true)].join('');
  const labels={first:'首推率',top3:'前三率',averageRank:'平均排名',strictAdvantage:'严格优势表达率',brandFactCorrectness:'品牌事实正确性',productCardExposure:'商品卡曝光'};
  $('unknown-metrics').innerHTML=Object.entries(labels).map(([key,label])=>`<div data-metric="${key}"><b>${label}</b><span>${key==='productCardExposure'?'不可观测 · API 未提供渲染商品卡':'未核验 · 当前语义流水线未就绪'}</span></div>`).join('');
  $('attempts').innerHTML=round==='d1'?[['原始尝试',snapshot.originalAttempts],['原始成功',snapshot.originalSuccesses],['保留原未决',snapshot.retainedOriginalUncertainties],['独立替代成功',snapshot.replacementSuccesses],['替代尝试',snapshot.replacementAttempts],['总尝试',snapshot.totalAttempts],['每题观察',2],['四次观察门槛','数据不足']].map(([k,v])=>`<div><dt>${k}</dt><dd>${typeof v==='number'?count(v):v}</dd></div>`).join(''):'<div><dt>每题历史观察</dt><dd>4 次</dd></div><div><dt>数据平台</dt><dd>AIDSO / FAST_WEB</dd></div><div><dt>分析版本</dt><dd>同口径字面重算</dd></div><div><dt>历史语义结果</dt><dd>保留于第一轮原页面</dd></div>';
  $('platform').textContent=analysis.platform+' · MAKA-PUBLIC-DESCRIPTIVE-V1';
}
function renderGroups() {
  $('group-summaries').innerHTML=['A-F','G','H'].map(key=>{const g=analysis.groups[key];return `<article class="group-summary" data-group="${key}"><h3>${key==='A-F'?'A–F · 通用问题':key+' · 品牌问题'}</h3><p>正文品牌提及率</p><b>${percentage(g.bodyAliasMention)}</b><p>${fraction(g.bodyAliasMention)} 条回答 · 官网覆盖 ${percentage(g.citations.officialSourceCoverage)}<br>有效回答 ${count(g.validAnswers)} · 四次观察${round==='d1'?'数据不足':'已具备历史观察数'}</p></article>`;}).join('');
  $('group-rows').innerHTML='ABCDEFGH'.split('').map(key=>{const g=analysis.groups[key];return `<tr><th>${key}</th><td class="numeric">${count(g.validAnswers)}</td><td class="numeric">${percentage(g.bodyAliasMention)}<br>${fraction(g.bodyAliasMention)}</td><td class="numeric">${percentage(g.citations.officialSourceCoverage)}<br>${fraction(g.citations.officialSourceCoverage)}</td><td class="numeric">${count(g.citations.normalizedCitationCount)}</td><td class="numeric">${count(g.citations.noUrlSourceCards)}</td></tr>`;}).join('');
  $('competitors').innerHTML=analysis.totals.competitors.map(c=>`<tr><th>${esc(c.name)}</th><td>${percentage(c.bodyAliasMention)}</td><td>${fraction(c.bodyAliasMention)}</td></tr>`).join('');
}
function renderSources() {
  const domain=$('source-mode').value==='domains', query=$('source-search').value.trim().toLowerCase();
  const all=domain?analysis.totals.citations.topDomains:analysis.totals.citations.urlDetails;
  const items=all.filter(item=>(domain?item.domain:item.url+' '+item.title).toLowerCase().includes(query));
  sourcePage=Math.min(sourcePage,Math.max(0,Math.ceil(items.length/pageSize)-1));
  $('source-table').querySelector('thead').innerHTML=domain?'<tr><th>域名</th><th>样本内去重引用次数</th></tr>':'<tr><th>具体网址 / 页面标题</th><th>原始引用次数</th><th>覆盖回答数</th><th>覆盖问题数</th></tr>';
  $('source-table').querySelector('tbody').innerHTML=items.slice(sourcePage*pageSize,(sourcePage+1)*pageSize).map(item=>domain?`<tr><td class="url-cell">${esc(item.domain)}</td><td class="numeric">${count(item.count)}</td></tr>`:`<tr><td class="url-cell">${safeUrl(item.url)?`<a href="${esc(safeUrl(item.url))}" target="_blank" rel="noopener noreferrer">${esc(item.title||item.url)}</a>`:esc(item.title||'无可用网址')}<small>${esc(item.url)}</small></td><td class="numeric">${count(item.rawCitationCount)}</td><td class="numeric">${count(item.coverageAnswers)}</td><td class="numeric">${count(item.coverageQuestions)}</td></tr>`).join('')||`<tr><td colspan="4" class="empty">没有匹配的${domain?'域名':'网址'}</td></tr>`;
  $('source-total').textContent=count(all.length)+' 个'+(domain?'域名':'唯一网址');
  $('source-count').textContent=count(items.length)+' 项 · 第 '+(sourcePage+1)+' / '+Math.max(1,Math.ceil(items.length/pageSize))+' 页';
  $('source-prev').disabled=sourcePage===0; $('source-next').disabled=(sourcePage+1)*pageSize>=items.length;
}
function renderAnswers() {
  const query=$('question-search').value.trim().toLowerCase(), group=$('group').value, replacements=$('replacements').checked;
  const items=index.samples.filter(s=>{const q=questions.get(s.questionId);return (!group||(group==='A-F'?/[A-F]/.test(q.groupId):q.groupId===group))&&(!replacements||s.replacement)&&(!query||(s.questionId+' '+q.questionText).toLowerCase().includes(query));});
  answerPage=Math.min(answerPage,Math.max(0,Math.ceil(items.length/pageSize)-1));
  $('answer-list').innerHTML=items.slice(answerPage*pageSize,(answerPage+1)*pageSize).map(s=>{const q=questions.get(s.questionId);const url=new URL(location.href);url.search='';url.searchParams.set('round',round);url.searchParams.set('question',s.questionId);url.searchParams.set('sample',s.sampleId);url.hash='answer-detail';return `<article class="answer-item"><span>${esc(s.questionId)}<br>${esc(s.passId)}</span><div><a data-answer href="${esc(url.href)}">${esc(q.questionText)}</a><span class="sample-id">${esc(s.sampleId)}</span></div><div><span>${count(s.citationCount)} 张来源卡</span><br><span class="${s.replacement?'replacement':''}">${s.replacement?'独立替代成功 · 原未决保留':'原始采样成功'}</span></div></article>`;}).join('')||'<p class="empty">没有匹配的问题或样本</p>';
  $('answer-total').textContent=count(index.samples.length)+' 条回答 · '+count(questions.size)+' 题';
  $('answer-count').textContent=count(items.length)+' 条 · 第 '+(answerPage+1)+' / '+Math.max(1,Math.ceil(items.length/pageSize))+' 页';
  $('answer-prev').disabled=answerPage===0;$('answer-next').disabled=(answerPage+1)*pageSize>=items.length;
}
async function showAnswer(questionId,sampleId) {
  const token=generation, answerToken=++answerGeneration;
  const detail=$('answer-detail');detail.hidden=false;detail.className='answer-detail';detail.textContent='正在读取原回答…';
  try {
    data=await cached(roundPaths[round]+'data.json',controller.signal);
    if(token!==generation || answerToken!==answerGeneration) return;
    const sample=resolveSample(data,index,questionId,sampleId);
    if(!sample) {detail.innerHTML='<p class="empty">该问题或样本不在当前冻结版本中。</p>';return;}
    detail.dataset.sampleId=sample.sampleId;
    detail.innerHTML=`<h3>${esc(sample.questionId)} · ${esc(sample.questionText)}</h3><div class="answer-meta"><span>${esc(sample.businessDate)} · ${esc(sample.passId)}</span><span>${esc(sample.status)}</span><span>回答 SHA-256 ${esc(sample.answerSha256)}</span></div>${sample.replacement?`<p class="note replacement">本条为独立替代成功。原样本 ${esc(sample.replacement.originalSampleId)} 的状态仍为 ${esc(sample.replacement.originalStatus)}，未覆盖或清零。</p>`:''}<div class="answer-text">${esc(sample.answer)}</div><h3>全部引用源 · ${count(sample.citations.length)} 张来源卡</h3><ol class="citations">${sample.citations.map(c=>`<li><b>${esc(c.index)}.</b> ${safeUrl(c.url)?`<a href="${esc(safeUrl(c.url))}" target="_blank" rel="noopener noreferrer">${esc(c.title||c.url)}</a><small>${esc(c.url)}</small>`:`<span class="source-gap">网址未提供 · NOT_PROVIDED</span><small>${esc(c.title||'无标题来源卡')}</small>`}<small>${esc(c.siteName||'站点未提供')}${c.urlRedacted?' · 敏感查询参数已脱敏':''}</small></li>`).join('')||'<li>本回答未附来源卡。</li>'}</ol>`;
    detail.focus({preventScroll:true});detail.scrollIntoView({block:'start'});
  } catch(error) {if(error.name!=='AbortError' && token===generation && answerToken===answerGeneration)detail.innerHTML='<p class="empty">原回答读取失败。<button id="retry-answer" type="button">重新读取原回答</button></p>';}
}
function renderDownloads(manifest) {
  const label={'round1/data.json':'第一轮原回答与引用源','round1/analysis.json':'第一轮同口径分析','round1/evidence-index.json':'第一轮证据索引','round2/d1/data.json':'D1 原回答与引用源','round2/d1/analysis.json':'D1 描述性分析','round2/d1/evidence-index.json':'D1 证据索引','round2/d1/snapshot.json':'D1 阶段快照','questions.json':'106 题冻结题池','evidence-catalog.json':'证据目录','public-manifest.json':'公开投影清单'};
  $('download-list').innerHTML=[...manifest.files,{path:'public-manifest.json'}].map(f=>`<a href="${esc(new URL(f.path,DATASET_ROOT).href)}" download="${esc(f.path.replaceAll('/','-'))}">${label[f.path]}<small>${esc(f.path)}${f.bytes?' · '+count(f.bytes)+' bytes':''}</small>${f.sha256?`<code>SHA-256 ${esc(f.sha256)}</code>`:''}</a>`).join('');
  $('legacy-downloads').innerHTML=['sampling/data.json','sampling/analysis.json','citation/data.json','citation/analysis.json','citation/dashboard-summary.json','citation/douyin-analysis.json','citation/douyin-enrichment.json'].map(file=>`<a href="../../${file}" download>${file} · 历史原文件</a>`).join('');
  $('dataset-version').textContent=DATASET_VERSION;
}
async function load() {
  generation++;controller?.abort();controller=new AbortController();const token=generation;
  $('content').hidden=true;$('error-state').hidden=true;$('load-state').hidden=false;$('answer-detail').hidden=true;$('round').value=round;
  try {
    const [a,i,q,s,m]=await Promise.all([cached(roundPaths[round]+'analysis.json',controller.signal),cached(roundPaths[round]+'evidence-index.json',controller.signal),cached('questions.json',controller.signal),cached('round2/d1/snapshot.json',controller.signal),cached('public-manifest.json',controller.signal)]);
    if(token!==generation) return;
    analysis=adaptAnalysis(a,round);index=i;snapshot=s;questions=new Map(q.questions.map(x=>[x.questionId,x]));
    const isD1=round==='d1';$('scope').textContent=isD1?'212 / 424 第二轮槽位 · 106 题 × 2 次观察 · 2026-10-14 · API / ai_search':'424 条第一轮回答 · 每题 4 次历史观察 · AIDSO / FAST_WEB · 同口径字面重算';
    document.querySelector('h1').textContent=isD1?'第二轮 D1 阶段数据':'第一轮同口径描述性数据';document.title='玛卡星球 · '+document.querySelector('h1').textContent;
    document.querySelector('.stage').textContent=isD1?'D1 阶段性 · 本地准备':'第一轮重算 · 历史原页面保留';
    $('boundary').innerHTML=isD1?'<strong>第二轮尚未完成</strong><span> D1 为半轮数据，每题仅两次观察，四次观察门槛未达到。第一轮为 AIDSO / FAST_WEB；跨平台差异不能归因于 GEO 优化。</span>':'<strong>第一轮历史数据 · 新规则重算</strong><span> 仅展示字面正文提及与规范化引用统计，不覆盖第一轮旧语义结果。两轮平台不同，不能作直接因果归因。</span>';
    renderMetrics();renderGroups();renderSources();renderAnswers();renderDownloads(m);$('content').hidden=false;$('load-state').hidden=true;
    const current=new URLSearchParams(location.search);if(current.get('sample'))await showAnswer(current.get('question'),current.get('sample'));
  } catch(error) {if(error.name==='AbortError'||token!==generation)return;$('load-state').hidden=true;$('error-state').hidden=false;}
}
$('round').addEventListener('change',()=>{round=$('round').value;sourcePage=answerPage=0;$('replacements').checked=false;updateUrl({round,question:null,sample:null});load();});
$('retry').addEventListener('click',load);
for(const id of ['source-search','source-mode']) $(id).addEventListener(id==='source-search'?'input':'change',()=>{sourcePage=0;renderSources();});
for(const id of ['question-search','group','replacements']) $(id).addEventListener(id==='question-search'?'input':'change',()=>{answerPage=0;renderAnswers();});
for(const kind of ['source','answer'])for(const [direction,delta] of [['prev',-1],['next',1]])$(kind+'-'+direction).addEventListener('click',()=>{if(kind==='source'){sourcePage+=delta;renderSources();}else{answerPage+=delta;renderAnswers();}});
$('reset').addEventListener('click',()=>{$('question-search').value='';$('group').value='';$('replacements').checked=false;answerPage=0;answerGeneration++;updateUrl({question:null,sample:null});$('answer-detail').hidden=true;renderAnswers();});
$('answer-list').addEventListener('click',event=>{const link=event.target.closest('a[data-answer]');if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.button>0)return;event.preventDefault();const url=new URL(link.href);history.pushState(null,'',url);showAnswer(url.searchParams.get('question'),url.searchParams.get('sample'));});
$('answer-detail').addEventListener('click',event=>{if(event.target.id==='retry-answer'){const p=new URLSearchParams(location.search);showAnswer(p.get('question'),p.get('sample'));}});
window.addEventListener('popstate',()=>{const p=new URLSearchParams(location.search),next=p.get('round')==='round1'?'round1':'d1';if(next!==round){round=next;load();}else if(p.get('sample'))showAnswer(p.get('question'),p.get('sample'));else $('answer-detail').hidden=true;});
if(params.get('question'))$('question-search').value=params.get('question');
load();

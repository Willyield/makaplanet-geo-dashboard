export const DATASET_VERSION = 'MP-R2-D1-PUBLIC-PREP-20261014-r2';
export const DATASET_ROOT = new URL('../../assets/datasets/'+DATASET_VERSION+'/', import.meta.url);
export const roundPaths = {d1:'round2/d1/',round1:'round1/'};
export const count = value => value === null || value === undefined ? '未核验' : Number(value).toLocaleString('zh-CN');
export const percentage = metric => metric?.percentage === null || metric?.percentage === undefined ? '未核验' : Number(metric.percentage).toFixed(2)+'%';
export const fraction = metric => metric ? count(metric.numerator)+' / '+count(metric.denominator) : '未核验';
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
export function safeUrl(value) {try {const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}}
export function adaptAnalysis(analysis,round) {
  if(analysis.schemaVersion!==1 || analysis.analysisVersion!=='MAKA-PUBLIC-DESCRIPTIVE-V1' || !roundPaths[round]) throw Error('Unsupported analysis schema');
  if(analysis.semanticAnalysisReady!==false) throw Error('Unapproved semantic metric version');
  for(const key of ['A-F','G','H']) if(!analysis.groups[key]) throw Error('Missing separate question group');
  return {round,platform:analysis.platform,totals:analysis.totals,groups:analysis.groups,datasetVersion:analysis.datasetVersion};
}
export function resolveSample(data,index,questionId,sampleId) {
  const pointer=index.samples.find(item=>item.sampleId===sampleId && (!questionId||item.questionId===questionId));
  if(!pointer || !/^\/samples\/\d+$/.test(pointer.pointer)) return null;
  const sample=data.samples[Number(pointer.pointer.split('/')[2])];
  if(sample?.sampleId!==sampleId || sample.questionId!==pointer.questionId) throw Error('Evidence pointer mismatch');
  return sample;
}
export async function readJson(relativePath,signal) {
  const response=await fetch(new URL(relativePath,DATASET_ROOT),{signal});
  if(!response.ok) throw Error('Frozen file unreadable: '+response.status);
  return response.json();
}

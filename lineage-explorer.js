(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const stage = $('#tree-stage'), canvas = $('#tree-canvas'), drawer = $('#person-drawer'), scrim = $('#drawer-scrim'), search = $('#tree-search');
  if (!stage || !canvas) return;
  const metas = [
    ['brady','Johnson · Peterson','Brady · paternal'], ['brady','Erickson · Guetzko','Brady · paternal'],
    ['brady','Woolery · Brodersen','Brady · maternal'], ['wife','Abel · Hunt','Wife · maternal'],
    ['wife','Reynolds · Ford','Wife · paternal']
  ].map(([family,short,title]) => ({family,short,title}));
  const direct = (el, s) => [...el.children].find(x => x.matches?.(s));
  let uid = 0;
  function parse(li, meta, depth = 0) {
    const card = direct(li,'.person'); if (!card) return null;
    const top = $('.top',card), badge = $('.tag',top)?.textContent.trim() || 'Unclassified';
    if (/lead|unverified|not established/i.test(badge)) return null;
    const n = {id:`p${++uid}`,name:$('strong',top)?.textContent.trim()||'Unknown',badge,dates:$('.dates',card)?.textContent.trim()||'',facts:$('.facts',card)?.textContent.trim()||'',proof:$('.proof',card)?.textContent.trim()||'',sources:$$('.sources a',card).map(a=>({label:a.textContent.trim(),href:a.href})),depth,branch:meta.short,children:[]};
    const ul = direct(li,'ul');
    if (ul) n.children = [...ul.children].filter(x=>x.tagName==='LI').map(x=>parse(x,meta,depth+1)).filter(Boolean);
    return n;
  }
  const roots = [];
  $$('details.branch').forEach((branch,i)=>{const root=parse($('.tree > ul > li',branch),metas[i]);if(root)roots.push({root,meta:metas[i]})});
  const rootNamed = name => roots.find(({root}) => root.name === name)?.root;
  const stevenRoots = roots.filter(({root}) => root.name === 'Steven Craig Johnson').map(({root}) => root);
  const steven = stevenRoots[0];
  if (stevenRoots[1]) steven.children.push(...stevenRoots[1].children);
  const groups = [
    {family:'brady',title:'Your family',people:[steven,rootNamed('Debra Jean Woolery')].filter(Boolean)},
    {family:'wife',title:"Your wife’s family",people:[rootNamed('Judith Abel'),rootNamed('Scott Reynolds')].filter(Boolean)}
  ];
  const S={active:'all',query:'',scale:1,x:0,y:0,width:1,height:1}, MIN=.18, MAX=1.8, NW=178, NH=82, GX=24, GY=132;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), walk=(n,f)=>{f(n);n.children.forEach(c=>walk(c,f))};
  const leaves=n=>n.children.length?n.children.reduce((a,c)=>a+leaves(c),0):1;
  const depth=n=>Math.max(n.depth,...n.children.map(depth));
  const esc=s=>s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const kind=n=>/living|starting|known/i.test(n.badge)?'living':/medium/i.test(n.badge)?'medium':'verified';
  function dates(n){if(n.name==='Glenn Edward Reynolds')return'16 Jan 1892 – 1960';if(n.name==='Edward John Miller')return'1872 – 1954';return n.dates.split('·')[0].trim()}
  function place(n){return n.dates.split('·').slice(1).join('·').trim()||n.facts.split('·')[0].trim()}
  function transform(){canvas.style.transform=`translate(${S.x}px,${S.y}px) scale(${S.scale})`;const out=$('#zoom-level');out.value=out.textContent=`${Math.round(S.scale*100)}%`}
  function fit(){const p=28;S.scale=clamp(Math.min((stage.clientWidth-p*2)/S.width,(stage.clientHeight-p*2)/S.height),MIN,1);center()}
  function center(){S.x=(stage.clientWidth-S.width*S.scale)/2;S.y=(stage.clientHeight-S.height*S.scale)/2;transform()}
  function zoom(next,cx=stage.clientWidth/2,cy=stage.clientHeight/2){const r=stage.getBoundingClientRect(),px=cx-r.left,py=cy-r.top,wx=(px-S.x)/S.scale,wy=(py-S.y)/S.scale;S.scale=clamp(next,MIN,MAX);S.x=px-wx*S.scale;S.y=py-wy*S.scale;transform()}
  function focus(el){const x=parseFloat(el.style.left)+NW/2,y=parseFloat(el.style.top)+NH/2;S.x=stage.clientWidth/2-x*S.scale;S.y=stage.clientHeight/2-y*S.scale;transform()}
  function render(andFit=false){
    canvas.innerHTML='';const chosen=groups.filter(g=>S.active==='all'||g.family===S.active),pos=new Map(),headings=[];let cursor=32;const allRoots=chosen.flatMap(g=>g.people),maxD=Math.max(1,...allRoots.map(depth)),top=72;
    chosen.forEach(group=>{const start=cursor;group.people.forEach(root=>{const width=Math.max(NW+GX,leaves(root)*(NW+GX));let leaf=0;function layout(n){let x=n.children.length?n.children.map(layout).reduce((a,b)=>a+b,0)/n.children.length:cursor+leaf++*(NW+GX);pos.set(n,{x,y:top+(maxD-n.depth)*GY});return x}layout(root);cursor+=width+GX});const end=cursor-GX,mid=(start+end)/2;if(group.people.length===2){pos.get(group.people[0]).x=mid-NW-7;pos.get(group.people[1]).x=mid+7}headings.push({title:group.title,x:start,width:end-start,people:group.people});cursor+=90});
    S.width=Math.max(320,cursor+10);S.height=top+(maxD+1)*GY+28;canvas.style.width=`${S.width}px`;canvas.style.height=`${S.height}px`;
    headings.forEach(h=>{const e=document.createElement('div');e.className='pedigree-label';e.style.cssText=`left:${h.x}px;width:${h.width}px`;e.textContent=h.title;canvas.appendChild(e)});
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','connection-layer');svg.setAttribute('width',S.width);svg.setAttribute('height',S.height);
    chosen.forEach(group=>{group.people.forEach(root=>walk(root,n=>{const a=pos.get(n);n.children.forEach(c=>{const b=pos.get(c),p=document.createElementNS('http://www.w3.org/2000/svg','path'),x1=a.x+NW/2,y1=a.y,x2=b.x+NW/2,y2=b.y+NH;p.setAttribute('d',`M${x1},${y1} C${x1},${(y1+y2)/2} ${x2},${(y1+y2)/2} ${x2},${y2}`);svg.appendChild(p)})}));if(group.people.length===2){const a=pos.get(group.people[0]),b=pos.get(group.people[1]),p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('class','couple-line');p.setAttribute('d',`M${a.x+NW},${a.y+NH/2} L${b.x},${b.y+NH/2}`);svg.appendChild(p)}});canvas.appendChild(svg);
    const q=S.query.toLowerCase().trim(),matches=[];
    chosen.forEach(group=>group.people.forEach(root=>walk(root,n=>{const p=pos.get(n),name=n.name.toLowerCase(),hay=[n.name,n.dates,n.branch].join(' ').toLowerCase(),match=!q||hay.includes(q),e=document.createElement('button');e.className=`tree-node ${kind(n)}${q&&!match?' dimmed':''}${q&&match?' match':''}`;e.style.cssText=`left:${p.x}px;top:${p.y}px`;const d=dates(n),pl=place(n);e.innerHTML=`<span class="node-name">${esc(n.name)}</span>${d?`<span class="node-dates">${esc(d)}</span>`:''}${pl?`<span class="node-place">${esc(pl)}</span>`:''}`;e.onclick=()=>open(n);canvas.appendChild(e);if(q&&match){if(name.includes(q))matches.unshift(e);else matches.push(e)}})));
    $('.tree-empty',stage).hidden=!(q&&!matches.length);transform();if(andFit)requestAnimationFrame(fit);else if(matches.length)requestAnimationFrame(()=>focus(matches[0]));
  }
  function open(n){$('#drawer-branch').textContent=`${n.branch} · ${n.badge}`;$('#drawer-name').textContent=n.name;$('#drawer-dates').textContent=n.dates||n.badge;$('#drawer-facts').textContent=n.facts||'No additional biographical detail recorded.';$('#drawer-proof').textContent=n.proof||'This person is shown as a private bridge or is supported by relationship evidence in connected records.';const list=$('#drawer-sources'),wrap=$('#drawer-sources-wrap');list.innerHTML='';n.sources.forEach(s=>{const a=document.createElement('a');a.href=s.href;a.target='_blank';a.rel='noopener';a.textContent=s.label;list.appendChild(a)});wrap.hidden=!n.sources.length;drawer.classList.add('open');scrim.classList.add('open');drawer.setAttribute('aria-hidden','false');$('.drawer-close').focus()}
  function close(){drawer.classList.remove('open');scrim.classList.remove('open');drawer.setAttribute('aria-hidden','true')}
  $('#zoom-in').onclick=()=>zoom(S.scale*1.2);$('#zoom-out').onclick=()=>zoom(S.scale/1.2);$('#zoom-fit').onclick=fit;$('#zoom-center').onclick=center;$('.drawer-close').onclick=close;scrim.onclick=close;
  $$('.view-switch button').forEach(b=>b.onclick=()=>{$$('.view-switch button').forEach(x=>x.classList.remove('active'));b.classList.add('active');S.active=b.dataset.view;render(true)});
  search.oninput=()=>{S.query=search.value;render()};stage.addEventListener('wheel',e=>{e.preventDefault();zoom(S.scale*Math.exp(-e.deltaY*.0015),e.clientX,e.clientY)},{passive:false});
  const pointers=new Map();let drag=null,pinch=null;
  stage.onpointerdown=e=>{if(e.target.closest('.tree-node'))return;stage.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){drag={cx:e.clientX,cy:e.clientY,x:S.x,y:S.y};stage.classList.add('dragging')}else{const[a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),scale:S.scale}}};
  stage.onpointermove=e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1&&drag){S.x=drag.x+e.clientX-drag.cx;S.y=drag.y+e.clientY-drag.cy;transform()}else if(pointers.size===2&&pinch){const[a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);zoom(pinch.scale*d/pinch.distance,(a.x+b.x)/2,(a.y+b.y)/2)}};
  const release=e=>{pointers.delete(e.pointerId);if(pointers.size<2)pinch=null;if(!pointers.size){drag=null;stage.classList.remove('dragging')}};stage.onpointerup=release;stage.onpointercancel=release;
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();if(/input|textarea/i.test(document.activeElement.tagName))return;if(e.key==='+'||e.key==='=')zoom(S.scale*1.2);if(e.key==='-')zoom(S.scale/1.2);if(e.key==='0')fit()});
  window.addEventListener('resize',fit);render(true);
})();

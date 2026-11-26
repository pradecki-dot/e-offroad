// e-offroad.com — menu mobilne, podmenu (dotyk/klawiatura) i akordeon FAQ (bez bibliotek)
(function(){var b=document.querySelector('.menu-btn'),m=document.getElementById('menu');
if(b&&m){b.addEventListener('click',function(){var o=m.classList.toggle('open');b.setAttribute('aria-expanded',o)});}
var subs=document.querySelectorAll('.has-sub');
function closeAll(x){subs.forEach(function(li){if(li!==x){li.classList.remove('open');li.querySelector('.sub-btn').setAttribute('aria-expanded','false')}})}
subs.forEach(function(li){var t=li.querySelector('.sub-btn');t.addEventListener('click',function(ev){ev.stopPropagation();
var o=li.classList.toggle('open');t.setAttribute('aria-expanded',o);closeAll(li)});});
document.addEventListener('click',function(ev){if(!ev.target.closest('.has-sub'))closeAll()});
document.addEventListener('keydown',function(ev){if(ev.key==='Escape'){var o=document.querySelector('.has-sub.open');closeAll();if(o)o.querySelector('.sub-btn').focus()}});
document.querySelectorAll('.faq').forEach(function(f){f.addEventListener('toggle',function(ev){
if(!ev.target.open)return;f.querySelectorAll('details[open]').forEach(function(d){if(d!==ev.target)d.open=false});},true);});})();

// e-offroad.com — galeria: powiększenie zdjęć, klik w lewą/prawą połowę = poprzednie/następne (w kółko), przycisk zamknięcia
(function(){var gal=document.querySelector('.pd-gal');
var salon=document.querySelector('#salon');
var rodzina=document.querySelector('#rodzina');
var czesci=document.querySelector('#czesci-tabela');
if(!gal&&!salon&&!rodzina&&!czesci)return;
var LT={pl:['Galeria zdjęć','Zamknij galerię','Poprzednie zdjęcie','Następne zdjęcie'],en:['Photo gallery','Close gallery','Previous photo','Next photo'],
de:['Bildergalerie','Galerie schließen','Vorheriges Bild','Nächstes Bild'],fr:['Galerie photos','Fermer la galerie','Photo précédente','Photo suivante'],
zh:['图片库','关闭图库','上一张','下一张']};
var T=LT[(document.documentElement.lang||'pl').slice(0,2).toLowerCase()]||LT.pl;
var box=document.createElement('div');box.className='lb';box.hidden=true;box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',T[0]);
box.innerHTML='<button type="button" class="lb-close" aria-label="'+T[1]+'">×</button><figure class="lb-fig"><img class="lb-img" alt=""><span class="lb-photo-label" hidden></span><span class="lb-zone lb-prev" aria-hidden="true" title="'+T[2]+'">‹</span><span class="lb-zone lb-next" aria-hidden="true" title="'+T[3]+'">›</span></figure><p class="lb-count" aria-live="polite"></p>';
document.body.appendChild(box);
var img=box.querySelector('.lb-img'),lbl=box.querySelector('.lb-photo-label'),cnt=box.querySelector('.lb-count'),cls=box.querySelector('.lb-close'),items=[],i=0,last=null;
function lblOf(el){if(!el)return '';var s=el.querySelector('.pd-photo-label');return (s?s.textContent.trim():'')||el.getAttribute('data-label')||''}
function show(n){i=(n+items.length)%items.length;img.src=items[i].src;img.alt=items[i].alt;var t=items[i].label||'';lbl.textContent=t;lbl.hidden=!t;cnt.textContent=(i+1)+' / '+items.length}
var anim=false,drag=false,aid=0,tmr=0,reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)');
function reset(){aid++;clearTimeout(tmr);anim=false;drag=false;img.style.transition='none';img.style.transform='';img.style.willChange=''}
function go(n){reset();show(n)}
function snap(){var id=++aid;anim=true;img.style.transition='transform .2s ease-out';img.style.transform='translateX(0)';clearTimeout(tmr);tmr=setTimeout(function(){if(id===aid)reset()},230)}
function fling(dir){var id=++aid,w=window.innerWidth;anim=true;img.style.transition='transform .16s ease-in';img.style.transform='translateX('+(-dir*w)+'px)';clearTimeout(tmr);
tmr=setTimeout(function(){if(id!==aid)return;show(i+dir);img.style.transition='none';img.style.transform='translateX('+(dir*w)+'px)';void img.offsetWidth;img.style.transition='transform .24s ease-out';img.style.transform='translateX(0)';
tmr=setTimeout(function(){if(id===aid)reset()},270)},180)}
function open(list,src){items=list;if(!items.length)return;var k=0;items.forEach(function(x,j){if(x.src===src)k=j});last=document.activeElement;
reset();box.hidden=false;document.documentElement.classList.add('lb-on');show(k);cls.focus()}
function close(){reset();box.hidden=true;document.documentElement.classList.remove('lb-on');if(last&&last.focus)last.focus()}
function linksOf(root,sel){var a=[];function add(src,alt,label){if(src&&a.every(function(x){return x.src!==src}))a.push({src:src,alt:alt||'',label:label||''})}
root.querySelectorAll(sel).forEach(function(l){var t=l.querySelector('img');add(l.getAttribute('href'),t?t.alt:'',lblOf(l))});return a}
function bind(root,sel){if(!root)return;root.addEventListener('click',function(ev){var l=ev.target.closest(sel);if(!l||!root.contains(l))return;ev.preventDefault();open(linksOf(root,sel),l.getAttribute('href'))})}
if(gal){var mainWrap=gal.querySelector('.pd-main'),main=gal.querySelector('.pd-main img');
function list(){var a=[];function add(src,alt,label){if(src&&a.every(function(x){return x.src!==src}))a.push({src:src,alt:alt||'',label:label||''})}
if(main)add(main.getAttribute('src'),main.alt,lblOf(mainWrap));
gal.querySelectorAll('.pd-thumbs a').forEach(function(l){var t=l.querySelector('img');add(l.getAttribute('href'),t?t.alt:'',lblOf(l))});return a}
gal.addEventListener('click',function(ev){var l=ev.target.closest('.pd-thumbs a');if(l){ev.preventDefault();open(list(),l.getAttribute('href'));return}
if(ev.target.closest('.pd-main img')){open(list(),main.getAttribute('src'))}});
if(main)main.style.cursor='zoom-in';}
bind(salon,'.salon-lead a, .salon-grid a');
bind(rodzina,'.rodzina-grid a');
bind(czesci,'a.part-lb');
box.style.touchAction='none';box.style.overscrollBehavior='none';
var tx=0,ty=0,tt=0,tOn=false,blk=false,swUntil=0;
box.addEventListener('click',function(ev){if(ev.target.closest('.lb-close'))return;if(Date.now()<swUntil){swUntil=0;return}go(i+(ev.clientX<window.innerWidth/2?-1:1))});
box.addEventListener('touchstart',function(ev){if(box.hidden||ev.touches.length!==1){tOn=false;return}tOn=true;blk=anim;drag=false;tx=ev.touches[0].clientX;ty=ev.touches[0].clientY;tt=Date.now()},{passive:true});
box.addEventListener('touchcancel',function(){if(tOn&&drag&&!blk)snap();tOn=false;blk=false},{passive:true});
box.addEventListener('touchmove',function(ev){if(!tOn||ev.touches.length!==1)return;var t=ev.touches[0],dx=t.clientX-tx,dy=t.clientY-ty;
if(blk){if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy))ev.preventDefault();return}
if(drag||(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy))){ev.preventDefault();if(!drag){drag=true;img.style.willChange='transform'}
if(!(reduce&&reduce.matches)){img.style.transition='none';img.style.transform='translateX('+(items.length>1?dx:dx*.25)+'px)'}}},{passive:false});
box.addEventListener('touchend',function(ev){if(!tOn)return;tOn=false;if(blk){blk=false;swUntil=Date.now()+350;return}var was=drag;drag=false;if(ev.target.closest('.lb-close')){if(was)reset();return}var t=ev.changedTouches&&ev.changedTouches[0];if(!t){if(was)reset();return}
var dx=t.clientX-tx,dy=t.clientY-ty,ad=Math.abs(dx),dt=Math.max(1,Date.now()-tt),hz=ad>40&&ad>Math.abs(dy)*1.5;
if(hz||was)swUntil=Date.now()+350;
var go2=hz&&items.length>1&&(ad>=Math.max(60,img.offsetWidth*.2)||(ad/dt>.5&&dt<800));
if(reduce&&reduce.matches){reset();if(go2)show(i+(dx<0?1:-1));return}
if(go2)fling(dx<0?1:-1);else if(was)snap()},{passive:true});
cls.addEventListener('click',close);
document.addEventListener('keydown',function(ev){if(box.hidden)return;if(ev.key==='Escape')close();else if(ev.key==='ArrowLeft')go(i-1);else if(ev.key==='ArrowRight')go(i+1)});
})();

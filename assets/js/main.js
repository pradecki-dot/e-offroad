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
function open(list,src){items=list;if(!items.length)return;var k=0;items.forEach(function(x,j){if(x.src===src)k=j});last=document.activeElement;
box.hidden=false;document.documentElement.classList.add('lb-on');show(k);cls.focus()}
function close(){box.hidden=true;document.documentElement.classList.remove('lb-on');if(last&&last.focus)last.focus()}
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
box.addEventListener('click',function(ev){if(ev.target.closest('.lb-close'))return;show(i+(ev.clientX<window.innerWidth/2?-1:1))});
cls.addEventListener('click',close);
document.addEventListener('keydown',function(ev){if(box.hidden)return;if(ev.key==='Escape')close();else if(ev.key==='ArrowLeft')show(i-1);else if(ev.key==='ArrowRight')show(i+1)});
})();

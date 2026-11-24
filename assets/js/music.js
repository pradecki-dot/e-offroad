/* Muzyka na stronie głównej: Equatorial Complex → Groove On → Equatorial Complex … bez końca,
   przejście z płynnym przenikaniem (5 s) przy każdej zmianie utworu. Start wyłącznie po kliknięciu przycisku
   (bez autoodtwarzania). Ponowne kliknięcie zatrzymuje muzykę; kolejne wznawia od tego samego miejsca. */
(function(){
  var btn=document.querySelector('[data-music]'); if(!btn) return;
  var tracks=(btn.getAttribute('data-tracks')||'').split('|').filter(Boolean); if(!tracks.length) return;
  var MLS={pl:['Włącz muzykę w tle','Wyłącz muzykę w tle'],en:['Play background music','Stop background music'],
    de:['Hintergrundmusik einschalten','Hintergrundmusik ausschalten'],fr:['Activer la musique de fond','Couper la musique de fond'],
    zh:['播放背景音乐','关闭背景音乐']};
  var ML=MLS[(document.documentElement.lang||'pl').slice(0,2).toLowerCase()]||MLS.pl;
  var FADE=5, VOL=0.25, idx=0, on=false, fading=false;
  var a=[new Audio(),new Audio()], cur=0;           // dwa odtwarzacze: bieżący i następny (do przenikania)
  a.forEach(function(p){p.preload='none';});
  a[0].src=tracks[0];
  function nxt(){return (idx+1)%tracks.length;}
  function setBtn(){btn.setAttribute('aria-pressed',on?'true':'false');
    btn.setAttribute('aria-label',on?ML[1]:ML[0]);
    btn.classList.toggle('is-on',on);}
  function finish(){var p=a[cur]; p.pause(); p.volume=0; cur=1-cur; idx=nxt(); fading=false; a[cur].volume=VOL;}
  function tick(){
    if(!on) return;
    var p=a[cur], d=p.duration; if(!d||!isFinite(d)) return;
    var rem=d-p.currentTime;
    if(!fading && (rem<=FADE || p.ended)){
      var q=a[1-cur]; q.src=tracks[nxt()]; q.currentTime=0; q.volume=0; fading=true;
      var pr=q.play(); if(pr&&pr.catch) pr.catch(function(){});
    }
    if(fading){
      var t=p.ended?1:Math.min(1,Math.max(0,1-rem/FADE));   // postęp przenikania liczony z czasu utworu (odporny na pauzę)
      p.volume=VOL*(1-t); a[1-cur].volume=VOL*t;
      if(t>=1) finish();
    }
  }
  a.forEach(function(p){p.addEventListener('timeupdate',tick); p.addEventListener('ended',tick);});
  setInterval(tick,100);
  btn.addEventListener('click',function(){
    on=!on; setBtn();
    if(on){ var ps=fading?[a[cur],a[1-cur]]:[a[cur]];
      if(!fading) a[cur].volume=VOL;
      ps.forEach(function(p){var r=p.play(); if(r&&r.catch) r.catch(function(){on=false;setBtn();});}); }
    else { a[0].pause(); a[1].pause(); }
  });
  setBtn();
  window.__eoMusic={get state(){return {on:on,idx:idx,track:tracks[idx],fading:fading,players:a.map(function(p){return {src:p.currentSrc||p.src,t:p.currentTime,d:p.duration,vol:p.volume,paused:p.paused};})};},
    seek:function(s){var p=a[cur]; p.currentTime=Math.max(0,p.duration-s);}};   // tylko do testów
})();

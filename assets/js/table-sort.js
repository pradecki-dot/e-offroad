(function(){
  document.querySelectorAll('table[data-sortable]').forEach(function(t){
    var tb=t.tBodies[0];
    Array.prototype.forEach.call(tb.rows,function(r,i){r.dataset.i=i;});
    var ths=t.tHead.rows[0].cells;
    function key(r,type,col){
      if(type==='price'){var b=r.querySelector('[data-price]');return b?parseFloat(b.dataset.price):0;}
      return (r.cells[col].textContent||'').trim();
    }
    function sortBy(th,dir){
      var col=th.cellIndex,type=th.dataset.sort;
      var rows=Array.prototype.slice.call(tb.rows);
      var coll=new Intl.Collator((document.documentElement.lang||'pl').slice(0,2).toLowerCase(),{numeric:true,sensitivity:'base'});
      rows.sort(function(a,b){
        var x=key(a,type,col),y=key(b,type,col),c;
        c=(type==='price')?(x-y):coll.compare(x,y);
        if(c===0)return a.dataset.i-b.dataset.i;
        return dir==='ascending'?c:-c;
      });
      rows.forEach(function(r){tb.appendChild(r);});
      Array.prototype.forEach.call(ths,function(h){if(h.dataset.sort){h.setAttribute('aria-sort',h===th?dir:'none');}});
    }
    Array.prototype.forEach.call(ths,function(th){
      if(!th.dataset.sort)return;
      var b=th.querySelector('button');
      b.addEventListener('click',function(){
        var cur=th.getAttribute('aria-sort');
        var dir=cur==='ascending'?'descending':(cur==='descending'?'ascending':(th.dataset.sort==='price'?'descending':'ascending'));
        sortBy(th,dir);
      });
    });
  });
})();

// e-offroad.com — prosty koszyk po stronie przeglądarki (localStorage, bez bibliotek)
(function () {
  'use strict';
  var KEY = 'eoffroad_cart_v1', MAX = 99;
  // teksty wg <html lang> (pl, en, de, fr)
  var LANG = (document.documentElement.lang || 'pl').slice(0, 2).toLowerCase();
  var I18N = {
    pl: { loc: 'pl-PL', cart: 'Koszyk', added: 'Dodano do koszyka: ', removed: 'Usunięto z koszyka: ', cleared: 'Koszyk wyczyszczony',
          price: 'Cena: ', qty: 'Ilość: ', dec: 'Zmniejsz ilość: ', inc: 'Zwiększ ilość: ', del: 'Usuń z koszyka: ', delTxt: 'Usuń',
          hello: 'Dzień dobry,\n\nproszę o potwierdzenie dostępności i kosztów dostawy dla zamówienia:\n\n', total: 'Razem: ',
          form: 'Imię i nazwisko:\nTelefon:\nAdres dostawy:\n', subject: 'Zapytanie o zamówienie — e-offroad.com' },
    en: { loc: 'en-GB', cart: 'Cart', added: 'Added to cart: ', removed: 'Removed from cart: ', cleared: 'Cart cleared',
          price: 'Price: ', qty: 'Quantity: ', dec: 'Decrease quantity: ', inc: 'Increase quantity: ', del: 'Remove from cart: ', delTxt: 'Remove',
          hello: 'Hello,\n\nPlease confirm availability and delivery costs for the following order:\n\n', total: 'Total: ',
          form: 'Full name:\nPhone:\nDelivery address:\n', subject: 'Order enquiry — e-offroad.com' },
    de: { loc: 'de-DE', cart: 'Warenkorb', added: 'Zum Warenkorb hinzugefügt: ', removed: 'Aus dem Warenkorb entfernt: ', cleared: 'Warenkorb geleert',
          price: 'Preis: ', qty: 'Menge: ', dec: 'Menge verringern: ', inc: 'Menge erhöhen: ', del: 'Aus dem Warenkorb entfernen: ', delTxt: 'Entfernen',
          hello: 'Guten Tag,\n\nbitte bestätigen Sie die Verfügbarkeit und die Versandkosten für folgende Bestellung:\n\n', total: 'Gesamt: ',
          form: 'Vor- und Nachname:\nTelefon:\nLieferadresse:\n', subject: 'Bestellanfrage — e-offroad.com' },
    fr: { loc: 'fr-FR', cart: 'Panier', added: 'Ajouté au panier : ', removed: 'Retiré du panier : ', cleared: 'Panier vidé',
          price: 'Prix : ', qty: 'Quantité : ', dec: 'Diminuer la quantité : ', inc: 'Augmenter la quantité : ', del: 'Retirer du panier : ', delTxt: 'Retirer',
          hello: 'Bonjour,\n\nMerci de me confirmer la disponibilité et les frais de livraison pour la commande suivante :\n\n', total: 'Total : ',
          form: 'Nom et prénom :\nTéléphone :\nAdresse de livraison :\n', subject: 'Demande de commande — e-offroad.com' }
  };
  var L = I18N[LANG] || I18N.pl;
  var fmt = LANG === 'pl' || !I18N[LANG] ? new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })
          : new Intl.NumberFormat(L.loc, { style: 'currency', currency: 'PLN', currencyDisplay: 'code' });
  var toastTimer;

  function clean(items) {
    if (!Array.isArray(items)) return [];
    var seen = {};
    return items.filter(function (i) {
      if (!i || typeof i.id !== 'string' || !i.id || seen[i.id]) return false;
      if (typeof i.name !== 'string' || !isFinite(i.price) || i.price < 0) return false;
      seen[i.id] = 1; return true;
    }).map(function (i) {
      var q = Math.floor(Number(i.qty)) || 1;
      return { id: i.id, name: i.name, price: Number(i.price), img: String(i.img || ''), url: String(i.url || '/'),
               qty: Math.min(MAX, Math.max(1, q)), variant: i.variant ? String(i.variant) : undefined };
    });
  }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || 'null');
      return d && d.v === 1 ? clean(d.items) : [];
    } catch (e) { return []; }
  }
  function save(items) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, items: clean(items) })); } catch (e) { /* tryb prywatny / brak miejsca */ }
    refresh();
  }
  function count(items) { return items.reduce(function (s, i) { return s + i.qty; }, 0); }
  function total(items) { return items.reduce(function (s, i) { return s + i.price * i.qty; }, 0); }
  function plural(n) {
    var a = n % 10, b = n % 100;
    if (LANG === 'en') return n === 1 ? 'item' : 'items';
    if (LANG === 'de') return n === 1 ? 'Artikel' : 'Artikel';
    if (LANG === 'fr') return n <= 1 ? 'article' : 'articles';
    if (n === 1) return 'produkt';
    return (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 'produkty' : 'produktów';
  }

  function toast(msg) {
    var t = document.getElementById('cart-toast'); if (!t) return;
    t.textContent = ''; t.classList.add('show');
    setTimeout(function () { t.textContent = msg; }, 30);  // ponowne ogłoszenie przez czytniki ekranu
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  function add(btn) {
    var d = btn.dataset, items = load(), price = Number(d.price);
    if (!d.id || !isFinite(price)) return;
    // opcjonalne pole ilości (strona produktu): data-qty-input="id pola"
    var qi = d.qtyInput && document.getElementById(d.qtyInput), n = 1;
    if (qi) { n = Math.min(MAX, Math.max(1, Math.floor(Number(qi.value)) || 1)); qi.value = n; }
    // opcjonalny wariant (kolor): radio name=data-variant-input, albo domyślny z data-variant-default (karta)
    var id = d.id, name = d.name, img = d.img, variant = '';
    var vr = d.variantInput && document.querySelector('input[name="' + d.variantInput + '"]:checked');
    if (vr) { variant = vr.dataset.label || vr.value; if (vr.dataset.srcset) img = vr.dataset.srcset.split(',')[0].trim().split(' ')[0]; }
    else if (d.variantDefault) variant = d.variantDefault;
    if (variant) { id = d.id + '#' + variant.toLowerCase().replace(/\s+/g, '-'); name = d.name + ' – ' + variant; }
    var ex = items.filter(function (i) { return i.id === id; })[0];
    if (ex) ex.qty = Math.min(MAX, ex.qty + n);
    else items.push({ id: id, name: name, price: price, img: img, url: d.url, qty: n, variant: variant || undefined });
    save(items);
    toast(L.added + name);
  }

  // wybór koloru na stronie produktu: podmiana zdjęcia głównego (jeśli kolor ma zdjęcie)
  document.addEventListener('change', function (ev) {
    var r = ev.target; if (!r.matches || !r.matches('.pd-colors input[type=radio]')) return;
    var im = document.querySelector('.pd-main img'); if (!im) return;
    if (!im.dataset.orig) { im.dataset.orig = JSON.stringify([im.getAttribute('src'), im.getAttribute('srcset') || '', im.alt, im.getAttribute('width'), im.getAttribute('height')]); }
    var o = JSON.parse(im.dataset.orig), h1 = document.querySelector('h1');
    if (r.dataset.src) {
      im.setAttribute('srcset', r.dataset.srcset); im.setAttribute('src', r.dataset.src);
      im.setAttribute('width', r.dataset.w); im.setAttribute('height', r.dataset.h);
      im.alt = (h1 ? h1.textContent : '') + ' – ' + (r.dataset.label || '');
    } else { im.setAttribute('src', o[0]); im.setAttribute('srcset', o[1]); im.alt = o[2]; im.setAttribute('width', o[3]); im.setAttribute('height', o[4]); }
  });

  function refresh() {
    var items = load(), n = count(items);
    document.querySelectorAll('[data-cart-count]').forEach(function (b) {
      b.textContent = n > 99 ? '99+' : String(n);
      b.classList.toggle('zero', n === 0);
    });
    document.querySelectorAll('.cart-link').forEach(function (a) {
      a.setAttribute('aria-label', L.cart + ': ' + n + ' ' + plural(n));
    });
    render(items);
  }

  // ----- strona /koszyk/ -----
  function el(tag, attrs, text) {
    var x = document.createElement(tag);
    for (var k in attrs) x.setAttribute(k, attrs[k]);
    if (text != null) x.textContent = text;
    return x;
  }
  function render(items) {
    var root = document.getElementById('cart-root'); if (!root) return;
    var empty = document.getElementById('cart-empty'), full = document.getElementById('cart-full');
    var list = document.getElementById('cart-lines');
    empty.hidden = items.length > 0; full.hidden = items.length === 0;
    list.textContent = '';
    items.forEach(function (i) {
      var li = el('li', { 'class': 'cart-line', 'data-id': i.id });
      var a = el('a', { href: i.url, 'class': 'cl-img', tabindex: '-1', 'aria-hidden': 'true' });
      a.appendChild(el('img', { src: i.img, alt: '', width: '120', height: '75', loading: 'lazy', decoding: 'async' }));
      li.appendChild(a);
      var info = el('div', { 'class': 'cl-info' });
      var h = el('h2', { 'class': 'cl-name' }); h.appendChild(el('a', { href: i.url }, i.name)); info.appendChild(h);
      info.appendChild(el('p', { 'class': 'cl-unit' }, L.price + fmt.format(i.price)));
      li.appendChild(info);
      var q = el('div', { 'class': 'qty', role: 'group', 'aria-label': L.qty + i.name });
      q.appendChild(el('button', { type: 'button', 'class': 'qbtn', 'data-act': 'dec', 'aria-label': L.dec + i.name }, '−'));
      q.appendChild(el('span', { 'class': 'qval', 'aria-live': 'polite' }, String(i.qty)));
      q.appendChild(el('button', { type: 'button', 'class': 'qbtn', 'data-act': 'inc', 'aria-label': L.inc + i.name }, '+'));
      li.appendChild(q);
      li.appendChild(el('p', { 'class': 'cl-total' }, fmt.format(i.price * i.qty)));
      li.appendChild(el('button', { type: 'button', 'class': 'cl-del', 'data-act': 'del', 'aria-label': L.del + i.name }, L.delTxt));
      list.appendChild(li);
    });
    var n = count(items), sum = total(items);
    document.getElementById('cart-count').textContent = n + ' ' + plural(n);
    document.getElementById('cart-subtotal').textContent = fmt.format(sum);
    document.getElementById('cart-total').textContent = fmt.format(sum);
    var body = L.hello +
      items.map(function (i) { return '- ' + i.name + ' × ' + i.qty + ' = ' + fmt.format(i.price * i.qty); }).join('\n') +
      '\n\n' + L.total + fmt.format(sum) + '\n\n' + L.form;
    document.getElementById('cart-checkout').href = 'mailto:' + root.dataset.email +
      '?subject=' + encodeURIComponent(L.subject) + '&body=' + encodeURIComponent(body);
  }
  function change(id, act) {
    var items = load(), idx = -1;
    items.forEach(function (i, k) { if (i.id === id) idx = k; });
    if (idx < 0) return;
    if (act === 'inc') items[idx].qty = Math.min(MAX, items[idx].qty + 1);
    if (act === 'dec') items[idx].qty = Math.max(1, items[idx].qty - 1);
    if (act === 'del') { var name = items[idx].name; items.splice(idx, 1); toast(L.removed + name); }
    save(items);
    var line = document.querySelector('.cart-line[data-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"] [data-act="' + act + '"]');
    if (line) line.focus(); else { var h = document.querySelector('main h1'); if (h) { h.tabIndex = -1; h.focus(); } }
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-add-to-cart]');
    if (b) { add(b); return; }
    var c = ev.target.closest('.cart-line [data-act]');
    if (c) { change(c.closest('.cart-line').dataset.id, c.dataset.act); return; }
    if (ev.target.closest('#cart-clear')) { save([]); toast(L.cleared); }
  });
  window.addEventListener('storage', function (ev) { if (ev.key === KEY || ev.key === null) refresh(); });
  window.addEventListener('pageshow', refresh);  // powrót z bfcache
  refresh();
})();

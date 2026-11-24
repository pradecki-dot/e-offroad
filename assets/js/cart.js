// e-offroad.com — prosty koszyk po stronie przeglądarki (localStorage, bez bibliotek)
(function () {
  'use strict';
  // teksty wg <html lang> (pl, en, de, fr)
  var LANG = (document.documentElement.lang || 'pl').slice(0, 2).toLowerCase();
  // waluta wynika z języka strony (<html lang>): pl = PLN, en/de/fr = EUR, zh = USD.
  var CURS = { pl: 'PLN', en: 'EUR', de: 'EUR', fr: 'EUR', zh: 'USD' };
  var CUR = CURS[LANG] || 'PLN';
  // Koszyk przechowuje CENĘ BAZOWĄ (kwota + waluta bazowa: PLN dla pojazdów, USD dla części Antelopower)
  // i przelicza ją przy każdym wyświetleniu na walutę bieżącej strony — po zmianie języka nic się nie miesza.
  var KEY = 'eoffroad_cart_v2', OLD_KEY = 'eoffroad_cart_v1', MAX = 99;
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
          form: 'Nom et prénom :\nTéléphone :\nAdresse de livraison :\n', subject: 'Demande de commande — e-offroad.com' },
    zh: { loc: 'zh-CN', cart: '购物车', added: '已加入购物车：', removed: '已从购物车移除：', cleared: '购物车已清空',
          price: '价格：', qty: '数量：', dec: '减少数量：', inc: '增加数量：', del: '从购物车移除：', delTxt: '移除',
          hello: '您好，\n\n请确认以下订单的库存情况和配送费用：\n\n', total: '合计：',
          form: '姓名：\n电话：\n收货地址：\n', subject: '订单询价 — e-offroad.com' }
  };
  var L = I18N[LANG] || I18N.pl;
  /* ---- KURSY WALUT (NBP, tabela A, kurs średni; PLN za 1 jednostkę waluty) ----
     1) /api/kursy.php — serwer pobiera z api.nbp.pl kursy EUR i USD i trzyma je w pliku cache (12 h);
     2) gdy PHP/serwer nie odpowie — przeglądarka pyta bezpośrednio api.nbp.pl (CORS dozwolony);
     3) gdy i to zawiedzie — kurs wbudowany niżej (z dnia budowy strony; ten sam, którym przeliczono ceny w HTML).
     Wynik trzymany w localStorage (eoffroad_kursy) przez 12 h.
     Przeliczenie: PLN = baza PLN albo baza USD × kurs USD; EUR = PLN / kurs EUR; USD = baza USD albo PLN / kurs USD.
     Zaokrąglenie: pełne jednostki (data-dec=2 → grosze/centy); data-r=100 → kwoty orientacyjne w tekście do pełnych setek. */
  var RATES = { EUR: 4.4633, USD: 4.0819, date: '2026-11-24', src: 'wbudowany' }; // @@KURSY-WBUDOWANE@@
  function rnd(v, dec, r) {
    if (r && v >= 1000) return Math.round(v / r) * r;
    var k = dec ? 100 : 1; return Math.round(v * k + 1e-9) / k;
  }
  function conv(base, bcur, cur, dec, r) {
    base = Number(base) || 0; bcur = bcur || 'PLN'; cur = cur || CUR;
    if (bcur === cur) return rnd(base, dec);
    var pln = bcur === 'PLN' ? base : base * (RATES[bcur] || 1);
    if (cur === 'PLN') return rnd(pln, dec || bcur !== 'PLN', r);
    return rnd(pln / RATES[cur], dec, r);
  }
  function grp(n, sep) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep); }
  // zapis kwot jak w HTML (waluta.py): pl '18 990 PLN' / '10 153,25 PLN'; en '€1,234'; de '1.234 €'; fr '1 234 €'; zh 'US$1,234'
  function money(v, cur, dec) {
    cur = cur || CUR; var neg = v < 0; v = Math.abs(v);
    var whole = Math.floor(v + 1e-9), frac = dec ? Math.round((v - whole) * 100) : 0;
    if (frac === 100) { whole += 1; frac = 0; }
    var f2 = (frac < 10 ? '0' : '') + frac, s;
    if (cur === 'PLN') s = grp(whole, '\u00a0') + (dec ? ',' + f2 : '') + '\u00a0PLN';
    else if (cur === 'USD') s = 'US$' + grp(whole, ',') + (dec ? '.' + f2 : '');
    else if (LANG === 'en') s = '\u20ac' + grp(whole, ',') + (dec ? '.' + f2 : '');
    else s = grp(whole, LANG === 'de' ? '.' : '\u202f') + (dec ? ',' + f2 : '') + '\u00a0\u20ac';
    return (neg ? '-' : '') + s;
  }
  function hasDec(items) { return items.some(function (i) { return i.dec; }); }
  var fmt = { format: function (v, dec) { return money(v, CUR, dec); } };
  function fmtDate(d) { var p = String(d || '').split('-'); return p.length === 3 ? (LANG === 'en' || LANG === 'zh' ? d : p[2] + '.' + p[1] + '.' + p[0]) : d; }
  function fmtRate(v) { var s = Number(v).toFixed(4); return LANG === 'en' || LANG === 'zh' ? s : s.replace('.', ','); }
  // przelicz wszystko, co na stronie ma cenę bazową
  function applyRates() {
    document.querySelectorAll('[data-cena]').forEach(function (e) {
      var d = e.dataset, dec = d.dec === '2';
      e.textContent = money(conv(d.cena, d.baza, CUR, dec, Number(d.r) || 0), CUR, dec);
    });
    document.querySelectorAll('[data-add-to-cart][data-base-price]').forEach(function (b) {
      var d = b.dataset, v = conv(d.basePrice, d.baseCur, CUR, d.dec === '2');
      b.setAttribute('data-price', d.dec === '2' ? v.toFixed(2) : String(v)); b.setAttribute('data-currency', CUR);
    });
    document.querySelectorAll('[data-kurs]').forEach(function (e) { if (RATES[e.dataset.kurs]) e.textContent = fmtRate(RATES[e.dataset.kurs]); });
    document.querySelectorAll('[data-kurs-data]').forEach(function (e) { e.textContent = fmtDate(RATES.date); });
  }
  function setRates(r, src) {
    if (!r || !(r.EUR > 0) || !(r.USD > 0)) return false;
    RATES = { EUR: Number(r.EUR), USD: Number(r.USD), date: r.date || RATES.date, src: src };
    window.eoffroadKursy = RATES; applyRates(); refresh(); return true;
  }
  function getJSON(url, ms) {
    return new Promise(function (ok, fail) {
      var x = new XMLHttpRequest(); x.open('GET', url, true); x.timeout = ms || 5000;
      x.onload = function () { try { if (x.status !== 200) throw 0; ok(JSON.parse(x.responseText)); } catch (e) { fail(e); } };
      x.onerror = x.ontimeout = function () { fail(new Error('net')); }; x.send();
    });
  }
  function loadRates() {
    window.eoffroadKursy = RATES;
    try {
      var c = JSON.parse(localStorage.getItem('eoffroad_kursy') || 'null');
      if (c && Date.now() - c.ts < 12 * 3600e3 && setRates(c, c.src || 'cache')) return;
    } catch (e) { /* brak localStorage */ }
    function keep(r, src) {
      if (setRates(r, src)) try { localStorage.setItem('eoffroad_kursy', JSON.stringify({ EUR: r.EUR, USD: r.USD, date: r.date, src: src, ts: Date.now() })); } catch (e) {}
    }
    getJSON('/api/kursy.php', 5000).then(function (j) {
      if (!j || !j.EUR || !j.USD) throw 0; keep({ EUR: j.EUR.mid, USD: j.USD.mid, date: j.EUR.date }, 'api');
    }).catch(function () {
      var n = 'https://api.nbp.pl/api/exchangerates/rates/a/';
      return Promise.all([getJSON(n + 'eur/?format=json'), getJSON(n + 'usd/?format=json')]).then(function (a) {
        keep({ EUR: a[0].rates[0].mid, USD: a[1].rates[0].mid, date: a[0].rates[0].effectiveDate }, 'nbp');
      });
    }).catch(function () { /* zostaje kurs wbudowany — ceny w HTML są już nim przeliczone */ });
  }
  var toastTimer;

  function clean(items) {
    if (!Array.isArray(items)) return [];
    var seen = {};
    return items.filter(function (i) {
      if (!i || typeof i.id !== 'string' || !i.id || seen[i.id]) return false;
      if (typeof i.name !== 'string' || !isFinite(i.base) || i.base < 0 || !/^[A-Z]{3}$/.test(i.bcur || '')) return false;
      seen[i.id] = 1; return true;
    }).map(function (i) {
      var q = Math.floor(Number(i.qty)) || 1;
      return { id: i.id, name: i.name, base: Number(i.base), bcur: i.bcur, dec: i.dec ? 1 : 0, img: String(i.img || ''), url: String(i.url || '/'),
               qty: Math.min(MAX, Math.max(1, q)), variant: i.variant ? String(i.variant) : undefined };
    });
  }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d && d.v === 2) return clean(d.items);
      // jednorazowa migracja starego koszyka v1 (ceny zapisane w walucie strony, na której dodano produkt)
      var o = JSON.parse(localStorage.getItem(OLD_KEY) || 'null');
      if (o && o.v === 1 && Array.isArray(o.items)) {
        var m = clean(o.items.map(function (i) {
          return i && { id: i.id, name: i.name, base: Number(i.price), bcur: i.cur || o.cur || 'PLN', dec: Number(i.price) % 1 ? 1 : 0,
                        img: i.img, url: i.url, qty: i.qty, variant: i.variant };
        }));
        localStorage.setItem(KEY, JSON.stringify({ v: 2, items: m })); localStorage.removeItem(OLD_KEY);
        return m;
      }
    } catch (e) { /* uszkodzone dane / brak localStorage */ }
    return [];
  }
  function save(items) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 2, items: clean(items) })); } catch (e) { /* tryb prywatny / brak miejsca */ }
    refresh();
  }
  function unit(i) { return conv(i.base, i.bcur, CUR, i.dec); }
  function count(items) { return items.reduce(function (s, i) { return s + i.qty; }, 0); }
  function total(items) { return items.reduce(function (s, i) { return s + unit(i) * i.qty; }, 0); }
  function plural(n) {
    var a = n % 10, b = n % 100;
    if (LANG === 'en') return n === 1 ? 'item' : 'items';
    if (LANG === 'de') return n === 1 ? 'Artikel' : 'Artikel';
    if (LANG === 'fr') return n <= 1 ? 'article' : 'articles';
    if (LANG === 'zh') return '件商品';
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
    var d = btn.dataset, items = load();
    // cena bazowa z przycisku (data-base-price + data-base-cur); stare przyciski bez bazy: data-price w data-currency
    var base = Number(d.basePrice != null ? d.basePrice : d.price), bcur = d.basePrice != null ? (d.baseCur || 'PLN') : (d.currency || CUR);
    var dec = d.dec === '2' || base % 1 ? 1 : 0;
    if (!d.id || !isFinite(base)) return;
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
    else items.push({ id: id, name: name, base: base, bcur: bcur, dec: dec, img: img, url: d.url, qty: n, variant: variant || undefined });
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
      info.appendChild(el('p', { 'class': 'cl-unit' }, L.price + fmt.format(unit(i), i.dec)));
      li.appendChild(info);
      var q = el('div', { 'class': 'qty', role: 'group', 'aria-label': L.qty + i.name });
      q.appendChild(el('button', { type: 'button', 'class': 'qbtn', 'data-act': 'dec', 'aria-label': L.dec + i.name }, '−'));
      q.appendChild(el('span', { 'class': 'qval', 'aria-live': 'polite' }, String(i.qty)));
      q.appendChild(el('button', { type: 'button', 'class': 'qbtn', 'data-act': 'inc', 'aria-label': L.inc + i.name }, '+'));
      li.appendChild(q);
      li.appendChild(el('p', { 'class': 'cl-total' }, fmt.format(unit(i) * i.qty, i.dec)));
      li.appendChild(el('button', { type: 'button', 'class': 'cl-del', 'data-act': 'del', 'aria-label': L.del + i.name }, L.delTxt));
      list.appendChild(li);
    });
    var n = count(items), sum = total(items), sd = hasDec(items);
    document.getElementById('cart-count').textContent = n + ' ' + plural(n);
    document.getElementById('cart-subtotal').textContent = fmt.format(sum, sd);
    document.getElementById('cart-total').textContent = fmt.format(sum, sd);
    var body = L.hello +
      items.map(function (i) { return '- ' + i.name + ' × ' + i.qty + ' = ' + fmt.format(unit(i) * i.qty, i.dec); }).join('\n') +
      '\n\n' + L.total + fmt.format(sum, sd) + '\n\n' + L.form;
    var co = document.getElementById('cart-checkout');
    if (co) co.href = 'mailto:' + root.dataset.email + '?subject=' + encodeURIComponent(L.subject) + '&body=' + encodeURIComponent(body);
    var cd = document.getElementById('co-done');
    if (cd && !cd.hidden) { empty.hidden = true; full.hidden = true; }
    var cw = document.getElementById('co-wrap');
    if (cw && !cw.hidden) { if (!items.length) cw.hidden = true; else { full.hidden = true; updAmount(); } }
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

  // ----- zamówienie z płatnością przelewem (strona /koszyk/) -----
  var CO = {
    pl: { order: 'Realizuj zamówienie', h: 'Dane do zamówienia', name: 'Imię i nazwisko', email: 'E-mail', phone: 'Telefon', street: 'Ulica i numer domu / mieszkania',
          zip: 'Kod pocztowy', city: 'Miejscowość', country: 'Kraj', countryDef: 'Polska', company: 'Firma (opcjonalnie)', nip: 'NIP (opcjonalnie)',
          comment: 'Uwagi do zamówienia (opcjonalnie)', pay: 'Sposób płatności', payPLN: 'Przelew bankowy (PLN)', payEUR: 'Przelew bankowy (EUR)',
          consent: 'Wyrażam zgodę na przetwarzanie moich danych przez E-OFFROAD SP. Z O.O. w celu realizacji zamówienia.', req: 'pole wymagane',
          submit: 'Zamawiam i płacę przelewem', back: '← Wróć do koszyka', sending: 'Wysyłanie…', amountL: 'Do zapłaty',
          ship: 'Kwota obejmuje produkty. Koszt dostawy (jeśli dotyczy) potwierdzimy e-mailem.', thanks: 'Dziękujemy! Zamówienie zostało przyjęte.',
          orderNo: 'Numer zamówienia', transfer: 'Dane do przelewu', recipient: 'Odbiorca', account: 'Numer rachunku', bic: 'BIC/SWIFT', title: 'Tytuł przelewu',
          amount: 'Kwota', nipL: 'NIP', after: 'Po zaksięgowaniu wpłaty potwierdzimy zamówienie i termin dostawy. Pytania: info@e-offroad.com, tel. +48 503 950 134.',
          err: 'Nie udało się wysłać zamówienia. Spróbuj ponownie albo napisz na info@e-offroad.com lub zadzwoń: +48 503 950 134.',
          errFields: 'Uzupełnij poprawnie wymagane pola.', print: 'Wydrukuj / zapisz' },
    en: { order: 'Place order', h: 'Order details', name: 'Full name', email: 'E-mail', phone: 'Phone', street: 'Street and house / flat number',
          zip: 'Postcode', city: 'City', country: 'Country', countryDef: '', company: 'Company (optional)', nip: 'VAT / tax number (optional)',
          comment: 'Order notes (optional)', pay: 'Payment method', payPLN: 'Bank transfer (PLN)', payEUR: 'Bank transfer (EUR)',
          consent: 'I agree to E-OFFROAD SP. Z O.O. processing my data in order to fulfil this order.', req: 'required',
          submit: 'Order and pay by bank transfer', back: '← Back to cart', sending: 'Sending…', amountL: 'Amount to pay',
          ship: 'The amount covers the products. We will confirm any delivery cost by e-mail.', thanks: 'Thank you! Your order has been received.',
          orderNo: 'Order number', transfer: 'Bank transfer details', recipient: 'Recipient', account: 'Account number', bic: 'BIC/SWIFT', title: 'Payment reference',
          amount: 'Amount', nipL: 'Tax ID (NIP)', after: 'Once the payment is received we will confirm the order and delivery date. Questions: info@e-offroad.com, +48 503 950 134.',
          err: 'The order could not be sent. Please try again or write to info@e-offroad.com or call +48 503 950 134.',
          errFields: 'Please fill in the required fields correctly.', print: 'Print / save' },
    de: { order: 'Bestellung abschließen', h: 'Bestelldaten', name: 'Vor- und Nachname', email: 'E-Mail', phone: 'Telefon', street: 'Straße und Hausnummer',
          zip: 'Postleitzahl', city: 'Ort', country: 'Land', countryDef: '', company: 'Firma (optional)', nip: 'USt-IdNr. (optional)',
          comment: 'Anmerkungen zur Bestellung (optional)', pay: 'Zahlungsart', payPLN: 'Banküberweisung (PLN)', payEUR: 'Banküberweisung (EUR)',
          consent: 'Ich willige ein, dass E-OFFROAD SP. Z O.O. meine Daten zur Abwicklung der Bestellung verarbeitet.', req: 'Pflichtfeld',
          submit: 'Bestellen und per Überweisung bezahlen', back: '← Zurück zum Warenkorb', sending: 'Wird gesendet…', amountL: 'Zu zahlen',
          ship: 'Der Betrag umfasst die Produkte. Eventuelle Versandkosten bestätigen wir per E-Mail.', thanks: 'Vielen Dank! Ihre Bestellung ist eingegangen.',
          orderNo: 'Bestellnummer', transfer: 'Überweisungsdaten', recipient: 'Empfänger', account: 'Kontonummer', bic: 'BIC/SWIFT', title: 'Verwendungszweck',
          amount: 'Betrag', nipL: 'Steuernummer (NIP)', after: 'Nach Zahlungseingang bestätigen wir die Bestellung und den Liefertermin. Fragen: info@e-offroad.com, +48 503 950 134.',
          err: 'Die Bestellung konnte nicht gesendet werden. Bitte erneut versuchen oder an info@e-offroad.com schreiben bzw. +48 503 950 134 anrufen.',
          errFields: 'Bitte füllen Sie die Pflichtfelder korrekt aus.', print: 'Drucken / speichern' },
    fr: { order: 'Passer la commande', h: 'Informations de commande', name: 'Nom et prénom', email: 'E-mail', phone: 'Téléphone', street: 'Rue et numéro',
          zip: 'Code postal', city: 'Ville', country: 'Pays', countryDef: '', company: 'Société (facultatif)', nip: 'N° de TVA (facultatif)',
          comment: 'Remarques sur la commande (facultatif)', pay: 'Mode de paiement', payPLN: 'Virement bancaire (PLN)', payEUR: 'Virement bancaire (EUR)',
          consent: 'J’accepte que E-OFFROAD SP. Z O.O. traite mes données afin d’exécuter la commande.', req: 'obligatoire',
          submit: 'Commander et payer par virement', back: '← Retour au panier', sending: 'Envoi…', amountL: 'Montant à payer',
          ship: 'Le montant couvre les produits. Les éventuels frais de livraison seront confirmés par e-mail.', thanks: 'Merci ! Votre commande a bien été reçue.',
          orderNo: 'Numéro de commande', transfer: 'Coordonnées bancaires', recipient: 'Bénéficiaire', account: 'Numéro de compte', bic: 'BIC/SWIFT', title: 'Libellé du virement',
          amount: 'Montant', nipL: 'N° fiscal (NIP)', after: 'Dès réception du paiement, nous confirmerons la commande et la date de livraison. Questions : info@e-offroad.com, +48 503 950 134.',
          err: 'La commande n’a pas pu être envoyée. Réessayez ou écrivez à info@e-offroad.com, ou appelez le +48 503 950 134.',
          errFields: 'Veuillez remplir correctement les champs obligatoires.', print: 'Imprimer / enregistrer' },
    zh: { order: '提交订单', h: '订单信息', name: '姓名', email: '电子邮箱', phone: '电话', street: '街道及门牌号',
          zip: '邮政编码', city: '城市', country: '国家', countryDef: '', company: '公司（选填）', nip: '税号（选填）',
          comment: '订单备注（选填）', pay: '付款方式', payPLN: '银行转账（PLN）', payEUR: '银行转账（EUR）',
          consent: '我同意 E-OFFROAD SP. Z O.O. 为履行订单处理我的个人数据。', req: '必填',
          submit: '下单并通过银行转账付款', back: '← 返回购物车', sending: '正在发送…', amountL: '应付金额',
          ship: '金额仅含商品费用，如有运费将通过电子邮件确认。', thanks: '谢谢！我们已收到您的订单。',
          orderNo: '订单号', transfer: '转账信息', recipient: '收款人', account: '账号', bic: 'BIC/SWIFT', title: '转账附言',
          amount: '金额', nipL: '税号 (NIP)', after: '收到款项后，我们将确认订单和交货日期。如有疑问：info@e-offroad.com，+48 503 950 134。',
          err: '订单发送失败。请重试，或发送邮件至 info@e-offroad.com，或致电 +48 503 950 134。',
          errFields: '请正确填写必填项。', print: '打印 / 保存' }
  };
  var C = CO[LANG] || CO.pl;
  function payCur() { var r = document.querySelector('input[name="co-cur"]:checked'); return r ? r.value : (CUR === 'PLN' ? 'PLN' : 'EUR'); }
  function payLines(items, cur) {
    return items.map(function (i) { var u = conv(i.base, i.bcur, cur, i.dec); return { i: i, u: u, t: rnd(u * i.qty, i.dec || cur === 'PLN' && i.bcur !== 'PLN') }; });
  }
  function paySum(items, cur) { return payLines(items, cur).reduce(function (s, l) { return s + l.t; }, 0); }
  function updAmount() {
    var a = document.getElementById('co-amount'); if (!a) return;
    var cur = payCur(), items = load(), s = paySum(items, cur);
    a.textContent = money(s, cur, hasDec(items) || s % 1 ? 1 : 0);
  }
  function field(id, label, type, req, full, extra) {
    var w = el('div', { 'class': 'co-f' + (full ? ' full' : '') });
    var lb = el('label', { 'for': id }, label + (req ? ' *' : '')); w.appendChild(lb);
    var inp = type === 'textarea' ? el('textarea', { id: id, name: id, rows: '3' }) : el('input', { id: id, name: id, type: type || 'text' });
    if (req) { inp.required = true; inp.setAttribute('aria-required', 'true'); }
    for (var k in (extra || {})) inp.setAttribute(k, extra[k]);
    w.appendChild(inp); return w;
  }
  function buildForm() {
    var root = document.getElementById('cart-root'); if (!root || document.getElementById('co-form')) return;
    var sec = el('section', { id: 'co-wrap', 'class': 'co card pad', 'aria-labelledby': 'co-h' }); sec.hidden = true;
    sec.appendChild(el('h2', { id: 'co-h' }, C.h));
    var f = el('form', { id: 'co-form', 'class': 'co-form', novalidate: '' });
    var g = el('div', { 'class': 'co-grid' });
    g.appendChild(field('co-name', C.name, 'text', 1, 1, { autocomplete: 'name', maxlength: '120' }));
    g.appendChild(field('co-email', C.email, 'email', 1, 0, { autocomplete: 'email', maxlength: '160' }));
    g.appendChild(field('co-phone', C.phone, 'tel', 1, 0, { autocomplete: 'tel', maxlength: '40' }));
    g.appendChild(field('co-street', C.street, 'text', 1, 1, { autocomplete: 'street-address', maxlength: '160' }));
    g.appendChild(field('co-zip', C.zip, 'text', 1, 0, { autocomplete: 'postal-code', maxlength: '20' }));
    g.appendChild(field('co-city', C.city, 'text', 1, 0, { autocomplete: 'address-level2', maxlength: '80' }));
    g.appendChild(field('co-country', C.country, 'text', 1, 1, { autocomplete: 'country-name', maxlength: '60', value: C.countryDef }));
    g.appendChild(field('co-company', C.company, 'text', 0, 0, { autocomplete: 'organization', maxlength: '160' }));
    g.appendChild(field('co-nip', C.nip, 'text', 0, 0, { maxlength: '30' }));
    g.appendChild(field('co-comment', C.comment, 'textarea', 0, 1, { maxlength: '2000' }));
    f.appendChild(g);
    var hp = el('div', { 'class': 'co-hp', 'aria-hidden': 'true' }); hp.appendChild(el('input', { type: 'text', name: 'www', id: 'co-www', tabindex: '-1', autocomplete: 'off' })); f.appendChild(hp);
    var fs = el('fieldset', { 'class': 'co-pay' }); fs.appendChild(el('legend', {}, C.pay));
    ['PLN', 'EUR'].forEach(function (c) {
      var l = el('label', { 'class': 'co-radio' }), r = el('input', { type: 'radio', name: 'co-cur', value: c });
      if ((CUR === 'PLN' ? 'PLN' : 'EUR') === c) r.checked = true;
      l.appendChild(r); l.appendChild(document.createTextNode(' ' + (c === 'PLN' ? C.payPLN : C.payEUR))); fs.appendChild(l);
    });
    var am = el('p', { 'class': 'co-amount' }); am.appendChild(document.createTextNode(C.amountL + (LANG === 'fr' ? ' : ' : LANG === 'zh' ? '：' : ': '))); am.appendChild(el('strong', { id: 'co-amount' }, ''));
    fs.appendChild(am); fs.appendChild(el('p', { 'class': 'note' }, C.ship)); f.appendChild(fs);
    var cl = el('label', { 'class': 'co-check' }), cb = el('input', { type: 'checkbox', id: 'co-consent', name: 'consent' }); cb.required = true;
    cl.appendChild(cb); cl.appendChild(el('span', {}, C.consent + ' *')); f.appendChild(cl);
    f.appendChild(el('p', { id: 'co-msg', 'class': 'co-err', role: 'alert' }));
    var act = el('p', { 'class': 'co-actions' });
    act.appendChild(el('button', { type: 'submit', 'class': 'btn', id: 'co-submit' }, C.submit));
    act.appendChild(el('button', { type: 'button', 'class': 'btn ghost', id: 'co-back' }, C.back));
    f.appendChild(act); sec.appendChild(f);
    var done = el('section', { id: 'co-done', 'class': 'co card pad', tabindex: '-1' }); done.hidden = true;
    root.appendChild(sec); root.appendChild(done);
    f.addEventListener('change', function (ev) { if (ev.target.name === 'co-cur') updAmount(); });
    f.addEventListener('submit', submitOrder);
  }
  function showForm(on) {
    buildForm();
    var w = document.getElementById('co-wrap'), full = document.getElementById('cart-full');
    w.hidden = !on; if (full) full.hidden = on || load().length === 0;
    if (on) { updAmount(); var h = document.getElementById('co-h'); h.tabIndex = -1; h.focus(); }
  }
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }
  function submitOrder(ev) {
    ev.preventDefault();
    var f = ev.target, msg = document.getElementById('co-msg'), bad = null;
    msg.textContent = '';
    ['co-name', 'co-email', 'co-phone', 'co-street', 'co-zip', 'co-city', 'co-country', 'co-consent'].forEach(function (id) {
      var e = document.getElementById(id), ok = e.type === 'checkbox' ? e.checked : e.value.trim() !== '' && (e.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.value.trim()));
      e.setAttribute('aria-invalid', ok ? 'false' : 'true'); if (!ok && !bad) bad = e;
    });
    if (bad) { msg.textContent = C.errFields; bad.focus(); return; }
    var items = load(); if (!items.length) return;
    var cur = payCur(), lines = payLines(items, cur), sum = paySum(items, cur);
    var dec = hasDec(items) || sum % 1 ? 1 : 0;
    var data = {
      lang: LANG, currency: cur, pageCurrency: CUR, amount: Math.round(sum * 100) / 100,
      pageTotal: fmt.format(total(items), hasDec(items)),
      items: lines.map(function (l) { return { name: l.i.name, qty: l.i.qty, unit: money(l.u, cur, l.i.dec || l.u % 1 ? 1 : 0), total: money(l.t, cur, l.i.dec || l.t % 1 ? 1 : 0) }; }),
      customer: { name: val('co-name'), email: val('co-email'), phone: val('co-phone'), street: val('co-street'), zip: val('co-zip'), city: val('co-city'),
                  country: val('co-country'), company: val('co-company'), nip: val('co-nip'), comment: val('co-comment') },
      consent: document.getElementById('co-consent').checked, www: val('co-www')
    };
    var btn = document.getElementById('co-submit'); btn.disabled = true; btn.textContent = C.sending;
    var x = new XMLHttpRequest(); x.open('POST', '/api/zamowienie.php', true); x.timeout = 20000;
    x.setRequestHeader('Content-Type', 'application/json');
    x.onload = function () {
      var j = null; try { j = JSON.parse(x.responseText); } catch (e) {}
      if (x.status === 200 && j && j.ok && j.bank) { showDone(j, dec); save([]); }
      else { msg.textContent = (j && j.error === 'fields') ? C.errFields : C.err; btn.disabled = false; btn.textContent = C.submit; }
    };
    x.onerror = x.ontimeout = function () { msg.textContent = C.err; btn.disabled = false; btn.textContent = C.submit; };
    x.send(JSON.stringify(data));
  }
  function row(dl, k, v) { var d = el('div'); d.appendChild(el('dt', {}, k)); d.appendChild(el('dd', {}, v)); dl.appendChild(d); }
  function showDone(j, dec) {
    var d = document.getElementById('co-done'), w = document.getElementById('co-wrap');
    d.textContent = '';
    d.appendChild(el('h2', {}, C.thanks));
    var p = el('p', { 'class': 'co-no' }); p.appendChild(document.createTextNode(C.orderNo + (LANG === 'fr' ? ' : ' : LANG === 'zh' ? '：' : ': '))); p.appendChild(el('strong', {}, j.order)); d.appendChild(p);
    d.appendChild(el('h3', {}, C.transfer));
    var dl = el('dl', { 'class': 'co-bank' }), b = j.bank;
    row(dl, C.recipient, b.recipient + ', ' + b.address);
    row(dl, C.nipL, b.nip);
    if (j.currency === 'PLN' && LANG === 'pl' && b.nrb) row(dl, C.account, b.nrb);
    row(dl, 'IBAN', b.iban);
    if (LANG !== 'pl' || j.currency !== 'PLN') row(dl, C.bic, b.bic);
    row(dl, C.title, j.title);
    row(dl, C.amount, money(j.amount, j.currency, dec));
    d.appendChild(dl);
    d.appendChild(el('p', { 'class': 'note' }, C.ship));
    d.appendChild(el('p', {}, C.after));
    var pr = el('p'); pr.appendChild(el('button', { type: 'button', 'class': 'btn ghost', id: 'co-print' }, C.print)); d.appendChild(pr);
    w.hidden = true; d.hidden = false; d.focus();
    try { sessionStorage.setItem('eoffroad_last_order', JSON.stringify({ j: j, dec: dec })); } catch (e) {}
  }
  document.addEventListener('click', function (ev) {
    if (ev.target.closest('#cart-order')) { showForm(true); return; }
    if (ev.target.closest('#co-back')) { showForm(false); var o = document.getElementById('cart-order'); if (o) o.focus(); return; }
    if (ev.target.closest('#co-print')) window.print();
  });

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-add-to-cart]');
    if (b) { add(b); return; }
    var c = ev.target.closest('.cart-line [data-act]');
    if (c) { change(c.closest('.cart-line').dataset.id, c.dataset.act); return; }
    if (ev.target.closest('#cart-clear')) { save([]); toast(L.cleared); }
  });
  window.addEventListener('storage', function (ev) { if (ev.key === KEY || ev.key === null) refresh(); });
  window.eoffroadCena = { conv: conv, money: money, cur: CUR };   // do testów / innych skryptów
  window.addEventListener('pageshow', refresh);  // powrót z bfcache
  refresh();
  loadRates();
})();

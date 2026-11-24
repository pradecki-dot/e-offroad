<?php
/* e-offroad.com — złożenie zamówienia z koszyka (płatność: przelew bankowy).
   POST /api/zamowienie.php  (JSON z assets/js/cart.js)
   -> wysyła zamówienie e-mailem do sklepu (info@e-offroad.com) i zwraca numer zamówienia + dane do przelewu.
   Ceny pochodzą z koszyka w przeglądarce — sklep potwierdza zamówienie przed wysyłką towaru. */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

date_default_timezone_set('Europe/Warsaw');
const SHOP_EMAIL = 'info@e-offroad.com';
const BANK = [
    'recipient' => 'E-OFFROAD SP. Z O.O.',
    'address'   => 'UL. MOGILSKA 54/24A, 31-546 KRAKÓW',
    'nip'       => '6751818885',
    'bic'       => 'PKOPPLPW',                       // Bank Pekao S.A.
    'PLN'       => ['nrb' => '51 1240 4546 1111 0011 6112 3049', 'iban' => 'PL51 1240 4546 1111 0011 6112 3049'],
    'EUR'       => ['nrb' => '', 'iban' => 'PL64 1240 4546 1978 0011 6457 3502'],
];

function out($code, $data) { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
function cut($v, $max) { return function_exists('mb_substr') ? mb_substr($v, 0, $max, 'UTF-8') : (preg_match('/^.{0,' . (int)$max . '}/us', $v, $m) ? $m[0] : ''); }
function s($v, $max) { $v = trim((string)preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string)$v)); return cut($v, $max); }
function line($v) { return str_replace(["\r", "\n"], ' ', $v); }
function iban_ok($iban) {
    $i = str_replace(' ', '', $iban);
    if (!preg_match('/^PL\d{26}$/', $i)) return false;
    $r = substr($i, 4) . substr($i, 0, 4); $n = '';
    foreach (str_split($r) as $c) $n .= ctype_alpha($c) ? (string)(ord($c) - 55) : $c;
    $m = 0; foreach (str_split($n, 7) as $p) $m = (int)(($m . $p) % 97);
    return $m === 1;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') out(405, ['ok' => false, 'error' => 'method']);
$raw = file_get_contents('php://input', false, null, 0, 65536);
$in = json_decode($raw ?: '', true);
if (!is_array($in)) out(400, ['ok' => false, 'error' => 'json']);
if (!empty($in['www'])) out(200, ['ok' => true, 'order' => 'EO-0']);            // pułapka na boty

// prosty limit: najwyżej 10 zamówień na 10 minut z jednego IP
$ip = $_SERVER['REMOTE_ADDR'] ?? '-';
$rlf = sys_get_temp_dir() . '/eoffroad-zam-' . md5($ip);
$hits = array_filter(array_map('intval', @file($rlf, FILE_IGNORE_NEW_LINES) ?: []), function ($t) { return $t > time() - 600; });
if (count($hits) >= 10) out(429, ['ok' => false, 'error' => 'limit']);

$lang = in_array($in['lang'] ?? '', ['pl', 'en', 'de', 'fr', 'zh'], true) ? $in['lang'] : 'pl';
$cur  = ($in['currency'] ?? '') === 'EUR' ? 'EUR' : 'PLN';
$c = $in['customer'] ?? [];
$f = [
    'name'    => s($c['name'] ?? '', 120),  'email' => s($c['email'] ?? '', 160), 'phone' => s($c['phone'] ?? '', 40),
    'street'  => s($c['street'] ?? '', 160), 'zip' => s($c['zip'] ?? '', 20), 'city' => s($c['city'] ?? '', 80),
    'country' => s($c['country'] ?? '', 60), 'company' => s($c['company'] ?? '', 160), 'nip' => s($c['nip'] ?? '', 30),
    'comment' => s($c['comment'] ?? '', 2000),
];
$miss = [];
foreach (['name', 'email', 'phone', 'street', 'zip', 'city', 'country'] as $k) if ($f[$k] === '') $miss[] = $k;
if ($f['email'] !== '' && !filter_var($f['email'], FILTER_VALIDATE_EMAIL)) $miss[] = 'email';
if (empty($in['consent'])) $miss[] = 'consent';
$items = [];
foreach (array_slice(is_array($in['items'] ?? null) ? $in['items'] : [], 0, 50) as $it) {
    $q = (int)($it['qty'] ?? 0); $n = s($it['name'] ?? '', 160);
    if ($n === '' || $q < 1 || $q > 99) continue;
    $items[] = ['name' => line($n), 'qty' => $q, 'unit' => line(s($it['unit'] ?? '', 40)), 'total' => line(s($it['total'] ?? '', 40))];
}
if (!$items) $miss[] = 'items';
$amount = round((float)($in['amount'] ?? 0), 2);
if (!($amount > 0) || $amount > 10000000) $miss[] = 'amount';
if ($miss) out(422, ['ok' => false, 'error' => 'fields', 'fields' => array_values(array_unique($miss))]);
if (!iban_ok(BANK[$cur]['iban'])) out(503, ['ok' => false, 'error' => 'bank']);

$order = 'EO-' . date('ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 5));
$amountTxt = number_format($amount, 2, ',', ' ') . ' ' . $cur;
$names = implode(', ', array_map(function ($i) { return $i['name'] . ($i['qty'] > 1 ? ' x' . $i['qty'] : ''); }, $items));
$title = cut($order . ' ' . $names, 140);
$acc = $cur === 'PLN' && $lang === 'pl' ? BANK['PLN']['nrb'] : BANK[$cur]['iban'];
$isTest = stripos($f['name'] . ' ' . $f['comment'], 'TEST') !== false;

$L = [];
$L[] = ($isTest ? '[TEST] ' : '') . 'Nowe zamówienie ze strony e-offroad.com — płatność: przelew bankowy (' . $cur . ')';
$L[] = '';
$L[] = 'Numer zamówienia: ' . $order;
$L[] = 'Data: ' . date('Y-m-d H:i') . ' (czas serwera)';
$L[] = 'Wersja językowa strony: ' . $lang . ($in['pageCurrency'] ?? '' ? ' (ceny na stronie w ' . line(s($in['pageCurrency'], 3)) . ')' : '');
$L[] = '';
$L[] = 'PRODUKTY:';
foreach ($items as $i) $L[] = '- ' . $i['name'] . ' × ' . $i['qty'] . ' (cena: ' . $i['unit'] . ', razem: ' . $i['total'] . ')';
$L[] = '';
$L[] = 'KWOTA DO PRZELEWU: ' . $amountTxt . ' (bez kosztu dostawy — do potwierdzenia)';
if (!empty($in['pageTotal'])) $L[] = 'Suma na stronie: ' . line(s($in['pageTotal'], 40));
$L[] = 'Tytuł przelewu: ' . $title;
$L[] = 'Rachunek (' . $cur . '): ' . $acc;
$L[] = '';
$L[] = 'KLIENT:';
$L[] = 'Imię i nazwisko: ' . $f['name'];
$L[] = 'E-mail: ' . $f['email'];
$L[] = 'Telefon: ' . $f['phone'];
$L[] = 'Adres dostawy: ' . $f['street'] . ', ' . $f['zip'] . ' ' . $f['city'] . ', ' . $f['country'];
if ($f['company'] !== '' || $f['nip'] !== '') $L[] = 'Firma / NIP: ' . trim($f['company'] . ' ' . ($f['nip'] !== '' ? '(NIP ' . $f['nip'] . ')' : ''));
if ($f['comment'] !== '') { $L[] = ''; $L[] = 'Uwagi klienta:'; $L[] = $f['comment']; }
$L[] = '';
$L[] = 'Zgoda na przetwarzanie danych w celu realizacji zamówienia: TAK';
$L[] = 'IP: ' . $ip;
$body = implode("\r\n", $L);

$subject = '=?UTF-8?B?' . base64_encode(($isTest ? '[TEST] ' : '') . 'Zamówienie ' . $order . ' — ' . $amountTxt . ' — przelew') . '?=';
$fromName = '=?UTF-8?B?' . base64_encode('e-offroad.com – zamówienia') . '?=';
$headers = 'From: ' . $fromName . ' <' . SHOP_EMAIL . ">\r\n"
         . 'Reply-To: ' . line($f['email']) . "\r\n"
         . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n"
         . 'X-Mailer: e-offroad.com/zamowienie';

$dry = getenv('EOFFROAD_MAIL_DRYRUN');
if ($dry) { $sent = (bool)file_put_contents($dry, "To: " . SHOP_EMAIL . "\r\nSubject: $subject\r\n$headers\r\n\r\n$body\r\n----\r\n", FILE_APPEND); }
else { $sent = @mail(SHOP_EMAIL, $subject, $body, $headers, '-f' . SHOP_EMAIL); }
if (!$sent) out(502, ['ok' => false, 'error' => 'mail']);
$hits[] = time(); @file_put_contents($rlf, implode("\n", $hits));

out(200, ['ok' => true, 'order' => $order, 'amount' => $amount, 'currency' => $cur, 'title' => $title,
    'bank' => ['recipient' => BANK['recipient'], 'address' => BANK['address'], 'nip' => BANK['nip'], 'bic' => BANK['bic'],
               'nrb' => $cur === 'PLN' ? BANK['PLN']['nrb'] : '', 'iban' => BANK[$cur]['iban']]]);

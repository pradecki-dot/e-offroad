<?php
/* e-offroad.com — dzienne kursy walut NBP (tabela A, kurs średni) dla przeliczania cen.
   GET /api/kursy.php -> {"EUR":{"mid":4.4633,"date":"2026-11-24","no":"228/A/NBP/2026"},"USD":{...},"source":"nbp|cache|stale","fetched":"..."}
   - Kursy pobierane z api.nbp.pl najwyżej raz na 12 h i trzymane w pliku cache obok skryptu (kursy-cache.json).
   - Gdy NBP nie odpowiada, zwracany jest ostatni zapisany kurs ("source":"stale"); gdy nie ma żadnego — HTTP 503,
     a przeglądarka (cart.js) pyta NBP bezpośrednio albo używa kursu wbudowanego. */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
$CACHE = __DIR__ . '/kursy-cache.json';
$TTL = 12 * 3600;

function nbp_rate($code) {
    $url = 'https://api.nbp.pl/api/exchangerates/rates/a/' . $code . '/?format=json';
    $raw = false;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6, CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_HTTPHEADER => ['Accept: application/json'], CURLOPT_USERAGENT => 'e-offroad.com kursy']);
        $raw = curl_exec($ch);
        if (curl_getinfo($ch, CURLINFO_HTTP_CODE) !== 200) $raw = false;
        curl_close($ch);
    } elseif (ini_get('allow_url_fopen')) {
        $ctx = stream_context_create(['http' => ['timeout' => 6, 'header' => "Accept: application/json\r\n"]]);
        $raw = @file_get_contents($url, false, $ctx);
    }
    if ($raw === false) return null;
    $j = json_decode($raw, true);
    $r = $j['rates'][0] ?? null;
    if (!$r || !is_numeric($r['mid'] ?? null) || $r['mid'] <= 0) return null;
    return ['mid' => (float)$r['mid'], 'date' => (string)$r['effectiveDate'], 'no' => (string)$r['no']];
}

$cached = is_readable($CACHE) ? json_decode((string)@file_get_contents($CACHE), true) : null;
$fresh = $cached && isset($cached['EUR'], $cached['USD'], $cached['ts']) && (time() - $cached['ts'] < $TTL);

if ($fresh) {
    $out = $cached; $out['source'] = 'cache';
} else {
    $eur = nbp_rate('eur'); $usd = nbp_rate('usd');
    if ($eur && $usd) {
        $out = ['EUR' => $eur, 'USD' => $usd, 'ts' => time(), 'fetched' => gmdate('c')];
        @file_put_contents($CACHE, json_encode($out), LOCK_EX);
        $out['source'] = 'nbp';
    } elseif ($cached && isset($cached['EUR'], $cached['USD'])) {
        $out = $cached; $out['source'] = 'stale';
    } else {
        http_response_code(503);
        echo json_encode(['error' => 'NBP niedostępny']);
        exit;
    }
}
unset($out['ts']);
header('Cache-Control: public, max-age=3600');
echo json_encode($out, JSON_UNESCAPED_UNICODE);

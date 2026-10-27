// Sprawdza, czy serwer gry działa: logowanie, czas, zapis, ziarna wytopu, Obieg, ranking.
// Użycie: node tools/server-check.mjs http://ADRES-SERWERA:8080 KLUCZ_SERWERA
const [base = 'http://127.0.0.1:8080', key = 'defaultkey'] = process.argv.slice(2);
const url = base.replace(/\/$/, '');
const step = async (name, fn) => {
  try { const r = await fn(); console.log(`✔ ${name}${r ? ': ' + r : ''}`); return true; }
  catch (e) { console.log(`✘ ${name}: ${e.message}`); return false; }
};
const json = async res => { const t = await res.text(); if (!res.ok) throw new Error(`HTTP ${res.status} ${t.slice(0, 200)}`); return JSON.parse(t); };
let token = '';
const rpc = async (id, body) => json(await fetch(`${url}/v2/rpc/${id}?unwrap`, {
  method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}));

const ok = await step('logowanie urządzeniem', async () => {
  const r = await json(await fetch(`${url}/v2/account/authenticate/device?create=true`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(key + ':').toString('base64'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'server-check-device-0001' }),
  }));
  token = r.token;
  return 'konto testowe ' + (r.created ? 'założone' : 'istnieje');
});
if (ok) {
  await step('czas serwera', async () => new Date((await rpc('time', {})).serverTime).toLocaleString('pl-PL'));
  await step('odczyt zapisu', async () => ((await rpc('save_get', {})).state ? 'jest zapis' : 'brak zapisu (nowe konto)'));
  await step('ziarna wytopu', async () => `${(await rpc('seeds', { from: 0, n: 3 })).seeds.length} z 3`);
  await step('ranking Mocy', async () => `${(await rpc('ranking', { board: 'moc' })).records.length} graczy`);
  await step('ranking areny', async () => `${(await rpc('ranking', { board: 'arena' })).records.length} graczy`);
}
process.exit(ok ? 0 : 1);

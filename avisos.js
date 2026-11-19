// Lo ejecuta GitHub cada 5 minutos: busca cambios nuevos en el cuadrante
// y manda un aviso al móvil de los jefes que lo tengan activado.
const admin = require('firebase-admin');

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SA)) });
const db = admin.firestore();

const NOMBRES = { cobos: 'Cobos', antonio: 'Antonio', gonzalo: 'Gonzalo', myriam: 'Myriam', ale: 'Ale', luis: 'Luis', fran: 'Fran', escobar: 'Escobar', julian: 'Julián', jc: 'José Carlos', elena: 'Elena', maqueda: 'Maqueda', carballo: 'Carballo', laura: 'Laura' };
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fecha = s => { const [, m, d] = s.split('-').map(Number); return `${d} ${MES[m - 1]}`; };
const [owner, repo] = (process.env.GITHUB_REPOSITORY || '/').split('/');
const URL_APP = process.env.APP_URL || `https://${owner.toLowerCase()}.github.io/${repo}/`;

(async () => {
  const estRef = db.doc('config/avisos');
  const est = (await estRef.get()).data() || {};
  const desde = est.ultimo || admin.firestore.Timestamp.fromMillis(Date.now() - 10 * 60 * 1000);

  const snap = await db.collection('cambios').where('ts', '>', desde).orderBy('ts').get();
  if (snap.empty) { if (!est.ultimo) await estRef.set({ ultimo: desde }); console.log('Sin cambios nuevos'); return; }
  const cambios = snap.docs.map(d => d.data());

  const jefes = await db.collection('usuarios').where('persona', 'in', ['cobos', 'antonio', 'gonzalo']).get();
  for (const u of jefes.docs) {
    const p = u.data();
    if (p.modo === 'informe' || !p.tokens || !p.tokens.length) continue;
    const suyos = cambios.filter(c => c.autor !== p.persona);
    if (!suyos.length) continue;
    const mensajes = suyos.length > 3
      ? [{ title: `${suyos.length} cambios en el cuadrante`, body: suyos.slice(0, 4).map(c => `${NOMBRES[c.persona]} ${fecha(c.fecha)}`).join(' · ') + '…' }]
      : suyos.map(c => ({ title: `${NOMBRES[c.persona]} · ${fecha(c.fecha)}`, body: `${c.antes} → ${c.despues}${c.autor !== c.persona ? ` (por ${NOMBRES[c.autor]})` : ''}` }));
    const malos = new Set();
    for (const m of mensajes) {
      const r = await admin.messaging().sendEachForMulticast({
        tokens: p.tokens,
        webpush: { notification: { ...m, icon: URL_APP + 'icon-192.png', tag: 'cuadrante-' + Date.now() }, fcmOptions: { link: URL_APP } }
      });
      r.responses.forEach((x, i) => {
        if (!x.success && ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument'].includes(x.error.code)) malos.add(p.tokens[i]);
      });
      console.log(`${p.persona}: ${r.successCount} enviados, ${r.failureCount} fallidos`);
    }
    if (malos.size) await u.ref.update({ tokens: p.tokens.filter(t => !malos.has(t)) });
  }
  await estRef.set({ ultimo: snap.docs[snap.docs.length - 1].data().ts });
})().catch(e => { console.error(e); process.exit(1); });

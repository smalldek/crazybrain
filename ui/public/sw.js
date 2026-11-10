// Le service worker de Crazybrain (tâche 5.1). Un service worker est un petit programme que le
// téléphone garde à côté de l'appli et qui voit passer ses requêtes ; il rend l'appli installable.
// Il reste prudent : l'appli n'est pas encore faite pour le hors-ligne (« plus tard »).
// - Les données (/api, le connecteur, Cloudflare Access) ne passent jamais par lui : toujours le réseau.
// - Les fichiers de /assets/ portent une empreinte dans leur nom : gardés en cache, servis du cache.
// - Une page : le réseau d'abord (on a toujours la dernière version) ; sans réseau, la dernière
//   page gardée. Une réponse redirigée (la connexion Access qui a expiré) n'est jamais gardée.
const CACHE = 'crazybrain-v1';
const JAMAIS = ['/api/', '/mcp', '/authorize', '/token', '/register', '/.well-known/', '/cdn-cgi/'];

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil((async () => {
    for (const nom of await caches.keys()) if (nom !== CACHE) await caches.delete(nom);
    await self.clients.claim();
  })());
});

/** Une réponse qu'on peut garder : réussie, de notre site, sans redirection. */
function gardable(reponse) {
  return reponse.ok && reponse.type === 'basic' && !reponse.redirected;
}

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request;
  const adresse = new URL(requete.url);
  if (requete.method !== 'GET' || adresse.origin !== self.location.origin) return;
  if (JAMAIS.some((debut) => adresse.pathname.startsWith(debut))) return;

  if (adresse.pathname.startsWith('/assets/')) {
    evenement.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const garde = await cache.match(requete);
      if (garde) return garde;
      const reponse = await fetch(requete);
      if (gardable(reponse)) await cache.put(requete, reponse.clone());
      return reponse;
    })());
    return;
  }

  if (requete.mode === 'navigate') {
    evenement.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const reponse = await fetch(requete);
        if (gardable(reponse)) await cache.put('/', reponse.clone());
        return reponse;
      } catch (erreur) {
        const garde = await cache.match('/');
        if (garde) return garde;
        throw erreur;
      }
    })());
  }
});

// Les rappels (tâche 5.5) : le serveur envoie un message chiffré par Web Push ; le téléphone le
// déchiffre et le remet ici, même appli fermée. On montre la notification, puis on dit au serveur
// qu'on l'a reçue (pour mesurer le retard ; si la connexion Access a expiré, tant pis).
self.addEventListener('push', (evenement) => {
  let message = { titre: 'Crazybrain', corps: '', url: '/', envoi: null };
  try {
    message = { ...message, ...evenement.data.json() };
  } catch {
    // Un message illisible : la notification par défaut.
  }
  evenement.waitUntil(Promise.all([
    self.registration.showNotification(message.titre, {
      body: message.corps,
      icon: '/icone-192.png',
      badge: '/icone-192.png',
      tag: message.url,
      data: { url: message.url },
    }),
    message.envoi
      ? fetch(`/api/push/recu/${encodeURIComponent(message.envoi)}`, { method: 'POST', credentials: 'include' }).catch(() => undefined)
      : Promise.resolve(),
  ]));
});

// Toucher la notification ouvre la tâche : dans l'appli déjà ouverte s'il y en a une, sinon une neuve.
self.addEventListener('notificationclick', (evenement) => {
  evenement.notification.close();
  const url = new URL(evenement.notification.data?.url ?? '/', self.location.origin).href;
  evenement.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const ouverte = fenetres.find((f) => new URL(f.url).origin === self.location.origin);
    if (ouverte) {
      await ouverte.focus();
      await ouverte.navigate(url);
    } else {
      await self.clients.openWindow(url);
    }
  })());
});

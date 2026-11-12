// Sends ticket buyers from in-app browsers (Instagram, Facebook, TikTok) to Ticketmaster in the real
// browser or the Ticketmaster app, where they are signed in and Apple Pay / saved cards work.
// Every visitor sees the same page; the jump happens when they tap.
(function () {
  var cfg = document.body.dataset;
  var ua = navigator.userAgent || '';
  var isAndroid = /Android/i.test(ua);
  var isIOS = /iPhone|iPad|iPod/i.test(ua);
  var isInstagram = /Instagram/i.test(ua);
  var inApp = /Instagram|FBAN|FBAV|FB_IAB|musical_ly|TikTok|Bytedance|Snapchat/i.test(ua);

  // UTM tags so Ticketmaster's reports show where sales came from. Tags on the ad URL win.
  var url = new URL(cfg.tickets);
  var tags = { utm_source: inApp ? 'instagram' : 'link', utm_medium: 'tix', utm_campaign: cfg.release };
  new URLSearchParams(location.search).forEach(function (v, k) { if (/^utm_/.test(k)) tags[k] = v; });
  Object.keys(tags).forEach(function (k) { url.searchParams.set(k, tags[k]); });
  var web = url.toString();

  // Android: no package named, so the Ticketmaster app takes it if installed, else the default browser.
  var androidIntent = 'intent://' + url.host + url.pathname + url.search +
    '#Intent;scheme=https;S.browser_fallback_url=' + encodeURIComponent(web) + ';end';

  // InitiateCheckout counts once per visit, so several taps on the same visit are one checkout.
  // TicketClick still fires every time, with its method, for the raw count.
  var checkoutKey = 'checkout:' + cfg.release;
  var checkoutSent = false;
  function firstCheckout() {
    if (checkoutSent) return false;
    checkoutSent = true;
    try {
      if (sessionStorage.getItem(checkoutKey) === '1') return false;
      sessionStorage.setItem(checkoutKey, '1');
    } catch (e) {}
    return true;
  }

  function track(how) {
    if (window.fbq) {
      if (firstCheckout()) fbq('track', 'InitiateCheckout', { content_name: cfg.release, content_category: 'tickets' });
      fbq('trackCustom', 'TicketClick', { method: how, inapp: inApp, release: cfg.release });
    }
  }

  function open(how) {
    track(how);
    if (isAndroid) {
      // Give the pixel a moment to send before the page is backgrounded.
      setTimeout(function () { window.location.href = androidIntent; }, 250);
    } else if (isIOS && isInstagram) {
      // Same jump that reaches the Spotify app (go.js): Instagram hands the link to iOS, which opens
      // Safari or the Ticketmaster app after an "allow" prompt.
      window.location.replace('instagram://extbrowser/?url=' + encodeURIComponent(web));
    }
  }

  ['buy', 'art'].forEach(function (elId) {
    var el = document.getElementById(elId);
    if (!el) return;
    el.href = isAndroid ? androidIntent : web;
    if (isAndroid) {
      el.addEventListener('click', function (e) { e.preventDefault(); open('tap'); });
    } else {
      // A real target=_blank tap is what leaves the iOS in-app browser; don't intercept it.
      el.target = '_blank';
      el.rel = 'noopener';
      el.addEventListener('click', function () { track('tap'); });
    }
  });
  document.getElementById('web').href = web;


  // No auto-open: the visitor sees the page and taps. A tap is the only thing that counts as a checkout,
  // so Meta optimises for people who chose to go to Ticketmaster, not for everyone who loaded the page.
})();

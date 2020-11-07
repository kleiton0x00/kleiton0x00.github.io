---
layout: compress
# Chirpy v2.2
# https://github.com/kleiton0x00
# © 2020 kleiton0x00
# MIT Licensed
---

/* Registering Service Worker */
if('serviceWorker' in navigator) {
  navigator.serviceWorker.register('{{ "/sw.js" | relative_url }}');
};

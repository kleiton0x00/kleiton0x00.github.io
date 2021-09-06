---
title: Bypassing WAF to perform XSS [Bug Hunting]
updated: 2020-05-28 12:37
---

Recently I was hunting for some XSS and I come up to a website (lets call it website.com for privacy reason) where it had an admin login form on /admin directory.

![admin_panel](https://cdn-images-1.medium.com/max/800/1*5lFCUXubKJ_1ixLidAO0zg.png)

Instinctively I tried entering random credentials to see what kind of response I will get.

![admin_panel_error_message](https://cdn-images-1.medium.com/max/800/1*1BmIw1KTSCtx6onICZ34ug.png)

>/admin/index.php?msg=Invalid Email and Password

This is the URL I got redirected to, by default this is a very bad idea to display an error message, but it is an implementation I see a lot on different websites.

Any value of ?msg= could be reflected into the website, so lets try to change it to better understand.

What I tried was website.com/admin/index.php?msg=Hello World

![admin_panel_reflected_message](https://cdn-images-1.medium.com/max/800/1*AkK3RwX5J0iBEZ2Hk21uhA.png)

Now we see that every input we enter, gets reflected into that Red-Fonted text.
What if I try injecting some HTML tags?

```html
?msg=<h1>Hello World</h1>
```

![admin_panel_html_injection](https://cdn-images-1.medium.com/max/800/1*jSHoRXnO1hXGwybabEV23w.png)

We got a successful HTML Injection, now its time to put some Javascript code.
I tried more than 50 basic XSS payloads, with a hope for XSS to popup:

```html
?msg=<script>alert(1)</script>
?msg=<img src=xss onerror=alert(1)>
?msg=<input/onmouseover="javaSCRIPT&colon;confirm&lpar;1&rpar;"
?msg=<iframe %00 src="&Tab;javascript:prompt(1)&Tab;"%00>
```

You get the idea that I bruteforced all type of XSS. All of them were blocked by server, seems there is a WAF behind the scene:

![waf_blocked_request](https://cdn-images-1.medium.com/max/800/1*zBRVo2Ajo5zYD-gmDzgE7w.png)

By entering more than 50 XSS Payloads, I came up to a conclusion of what WAF was really filtering:
```
- Every payload with <script>, <frame, <input, <form, was directly blocked by WAF.
- Every payload with alert( ) was directly blocked by WAF.
```
So how will we popup a XSS when alert() was filtered out?
While guessing, I realised that **<img** wasn't filtered out, so I start making more complex payload based on that:

```html
?msg=<img/src=`%00`%20onerror=this.onerror=confirm(1)
```
This was my next payload, it got reflected but no XSS unfortunately.

![admin_panel_image_tag](https://cdn-images-1.medium.com/max/800/1*v7bT00oMPvyuR34e0XpM_g.png)

Seems like XSS by image isn't the right path so I kept enumerating more, since it gets reflected, but it doesn't execute anything inside it.
Soon, I realised that ```<svg>``` wasn't filtered out, so I kept following this path. Since alert( ) is blocked, I'm trying confirm( ) since it worked.

```html
<svg><script%20?>confirm(1)
```

![admin_panel_svg_no_xss](https://cdn-images-1.medium.com/max/800/1*nu1yamkE9B4SAuembW1uNg.png)

I had a feeling I was close since it reflected a blank space, I just have to keep going on more. Since there is a WAF, I tried different bypasses, including Base64 decode with eval.atob. I kept using ```<svg>``` since It somehow worked.

```html
<svg/onload=eval(atob('YWxlcnQoJ1hTUycp'))>
```
This payload basically decode the base64 value which is alert('XSS'). I immediately fired up the payload and, guess what I see, a XSS!!!

![admin_panel_xss_popup](https://cdn-images-1.medium.com/max/800/1*zAhwn7SNIshemvFPKOmzXQ.png)

Encoding a XSS payload (which was filtered out by WAF) into a base64, it really gave me the freedom to execute whatever I want.

```html
<svg/onload=eval(atob('YWxlcnQoZG9jdW1lbnQuY29va2llKQ=='))>
```

The following encoded base64 is alert(document.cookie) and it went as expected.

![admin_panel_xss_cookie_popup](https://cdn-images-1.medium.com/max/800/1*Y2X65_HrfNB5M6kF9ezSTg.png)

Now I have the freedom to execute everything I want since everything is encoded in Base64 and not detected by WAF, and this is something everyone wants!

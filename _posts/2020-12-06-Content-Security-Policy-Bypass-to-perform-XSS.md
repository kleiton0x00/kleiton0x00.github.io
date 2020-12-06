---
title: Content-Security-Policy Bypass to perform XSS [Bug Hunting]
updated: 2020-12-06 17:23
---

## Summary

Recently, I performed a Cross Site Scripting vulnerability, however a normal XSS payload wasn't being triggered because CSP was  blocking external Javascript code (XSS) being executed. By finding another XSS vulnerability in another endpoint (which again is being blocked by CSP), I managed to combine them together leading into CSP bypassing and trigger XSS.

## Finding the first XSS

The following image shows the endpoint located in the index, which it's parameter value is being reflected to the body of the website.

![input_reflected](https://cdn-images-1.medium.com/max/800/1*Fyq1VB-WOn_KN_yU_ZLs_A.jpeg)

Instead of giving a string value, let's try inputting an HTML simple payload. I entered **<h1>kleiton0x00</h1>** and hopefully the payload will be reflected and displayed as a HTML content.

![html_injection](https://cdn-images-1.medium.com/max/800/1*KHg8oSA8vM5gLAZnQHomdg.jpeg)

Cool, we have HTML Injection, so let's try to leverage it into XSS. This time I entered the simplest XSS payload ever: <script>alert(1)</script>
If nothing gets filtered or blocked by WAF, we will be able to trigger the Javascript payload.

![XSS_not_triggered](https://cdn-images-1.medium.com/max/800/1*AhUgcHJriQoYZfz1ugEv7w.jpeg)

Wait?! It got successfully injected into the website, but no alert 1?!?!? Looking at the page source, nothing was being filtered or removed.

![source_code_approve](https://cdn-images-1.medium.com/max/800/1*BPtGNIYJlmH7BI6QHSdkKg.jpeg)

## Detecting CSP

While taking a look at Developer Tools of the browser (Console), I realised that the script is being blocked by Content-Security-Policy.

![csp_blocking](https://cdn-images-1.medium.com/max/800/1*-xnKZAw1m86EjoqQTjwNxw.jpeg)

What does this mean? Content Security Policy (CSP) is an added layer of security, specifically a HTTP Header which blocks external codes to be injected into a website. Usually a well-implemented CSP only allows script by internal entities (the domain itself). 

First we have to detect how CSP works and from which source it allows the scripts to be loaded inside the website.

![request](https://cdn-images-1.medium.com/max/800/1*yf-2jInZ8Ryfto1KDZ-3dQ.jpeg)

Looking at the HTTP Headers, specifically **Content-Security-Policy**: we can see that CSP has a rule to accept scripts from the website itself and it's directories and subdomains. Looks like we are very limited as we can't inject our own malicious Javascript.

## Finding another vulnerable endpoint to XSS

Since we can't bypass it, I decided to look around, trying to find more XSS. I opened the Page Source of the index, and while scrolling I noticed a php code which has an parameter. Interesting!

![source_code_enumerationg_for_second_xss](https://cdn-images-1.medium.com/max/800/1*gAA9BoUBzwaUcQPWg7zufA.jpeg)

Without losing time, I immediately went to **/js/countdown.php**
In the **end** parameter, I put a simple string value to see how the website behaves.

![code_analysis_input_reflection](https://cdn-images-1.medium.com/max/800/1*6UX3ucL-HyHORbJNLAKQ1A.jpeg)

We see our string (kleiton0x00) being reflected into the source code. Super! We can start begin injecting our javascript code.

## Breaking Javascript string to perform the second XSS

Instead of entering a simple string, let's try to break the js string. How to do this? Based on the code, our reflected input is being added right after the numbers.

Add **);** to close the current Javascript code in the 2nd  line. The bracked ) will close the variable value and the ; will close the current javascript code in the 2nd line. Because the code is closed, we can add a new Javascript code, which of course is our malicious code, in our case **alert(1);**

Unfortunately there is codes left on the same line:  
```
*1000).getTime();
```

How to get rid of those? Easy, simply by commenting. So, at the end of our input, we add **//**

Our final payload would be:

```
);alert(1);//
```

![code_analysis](https://cdn-images-1.medium.com/max/800/1*VW7dqCcSOeKznwOBbPgyGw.jpeg)

Great, based on the source code, we have injected successfully a Javascript code to the directory. We got a second XSS!

So the full URL would be: 
```
http://website.com/js/countdown.php?end=2534926825);alert(1);//
```

When going to the given URL, no XSS is being reflected. Why? Because our XSS is being again blocked by CSP.

## Bypassing CSP with 2 XSS we found

Combining the first XSS we found on index and the second XSS we found on the **countdown.php**, we can use both of them to bypass CSP. The workflow would be:

1. The XSS payload on index will load Javascript code from **countdown.php** where we injected our payload.

2. CSP will accept the XSS payload (the one from index) because it is loading a script from the website itself (from countdown.php, where we injected our js code)

3. Since **countdown.php** is loaded, our alert(1) will be triggered

This has to work, right?

Our XSS payload will be based on what we found on the first XSS (**<script>alert(1)</script>**). Instead of executing a Javascript, we will load the URL of countdown.php which is:
```
http://website.com/js/countdown.php?end=2534926825);alert(1);//
```

So, combining the XSS payload of the first one with the URL of the vulnerable php file, our final payload will be:

```
<script src='http://website.com/js/countdown.php?end=2534926825);alert(1);//></script>
```

![xss_triggered](https://cdn-images-1.medium.com/max/800/1*gVFn-onsZ2eOsfF9N-7JBA.jpeg)

We bypassed CSP and successfully executed our **alert(1)** code.


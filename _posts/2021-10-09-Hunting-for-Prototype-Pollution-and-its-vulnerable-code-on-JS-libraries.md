---
title: Hunting for Prototype Pollution and it's vulnerable code on JS libraries
updated: 2021-10-09 01:13
---

![thumbnail](https://cdn-images-1.medium.com/max/800/1*-G7_0G_C7y9C0Z0pFCAJZg.jpeg)

It's been months since I have released [ppmap](https://github.com/kleiton0x00/ppmap) and it didn't took much for the tool to be popular because of how crazy and trending Prototype Pollution vulnerability actually is.
On this article I'm not going to introduce you what Prototype Pollution is, since there are a lot of articles/videos out there which explain it better than me. This article is a work of several weeks of researching on this topic, to bring you new and innovative ideas (well not all of them) on how to scan massively on Javascript Packages ([npm packages](https://www.npmjs.com/) as well)  and how to manual debug (for much complex Javascript code) to find the root cause of client-side Prototype Pollution.

## Finding the root cause for client-side prototype pollution

Well for this type of hunting we are going to use Chrome/Chromium, since they have the Developer Tools which is for sure more compatible for debugging.
The exploitation starts by first finding is the website is vulnerable to client-side prototype pollution or not. We are going to use [ppmap](https://github.com/kleiton0x00/ppmap) which will automatically try different payloads to pollute the variables in global context. After downloading the tool to your local machine, simply run it on the target website by using the following command, simple as that:

```bash
echo 'https://grey-acoustics.surge.sh' | ./ppmap
```

![ppmap_executed](https://cdn-images-1.medium.com/max/800/1*cTPFbvCDDCufj-_kff5Q4Q.png)

Great, let's open the website with the payload that the tool displayed as vulnerable (**https://grey-acoustics.surge.sh/?constructor%5Bprototype%5D%5Bppmap%5D=reserved**) and open the Console (on Developer Tools) to confirm if we successfully polluted that.

[successfully_polluted](https://cdn-images-1.medium.com/max/800/1*I4GivnOTXkXkcV9bklApKg.png)

It's time to find the vulnerable code, so to do that we need to go to **Source** and set a breakpoint on the first script of the page. The reason to do this is that we don't want the whole Javascript executed because then we won't know when ppmap gadget will be polluted. After setting a breakpoint, click on "Resume Script Execution" button. Simply refresh the website to apply the changes, and the website should be **Paused on debugger**.

![set_a_breakpoint_and_then_resume_script_execution](https://cdn-images-1.medium.com/max/800/1*052-ZnY-JWy6wiVfX_UGVQ.jpeg)

In this case Line 7 would be the first executed javascript code so we will put a breakpoint on that line. If we enter **ppmap** on console, it will be shown as undefined, since the website is stuck on breakpoint and ppmap is not polluted yet.

![website_paused_on_debugger](https://cdn-images-1.medium.com/max/800/1*qERXAJFeF7xwuSjsdFCSpg.png)

Now we have to run a Snippet which you can get it from [here](https://gist.githubusercontent.com/dmethvin/1676346/raw/24cde96c341e524dc8706104afbd0748752c7432/gistfile1.txt). 

```javascript
function debugAccess(obj, prop, debugGet){

    var origValue = obj[prop];

    Object.defineProperty(obj, prop, {
        get: function () {
            if ( debugGet )
                debugger;
            return origValue;
        },
        set: function(val) {
            debugger;
            return origValue = val;
        }
    });

};
```

The script will set a breakpoint once a property is polluted (in this case ppmap property). To do that, simply to go **Source**, then click on **Snippet** and create a new one by adding the code like in the image below:

![executing_the_snippet](https://cdn-images-1.medium.com/max/800/1*mjbBiLpC4YSjcTlOjg5pBw.png)

Execute the Snippet and you will just see an "undefined" output on console, means that the Snippet has run successfully. 

Go back to **Console** tab and execute the following code, which will set a breakpoint automatically once a Pollution happened to "ppmap" property. It means it will redirect us to the vulnerable code where the pollution occurs:

```javascript
debugAccess(Object.prototype, 'ppmap')
```

![command_executed_on_console](https://cdn-images-1.medium.com/max/800/1*qHi2lRA_At_cwZCqMSq-2A.jpeg)

There is no output, but that is completely fine. Go back to **Sources** and click "Resume script execution". After you do that, the whole javascript will be executed and ppmap will be polluted again as excpected. With the help of the Snippet we can find where exactly the ppmap property is polluted. We can click on the Call Stack and you will face different stacks where the pollution happened. 

But which one to choose? Most of the time Prototype Pollution happens on Javascript libraries, so aim for the stack which is attached to the .js library files (look at the right side just like in the image to know which endpoint the stack is attached to). On this case we have 2 stacks on line 4 and 6, logically we will choose the 4th line because that line is the first time where Pollution happens, which mean that this line is the reason of the vulnerability. Clicking on the stack will redirect us to the vulnerable code.

![analysing_part_1](https://cdn-images-1.medium.com/max/800/1*S8NBOl1a7f1zhJxlh-6g4w.jpeg)

With the help of Beautifier, we can see the vulnerable code of the JS library:

```
params.replace(/\+/g, ' ').split('&').forEach(function(v) {
            var param = v.split('='),
                key = decodeURIComponent(param[0]),
                val, cur = obj,
                i = 0,
                keys = key.split(']['),
                keys_last = keys.length - 1;
            if (/\[/.test(keys[0]) && /\]$/.test(keys[keys_last])) {
                keys[keys_last] = keys[keys_last].replace(/\]$/, '');
                keys = keys.shift().split('[').concat(keys);
                keys_last = keys.length - 1;
            } else {
                keys_last = 0;
            }
```

This is not the only reason why the website is vulnerable, if we see closely on the Stacks, there is one more endpoint where ppmap is being polluted (which is located to the index HTML page):

![analysing_part_2](https://cdn-images-1.medium.com/max/800/1*i_lq15EhvZRqb8GrF4_UEQ.jpeg)

So here is the vulnerable code of the index HTML page:

```javascript
var query = deparam(location.search.slice(1));
```

If you have some experience with Javascript you will directly identify the issue here. The exploitation starts with the injection of a payload into an input (this case on URL parsing) that is used to build the client-side logic or rendering of the application. The most common source of input is the URL and its different properties, like **location.search**














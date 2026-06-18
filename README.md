
## This is an app that will tunnel http from knotfree.net to localhost. 

In the UI add a name and a local port. Traffic to your-name.knotfree.net will 
be tunneled to localhost on your workstation.

btw. I orignally used this for IOT applications. It's prone to the occasional failute

Cloudflair has a much more polished and professional version of this if you 
buy your domain name from them. Use that if you can. You get what you pay for. 

btw. Someone PLEASE build the windows app for this. I have a mac app available here in the ./out/make folder.

***Example*** of starting a local web service:
This will start a wordpress installation:

```docker-compose -f docker-compose-wp.yml up```

Then, in the UI of this running app add a name, eg john-q-blog and a port of 8087.
Then you will have a wordpress accessible at http://john-q-blog.knotfree.net

Use npm, not yarn here.
the yarn publish crashes so use 'npx electron-forge publish' and then wait ...

<!--    the knotfree-ts-lib is one big link error waiting to happen. 
I've checked it in with the project.
sync with ~/workspace/knotfree-ts-lib manually 
 
-->


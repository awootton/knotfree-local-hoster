
## This is an app that will tunnel http from knotfree.net to localhost. 

Example of starting a local web service:
This will start a wordpress installation:

```docker-compose -f docker-compose-wp.yml up```

Then, in the UI of this running app add a name, eg john-q-blog and a port of 8087.
Then you will have a wordpress accessible at http://john-q-blog.knotfree.net

the yarn publish crashes so use 'npx electron-forge publish' and then wait ...

for development ```yarn remove knotfree-ts-lib``` 
and then ```ln -s /Users/awootton/workspace/knotfree-ts-lib/src ./src/knotfree-ts-lib ```
and then change the code. 

for releases ```rm ./src/knotfree-ts-lib```
then publish the lib ! 
and then ```yarn add knotfree-ts-lib```
and fix the code


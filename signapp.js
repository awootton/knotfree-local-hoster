

const { signAsync } = require('@electron/osx-sign');
const { notarize } = require('@electron/notarize');

// it's not clear this is needed, or works but it's here for now

const opts = {
  app: '/Users/awootton/Documents/workspace/knotfree-local-hoster/out/knotfree-local-hoster-darwin-x64/knotfree-local-hoster.app',
  // optional parameters for additional customization
  // platform: "mas", // should be auto-detected if your app was packaged for MAS via Packager or Forge
  platform: "darwin",
  type: "development",//  "distribution", // defaults to "distribution" for submission to App Store Connect
  // provisioningProfile: 'path/to/my.provisionprofile', // defaults to the current working directory
  // keychain: 'my-keychain', // defaults to the system default login keychain
};
signAsync(opts)
  .then(function () {
    // Application signed
    console.log('Application signed')
  })
  .catch(function (err) {
    // Handle the error
    console.log('Application sign error', err)
  })

// get these from https://appstoreconnect.apple.com/access/integrations/api
// see https://github.com/electron/notarize

function notarizenow() {
  const appPath = 'out/knotfree-local-hoster-darwin-x64/knotfree-local-hoster.app';
  const appleApiKey = '/Users/awootton/atw_private/AuthKey_AB9WR6X638.p8';
  const appleApiIssuer = '59b45171-dcad-480b-9f9e-8700e368acc6';

  notarize({
    appPath,
    appleApiKey, // Absolute path to API key (e.g. `/path/to/AuthKey_X0X0X0X0X0.p8`)
    appleApiIssuer, // Issuer ID (e.g. `d5631714-a680-4b4b-8156-b4ed624c0845`)
  }).then(function () {
    // Application signed
    console.log('Application notarized')
  }).catch(function (err) {
    // Handle the error
    console.log('Application notarized error', err)
  });
}
notarizenow();

//  electron-packager . "knotfree-local-hoster" --platform=darwin --arch=x64 --version=0.35.6 --app-bundle-id="net.knotfree.knotfree-local-hoster" --app-version="1.0.0" --build-version="1.0.100" --osx-sign



// Adopts the UIScene lifecycle on iOS. Apps built with the iOS 27 SDK that
// don't adopt it are stopped at launch (UIKit's "no scene lifecycle adoption"
// runtime issue). Expo SDK 54's AppDelegate template creates the window in
// application(_:didFinishLaunchingWithOptions:); this plugin
//   1. declares a single-window scene in Info.plist (UIApplicationSceneManifest),
//   2. compiles SceneDelegate.swift into the app, which creates the window and
//      starts React Native in it, and forwards links to RCTLinkingManager,
//   3. removes the window creation from AppDelegate.swift.
// Fails the prebuild if the AppDelegate no longer looks like the template, so a
// template change can't silently leave the app without a window.

const path = require('node:path');
const { withAppDelegate, withInfoPlist } = require('@expo/config-plugins');
const { withAppSources } = require('../ios-app-sources');

const WINDOW_BLOCK = /#if os\(iOS\) \|\| os\(tvOS\)\s*\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*\n\s*factory\.startReactNative\(\s*withModuleName: "main",\s*in: window,\s*launchOptions: launchOptions\)\s*\n#endif\n/;

function withSceneLifecycle(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });

  config = withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('ios-scene-lifecycle: expected a Swift AppDelegate');
    }
    const src = cfg.modResults.contents;
    if (src.includes('plugins/ios-scene-lifecycle')) return cfg;
    if (!WINDOW_BLOCK.test(src)) {
      throw new Error('ios-scene-lifecycle: AppDelegate no longer matches the Expo template (window creation not found)');
    }
    cfg.modResults.contents = src.replace(
      WINDOW_BLOCK,
      '    // plugins/ios-scene-lifecycle: the window is created per scene in SceneDelegate.swift.\n',
    );
    return cfg;
  });

  return withAppSources(config, { dir: __dirname, files: ['SceneDelegate.swift'] });
}

module.exports = withSceneLifecycle;

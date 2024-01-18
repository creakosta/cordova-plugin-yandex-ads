#!/usr/bin/env node

// Workaround for https://github.com/dpa99c/cordova-plugin-firebasex/issues/766
// set CODE_SIGNING_ALLOWED to NO to avoid signing errors during CI Builds

const fs = require("fs");
const path = require("path");
const execa = require("execa");

module.exports = (context) => {
  const platformPath = path.resolve(context.opts.projectRoot, "platforms/ios");
  const podfilePath = path.resolve(platformPath, "Podfile");

  if (!fs.existsSync(podfilePath)) {
    console.log(`'${podfilePath}' does not exist. Firebase deployment fix skipped.`);
    return;
  }

  let podfileContent = fs.readFileSync(podfilePath, "utf-8");
  if (podfileContent.indexOf("post_install") == -1) {
    podfileContent += `

pod_targets_for_disable_build_for_distribution = [
     'DivKit',
     'DivKit_Base',
     'DivKit_BaseTiny',
     'DivKit_BaseUI',
     'DivKit_LayoutKit',
     'DivKit_LayoutKitInterface',
     'DivKit_CommonCore',
     'DivKit_Serialization',
     'DivKit_Networking'
]    

post_install do |installer|
  installer.pods_project.targets.each do |target|
           if target.name.start_with?(*pod_targets_for_disable_build_for_distribution)
              target.build_configurations.each do |config|
                  config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'NO'
              end
          end
      end

  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['ONLY_ACTIVE_ARCH'] = 'YES'
      config.build_settings["EXCLUDED_ARCHS[sdk=iphonesimulator*]"] = "arm64"
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
    end
  end
end

  `;

    fs.writeFileSync(podfilePath, podfileContent, "utf-8");

    return execa("pod", ["install", "--verbose"], {
      cwd: platformPath,
    });
  }
};


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
  
  sharedLibrary = installer.aggregate_targets.find { |aggregate_target| aggregate_target.name == 'Pods-[MY_FRAMEWORK_TARGET]' }
  
 
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
    end
  end
  
  
  
  installer.aggregate_targets.each do |target|
    target.xcconfigs.each do |variant, xcconfig|
      xcconfig_path = target.client_root + target.xcconfig_relative_path(variant)
      IO.write(xcconfig_path, IO.read(xcconfig_path).gsub("DT_TOOLCHAIN_DIR", "TOOLCHAIN_DIR"))
    end
  end
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      if config.base_configuration_reference.is_a? Xcodeproj::Project::Object::PBXFileReference
        xcconfig_path = config.base_configuration_reference.real_path
        IO.write(xcconfig_path, IO.read(xcconfig_path).gsub("DT_TOOLCHAIN_DIR", "TOOLCHAIN_DIR"))
      end
    end
  end

    installer.aggregate_targets.each do |aggregate_target|
    if aggregate_target.name == 'Pods-[MY_APP_TARGET]'
      aggregate_target.xcconfigs.each do |config_name, config_file|
        sharedLibraryPodTargets = sharedLibrary.pod_targets
        aggregate_target.pod_targets.select { |pod_target| sharedLibraryPodTargets.include?(pod_target) }.each do |pod_target|
          pod_target.specs.each do |spec|
            frameworkPaths = unless spec.attributes_hash['ios'].nil? then spec.attributes_hash['ios']['vendored_frameworks'] else spec.attributes_hash['vendored_frameworks'] end || Set.new
            frameworkNames = Array(frameworkPaths).map(&:to_s).map do |filename|
              extension = File.extname filename
              File.basename filename, extension
            end
          end
          frameworkNames.each do |name|
            if name != '[DUPLICATED_FRAMEWORK_1]' && name != '[DUPLICATED_FRAMEWORK_2]'
              raise("Script is trying to remove unwanted flags: #{name}. Check it out!")
            end
            puts "Removing #{name} from OTHER_LDFLAGS"
            config_file.frameworks.delete(name)
          end
        end
      end
      xcconfig_path = aggregate_target.xcconfig_path(config_name)
      config_file.save_as(xcconfig_path)
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


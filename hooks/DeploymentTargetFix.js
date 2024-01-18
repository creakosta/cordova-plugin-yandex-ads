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
    shell_script_path = "Pods/Target Support Files/#{target.name}/#{target.name}-frameworks.sh"
    if File::exists?(shell_script_path)
      shell_script_input_lines = File.readlines(shell_script_path)
      shell_script_output_lines = shell_script_input_lines.map { |line| line.sub("source=\"$(readlink \"${source}\")\"", "source=\"$(readlink -f \"${source}\")\"") }
      File.open(shell_script_path, 'w') do |f|
        shell_script_output_lines.each do |line|
          f.write line
        end
      end
    end

  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
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


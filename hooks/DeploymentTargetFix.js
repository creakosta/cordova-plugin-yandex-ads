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

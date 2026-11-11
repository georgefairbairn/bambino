const { withPodfile } = require('expo/config-plugins');

// Xcode 27 refuses to build any target whose deployment target is below
// iOS 15.0, and several pods (Sentry, SDWebImage, RevenueCat, RNSVG, ...)
// still declare 9.0–13.4 on their resource-bundle targets. Raise every pod
// target to the app's own minimum so the Pods project builds.
const DEPLOYMENT_TARGET = '15.1';
const MARKER = '# with-pod-deployment-target';

const SNIPPET = `
    ${MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        if build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < ${DEPLOYMENT_TARGET}
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${DEPLOYMENT_TARGET}'
        end
      end
    end
`;

module.exports = function withPodDeploymentTarget(config) {
  return withPodfile(config, (cfg) => {
    const podfile = cfg.modResults.contents;
    if (podfile.includes(MARKER)) return cfg;
    // Append to the end of post_install, after react_native_post_install, so
    // nothing React Native sets afterwards can lower the targets again.
    const start = podfile.indexOf('post_install do |installer|');
    const end = start === -1 ? -1 : podfile.indexOf('\n  end', start);
    if (end === -1) {
      throw new Error('with-pod-deployment-target: no post_install block in the Podfile');
    }
    cfg.modResults.contents = podfile.slice(0, end) + SNIPPET.trimEnd() + podfile.slice(end);
    return cfg;
  });
};

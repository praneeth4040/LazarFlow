/**
 * withScopedWritePermission
 *
 * Expo's android.permissions array doesn't support per-permission attributes
 * like maxSdkVersion. This plugin runs after the manifest is generated and
 * adds android:maxSdkVersion="28" to WRITE_EXTERNAL_STORAGE so the permission
 * is only declared on Android 9 (API 28) and below.
 *
 * On Android 10+ (API 29+), expo-media-library uses scoped storage and does
 * not need WRITE_EXTERNAL_STORAGE at all.
 */

const { withAndroidManifest } = require('@expo/config-plugins');

const withScopedWritePermission = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const permissions = manifest.manifest['uses-permission'] || [];

    manifest.manifest['uses-permission'] = permissions.map((perm) => {
      if (
        perm.$['android:name'] === 'android.permission.WRITE_EXTERNAL_STORAGE' &&
        !perm.$['android:maxSdkVersion']
      ) {
        return {
          ...perm,
          $: {
            ...perm.$,
            'android:maxSdkVersion': '28',
          },
        };
      }
      return perm;
    });

    return config;
  });
};

module.exports = withScopedWritePermission;

const { withProjectBuildGradle, withSettingsGradle } = require('@expo/config-plugins');

const withAndroidRepositories = (config) => {
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = addMavenRepository(config.modResults.contents);
    } else {
      throw new Error('Cannot add Maven repository to build.gradle because it is not Groovy');
    }
    return config;
  });

  config = withSettingsGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = addPluginManagementRepositories(config.modResults.contents);
    } else {
      throw new Error('Cannot add repositories to settings.gradle because it is not Groovy');
    }
    return config;
  });

  return config;
};

function addPluginManagementRepositories(settingsGradle) {
  const googleMirror = `maven { url 'https://maven-central.storage.googleapis.com/repos/central/data/' }`;
  
  // If pluginManagement doesn't exist, prepend it
  if (!settingsGradle.includes('pluginManagement')) {
    return `pluginManagement {\n    repositories {\n        google()\n        mavenCentral()\n        ${googleMirror}\n        gradlePluginPortal()\n    }\n}\n` + settingsGradle;
  }

  // If pluginManagement exists, inject repositories if they don't have the mirror
  if (!settingsGradle.includes('maven-central.storage.googleapis.com')) {
    return settingsGradle.replace(
      /pluginManagement\s*\{(\s*)repositories\s*\{/,
      `pluginManagement {\$1repositories {\$1    ${googleMirror}`
    );
  }

  return settingsGradle;
}

function addMavenRepository(buildGradle) {
  const cashfreeRepo = `maven { url 'https://maven.cashfree.com/release' }`;
  const googleMirror = `maven { url 'https://maven-central.storage.googleapis.com/repos/central/data/' }`;
  
  let result = buildGradle;

  // Add to all repositories blocks if they don't already have them
  if (!result.includes('maven.cashfree.com')) {
    result = result.replace(
      /repositories\s*\{/g,
      (match) => `${match}\n        ${cashfreeRepo}`
    );
  }

  if (!result.includes('maven-central.storage.googleapis.com')) {
    result = result.replace(
      /repositories\s*\{/g,
      (match) => `${match}\n        ${googleMirror}`
    );
  }

  return result;
}

module.exports = withAndroidRepositories;

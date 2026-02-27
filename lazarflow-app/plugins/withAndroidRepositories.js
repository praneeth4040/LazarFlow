const { withProjectBuildGradle } = require('@expo/config-plugins');

const withAndroidRepositories = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = addMavenRepository(config.modResults.contents);
    } else {
      throw new Error('Cannot add Maven repository to build.gradle because it is not Groovy');
    }
    return config;
  });
};

function addMavenRepository(buildGradle) {
  // Add Cashfree Maven repository
  const cashfreeRepo = `maven { url 'https://maven.cashfree.com/release' }`;
  
  if (buildGradle.includes('maven.cashfree.com')) {
    return buildGradle;
  }

  return buildGradle.replace(
    /allprojects\s*\{[\s\S]*?repositories\s*\{/,
    (match) => `${match}\n        ${cashfreeRepo}`
  );
}

module.exports = withAndroidRepositories;

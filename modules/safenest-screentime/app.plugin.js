// Config plugin: adds the Family Controls entitlement to the iOS app.
//
// Only enable it once Apple has granted the entitlement to the app's team;
// otherwise iOS builds fail to sign. In app.json:
//   "plugins": ["./modules/safenest-screentime/app.plugin.js"]
const { withEntitlementsPlist } = require("expo/config-plugins");

module.exports = function withFamilyControls(config) {
  // Tells the JS side the entitlement is present (see index.ts).
  config.extra = { ...config.extra, familyControls: true };
  return withEntitlementsPlist(config, (cfg) => {
    cfg.modResults["com.apple.developer.family-controls"] = true;
    return cfg;
  });
};

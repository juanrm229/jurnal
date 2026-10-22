/** Target WidgetKit iOS (dibangkitkan oleh @bacons/apple-targets saat prebuild). */
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'SehariWidget',
  displayName: 'Sehari',
  deploymentTarget: '17.0',
  colors: {
    $accent: '#2A14D6',
    $widgetBackground: { light: '#EEEEF0', dark: '#121214' },
    Ink: { light: '#2A14D6', dark: '#B3ACFF' },
    InkSoft: { light: '#A9A4E8', dark: '#5D58A6' },
  },
  entitlements: {
    'com.apple.security.application-groups': config.ios?.entitlements?.['com.apple.security.application-groups'] ?? ['group.app.sehari'],
  },
});

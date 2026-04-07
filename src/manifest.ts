import { defineManifest } from '@crxjs/vite-plugin';

const manifest = defineManifest({
  manifest_version: 3,
  name: 'Sketch Party',
  description: 'Send playful effects to friends on any page. Patreon-powered Pro.',
  version: '1.0.1',
  action: {
    default_popup: 'src/popup.html',
    default_title: 'Sketch Party'
  },
  background: {
    service_worker: 'src/background.ts',
    type: 'module'
  },
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png'
  },
  permissions: ['storage', 'alarms', 'identity', 'tabs'],
  host_permissions: [
    'https://harika-extensions-backend.notetaker-app-burak.workers.dev/*',
    'https://extensions-hub-sites.vercel.app/*'
  ],
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/contentScripts/effects.ts'],
      run_at: 'document_idle'
    }
  ],
  web_accessible_resources: [
    {
      resources: ['src/auth-callback.html', 'assets/*'],
      matches: ['*://*/*']
    }
  ]
});

export default manifest;

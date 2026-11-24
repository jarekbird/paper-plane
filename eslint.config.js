import tseslint from 'typescript-eslint'
import plane from './eslint/plugin.js'

const SDK = '@evenrealities/even_hub_sdk'
const NETWORKED = ['src/telegram', 'src/google', 'src/voice']
const SERVICES = [...NETWORKED, 'src/demo']
const UI = ['src/glasses', 'src/phone']
const SCREENS = [
  'Router',
  'Shell',
  'Glasses',
  'boxes',
  'list',
  'text',
  'FRAME_TAG',
  'Screen',
  'View',
  'RouterOptions',
  'ShellOptions',
  'ShellWords',
  'GlassesOptions',
  'GlassesBridge',
  'Box',
  'Frame',
  'MenuItem',
  'Picture',
  'Brightness',
  'Drawing',
  'DrawOp',
  'Input',
  'HoldSource',
]
const NETWORK = ['fetch', 'WebSocket', 'XMLHttpRequest', 'EventSource', 'WebTransport', 'RTCPeerConnection', 'sendBeacon']
const SOCKETS = ['WebSocket', 'EventSource', 'WebTransport', 'RTCPeerConnection']
const DRAW = ['createStartUpPageContainer', 'rebuildPageContainer', 'textContainerUpgrade', 'updateImageRawData', 'shutDownPageContainer']
const SUBSCRIPTIONS = ['onEvenHubEvent', 'onDeviceStatusChanged', 'onLaunchSource', 'onAppLocationChanged']
const RECORD = ['audioControl', 'imuControl']
const SDK_STORAGE = ['setLocalStorage', 'getLocalStorage']
const WEB_STORAGE = [
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'caches',
  'cookie',
  'openDatabase',
  'getDirectory',
  'requestFileSystem',
  'webkitRequestFileSystem',
]
const TIMERS = ['setTimeout', 'setInterval', 'requestAnimationFrame', 'requestIdleCallback', 'addEventListener']
const HANDLES = ['onChange', 'onMic', 'onInput', 'subscribe']

export const architecture = {
  'plane/imports': [
    'error',
    [
      { id: 'A1', from: SERVICES, to: UI, advice: 'A service has no UI: return data and let the UI show it.' },
      {
        id: 'A1',
        from: SERVICES,
        to: ['earshot'],
        members: SCREENS,
        advice: "A service has no UI: none of Earshot's screens, shell, glasses or views.",
      },
      { id: 'A2', from: UI, to: SERVICES, advice: 'UI reaches a service only through the interfaces in src/messenger.ts.' },
      {
        id: 'A2',
        from: ['src'],
        except: ['src/telegram'],
        to: ['@mtcute/'],
        advice: 'Only src/telegram talks to Telegram; the rest asks through the interfaces in src/messenger.ts.',
      },
      {
        id: 'A3',
        from: ['src'],
        except: ['src/main.ts'],
        to: [SDK],
        advice: 'Only src/main.ts imports the Even SDK, to wait for the bridge and hand it on.',
      },
    ],
  ],
  'plane/names': [
    'error',
    [
      {
        id: 'A2',
        from: ['src'],
        except: NETWORKED,
        names: NETWORK,
        advice: 'Only src/telegram, src/google and src/voice touch the network.',
      },
      {
        id: 'A3',
        from: ['src'],
        names: [...DRAW, ...SUBSCRIPTIONS, ...RECORD],
        advice: 'Of the Even SDK bridge, Earshot draws, reads input and records; the app never does.',
      },
      {
        id: 'A3',
        from: ['src'],
        except: ['src/store.ts'],
        names: [...SDK_STORAGE, ...WEB_STORAGE],
        advice: 'Only src/store.ts stores.',
      },
      {
        id: 'A4',
        from: ['src'],
        names: TIMERS,
        advice: "Use Earshot's Lifetime: life.timeout, life.interval, life.listen or life.own.",
      },
      {
        id: 'C3',
        from: ['src'],
        names: ['clipboard', 'execCommand'],
        advice: 'No copy-and-paste flows: the app sends it itself.',
      },
    ],
  ],
  'plane/opaque': ['error', [{ id: 'A2, A3, A4', from: ['src'] }]],
  'plane/lifetime': ['error', [{ id: 'A4', from: ['src'], sockets: SOCKETS, handles: HANDLES }]],
  'plane/awaits': ['error', [{ id: 'A5', from: ['src'] }]],
}

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', 'eslint/fixtures/**'] },
  {
    files: ['src/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}', 'eslint/fixtures/src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      sourceType: 'module',
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'off' },
    plugins: { plane },
    rules: architecture,
  },
]

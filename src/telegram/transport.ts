import { connectWs } from '@fuman/net'
import { IntermediatePacketCodec, ObfuscatedPacketCodec, type TelegramTransport } from '@mtcute/core'

const SOCKETS: Record<number, string> = {
  1: 'wss://pluto.web.telegram.org/apiws',
  2: 'wss://venus.web.telegram.org/apiws',
  3: 'wss://aurora.web.telegram.org/apiws',
  4: 'wss://vesta.web.telegram.org/apiws',
  5: 'wss://flora.web.telegram.org/apiws',
}

export const socketOf = (dc: number): string => {
  const url = SOCKETS[dc]
  if (!url) throw new Error('Telegram named a data centre this app does not know')
  return url
}

export const webSockets: TelegramTransport = {
  connect: (dc, abortSignal) => connectWs({ url: socketOf(dc.id), protocols: 'binary' }, abortSignal),
  packetCodec: () => new ObfuscatedPacketCodec(new IntermediatePacketCodec()),
}

// Lightweight cross-tab sync for live tournament updates using BroadcastChannel

let channel = null

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  channel = new BroadcastChannel('lazarflow-live')
}

export const sendLiveUpdate = (tournamentId) => {
  if (!channel || !tournamentId) {
    console.warn('⚠️ sendLiveUpdate: channel or tournamentId missing', { channel: !!channel, tournamentId })
    return
  }
  const message = {
    type: 'results-updated',
    tournamentId,
    ts: Date.now(),
  }
  console.log('📢 Broadcasting live update:', message)
  channel.postMessage(message)
}

export const subscribeToLiveUpdates = (callback) => {
  if (!channel || typeof callback !== 'function') {
    console.warn('⚠️ subscribeToLiveUpdates: channel or callback missing', { channel: !!channel, hasCallback: typeof callback === 'function' })
    return () => {}
  }

  console.log('👂 Subscribing to live updates via BroadcastChannel')

  const handler = (event) => {
    console.log('📨 Received live update message:', event.data)
    callback(event.data)
  }

  channel.addEventListener('message', handler)

  return () => {
    console.log('🔇 Unsubscribing from live updates')
    channel.removeEventListener('message', handler)
  }
}

export default {
  sendLiveUpdate,
  subscribeToLiveUpdates,
}



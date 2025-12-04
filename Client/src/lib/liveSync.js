// Lightweight cross-tab sync for live tournament updates using BroadcastChannel

let channel = null

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  channel = new BroadcastChannel('lazarflow-live')
}

export const sendLiveUpdate = (tournamentId) => {
  if (!channel || !tournamentId) return
  channel.postMessage({
    type: 'results-updated',
    tournamentId,
    ts: Date.now(),
  })
}

export const subscribeToLiveUpdates = (callback) => {
  if (!channel || typeof callback !== 'function') {
    return () => {}
  }

  const handler = (event) => {
    callback(event.data)
  }

  channel.addEventListener('message', handler)

  return () => {
    channel.removeEventListener('message', handler)
  }
}

export default {
  sendLiveUpdate,
  subscribeToLiveUpdates,
}



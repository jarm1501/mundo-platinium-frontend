import { useEffect, useState } from 'react'

import { getSessionSnapshot, subscribeSession } from '../api'

export default function useSession() {
  const [session, setSession] = useState(() => getSessionSnapshot())

  useEffect(() => {
    return subscribeSession(() => {
      setSession(getSessionSnapshot())
    })
  }, [])

  return session
}

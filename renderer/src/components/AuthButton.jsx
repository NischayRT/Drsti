'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthButton() {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [open,    setOpen]    = useState(false)
  const dropdownRef           = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); setLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })

    // Handle OAuth deep link callback from Electron
    // Supabase uses PKCE: focusguard://auth/callback?code=xxxx
    if (window.electronAPI?.onOAuthCallback) {
      window.electronAPI.onOAuthCallback(async (url) => {
        try {
          // Parse both hash params (implicit) and query params (PKCE)
          const urlObj    = new URL(url)
          const code      = urlObj.searchParams.get('code')
          const hashStr   = url.split('#')[1] || ''
          const hashParams = new URLSearchParams(hashStr)
          const accessToken  = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')

          if (code) {
            // PKCE flow — exchange code for session
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            if (error) console.error('OAuth code exchange failed:', error.message)
          } else if (accessToken && refreshToken) {
            // Implicit flow fallback
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            if (error) console.error('OAuth setSession failed:', error.message)
          }
        } catch (err) {
          console.error('OAuth callback error:', err)
        }
      })
    }

    return () => {
      listener.subscription.unsubscribe()
      window.electronAPI?.removeOAuthListener?.()
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        skipBrowserRedirect: true,
        redirectTo: 'focusguard://auth/callback',
      },
    })
    if (data?.url) {
      // Open OAuth URL in system browser, not inside Electron
      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(data.url)
      } else {
        window.open(data.url, '_blank')
      }
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setOpen(false)
  }

  if (loading) return <div style={{ width: 32, height: 32 }}/>

  if (!user) return (
    <button onClick={signInWithGoogle} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
      background: 'transparent', border: '1px solid #1e1e1e',
      color: '#404040', fontFamily: "'JetBrains Mono', monospace",
      fontSize: 14, letterSpacing: '0.12em', transition: 'all 0.15s',
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M15 3H9a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/>
        <path d="M18 16l4-4-4-4"/><path d="M22 12H9"/>
      </svg>
      SIGN IN
    </button>
  )

  const name   = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'U'
  const avatar = user.user_metadata?.avatar_url

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 10px 4px 4px',
        borderRadius: 10, cursor: 'pointer',
        background: open ? '#111' : 'transparent',
        border: '1px solid #1e1e1e',
        transition: 'all 0.15s',
      }}>
        {/* Avatar — fixed 28px so it never overflows 56px navbar */}
        {avatar
          ? <img src={avatar} alt="" style={{ width: 28, height: 28, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }}/>
          : (
            <div style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: '#c8f04a', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: '#080808', fontFamily: "'JetBrains Mono', monospace",
            }}>
              {name[0].toUpperCase()}
            </div>
          )
        }
        <span style={{
          fontSize: 12, color: '#484848',
          maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {name}
        </span>
        {/* Chevron */}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#303030" strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: '#0e0e0e', border: '1px solid #1c1c1c',
          borderRadius: 10, overflow: 'hidden', minWidth: 160, zIndex: 100,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #161616' }}>
            <div style={{ fontSize: 12, color: '#2a2a2a', letterSpacing: '0.12em', marginBottom: 4 }}>SIGNED IN AS</div>
            <div style={{ fontSize: 12, color: '#c8f04a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </div>
          </div>
          <button onClick={() => {
            setOpen(false)
            // In Electron (file://), navigate to history/index.html relative to current page
            // In dev (http://localhost:3000), use normal path
            if (window.location.protocol === 'file:') {
              const base = window.location.href.split('/').slice(0, -1).join('/')
              window.location.href = base + '/history/index.html'
            } else {
              window.location.href = '/history'
            }
          }} style={{
            display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left',
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 14, color: '#484848', letterSpacing: '0.12em',
            fontFamily: "'JetBrains Mono', monospace",
            textDecoration: 'none', transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#141414'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            MY SESSIONS
          </button>
          <button onClick={signOut} style={{
            width: '100%', padding: '10px 14px', textAlign: 'left',
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 14, color: '#484848', letterSpacing: '0.12em',
            fontFamily: "'JetBrains Mono', monospace",
            borderTop: '1px solid #141414',
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#141414'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            SIGN OUT
          </button>
        </div>
      )}
    </div>
  )
}